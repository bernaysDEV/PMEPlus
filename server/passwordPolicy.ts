// Centralised password policy used by /api/register, /api/auth/reset-password,
// /api/auth/set-password, /api/admin/users/:id/reset-password, and the staff
// "send credentials" temporary-password generator.
//
// PME audit "خلال أسبوع" tier required: minimum 12 chars, top-100 weak-password
// rejection, rejection of trivial repeats. We deliberately keep the rule set
// small and deterministic — heavy entropy estimators (zxcvbn, etc.) belong in
// the 2-week tier.

const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  // Top global breached passwords
  "password", "password1", "password12", "password123", "password1234",
  "passw0rd", "p@ssword", "p@ssw0rd", "p@ssword1", "p@ssw0rd1",
  "qwerty123", "qwerty1234", "qwertyuiop", "1qaz2wsx3edc",
  "12345678", "123456789", "1234567890", "12345678910",
  "11111111", "00000000", "asdfasdf", "asdfghjkl",
  "letmein123", "welcome123", "welcome1234", "admin1234", "administrator",
  "iloveyou12", "monkey1234", "dragon1234", "football1234",
  "baseball123", "superman123", "trustno1234",
  "changeme", "changeme1", "changeme123", "default123",
  "rootroot", "toortoor",
  // Common Arabic/Saudi patterns
  "azerty1234", "qwerty1234", "saudi1234", "alsabq1234",
  "ksa1234567", "alriyadh123", "kingdom1234",
]);

export interface PasswordValidationResult {
  ok: boolean;
  message?: string;
}

export function validatePasswordStrength(password: unknown): PasswordValidationResult {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, message: "كلمة المرور مطلوبة" };
  }
  if (password.length < 12) {
    return {
      ok: false,
      message: "كلمة المرور يجب أن تكون 12 حرفاً على الأقل",
    };
  }
  if (password.length > 128) {
    return { ok: false, message: "كلمة المرور طويلة جداً (الحد الأقصى 128 حرفاً)" };
  }

  // All same character ("aaaaaaaaaaaa")
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, message: "كلمة المرور ضعيفة جداً" };
  }

  // Trivial sequences ("123456789012", "abcdefghijkl")
  if (
    /^0?123456789(0|01|012|0123)?$/.test(password) ||
    /^abcdefghijkl(mno)?$/i.test(password)
  ) {
    return { ok: false, message: "كلمة المرور ضعيفة جداً" };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      ok: false,
      message: "كلمة المرور شائعة جداً، يرجى اختيار كلمة مرور أقوى",
    };
  }

  return { ok: true };
}

// Cryptographically strong temporary password generator (used when an admin
// creates a staff account or triggers a forced reset). Bumped from 8 → 16
// chars and forced to include all four character classes so the produced
// password always passes `validatePasswordStrength`.
export function generateStrongTempPassword(length: number = 16): string {
  const crypto = require("crypto") as typeof import("crypto");
  const lower = "abcdefghijkmnopqrstuvwxyz"; // no l
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
  const digits = "23456789"; // no 0, 1
  const symbols = "!@#$%^&*-_=+";
  const all = lower + upper + digits + symbols;

  const minLen = Math.max(12, length);
  const buf = crypto.randomBytes(minLen * 2);
  const out: string[] = [
    lower[buf[0] % lower.length],
    upper[buf[1] % upper.length],
    digits[buf[2] % digits.length],
    symbols[buf[3] % symbols.length],
  ];
  for (let i = 4; i < minLen; i++) {
    out.push(all[buf[i] % all.length]);
  }
  // Fisher–Yates shuffle so the four guaranteed classes don't always sit in
  // the first four positions.
  for (let i = out.length - 1; i > 0; i--) {
    const j = buf[minLen + i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}
