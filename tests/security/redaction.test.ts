// Log redaction helper probes (task-74). Asserts production-mode masking
// of email, signed URLs, storage paths, and the recursive `redact()` of
// sensitive keys (passwords/tokens/auth headers).
import { describe, it, expect, beforeAll, afterAll } from "vitest";

let prevEnv: string | undefined;

beforeAll(() => {
  prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
});

afterAll(() => {
  if (prevEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = prevEnv;
});

async function loadHelpers() {
  // Re-import after env flip so isProduction() picks up the new value.
  const mod = await import("../../server/logRedaction");
  return mod;
}

describe("logRedaction (production mode)", () => {
  it("maskEmail keeps domain, hides local part", async () => {
    const { maskEmail } = await loadHelpers();
    expect(maskEmail("alice@example.com")).toBe("a***@example.com");
    expect(maskEmail("")).toBe("");
    expect(maskEmail("noatsign")).toBe("***");
  });

  it("maskSignedUrl strips query credentials", async () => {
    const { maskSignedUrl } = await loadHelpers();
    const signed =
      "https://storage.googleapis.com/bucket/.private/uploads/abc.bin?X-Goog-Signature=secret&X-Goog-Expires=3600";
    const out = maskSignedUrl(signed);
    expect(out).not.toContain("secret");
    expect(out).not.toContain("X-Goog-Signature");
    expect(out.startsWith("https://storage.googleapis.com/bucket/.private/uploads/abc.bin?"))
      .toBe(true);
  });

  it("maskStoragePath collapses past second segment", async () => {
    const { maskStoragePath } = await loadHelpers();
    expect(maskStoragePath(".private/uploads/abcdef/secret.pdf")).toBe(
      ".private/uploads/…",
    );
  });

  it("redact() walks objects and replaces sensitive keys", async () => {
    const { redact } = await loadHelpers();
    const out = redact({
      user: { email: "bob@example.com", password: "hunter2" },
      headers: { authorization: "Bearer xyz", cookie: "sid=abc" },
      uploadUrl: "https://x/y?Signature=zzz",
      nested: [{ accessToken: "tok", note: "ok" }],
    }) as any;
    expect(out.user.password).toBe("[REDACTED]");
    expect(out.user.email).toBe("b***@example.com");
    expect(out.headers.authorization).toBe("[REDACTED]");
    expect(out.headers.cookie).toBe("[REDACTED]");
    expect(out.uploadUrl).toBe("[REDACTED]");
    expect(out.nested[0].accessToken).toBe("[REDACTED]");
    expect(out.nested[0].note).toBe("ok");
  });
});
