/**
 * Centralised brand identity constants.
 *
 * The "Property ME" rebrand (task #25) only updated user-visible text. The
 * in-code identifiers (host names, social handles, OG image paths, e-mail
 * senders, mobile bundle IDs, etc.) still carry the legacy "sabq" name. This
 * module is the single switch point for the next phase of the migration:
 *
 *   - Existing values are kept as the defaults so nothing breaks until the
 *     supporting external coordination (App Store / Play Store / DNS / social
 *     handles / SendGrid) is in place.
 *   - Each value can be flipped per environment via the matching env var,
 *     without touching the source.
 *
 * See `docs/BRAND_IDENTIFIER_MIGRATION.md` for the full plan and the list of
 * external systems that still need to be coordinated before the legacy
 * identifiers can be retired.
 */

const env: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};

// ---------------------------------------------------------------------------
// Display name (kept here so server-side templates have a single source of
// truth; UI text already uses these names directly).
// ---------------------------------------------------------------------------
export const BRAND_NAME_AR = "بروبرتي ميدل إيست";
export const BRAND_NAME_EN = "Property Middle East";
export const BRAND_OG_SITE_NAME = "بروبرتي ميدل إيست - Property Middle East";

// ---------------------------------------------------------------------------
// Web identity
// ---------------------------------------------------------------------------
export const BRAND_PRIMARY_DOMAIN = env.BRAND_PRIMARY_DOMAIN || "propertymiddleeast.com";
export const BRAND_PRIMARY_URL = `https://${BRAND_PRIMARY_DOMAIN}`;

// ---------------------------------------------------------------------------
// Social handles / URLs
// ---------------------------------------------------------------------------
export const BRAND_TWITTER_HANDLE = env.BRAND_TWITTER_HANDLE || "@PropertyMENA";
export const BRAND_TWITTER_URL =
  env.BRAND_TWITTER_URL || "https://x.com/PropertyMENA";
export const BRAND_FACEBOOK_URL =
  env.BRAND_FACEBOOK_URL || "https://www.facebook.com/PropertyMiddleEast";
export const BRAND_FACEBOOK_PUBLISHER =
  env.BRAND_FACEBOOK_PUBLISHER || "https://www.facebook.com/PropertyMiddleEast";
export const BRAND_INSTAGRAM_URL =
  env.BRAND_INSTAGRAM_URL || "https://www.instagram.com/propertymiddleeast";
export const BRAND_YOUTUBE_URL =
  env.BRAND_YOUTUBE_URL || "https://youtube.com/@propertymiddleeast";
export const BRAND_TIKTOK_URL =
  env.BRAND_TIKTOK_URL || "https://www.tiktok.com/@propertymiddleeast";
export const BRAND_LINKEDIN_URL =
  env.BRAND_LINKEDIN_URL || "https://www.linkedin.com/company/property-middle-east";
export const BRAND_WHATSAPP_URL =
  env.BRAND_WHATSAPP_URL || "https://whatsapp.com/channel/0029VajXjkDAzNbzO6RwPy0q";

// ---------------------------------------------------------------------------
// Branding asset paths (served from `public/branding/`)
// ---------------------------------------------------------------------------
export const BRAND_OG_IMAGE_PATH =
  env.BRAND_OG_IMAGE_PATH || "/branding/property-me-og-image.png";
export const BRAND_LOGO_PATH =
  env.BRAND_LOGO_PATH || "/branding/property-me-logo.png";
export const BRAND_LOGO_WHITE_PATH =
  env.BRAND_LOGO_WHITE_PATH || "/branding/property-me-logo-white.png";

// ---------------------------------------------------------------------------
// Mobile / native identifiers (informational — see migration doc).
// These constants exist so server code that builds deep links or checks
// bundle IDs has a single place to read them from. The native projects
// (`ios/`, `android/`, `capacitor.config.ts`) still hold the literal values
// because changing them requires App Store / Play Store coordination.
// ---------------------------------------------------------------------------
export const APP_BUNDLE_ID_IOS_MAIN =
  env.APP_BUNDLE_ID_IOS_MAIN || "com.sabq.smart";
export const APP_BUNDLE_ID_IOS_LITE =
  env.APP_BUNDLE_ID_IOS_LITE || "com.sabq.lite";
export const APP_PACKAGE_ID_ANDROID_MAIN =
  env.APP_PACKAGE_ID_ANDROID_MAIN || "com.sabq.smart";
export const APP_APNS_BUNDLE_ID =
  env.APNS_BUNDLE_ID || "com.sabq.sabqorg";

// ---------------------------------------------------------------------------
// Instance isolation
// ---------------------------------------------------------------------------
// `INSTANCE_NAMESPACE` is the prefix used for every cross-instance side-channel
// in the project (Redis Pub/Sub channels, session keys, future cache keys,
// etc.). The goal is to ensure that, even when two deployments share the same
// Redis instance / object-storage bucket, they cannot accidentally read or
// invalidate each other's data.
//
// - Default is derived from the brand name (e.g. "property-me") so a fresh
//   clone gets a sane value out-of-the-box.
// - Operators should override it via the `INSTANCE_NAMESPACE` env var when
//   running multiple deployments off the same shared infra.
// ---------------------------------------------------------------------------

function slugifyForNamespace(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "instance";
}

export const INSTANCE_NAMESPACE: string =
  (env.INSTANCE_NAMESPACE && env.INSTANCE_NAMESPACE.trim()) ||
  slugifyForNamespace(BRAND_NAME_EN);

/**
 * Prefix an arbitrary key/channel name with the active instance namespace.
 * Idempotent: calling twice with the same key won't double-prefix.
 *
 * Example: namespacedKey("editor-presence:heartbeat")
 *          -> "property-me:editor-presence:heartbeat"
 */
export function namespacedKey(key: string): string {
  const prefix = `${INSTANCE_NAMESPACE}:`;
  if (!key) return prefix;
  if (key.startsWith(prefix)) return key;
  return `${prefix}${key}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an absolute URL on the brand domain.
 * Pass a path with or without a leading slash.
 */
export function brandUrl(pathname = ""): string {
  if (!pathname) return BRAND_PRIMARY_URL;
  if (/^https?:\/\//.test(pathname)) return pathname;
  return `${BRAND_PRIMARY_URL}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}
