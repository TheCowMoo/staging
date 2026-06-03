/**
 * Daily MySQL database backup to S3 with configurable retention.
 *
 * Automatically:
 *   1. Connects to the MySQL database via mysqldump (using DATABASE_URL)
 *   2. Uploads the compressed dump to S3 under db-backups/YYYY-MM-DD.sql.gz
 *   3. Deletes backups older than BACKUP_RETENTION_DAYS (default: 14)
 *
 * Can be run standalone:   tsx scripts/backup-db.ts
 * Or imported and scheduled via the server's startServer().
 */
import "dotenv/config";
import { spawn, execSync } from "child_process";
import { createGzip } from "zlib";
import { createWriteStream, unlinkSync, existsSync, mkdtempSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ─── Parse DATABASE_URL ─────────────────────────────────────────────────────
function parseDatabaseUrl(url: string) {
  const pattern = /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = url.match(pattern);
  if (!match) throw new Error("Cannot parse DATABASE_URL. Expected format: mysql://user:password@host:port/database");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4], 10),
    database: match[5],
  };
}

// ─── Get S3 Client ──────────────────────────────────────────────────────────
function getS3Client() {
  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: process.env.S3_REGION || "us-east-2",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  };
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    config.forcePathStyle = true;
  }
  return new S3Client(config);
}

// ─── Run mysqldump, compress with gzip, save to temp file ──────────────────
async function dumpDatabase(connection: ReturnType<typeof parseDatabaseUrl>): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = mkdtempSync(join(tmpdir(), "db-backup-"));
    const outPath = join(tmpDir, "dump.sql.gz");

    const mysqldump = spawn("mysqldump", [
      `--user=${connection.user}`,
      `--password=${connection.password}`,
      `--host=${connection.host}`,
      `--port=${connection.port}`,
      "--single-transaction",
      "--routines",
      "--triggers",
      "--events",
      "--quick",
      connection.database,
    ]);

    const gzip = createGzip();
    const outFile = createWriteStream(outPath);

    mysqldump.stdout.pipe(gzip).pipe(outFile);

    mysqldump.stderr.on("data", (data: Buffer) => {
      // mysqldump outputs warnings to stderr even on success
      const msg = data.toString();
      if (msg.toLowerCase().includes("error")) {
        console.error("[Backup] mysqldump error:", msg);
      }
    });

    outFile.on("finish", () => resolve(outPath));
    outFile.on("error", reject);

    mysqldump.on("error", (err) => reject(new Error(`Failed to start mysqldump: ${err.message}`)));
    mysqldump.on("exit", (code) => {
      if (code !== 0) reject(new Error(`mysqldump exited with code ${code}`));
    });

    // Timeout after 10 minutes
    setTimeout(() => reject(new Error("mysqldump timed out after 10 minutes")), 10 * 60 * 1000);
  });
}

// ─── Upload to S3 ───────────────────────────────────────────────────────────
async function uploadToS3(localPath: string, s3Key: string): Promise<void> {
  const s3BucketName = process.env.S3_BUCKET_NAME;
  if (!s3BucketName) throw new Error("S3_BUCKET_NAME is not set");

  const client = getS3Client();
  const fileBuffer = readFileSync(localPath);

  await client.send(
    new PutObjectCommand({
      Bucket: s3BucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: "application/gzip",
    })
  );
  console.log(`[Backup] Uploaded to s3://${s3BucketName}/${s3Key} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

// ─── Clean up backups older than retention days ─────────────────────────────
async function cleanupOldBackups(retentionDays: number): Promise<number> {
  const s3BucketName = process.env.S3_BUCKET_NAME;
  if (!s3BucketName) return 0;

  const client = getS3Client();
  const prefix = "db-backups/";

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: s3BucketName,
      Prefix: prefix,
    })
  );

  if (!result.Contents || result.Contents.length === 0) {
    console.log("[Backup] No existing backups found to clean up.");
    return 0;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  let deletedCount = 0;
  for (const obj of result.Contents) {
    if (!obj.Key) continue;
    // Extract date from key: db-backups/YYYY-MM-DD.sql.gz
    const dateMatch = obj.Key.match(/db-backups\/(\d{4}-\d{2}-\d{2})\.sql\.gz/);
    if (!dateMatch) continue;

    const backupDate = dateMatch[1];
    if (backupDate < cutoffStr) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: s3BucketName,
          Key: obj.Key,
        })
      );
      console.log(`[Backup] Deleted old backup: s3://${s3BucketName}/${obj.Key}`);
      deletedCount++;
    }
  }

  return deletedCount;
}

// ─── Clean up temp file ─────────────────────────────────────────────────────
function cleanupTempFile(localPath: string) {
  try {
    if (existsSync(localPath)) {
      const dir = localPath.substring(0, localPath.lastIndexOf("/"));
      unlinkSync(localPath);
      // Try to remove the temp directory
      try { execSync(`rmdir "${dir}" 2>nul || rm -rf "${dir}" 2>/dev/null`); } catch { /* ignore */ }
    }
  } catch {
    // Best effort cleanup
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
export async function runDatabaseBackup(): Promise<{ success: boolean; key?: string; deletedCount?: number; error?: string }> {
  const startTime = Date.now();
  let tempFile: string | null = null;

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.warn("[Backup] DATABASE_URL not set — skipping backup.");
      return { success: false, error: "DATABASE_URL not set" };
    }

    if (!process.env.S3_BUCKET_NAME || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      console.warn("[Backup] S3 not configured — skipping backup.");
      return { success: false, error: "S3 not configured" };
    }

    const connection = parseDatabaseUrl(dbUrl);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const s3Key = `db-backups/${today}.sql.gz`;

    console.log(`[Backup] Starting database backup to s3://${process.env.S3_BUCKET_NAME}/${s3Key}...`);

    // 1. Dump the database
    tempFile = await dumpDatabase(connection);
    console.log(`[Backup] Database dump created at ${tempFile}`);

    // 2. Upload to S3
    await uploadToS3(tempFile, s3Key);

    // 3. Clean up old backups
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || "14", 10);
    const deletedCount = await cleanupOldBackups(retentionDays);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Backup] Completed in ${elapsed}s. Uploaded: ${s3Key}. Deleted ${deletedCount} old backups.`);

    return { success: true, key: s3Key, deletedCount };
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Backup] Failed after ${elapsed}s:`, err.message);
    return { success: false, error: err.message };
  } finally {
    if (tempFile) cleanupTempFile(tempFile);
  }
}

// ─── Standalone entry point ─────────────────────────────────────────────────
// When run directly: tsx scripts/backup-db.ts
const isStandalone = process.argv[1]?.endsWith("backup-db.ts") || process.argv[1]?.endsWith("backup-db.js");
if (isStandalone) {
  runDatabaseBackup().then((result) => {
    if (result.success) {
      console.log("[Backup] ✅ Backup completed successfully.");
      process.exit(0);
    } else {
      console.error("[Backup] ❌ Backup failed:", result.error);
      process.exit(1);
    }
  });
}