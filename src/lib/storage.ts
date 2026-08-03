import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Thin adapter over S3-compatible object storage (real AWS S3 or Cloudflare
 * R2 — R2 speaks the same API, so only STORAGE_ENDPOINT differs). Kept
 * small and swappable on purpose: everything above this file works against
 * the two functions below, not against the AWS SDK directly.
 */

function getClient() {
  return new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucket() {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) throw new Error("STORAGE_BUCKET is not configured");
  return bucket;
}

export async function uploadObject(key: string, bytes: Buffer, contentType: string) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: bytes, ContentType: contentType })
  );
}

export async function getPresignedGetUrl(key: string, expiresInSeconds = 600) {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
