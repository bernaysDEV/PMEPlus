/**
 * Sensitive-field redaction helpers shared by `server/auth.ts`,
 * `server/routes.ts`, and `server/objectStorage.ts`.
 *
 * Goal: keep useful diagnostics in development, but in production avoid
 * leaking PII (full email addresses), credentials (passwords, tokens,
 * cookies, auth headers), and internal storage paths (signed upload URLs,
 * private bucket prefixes) into logs that may be tailed or shipped to a
 * downstream collector.
 *
 * Used at log call sites — NOT a global console wrapper. We deliberately
 * keep this module dependency-free and synchronous so it can be imported
 * from anywhere on the server without bootstrapping concerns.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "newpassword",
  "currentpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "secret",
  "clientsecret",
  "authorization",
  "cookie",
  "set-cookie",
  "privatekey",
  "apikey",
  "api_key",
  "uploadurl",
  "upload_url",
  "signedurl",
  "signed_url",
  "x-csrf-token",
]);

const REDACTED = "[REDACTED]";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Mask an email like `alice@example.com` -> `a***@example.com`.
 * In non-production, returns the original value so debugging stays easy.
 */
export function maskEmail(email: unknown): string {
  if (typeof email !== "string" || email.length === 0) return String(email ?? "");
  if (!isProduction()) return email;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local[0] ?? "";
  return `${head}***@${domain}`;
}

/**
 * Drop everything after a path's first segment so we never print full
 * private-bucket prefixes (e.g. `.private/uploads/abc/secret.pdf` becomes
 * `.private/…`). In dev returns the original.
 */
export function maskStoragePath(p: unknown): string {
  if (typeof p !== "string" || p.length === 0) return String(p ?? "");
  if (!isProduction()) return p;
  // Strip query string first (signed URL params).
  const noQuery = p.split("?")[0];
  // Keep only first 1-2 segments.
  const parts = noQuery.split("/").filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]}/${parts[1]}/…`;
}

/**
 * Replace any signed-URL token in a string with `[REDACTED]`. Useful when
 * the URL itself isn't structured (e.g. embedded in a free-form message).
 */
export function maskSignedUrl(url: unknown): string {
  if (typeof url !== "string" || url.length === 0) return String(url ?? "");
  if (!isProduction()) return url;
  // For GCS / S3 signed URLs, anything past `?` is the credential payload.
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return url;
  return `${url.slice(0, qIdx)}?${REDACTED}`;
}

/**
 * Recursively redact sensitive keys from an object/array. Mutates a copy,
 * not the input. Safe to pass to `console.log`.
 */
export function redact<T = unknown>(value: T, depth = 0): T {
  if (depth > 6) return REDACTED as unknown as T;
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEYS.has(lower)) {
      out[k] = REDACTED;
      continue;
    }
    if (lower === "email" || lower.endsWith("email")) {
      out[k] = maskEmail(v as string);
      continue;
    }
    out[k] = redact(v, depth + 1);
  }
  return out as unknown as T;
}
