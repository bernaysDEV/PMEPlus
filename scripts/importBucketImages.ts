#!/usr/bin/env tsx
/**
 * Import legacy site images into the Property ME object storage bucket.
 *
 * Usage:
 *   tsx scripts/importBucketImages.ts [sourceDir]
 *
 * Defaults to `/tmp/bucket-import` when `sourceDir` is omitted.
 *
 * The script walks `sourceDir` recursively and uploads every file it finds to
 * the bucket resolved from `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, preserving the
 * relative directory layout. For example, given:
 *
 *   /tmp/bucket-import/public/uploads/abcd-1234.png
 *
 * the file is uploaded to:
 *
 *   <bucket>/public/uploads/abcd-1234.png
 *
 * Per-file failures are logged and skipped — they never abort the run, since
 * most article hero images are external URLs and partial coverage is fine.
 */

import * as fs from "fs";
import * as path from "path";
import { objectStorageClient } from "../server/objectStorage";

const EXTENSION_CONTENT_TYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".json": "application/json",
  ".txt": "text/plain",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
};

function contentTypeFor(filePath: string, sample?: Buffer): string {
  const ext = path.extname(filePath).toLowerCase();
  const fromExt = EXTENSION_CONTENT_TYPE[ext];
  if (fromExt) return fromExt;

  // Fallback: sniff magic bytes for common image types so files without an
  // extension (legacy uploads were named by UUID) still get a sensible MIME.
  if (sample && sample.length >= 12) {
    if (
      sample[0] === 0x89 &&
      sample[1] === 0x50 &&
      sample[2] === 0x4e &&
      sample[3] === 0x47
    ) {
      return "image/png";
    }
    if (sample[0] === 0xff && sample[1] === 0xd8 && sample[2] === 0xff) {
      return "image/jpeg";
    }
    if (sample[0] === 0x47 && sample[1] === 0x49 && sample[2] === 0x46) {
      return "image/gif";
    }
    if (
      sample[0] === 0x52 &&
      sample[1] === 0x49 &&
      sample[2] === 0x46 &&
      sample[3] === 0x46 &&
      sample[8] === 0x57 &&
      sample[9] === 0x45 &&
      sample[10] === 0x42 &&
      sample[11] === 0x50
    ) {
      return "image/webp";
    }
    if (sample[0] === 0x25 && sample[1] === 0x50 && sample[2] === 0x44 && sample[3] === 0x46) {
      return "application/pdf";
    }
  }
  return "application/octet-stream";
}

function* walkFiles(rootDir: string): Generator<string> {
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        yield full;
      }
    }
  }
}

async function main(): Promise<void> {
  const sourceDir = path.resolve(process.argv[2] ?? "/tmp/bucket-import");
  const bucketId = (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "").trim();

  if (!bucketId) {
    throw new Error(
      "DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set. Provision an Object " +
        "Storage bucket and set the env var before running this importer.",
    );
  }

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  console.log(`[importBucketImages] sourceDir=${sourceDir}`);
  console.log(`[importBucketImages] bucket=${bucketId}`);

  const bucket = objectStorageClient.bucket(bucketId);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures: Array<{ key: string; error: string }> = [];

  for (const filePath of walkFiles(sourceDir)) {
    const relative = path.relative(sourceDir, filePath).split(path.sep).join("/");
    if (!relative || relative.startsWith("..")) {
      skipped += 1;
      continue;
    }

    const objectKey = relative;
    const contentType = contentTypeFor(filePath);

    try {
      const buffer = fs.readFileSync(filePath);
      const resolvedContentType =
        contentType === "application/octet-stream"
          ? contentTypeFor(filePath, buffer.subarray(0, 16))
          : contentType;
      const file = bucket.file(objectKey);
      await file.save(buffer, {
        resumable: false,
        metadata: { contentType: resolvedContentType },
      });
      uploaded += 1;
      console.log(
        `[importBucketImages] uploaded ${objectKey} (${buffer.length} bytes, ${resolvedContentType})`,
      );
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ key: objectKey, error: message });
      console.error(
        `[importBucketImages] FAILED ${objectKey}: ${message}`,
      );
    }
  }

  console.log("");
  console.log(
    `[importBucketImages] summary: ${JSON.stringify({ uploaded, skipped, failed })}`,
  );

  if (failures.length > 0) {
    console.log("[importBucketImages] failures:");
    for (const f of failures) {
      console.log(`  - ${f.key}: ${f.error}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[importBucketImages] fatal error:", err);
    process.exit(1);
  });
