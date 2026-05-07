/**
 * CSRF regression probe (task-74).
 *
 * Boots a tiny Express app that mirrors the production wiring:
 *   express.json() → cookie-parser → express-session → validateCsrfToken
 *
 * and asserts:
 *   - Anonymous POST without `x-csrf-token` is rejected with 403 even when
 *     a session cookie exists (no enumeration shortcut, no "no session →
 *     pass" path).
 *   - GET requests are not blocked.
 *   - A valid token (header + session) is accepted.
 *
 * This guards against the historical regression where a missing/forged
 * CSRF token was silently treated as valid.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import http from "http";
import { AddressInfo } from "net";
import {
  validateCsrfToken,
  ensureCsrfToken,
  getCsrfToken,
} from "../../server/csrf";

let server: http.Server;
let baseUrl = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: "test-secret-do-not-use-in-prod",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false, httpOnly: true },
    })
  );
  app.get("/api/csrf-token", getCsrfToken);
  // Helper: deliberately install the token in the session so the "valid token"
  // test doesn't depend on cookie<->session matching from a separate request.
  app.get("/api/_test/seed-token", (req, res) => {
    const token = ensureCsrfToken(req);
    res.json({ token });
  });
  app.use("/api", validateCsrfToken);
  app.post("/api/echo", (req, res) => {
    res.json({ ok: true, body: req.body });
  });
  app.get("/api/echo", (_req, res) => res.json({ ok: true }));

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("CSRF middleware", () => {
  it("rejects POST /api/* without x-csrf-token (403)", async () => {
    const res = await fetch(`${baseUrl}/api/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects POST with a forged header but no session token (403)", async () => {
    // Even sending a "valid-looking" header without the matching session
    // token must fail. This guards the historical no-session-yet shortcut.
    const res = await fetch(`${baseUrl}/api/echo`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "deadbeef".repeat(8),
      },
      body: JSON.stringify({ hello: "world" }),
    });
    expect(res.status).toBe(403);
  });

  it("allows GET /api/* without a CSRF token (safe method)", async () => {
    const res = await fetch(`${baseUrl}/api/echo`);
    expect(res.status).toBe(200);
  });

  it("accepts POST when token matches the session", async () => {
    // First, get a session + token. We need to keep the connect.sid cookie.
    const seed = await fetch(`${baseUrl}/api/_test/seed-token`);
    const setCookie = seed.headers.get("set-cookie") || "";
    const token = (await seed.json()).token as string;
    const cookieHeader = setCookie.split(";")[0];

    const res = await fetch(`${baseUrl}/api/echo`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": token,
        cookie: cookieHeader,
      },
      body: JSON.stringify({ hello: "world" }),
    });
    expect(res.status).toBe(200);
  });
});
