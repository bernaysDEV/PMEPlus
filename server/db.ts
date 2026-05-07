// Reference: javascript_database blueprint
import { Pool, neonConfig, type PoolClient } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = "password";
neonConfig.coalesceWrites = true;
neonConfig.useSecureWebSocket = true;

// Graceful database connection with error handling
let pool: Pool;
let db: NeonDatabase<typeof schema>;
let _dbConnected = false;
let _dbLastError: string | null = null;
let _reconnectTimer: ReturnType<typeof setInterval> | null = null;

// Production detection signal. The deployed app runs `node dist/bootstrap.js`
// directly (see .replit) and does NOT inherit the `NODE_ENV=production` that
// `npm start` would set, so we also accept Replit's deployment flag.
const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';

// Pool sizing. Per-pod max × replica count must stay under the Neon plan's
// connection ceiling (currently 80). Defaults: max=15 per pod, which yields
// 15×3 pods = 45 < 80 with headroom. Override via env vars when scaling out.
const POOL_MAX = parseInt(process.env.DB_POOL_MAX || '15', 10);
const POOL_IDLE_TIMEOUT_MS = parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10);
const POOL_CONNECTION_TIMEOUT_MS = parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '10000', 10);

function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

// Recognise errors that mean "we lost the network path to Postgres", as
// opposed to ordinary query errors (constraint violations, syntax errors,
// missing relations, permission errors, etc) which should NOT flip the pool
// health flag.
function isConnectivityError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || '').toString().toUpperCase();
  if (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENOTFOUND' ||
    code === 'EPIPE' ||
    code === 'EAI_AGAIN' ||
    code === '57P01' || // admin_shutdown
    code === '57P02' || // crash_shutdown
    code === '57P03' || // cannot_connect_now
    code === '08000' || // connection_exception
    code === '08003' || // connection_does_not_exist
    code === '08006' || // connection_failure
    code === '08001' || // sqlclient_unable_to_establish_sqlconnection
    code === '08004'    // sqlserver_rejected_establishment_of_sqlconnection
  ) {
    return true;
  }
  return (
    msg.includes('connection terminated') ||
    msg.includes('connection closed') ||
    msg.includes('connection ended') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('timeout') && msg.includes('connect') ||
    msg.includes('terminating connection') ||
    msg.includes('server closed the connection') ||
    msg.includes('websocket') && (msg.includes('closed') || msg.includes('error'))
  );
}

// Single canonical place to update pool/connection health based on a query
// result. Pass `null` for success, or an Error for failure.
export function noteQueryResult(err: any | null): void {
  if (err == null) {
    // Only emit a recovery line when we were actually in a reconnect loop —
    // otherwise this would fire once on every startup when _dbConnected
    // flips from its initial `false` to `true`.
    if (!_dbConnected && _reconnectTimer !== null) {
      console.log('[DB] Connectivity restored (query succeeded)');
    }
    _dbConnected = true;
    _dbLastError = null;
    if (_reconnectTimer !== null) {
      stopReconnectLoop();
    }
    return;
  }
  if (isConnectivityError(err)) {
    if (_dbConnected) {
      console.error('[DB] Connectivity lost (query failure):', err.message);
    }
    _dbConnected = false;
    _dbLastError = err.message || String(err);
    startReconnectLoop();
  }
}

// Marker placed on a Pool / PoolClient once its `query` method has been
// wrapped, so we never double-install the hook (a pooled client may be
// checked out and released many times).
const QUERY_HOOK_INSTALLED: unique symbol = Symbol('sabq.queryHookInstalled');
type QueryHookable = { [QUERY_HOOK_INSTALLED]?: true };

// If the value looks like a Promise, attach the success/failure hook. Returns
// the value unchanged otherwise so the callback form of node-pg's `query`
// (which returns void) keeps working.
function attachOutcomeHook<T>(value: T): T {
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { then?: unknown }).then === 'function'
  ) {
    const promised = value as unknown as Promise<unknown>;
    return promised.then(
      (resolved) => {
        noteQueryResult(null);
        return resolved;
      },
      (err: unknown) => {
        noteQueryResult(err);
        throw err;
      },
    ) as unknown as T;
  }
  return value;
}

