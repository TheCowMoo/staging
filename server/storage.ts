/**
 * Storage helpers — AWS S3 (or any S3-compatible service)
 *
 * Required environment variables:
 *   S3_BUCKET_NAME       — bucket name
 *   S3_REGION            — AWS region (default: us-east-1)
 *   S3_ACCESS_KEY_ID     — AWS access key ID
 *   S3_SECRET_ACCESS_KEY — AWS secret access key
 *   S3_ENDPOINT          — (optional) custom endpoint for S3-compatible services
 */
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Client(): S3Client {
  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: ENV.s3Region || "us-east-1",
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  };
  if (ENV.s3Endpoint) {
    config.endpoint = ENV.s3Endpoint;
    config.forcePathStyle = true;
  }
  return new S3Client(config);
}

function assertStorageConfig() {
  if (!ENV.s3BucketName || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) {
    throw new Error(
      "File storage is not configured: set S3_BUCKET_NAME, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY " +
      "in your .env file to enable file uploads and downloads."
    );
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  assertStorageConfig();
  const key = normalizeKey(relKey);
  const client = getS3Client();
  const body = typeof data === "string" ? Buffer.from(data) : data;
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3BucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3BucketName, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  assertStorageConfig();
  const key = normalizeKey(relKey);
  const client = getS3Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3BucketName, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 }
  );
  return { key, url };
}

export function storagePublicUrl(relKey: string): string {
  assertStorageConfig();
  const key = normalizeKey(relKey);
  if (ENV.s3Endpoint) {
    return `${ENV.s3Endpoint.replace(/\/+$/, "")}/${encodeURI(key)}`;
  }
  return `https://${ENV.s3BucketName}.s3.amazonaws.com/${encodeURI(key)}`;
}

/**
 * List top-level subdirectories (common prefixes) under a given prefix.
 * Returns an array of directory/prefix names (e.g. ["Active Threat Response 5_24_26", "De-escalation"]).
 */
export async function storageListDirectories(prefix: string): Promise<string[]> {
  assertStorageConfig();
  const normalizedPrefix = prefix.replace(/^\/+/, "").replace(/\/+$/, "") + "/";
  const client = getS3Client();
  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: ENV.s3BucketName,
      Prefix: normalizedPrefix,
      Delimiter: "/",
    })
  );
  return (result.CommonPrefixes ?? [])
    .map((cp) => cp.Prefix ?? "")
    .filter(Boolean)
    .map((p) => p.replace(normalizedPrefix, "").replace(/\/+$/, ""));
}

/**
 * Read a text file from S3 and return its contents as a string.
 * Returns null if the file doesn't exist or can't be read.
 */
export async function storageGetText(relKey: string): Promise<string | null> {
  assertStorageConfig();
  const key = normalizeKey(relKey);
  const client = getS3Client();
  try {
    const result = await client.send(
      new GetObjectCommand({ Bucket: ENV.s3BucketName, Key: key })
    );
    if (!result.Body) return null;
    return await result.Body.transformToString("utf-8");
  } catch (err: any) {
    if (err?.name === "NoSuchKey") return null;
    throw err;
  }
}
