// Reference: javascript_object_storage blueprint
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import { maskStoragePath, maskSignedUrl } from "./logRedaction";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('[R2] Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }
    
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

/**
 * Resolve the R2 (Cloudflare) bucket name for the active deployment.
 *
 * Historically this defaulted to the legacy `sabq-media` bucket, which meant
 * that any deployment using the R2 storage provider without an explicit
 * `R2_BUCKET_NAME` would silently land its uploads in the old brand's
 * shared media bucket. We now require `R2_BUCKET_NAME` to be set explicitly
 * so that each brand owns its own bucket and there is zero chance of
 * cross-brand co-mingling.
 */
function getR2Bucket(): string {
  const bucket = (process.env.R2_BUCKET_NAME || '').trim();
  if (!bucket) {
    throw new Error(
      '[R2] R2_BUCKET_NAME is not set. Provision a brand-owned R2 bucket ' +
      'and set R2_BUCKET_NAME before using the R2 storage provider. ' +
      'Falling back to a shared default is intentionally disabled to ' +
      'prevent uploads from co-mingling with the legacy sabq media bucket.'
    );
  }
  return bucket;
}

/**
 * Resolved CDN base URL for public image rewrites.
 *
 * The legacy implementation hard-coded `https://sabq.org/cdn-img/`, which
 * meant the new "Property ME" deployment was emitting public image URLs that
 * lived on the old brand's domain. The CDN base is now configurable via the
 * `PUBLIC_CDN_BASE_URL` env var. When unset, we fall back to the direct GCS
 * URL — never to the legacy sabq domain.
 *
 * Accepted formats for `PUBLIC_CDN_BASE_URL`:
 *   - Full prefix:        `https://cdn.example.com/cdn-img/`
 *   - Bare host/origin:   `https://cdn.example.com`        (we append `/`)
 *
 * Trailing slashes are normalised so callers can rely on a single shape.
 */
function resolvePublicCdnBaseUrl(): string | null {
  const raw = (process.env.PUBLIC_CDN_BASE_URL || '').trim();
  if (!raw) return null;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/**
 * Convert GCS URL to a CDN URL for better performance (Cloudflare Polish for
 * WebP conversion and edge caching). When `PUBLIC_CDN_BASE_URL` is not
 * configured, returns the original GCS URL unchanged so we never accidentally
 * route public images through another brand's domain.
 *
 * Example with `PUBLIC_CDN_BASE_URL=https://cdn.property.me/cdn-img/`:
 *   Input:  https://storage.googleapis.com/bucket-name/public/image.jpg
 *   Output: https://cdn.property.me/cdn-img/bucket-name/public/image.jpg
 */
export function toCdnUrl(gcsUrl: string): string {
  // Only convert GCS URLs in production / deployed envs.
  const isProduction = process.env.NODE_ENV === 'production' ||
                       process.env.REPLIT_DEPLOYMENT === '1';

  if (!isProduction) {
    return gcsUrl; // Keep original URL in development
  }

  // Check if it's a GCS URL
  if (!gcsUrl.startsWith('https://storage.googleapis.com/')) {
    return gcsUrl;
  }

  const cdnBase = resolvePublicCdnBaseUrl();
  if (!cdnBase) {
    // No brand-specific CDN configured — serve the direct storage URL
    // rather than fall back to a foreign brand's domain.
    return gcsUrl;
  }

  // Extract path after storage.googleapis.com/
  const gcsPath = gcsUrl.replace('https://storage.googleapis.com/', '');

  return `${cdnBase}${gcsPath}`;
}

/**
 * Convert CDN URL back to GCS URL (for internal operations). Honours both the
 * currently-configured `PUBLIC_CDN_BASE_URL` and the legacy sabq prefix so
 * historic article records that were written before the CDN was made
 * configurable still resolve correctly.
 */
export function fromCdnUrl(cdnUrl: string): string {
  const cdnBase = resolvePublicCdnBaseUrl();
  if (cdnBase && cdnUrl.startsWith(cdnBase)) {
    return `https://storage.googleapis.com/${cdnUrl.slice(cdnBase.length)}`;
  }

  // Backwards compatibility: historical rows may still embed the old prefix.
  const LEGACY_PREFIX = 'https://sabq.org/cdn-img/';
  if (cdnUrl.startsWith(LEGACY_PREFIX)) {
    return `https://storage.googleapis.com/${cdnUrl.slice(LEGACY_PREFIX.length)}`;
  }

  return cdnUrl;
}

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/**
 * Get the correct bucket configuration with fallbacks
 * Prioritizes DEFAULT_OBJECT_STORAGE_BUCKET_ID over env-configured bucket names
 */
export interface BucketConfig {
  bucketName: string;
  privatePrefix: string;  // e.g., ".private"
  publicPrefix: string;   // e.g., "public"
}

// Legacy bucket ID hard-coded as a fallback for historic articles whose
// images were uploaded to the old shared "sabq" Replit Object Storage bucket.
// New deployments should NOT write here — uploads always go to the bucket
// resolved by `getBucketConfig()` (which prefers the bucket extracted from
// `PRIVATE_OBJECT_DIR` / `PUBLIC_OBJECT_SEARCH_PATHS`). This constant only
// participates in read-side fallbacks via `getLegacyBucketIds()`.
const LEGACY_BUCKET_ID = 'replit-objstore-3dc2325c-bbbe-4e54-9a00-e6f10b243138';

/**
 * Return the list of bucket IDs that should be consulted as read fallbacks
 * when an object is not found in the primary (write) bucket. This always
 * includes the hard-coded `LEGACY_BUCKET_ID`, plus any
 * `DEFAULT_OBJECT_STORAGE_BUCKET_ID` value that differs from the primary
 * bucket. The latter is important for deployments where the historical
 * Replit Object Storage default still points at the old shared bucket but
 * the active uploads have been migrated to a brand-owned bucket via
 * `PRIVATE_OBJECT_DIR` / `PUBLIC_OBJECT_SEARCH_PATHS`.
 */
export function getLegacyBucketIds(): string[] {
  const primary = getBucketConfig().bucketName;
  const ids = new Set<string>();
  if (LEGACY_BUCKET_ID && LEGACY_BUCKET_ID !== primary) {
    ids.add(LEGACY_BUCKET_ID);
  }
  const explicitDefault = (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || '').trim();
  if (explicitDefault && explicitDefault !== primary) {
    ids.add(explicitDefault);
  }
  return Array.from(ids);
}

/**
 * Backwards-compatible single-bucket form of `getLegacyBucketIds()`. Returns
 * the first available legacy bucket as a fully-formed `BucketConfig`, or
 * `null` if there is no legacy bucket distinct from the primary.
 */
export function getLegacyBucketConfig(): BucketConfig | null {
  const [first] = getLegacyBucketIds();
  if (!first) return null;
  return {
    bucketName: first,
    privatePrefix: '.private',
    publicPrefix: 'public'
  };
}

// Cached bucket config to avoid repeated parsing and logging
let _cachedBucketConfig: BucketConfig | null = null;

// Helper to extract prefix from path, stripping bucket/objects segments
function _extractPrefix(path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  // Format: /objects/<bucket>/<prefix> or /<bucket>/<prefix> or just /<prefix>
  if (parts.length === 0) return null;

  // Skip 'objects' if present
  let startIdx = parts[0] === 'objects' ? 1 : 0;

  // Skip bucket name segment (non-prefix part that doesn't start with '.' or isn't a known prefix)
  if (startIdx < parts.length && !parts[startIdx].startsWith('.') && parts[startIdx] !== 'public') {
    startIdx++;
  }

  // Return remaining parts as prefix
  if (startIdx < parts.length) {
    return parts.slice(startIdx).join('/');
  }
  return null;
}

// Helper to extract the bucket segment from a bucket-prefixed path
function _extractBucketName(path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  const startIdx = parts[0] === 'objects' ? 1 : 0;
  if (startIdx < parts.length && !parts[startIdx].startsWith('.')) {
    return parts[startIdx];
  }
  return null;
}

/**
 * Resolve the active object-storage bucket configuration.
 *
 * Resolution order for `bucketName`:
 *   1. The bucket prefix on `PRIVATE_OBJECT_DIR` (this is where new private
 *      uploads physically land via `uploadFile()`).
 *   2. The bucket prefix on `PUBLIC_OBJECT_SEARCH_PATHS[0]` (where new public
 *      uploads physically land).
 *   3. `DEFAULT_OBJECT_STORAGE_BUCKET_ID` as a last-resort fallback.
 *
 * This intentionally prefers the bucket derived from `PRIVATE_OBJECT_DIR` /
 * `PUBLIC_OBJECT_SEARCH_PATHS` over `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.
 * Rationale: in the Property ME migration the legacy
 * `DEFAULT_OBJECT_STORAGE_BUCKET_ID` secret still references the shared
 * "sabq" bucket, but `PRIVATE_OBJECT_DIR` / `PUBLIC_OBJECT_SEARCH_PATHS`
 * already point at the brand-owned bucket where new uploads should live.
 * Reading from `DEFAULT_OBJECT_STORAGE_BUCKET_ID` first would mean
 * `getObjectEntityFile()` looks in the wrong place and freshly uploaded
 * images appear "missing". The legacy bucket is still consulted as a
 * read-only fallback via `getLegacyBucketIds()`.
 */
export function getBucketConfig(): BucketConfig {
  // Return cached config if available
  if (_cachedBucketConfig) {
    return _cachedBucketConfig;
  }
  const defaultBucketId = (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || '').trim();
  const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || '';
  const publicSearchPaths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';

  let bucketName: string = '';
  let privatePrefix: string = '.private';
  let publicPrefix: string = 'public';

  // Extract private prefix
  if (privateObjectDir) {
    const extracted = _extractPrefix(privateObjectDir);
    if (extracted) {
      privatePrefix = extracted;
    }
  }

  // Extract public prefix
  if (publicSearchPaths) {
    const firstPath = publicSearchPaths.split(',')[0].trim();
    const extracted = _extractPrefix(firstPath);
    if (extracted) {
      publicPrefix = extracted;
    }
  }

  // Prefer the bucket implied by where uploads actually land (PRIVATE_OBJECT_DIR
  // first, then PUBLIC_OBJECT_SEARCH_PATHS), and only fall back to
  // DEFAULT_OBJECT_STORAGE_BUCKET_ID when neither is set.
  if (privateObjectDir) {
    const extracted = _extractBucketName(privateObjectDir);
    if (extracted) bucketName = extracted;
  }
  if (!bucketName && publicSearchPaths) {
    const firstPath = publicSearchPaths.split(',')[0].trim();
    const extracted = _extractBucketName(firstPath);
    if (extracted) bucketName = extracted;
  }
  if (!bucketName && defaultBucketId) {
    bucketName = defaultBucketId;
  }

  if (!bucketName) {
    throw new Error('No object storage bucket configured. Set PRIVATE_OBJECT_DIR or PUBLIC_OBJECT_SEARCH_PATHS for the brand-owned bucket (DEFAULT_OBJECT_STORAGE_BUCKET_ID is also accepted as a last-resort fallback).');
  }

  // Log only once on first call. Surface the legacy fallback so operators
  // can confirm the migration shape at a glance.
  const legacyFallbacks = (() => {
    const ids = new Set<string>();
    if (LEGACY_BUCKET_ID && LEGACY_BUCKET_ID !== bucketName) ids.add(LEGACY_BUCKET_ID);
    if (defaultBucketId && defaultBucketId !== bucketName) ids.add(defaultBucketId);
    return Array.from(ids);
  })();
  console.log(
    `[ObjectStorage] getBucketConfig: bucket=${bucketName}, private=${privatePrefix}, ` +
    `public=${publicPrefix}, legacyFallbacks=[${legacyFallbacks.join(', ')}]`
  );

  // Cache the result for subsequent calls
  _cachedBucketConfig = {
    bucketName,
    privatePrefix,
    publicPrefix
  };

  return _cachedBucketConfig;
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    // First search in public paths (new bucket)
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    // Fallback: Also search in private directory for files that have public ACL
    // This handles legacy uploads that went to .private/uploads/ but are marked public
    try {
      const privateDir = this.getPrivateObjectDir();
      const fullPath = `${privateDir}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        // Check if this file is marked as public before serving
        const aclPolicy = await getObjectAclPolicy(file);
        if (aclPolicy?.visibility === "public") {
          return file;
        }
      }
    } catch (error) {
      // Ignore errors from private dir search - it's a fallback
    }

    // LEGACY BUCKET FALLBACK: Search in any old bucket(s) for historic articles.
    //
    // SECURITY: Only objects whose path is under the `public/` prefix, or whose
    // ACL metadata explicitly says `visibility === "public"`, may be served
    // through `/public-objects/*`. The previous implementation returned anything
    // it found under `.private/` in a legacy bucket without checking the ACL,
    // which let anyone read arbitrary historic private uploads just by
    // guessing or scraping the path.
    for (const legacyBucketId of getLegacyBucketIds()) {
      try {
        const legacyBucket = objectStorageClient.bucket(legacyBucketId);

        // Try public directory in legacy bucket — these live under the
        // `public/` prefix by convention and are safe to serve.
        const legacyPublicPath = `public/${filePath}`;
        const legacyPublicFile = legacyBucket.file(legacyPublicPath);

        const [publicExists] = await legacyPublicFile.exists();
        if (publicExists) {
          console.log(`[ObjectStorage] Found in legacy bucket "${legacyBucketId}" (public): ${maskStoragePath(filePath)}`);
          return legacyPublicFile;
        }

        // Try private directory in legacy bucket — only return it if its ACL
        // explicitly marks it as public. Anything else stays inaccessible
        // through this code path.
        const legacyPrivatePath = `.private/${filePath}`;
        const legacyPrivateFile = legacyBucket.file(legacyPrivatePath);

        const [privateExists] = await legacyPrivateFile.exists();
        if (privateExists) {
          const aclPolicy = await getObjectAclPolicy(legacyPrivateFile);
          if (aclPolicy?.visibility === "public") {
            console.log(`[ObjectStorage] Found in legacy bucket "${legacyBucketId}" (.private with public ACL): ${maskStoragePath(filePath)}`);
            return legacyPrivateFile;
          }
          // Found but not public — refuse silently.
        }
      } catch (error) {
        // Ignore errors from legacy bucket search - it's a fallback
        console.log(`[ObjectStorage] Legacy bucket search error for ${maskStoragePath(filePath)}:`, error);
      }
    }

    return null;
  }

  async downloadObject(file: File, res: Response, options?: { cacheTtlSec?: number; forcePublic?: boolean }) {
    try {
      const [metadata] = await file.getMetadata();
      // If forcePublic is true (e.g., /public-objects/ route), skip ACL check
      const isPublic = options?.forcePublic || (await getObjectAclPolicy(file))?.visibility === "public";
      
      // Determine content type with validation
      const contentType = metadata.contentType || "application/octet-stream";
      
      // Only treat as safe inline image if content type is a safe raster image type
      // SVG is excluded because it can contain embedded JavaScript (XSS risk)
      const safeImageTypes = [
        'image/webp', 'image/png', 'image/jpeg', 'image/jpg', 
        'image/gif', 'image/avif'
      ];
      const isSafeImage = safeImageTypes.includes(contentType.toLowerCase());
      const isImage = isSafeImage;
      const isWebP = contentType.toLowerCase() === "image/webp";
      
      // Cache durations:
      // - WebP images: 1 year (optimized, immutable content)
      // - Other images: 1 week
      // - Other files: 1 hour
      let defaultCacheTtl = 3600; // 1 hour default
      let useImmutable = false;
      
      if (isImage) {
        if (isWebP) {
          defaultCacheTtl = 31536000; // 1 year
          useImmutable = true;
        } else {
          defaultCacheTtl = 604800; // 1 week
        }
      }
      
      const finalCacheTtl = options?.cacheTtlSec ?? defaultCacheTtl;
      
      // CDN-optimized cache control for public content
      // s-maxage controls CDN cache, max-age controls browser cache
      // stale-while-revalidate allows serving stale content during revalidation
      const cdnMaxAge = isImage ? 86400 : 3600; // 1 day for images, 1 hour for others
      const cacheControl = isPublic 
        ? `public, max-age=${finalCacheTtl}, s-maxage=${cdnMaxAge}, stale-while-revalidate=86400${useImmutable ? ", immutable" : ""}`
        : `private, max-age=${finalCacheTtl}`;
      
      const headers: Record<string, string | number> = {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      };
      
      // Add Content-Length if available
      if (metadata.size) {
        headers["Content-Length"] = metadata.size;
      }
      
      // Add ETag for conditional requests (helps with caching validation)
      if (metadata.etag) {
        headers["ETag"] = metadata.etag;
      }
      
      // Add Vary header for content negotiation on images
      if (isImage) {
        headers["Vary"] = "Accept";
      }
      
      headers["X-Content-Type-Options"] = "nosniff";
      
      if (!isImage) {
        const fileName = file.name.split('/').pop() || 'download';
        headers["Content-Disposition"] = `attachment; filename="${fileName}"`;
      }
      
      if (contentType.toLowerCase() === 'image/svg+xml') {
        const fileName = file.name.split('/').pop() || 'download.svg';
        headers["Content-Disposition"] = `attachment; filename="${fileName}"`;
      }
      
      res.set(headers);

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async uploadFileR2(
    path: string,
    buffer: Buffer,
    contentType: string,
    visibility: "public" | "private" = "private"
  ): Promise<{ url: string; path: string }> {
    const client = getR2Client();
    const bucket = getR2Bucket();
    const prefix = visibility === "public" ? "public" : ".private";
    const key = `${prefix}/${path}`;
    
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    
    const r2PublicUrl = process.env.R2_PUBLIC_URL || `https://${bucket}.r2.dev`;
    const url = visibility === "public" ? `${r2PublicUrl}/${key}` : key;
    
    return { url, path: key };
  }

  async uploadFile(
    path: string,
    buffer: Buffer,
    contentType: string,
    visibility: "public" | "private" = "private"
  ): Promise<{ url: string; path: string }> {
    if (STORAGE_PROVIDER === 'r2') {
      return this.uploadFileR2(path, buffer, contentType, visibility);
    }

    // Use public or private directory based on visibility
    const baseDir = visibility === "public" 
      ? this.getPublicObjectSearchPaths()[0] 
      : this.getPrivateObjectDir();
    
    if (!baseDir) {
      throw new Error(
        `${visibility === "public" ? "PUBLIC_OBJECT_SEARCH_PATHS" : "PRIVATE_OBJECT_DIR"} not set. ` +
        "Create a bucket in 'Object Storage' tool and set the env var."
      );
    }

    const fullPath = `${baseDir}/${path}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(buffer, {
      metadata: {
        contentType,
      },
    });

    // For public files in the public/ directory, they're automatically accessible
    // No need to call makePublic() as Replit Object Storage doesn't allow it
    
    // Return CDN URL for better performance (Cloudflare Polish + edge caching)
    const gcsUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
    return {
      url: toCdnUrl(gcsUrl),
      path: fullPath,
    };
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    
    // Use bucket ID from environment configuration
    const config = getBucketConfig();
    const objectName = `.private/${entityId}`;
    
    // Try new bucket first
    const bucket = objectStorageClient.bucket(config.bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (exists) {
      return objectFile;
    }
    
    // LEGACY BUCKET FALLBACK: Try any old bucket(s) for historic articles
    for (const legacyBucketId of getLegacyBucketIds()) {
      const legacyBucket = objectStorageClient.bucket(legacyBucketId);
      const legacyFile = legacyBucket.file(objectName);
      const [legacyExists] = await legacyFile.exists();
      if (legacyExists) {
        console.log(`[ObjectStorage] Found in legacy bucket "${legacyBucketId}": ${maskStoragePath(objectName)}`);
        return legacyFile;
      }
    }

    throw new ObjectNotFoundError();
  }

  normalizeObjectEntityPath(rawPath: string): string {
    console.log("[ObjectStorage] normalizeObjectEntityPath - Input:", maskSignedUrl(rawPath));
    
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      console.log("[ObjectStorage] Not a GCS URL, returning as-is");
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    console.log("[ObjectStorage] URL pathname:", maskStoragePath(rawObjectPath));

    // Extract bucket name from the URL path (first segment after /)
    const pathParts = rawObjectPath.split('/').filter(p => p);
    const urlBucketName = pathParts[0] || '';
    console.log("[ObjectStorage] URL bucket name:", urlBucketName);

    // Check if this matches our configured bucket ID, the legacy bucket
    // alias used by historic article rows, or any read-fallback bucket.
    const config = getBucketConfig();
    const legacyBucketIds = getLegacyBucketIds();
    const isOurBucket =
      urlBucketName === config.bucketName ||
      urlBucketName === 'sabq-production-bucket' ||
      legacyBucketIds.includes(urlBucketName);

    if (!isOurBucket) {
      console.log("[ObjectStorage] Not our bucket:", urlBucketName, "expected:", config.bucketName);
      return rawObjectPath;
    }

    // Check if it's in the .private directory
    const remainingPath = pathParts.slice(1).join('/');
    if (!remainingPath.startsWith('.private/')) {
      console.log("[ObjectStorage] Not in .private directory, returning pathname");
      return rawObjectPath;
    }

    // Extract the entity ID (path after .private/)
    const entityId = remainingPath.slice('.private/'.length);
    const result = `/objects/${entityId}`;
    console.log("[ObjectStorage] Normalized to:", maskStoragePath(result));
    return result;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    
    // If visibility is public, move file from .private to public directory
    if (aclPolicy.visibility === "public") {
      const privateDir = this.getPrivateObjectDir();
      const publicPaths = this.getPublicObjectSearchPaths();
      const publicDir = publicPaths[0]; // Use first public path
      
      // Get the relative path (e.g., "uploads/xxx")
      // objectFile.name is like ".private/uploads/xxx", we want just "uploads/xxx"
      const relativePath = objectFile.name.replace('.private/', '');
      
      // Create new public path
      const newObjectName = `public/${relativePath}`;
      const newFile = objectStorageClient.bucket(objectFile.bucket.name).file(newObjectName);
      
      console.log("[ObjectStorage] Moving file from private to public:");
      console.log("  From:", maskStoragePath(objectFile.name));
      console.log("  To:", maskStoragePath(newObjectName));
      
      // Copy file to public location
      await objectFile.copy(newFile);
      
      // Set ACL policy in metadata
      await setObjectAclPolicy(newFile, aclPolicy);
      
      // Delete original private file
      await objectFile.delete();
      
      // Return public object path (served via /public-objects/ route)
      const publicPath = `/public-objects/${relativePath}`;
      console.log("[ObjectStorage] Returning public path:", maskStoragePath(publicPath));
      return publicPath;
    }
    
    // For private files, just set ACL
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

// Bucket alias to actual bucket name mapping
// Historic article rows and a handful of internal env vars referenced the
// legacy GCS bucket via the alias "sabq-production-bucket". We resolve that
// alias to whatever the active brand-owned bucket is so backward-compatible
// reads succeed without re-tying the new deployment to the legacy bucket name.
function getBucketAliasMap(): Record<string, string> {
  const config = getBucketConfig();
  return {
    "sabq-production-bucket": config.bucketName,
  };
}

function resolveBucketAlias(bucketAlias: string): string {
  const aliasMap = getBucketAliasMap();
  return aliasMap[bucketAlias] || bucketAlias;
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketAlias = pathParts[1];
  const bucketName = resolveBucketAlias(bucketAlias);
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response: globalThis.Response;
  try {
    response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      }
    );
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Failed to sign object URL, errorcode: 504, sidecar timeout`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
