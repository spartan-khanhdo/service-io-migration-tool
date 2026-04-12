/**
 * Rewrites S3 URLs from the old bucket to the new bucket.
 *
 * Old PHP system stores full S3 URLs like:
 *   https://brokertool-dev-private-bucket.s3.us-east-1.amazonaws.com/public/3791/image.jpg
 *
 * New Kotlin system uses a different bucket. This utility rewrites the bucket
 * domain while preserving the object key (path).
 *
 * Config via env vars:
 *   S3_OLD_BUCKET_URL=https://brokertool-dev-private-bucket.s3.us-east-1.amazonaws.com
 *   S3_NEW_BUCKET_URL=https://loanbud-dev-bucket.s3.us-east-1.amazonaws.com
 */

let oldBucketUrl: string | null = null;
let newBucketUrl: string | null = null;
let initialized = false;

function init(): void {
  if (initialized) return;
  oldBucketUrl = process.env.S3_OLD_BUCKET_URL?.replace(/\/+$/, "") || null;
  newBucketUrl = process.env.S3_NEW_BUCKET_URL?.replace(/\/+$/, "") || null;
  initialized = true;
}

/**
 * Returns true if S3 URL rewriting is configured.
 */
export function isS3RewriteEnabled(): boolean {
  init();
  return oldBucketUrl != null && newBucketUrl != null;
}

/**
 * Rewrites an S3 URL from the old bucket to the new bucket.
 * Returns the original value if:
 * - Rewriting is not configured
 * - The value is null/undefined
 * - The URL doesn't match the old bucket
 */
export function rewriteS3Url(url: string | null | undefined): string | null {
  if (url == null) return null;
  init();
  if (!oldBucketUrl || !newBucketUrl) return url;
  if (!url.startsWith(oldBucketUrl)) return url;
  return newBucketUrl + url.slice(oldBucketUrl.length);
}

/**
 * Rewrites all S3 URLs inside a JSON object (e.g. cover_image).
 * Scans all string values and rewrites any that match the old bucket URL.
 *
 * Example input:
 *   { "id": "uuid", "original": "https://old-bucket.../cover.jpg", "thumb200": "https://old-bucket.../thumb.jpg" }
 * Output:
 *   { "id": "uuid", "original": "https://new-bucket.../cover.jpg", "thumb200": "https://new-bucket.../thumb.jpg" }
 */
export function rewriteS3UrlsInJson<T>(obj: T | null | undefined): T | null {
  if (obj == null) return null;
  if (!isS3RewriteEnabled()) return obj;
  if (typeof obj !== "object") return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === "string") {
      result[key] = rewriteS3Url(value) ?? value;
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