// Wrap a Pool / PoolClient's `query` method so every resolution / rejection
// flows through `noteQueryResult`. This is the universal health hook the task
// calls for: a connectivity-class failure on ANY query — Drizzle-issued or
// raw — flips `_dbConnected` to false and kicks off the reconnect loop
// within milliseconds, instead of waiting for the next monitor tick.
//
// The replacement is typed as `typeof original` so the host's overloaded
// query signature (string / QueryConfig / callback / Submittable forms) is
// preserved at every call site.
function installQueryHook(target: Pool | PoolClient): void {
  const tagged = target as (Pool | PoolClient) & QueryHookable;
  if (tagged[QUERY_HOOK_INSTALLED]) return;

  const original = target.query;
  type QueryFn = typeof original;
  type QueryArgs = Parameters<QueryFn>;
  type QueryResultLike = ReturnType<QueryFn>;

  const wrapped = function instrumentedQuery(
    this: Pool | PoolClient,
    ...args: QueryArgs
  ): QueryResultLike {
    let result: QueryResultLike;
    try {
      // `apply` preserves the host binding so internals that rely on
      // `this` (Submittable handling, event emission) keep working.
      result = (original as (...a: QueryArgs) => QueryResultLike).apply(
        this ?? target,
        args,
      );
    } catch (err) {
      // Synchronous throw (e.g. malformed config). Route through the hook
      // for uniform behaviour, then re-throw.
      noteQueryResult(err);
      throw err;
    }
    return attachOutcomeHook(result);
  } as QueryFn;

  target.query = wrapped;
  Object.defineProperty(target, QUERY_HOOK_INSTALLED, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
}

// Wrap a Pool's `connect` so the checked-out PoolClient also has its `query`
// instrumented. Both overloads (Promise form and callback form) are preserved
// explicitly so drizzle's `await pool.connect()` for transactions and any
// future callback-form callers both keep working.
type ConnectCallback = (
  err: Error | undefined,
  client: PoolClient | undefined,
  done: (release?: unknown) => void,
) => void;

function installConnectHook(p: Pool): void {
  const originalConnect = p.connect;

  function instrumentedConnect(): Promise<PoolClient>;
  function instrumentedConnect(callback: ConnectCallback): void;
  function instrumentedConnect(
    callback?: ConnectCallback,
  ): Promise<PoolClient> | void {
    if (typeof callback === 'function') {
      const cbForm = originalConnect as (cb: ConnectCallback) => void;
      cbForm.call(p, (err, client, done) => {
        if (!err && client) installQueryHook(client);
        callback(err, client, done);
      });
      return;
    }
    const promiseForm = originalConnect as () => Promise<PoolClient>;
    return promiseForm.call(p).then((client) => {
      installQueryHook(client);
      return client;
    });
  }

  p.connect = instrumentedConnect as typeof p.connect;
}

function initPool(databaseUrl: string): void {
  let dbHost = "unknown";
  let dbName = "unknown";
  try {
    const u = new URL(databaseUrl);
    dbHost = u.hostname;
    dbName = u.pathname.replace(/^\//, "") || "unknown";
  } catch {}
  console.log(`[DB] Initializing connection → host=${dbHost} db=${dbName}`);

  pool = new Pool({
    connectionString: databaseUrl,
    max: POOL_MAX,
    min: 0,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    allowExitOnIdle: true,
    maxUses: 5000,
  });

  pool.on('error', (err) => {
    console.error('[Pool] Unexpected client error:', err.message);
    if (isConnectivityError(err)) {
      _dbConnected = false;
      _dbLastError = err.message;
      startReconnectLoop();
    }
  });

  // Universal health hook: every `pool.query(...)` — including the ones
  // drizzle-orm/neon-serverless issues internally for `db.select()` /
  // `db.execute()` etc — now runs noteQueryResult on resolve/reject.
  installQueryHook(pool);

  // For transactions and explicit checkouts (`await pool.connect()`), wrap
  // the returned client's `.query` too so per-client queries (drizzle's
  // `db.transaction(...)`, the leader-election advisory locks, the
  // `databaseCleanupJob` VACUUMs, etc.) also flip the health flag
  // immediately on a connectivity drop.
  installConnectHook(pool);

  db = drizzle({ client: pool, schema });
}

async function verifyConnection(): Promise<boolean> {
  try {
    if (!pool) return false;
    const start = Date.now();
    await pool.query('SELECT 1');
    const elapsed = Date.now() - start;
    noteQueryResult(null);
    if (!IS_PRODUCTION) {
      console.log(`[DB] Connection verified (${elapsed}ms)`);
    }
    return true;
  } catch (error: any) {
    _dbConnected = false;
    _dbLastError = error.message || 'Unknown error';
    console.error(`[DB] Connection verification failed: ${_dbLastError}`);
    return false;
  }
}

let _dbMaintenanceDone = false;

async function runStartupMaintenance(): Promise<void> {
  if (_dbMaintenanceDone) return;
  _dbMaintenanceDone = true;
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_homepage_order ON articles (status, hide_from_homepage, display_order DESC, published_at DESC)`);
    console.log('[DB] Homepage order index ensured');
  } catch (err: any) {
    console.warn('[DB] Homepage order index creation skipped:', err.message);
  }
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_breaking ON articles (status, hide_from_homepage, news_type, published_at DESC)`);
    console.log('[DB] Breaking news index ensured');
  } catch (err: any) {
    console.warn('[DB] Breaking news index creation skipped:', err.message);
  }
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_paginated ON articles (status, hide_from_homepage, published_at DESC) WHERE (article_type IS NULL OR article_type != 'opinion') AND (source IS NULL OR source != 'ai')`);
    console.log('[DB] Paginated news index ensured');
  } catch (err: any) {
    console.warn('[DB] Paginated news index creation skipped:', err.message);
  }
  try {
    await pool.query(`SET statement_timeout = '15s'`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_search_vector ON articles USING gin(search_vector) WHERE status = 'published'`);
    console.log('[DB] Search GIN index ensured');
  } catch (err: any) {
    console.warn('[DB] Search GIN index creation skipped:', err.message);
  } finally {
    try { await pool.query(`SET statement_timeout = '0'`); } catch {}
  }
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_published_status ON articles (published_at DESC) WHERE status = 'published'`);
    console.log('[DB] Published status index ensured');
  } catch (err: any) {
    console.warn('[DB] Published status index creation skipped:', err.message);
  }
  try {
    await pool.query(`
      DELETE FROM reading_history 
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, article_id) id 
        FROM reading_history 
        ORDER BY user_id, article_id, read_at DESC
      )
    `);
    console.log('[DB] Reading history duplicates cleaned');
  } catch (err: any) {
    console.warn('[DB] Reading history dedup skipped:', err.message);
  }
  setTimeout(async () => {
    try {
      await pool.query('ANALYZE articles');
      console.log('[DB] ANALYZE articles completed - query planner stats updated');
    } catch (err: any) {
      console.warn('[DB] ANALYZE articles skipped:', err.message);
    }
  }, 30000);
  // VACUUM to remove dead tuples from bulk search_vector UPDATE (runs once after 2 min)
  setTimeout(async () => {
    try {
      await pool.query('VACUUM articles');
      console.log('[DB] VACUUM articles completed - dead tuples removed');
    } catch (err: any) {
      console.warn('[DB] VACUUM articles skipped:', err.message);
    }
  }, 120000);
}

function startReconnectLoop(): void {
  if (_reconnectTimer) return;
  
  console.warn('[DB] Starting reconnection loop (every 10s)...');
  _reconnectTimer = setInterval(async () => {
    console.log('[DB] Attempting reconnection...');
    
    try {
      const connected = await verifyConnection();
      if (connected) {
        console.log('[DB] Reconnection successful');
        stopReconnectLoop();
        runStartupMaintenance();
      }
    } catch (error: any) {
      console.error(`[DB] Reconnection attempt failed: ${error.message}`);
    }
  }, 10000);
  _reconnectTimer.unref();
}

function stopReconnectLoop(): void {
  if (_reconnectTimer) {
    clearInterval(_reconnectTimer);
    _reconnectTimer = null;
    console.log('[DB] Reconnection loop stopped');
  }
}

try {
  const databaseUrl = getDatabaseUrl();
  
  if (!databaseUrl) {
    console.error("[DB] No database URL configured. Database features will be unavailable.");
    console.error("Please set NEON_DATABASE_URL (external) or DATABASE_URL in your deployment settings.");
    throw new Error("Database URL must be set. Did you forget to provision a database?");
  }

  initPool(databaseUrl);

  console.log("[DB] Pool initialized");
  console.log(
    `[DB] Pool config: max=${POOL_MAX}, min=0, idleTimeout=${Math.round(POOL_IDLE_TIMEOUT_MS / 1000)}s, connTimeout=${Math.round(POOL_CONNECTION_TIMEOUT_MS / 1000)}s, allowExitOnIdle=true ` +
    `(per-pod max × replicas must stay under Neon connection limit; override with DB_POOL_MAX / DB_POOL_IDLE_TIMEOUT_MS / DB_POOL_CONNECTION_TIMEOUT_MS)`,
  );

  // In production we mostly want silence: only log when something is actually
  // wrong. In development we still emit a heartbeat so devs can confirm the
  // monitor is alive. `IS_PRODUCTION` accepts NODE_ENV=production OR the
  // Replit deployment flag (REPLIT_DEPLOYMENT=1) so the longer cadence applies
  // even when NODE_ENV isn't set in the deployed app.
  const monitorInterval = IS_PRODUCTION ? 300000 : 60000;
  const monitorTimer = setInterval(() => {
    const stats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };

    // Saturation conditions that genuinely deserve a warning:
    //   1. There are clients waiting on a connection.
    //   2. We are at (or above) the configured max.
    //   3. Every open connection is in use (busy with no slack), AND we
    //      actually have at least one open connection. `total === 0` is the
    //      normal resting state for a Neon serverless pool with min=0 and a
    //      30s idle timeout — it does NOT mean "starved".
    const saturated =
      stats.waiting > 0 ||
      stats.total >= POOL_MAX ||
      (stats.total > 0 && stats.idle === 0);

    if (saturated) {
      console.warn(
        `[Pool Monitor] Saturated: total=${stats.total}, idle=${stats.idle}, waiting=${stats.waiting}, max=${POOL_MAX}`,
      );
    } else if (!IS_PRODUCTION) {
      console.log(
        `[Pool Monitor] Healthy: total=${stats.total}, idle=${stats.idle}, waiting=${stats.waiting}, max=${POOL_MAX}`,
      );
    }
  }, monitorInterval);
  monitorTimer.unref();
  
  console.log('[DB] Keep-alive disabled to allow Neon auto-suspend (cost optimization)');
  
  verifyConnection().then(async (connected) => {
    if (!connected) {
      startReconnectLoop();
    } else {
      runStartupMaintenance();
      try {
        const r = await pool.query(
          "SELECT current_database() AS db, (SELECT COUNT(*) FROM articles WHERE status='published')::int AS published_articles"
        );
        const row = r.rows[0] || {};
        console.log(`[DB] Sanity check → db=${row.db} published_articles=${row.published_articles}`);
      } catch (err: any) {
        console.warn('[DB] Sanity check skipped:', err.message);
      }
    }
  });
  
} catch (error: any) {
  console.error("[DB] Initialization error:", error.message);
  console.error("Please set NEON_DATABASE_URL or DATABASE_URL and restart.");
  
  if (IS_PRODUCTION) {
    console.error("[PRODUCTION] Server will start without DB to serve static pages. API calls will return 503.");
    startReconnectLoop();
  } else {
    console.error("[DEV] Server cannot start without a valid database connection.");
    throw error;
  }
}

export function isDatabaseAvailable(): boolean {
  return pool !== undefined && db !== undefined && _dbConnected;
}

export function getDatabaseStatus(): { connected: boolean; lastError: string | null; reconnecting: boolean } {
  return {
    connected: _dbConnected,
    lastError: _dbLastError,
    reconnecting: _reconnectTimer !== null,
  };
}

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD = 500;

// Helper function to wrap queries with timing and logging
export async function timedQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const elapsed = Date.now() - start;

    // Successful query → confirm DB is reachable. This is what flips
    // _dbConnected back to true after a transient outage.
    noteQueryResult(null);

    if (elapsed > SLOW_QUERY_THRESHOLD) {
      console.warn(`🐢 [Slow Query] ${queryName}: ${elapsed}ms (threshold: ${SLOW_QUERY_THRESHOLD}ms)`);
    } else if (!IS_PRODUCTION && elapsed > 100) {
      console.log(`⏱️ [Query] ${queryName}: ${elapsed}ms`);
    }

    return result;
  } catch (error) {
    const elapsed = Date.now() - start;
    // Only connectivity-class failures flip the health flag and start the
    // reconnect loop. Ordinary query errors (constraint violations, syntax,
    // missing relation, etc) are left untouched.
    noteQueryResult(error);
    console.error(`❌ [Query Error] ${queryName}: ${elapsed}ms`, error);
    throw error;
  }
}

// Pool stats helper for debugging
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export { pool, db };
