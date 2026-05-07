import { INSTANCE_NAMESPACE, BRAND_NAME_EN } from "@shared/branding";

/**
 * Best-effort startup audit that surfaces — loudly — any configuration which
 * still ties this deployment to the legacy "sabq" platform's live runtime.
 *
 * Scope: only checks for configuration we can detect locally (env vars and
 * defaults). It never reads the actual secret values for sensitive credentials
 * (e.g. SESSION_SECRET, REDIS_URL credentials), it only inspects whether the
 * connection target / bucket / prefix appears to be a shared "sabq" resource.
 *
 * Output is structured so operators (and the platform's deployment logs view)
 * can see at a glance which sharing risks remain after task #62 was applied.
 *
 * Returns the raw findings so callers can use them for testing / metrics.
 */
export interface IsolationFinding {
  level: "info" | "warn" | "error";
  key: string;
  message: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isLikelyShared(value: string | undefined): boolean {
  if (!value) return false;
  return /sabq/i.test(value);
}

export function auditInstanceIsolation(): IsolationFinding[] {
  const findings: IsolationFinding[] = [];

  // 1. INSTANCE_NAMESPACE — must be set explicitly when sharing infra.
  const explicitNamespace = (process.env.INSTANCE_NAMESPACE || "").trim();
  if (!explicitNamespace) {
    findings.push({
      level: "warn",
      key: "INSTANCE_NAMESPACE",
      message:
        `INSTANCE_NAMESPACE is unset — falling back to a slug of BRAND_NAME_EN ` +
        `("${INSTANCE_NAMESPACE}"). Set it explicitly in deployment secrets ` +
        `to lock the namespace to the new brand and avoid drift if BRAND_NAME_EN ` +
        `is ever rebranded.`,
    });
  } else if (slugify(explicitNamespace) === "sabq") {
    findings.push({
      level: "error",
      key: "INSTANCE_NAMESPACE",
      message:
        `INSTANCE_NAMESPACE is set to "${explicitNamespace}" — this would re-couple ` +
        `Redis channels and sessions to the legacy sabq deployment. Pick a value ` +
        `unique to this brand (recommended: "${slugify(BRAND_NAME_EN)}").`,
    });
  }

  // 2. PUBLIC_CDN_BASE_URL — required so public image URLs do not leak
  //    through (or back to) the legacy sabq.org domain. When unset, the
  //    code falls back to direct GCS URLs, which is safe but suboptimal.
  const cdnBase = (process.env.PUBLIC_CDN_BASE_URL || "").trim();
  if (!cdnBase) {
    findings.push({
      level: "warn",
      key: "PUBLIC_CDN_BASE_URL",
      message:
        `PUBLIC_CDN_BASE_URL is unset — public image URLs will be served as ` +
        `direct https://storage.googleapis.com/... links. Set this to your ` +
        `brand-owned CDN (e.g. https://cdn.your-brand.com/cdn-img/) to enable ` +
        `Cloudflare Polish + edge caching without going through the legacy ` +
        `sabq.org domain.`,
    });
  } else if (/sabq\./i.test(cdnBase)) {
    findings.push({
      level: "error",
      key: "PUBLIC_CDN_BASE_URL",
      message:
        `PUBLIC_CDN_BASE_URL ("${cdnBase}") points back at the legacy sabq domain. ` +
        `Public images from this deployment will be routed through the old ` +
        `brand. Use a CDN hostname owned by the new brand instead.`,
    });
  }

  // 3. REDIS_URL — best-effort check on the connection target host. We only
  //    inspect the part of the URL after "@" so credentials are never logged.
  const redisUrl = process.env.REDIS_URL || "";
  if (redisUrl) {
    const hostPart = redisUrl.includes("@")
      ? redisUrl.slice(redisUrl.lastIndexOf("@") + 1)
      : redisUrl.replace(/^[a-z]+:\/\//i, "");
    if (isLikelyShared(hostPart)) {
      findings.push({
        level: "warn",
        key: "REDIS_URL",
        message:
          `REDIS_URL appears to point at a Redis instance shared with the ` +
          `legacy sabq platform (host: ${hostPart}). Pub/Sub channels and ` +
          `session keys are namespaced with "${INSTANCE_NAMESPACE}:" so this ` +
          `is safe, but provisioning a dedicated Redis is still recommended.`,
      });
    }
  }

  // 4. AWS_S3_IMAGES_BUCKET / AWS_S3_IMAGES_PREFIX / R2_BUCKET_NAME —
  //    detect when uploads still land in the legacy "sabq" media bucket.
  const s3Bucket = (process.env.AWS_S3_IMAGES_BUCKET || "").trim();
  const s3Prefix = (process.env.AWS_S3_IMAGES_PREFIX || "").trim();
  if (isLikelyShared(s3Bucket) || isLikelyShared(s3Prefix)) {
    findings.push({
      level: "warn",
      key: "AWS_S3_IMAGES_BUCKET",
      message:
        `S3 image storage is shared with sabq (bucket="${s3Bucket}", ` +
        `prefix="${s3Prefix}"). Newly uploaded images for this brand will ` +
        `co-mingle with the legacy platform's files. Provision a dedicated ` +
        `bucket (or prefix) for the new brand.`,
    });
  }
  const r2Bucket = (process.env.R2_BUCKET_NAME || "").trim();
  if (isLikelyShared(r2Bucket)) {
    findings.push({
      level: "error",
      key: "R2_BUCKET_NAME",
      message:
        `R2_BUCKET_NAME ("${r2Bucket}") looks like the legacy sabq media bucket. ` +
        `Uploads via the R2 storage provider would land in shared storage. ` +
        `Provision a brand-owned R2 bucket and update R2_BUCKET_NAME.`,
    });
  }

  // Cross-check the Replit Object Storage configuration: the bucket implied
  // by PRIVATE_OBJECT_DIR / PUBLIC_OBJECT_SEARCH_PATHS is where new uploads
  // physically land. If DEFAULT_OBJECT_STORAGE_BUCKET_ID still references a
  // *different* bucket, reads (which historically preferred that secret) can
  // miss freshly uploaded content. Surface this so operators can either
  // realign the secret to the new bucket or accept the read-fallback path.
  const defaultBucketId = (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "").trim();
  const privateObjectDir = (process.env.PRIVATE_OBJECT_DIR || "").trim();
  const publicSearchPaths = (process.env.PUBLIC_OBJECT_SEARCH_PATHS || "").trim();
  const extractBucket = (path: string): string | null => {
    const parts = path.split("/").filter(Boolean);
    const startIdx = parts[0] === "objects" ? 1 : 0;
    if (startIdx < parts.length && !parts[startIdx].startsWith(".")) {
      return parts[startIdx];
    }
    return null;
  };
  const uploadBucket =
    (privateObjectDir && extractBucket(privateObjectDir)) ||
    (publicSearchPaths && extractBucket(publicSearchPaths.split(",")[0].trim())) ||
    "";
  if (defaultBucketId && uploadBucket && defaultBucketId !== uploadBucket) {
    findings.push({
      level: "info",
      key: "DEFAULT_OBJECT_STORAGE_BUCKET_ID",
      message:
        `DEFAULT_OBJECT_STORAGE_BUCKET_ID ("${defaultBucketId}") points at a ` +
        `different bucket than the one that backs PRIVATE_OBJECT_DIR / ` +
        `PUBLIC_OBJECT_SEARCH_PATHS ("${uploadBucket}"). New uploads land in ` +
        `"${uploadBucket}"; "${defaultBucketId}" is consulted as a read-only ` +
        `legacy fallback. Update the secret to "${uploadBucket}" once the ` +
        `legacy bucket is no longer needed.`,
    });
  }

  // 5. Frontend / CORS configuration — if the only allowed origins are sabq
  //    domains, the new brand's domain almost certainly cannot reach this API.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").trim();
  if (allowedOrigins) {
    const origins = allowedOrigins.split(",").map((o) => o.trim()).filter(Boolean);
    const allSabq = origins.length > 0 && origins.every((o) => /sabq\./i.test(o));
    if (allSabq) {
      findings.push({
        level: "warn",
        key: "ALLOWED_ORIGINS",
        message:
          `ALLOWED_ORIGINS only contains legacy sabq.* domains — the new ` +
          `brand's frontend will be blocked by CORS until a brand-owned ` +
          `domain is added.`,
      });
    }
  }
  const frontendUrl = (process.env.FRONTEND_URL || "").trim();
  if (isLikelyShared(frontendUrl)) {
    findings.push({
      level: "warn",
      key: "FRONTEND_URL",
      message:
        `FRONTEND_URL ("${frontendUrl}") still points at a legacy sabq domain. ` +
        `OAuth callbacks and password-reset links will redirect users to the ` +
        `wrong brand.`,
    });
  }

  return findings;
}

/**
 * Logs the audit results in a single, easy-to-grep block. Always called
 * exactly once at startup from server/index.ts.
 */
export function logInstanceIsolationAudit(): void {
  const findings = auditInstanceIsolation();
  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warn");

  if (findings.length === 0) {
    console.log(
      `[Isolation] ✅ Instance fully isolated from legacy sabq platform ` +
      `(namespace: ${INSTANCE_NAMESPACE})`,
    );
    return;
  }

  console.log(
    `[Isolation] 🔎 Audit complete — namespace="${INSTANCE_NAMESPACE}", ` +
    `${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  for (const f of findings) {
    const tag =
      f.level === "error" ? "❌ ERROR" : f.level === "warn" ? "⚠️  WARN " : "ℹ️  INFO ";
    console.log(`[Isolation] ${tag} ${f.key}: ${f.message}`);
  }
  if (errors.length > 0) {
    console.log(
      `[Isolation] 🚨 At least one configuration value would re-couple this ` +
      `deployment to the legacy sabq platform — please remediate before ` +
      `serving production traffic.`,
    );
  }
}
