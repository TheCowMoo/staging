import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, ultraAdminProcedure, router } from "./trpc";
import { execFile } from "child_process";
import { storagePut } from "../storage";
import { ENV } from "./env";

/**
 * Parse a MySQL DATABASE_URL into connection parameters for mysqldump.
 * Format: mysql://user:password@host:port/database
 */
function parseDatabaseUrl(url: string): { host: string; port: number; user: string; password: string; database: string } {
  const u = new URL(url);
  const auth = u.username ? { user: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : { user: "root", password: "" };
  return {
    host: u.hostname ?? "127.0.0.1",
    port: Number(u.port) || 3306,
    ...auth,
    database: u.pathname.replace(/^\//, ""),
  };
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /** Ultra Admin: dump the database and upload to S3 as a timestamped .sql file. */
  backupDatabase: ultraAdminProcedure
    .mutation(async () => {
      const dbUrl = ENV.databaseUrl;
      if (!dbUrl) {
        throw new Error("DATABASE_URL is not configured — cannot run backup");
      }

      const { host, port, user, password, database } = parseDatabaseUrl(dbUrl);

      // Run mysqldump and capture the output
      const dumpBuffer = await new Promise<Buffer>((resolve, reject) => {
        const child = execFile(
          "mysqldump",
          [
            `--host=${host}`,
            `--port=${port}`,
            `--user=${user}`,
            `--password=${password}`,
            "--single-transaction",
            "--no-tablespaces",
            "--routines",
            "--triggers",
            "--events",
            database,
          ],
          { maxBuffer: 1024 * 1024 * 1024 }, // 1 GB max buffer
          (err, stdout, stderr) => {
            if (err) {
              console.error("[backupDatabase] mysqldump error:", err.message);
              console.error("[backupDatabase] stderr:", stderr.slice(0, 500));
              reject(new Error(`mysqldump failed: ${err.message}. stderr: ${stderr.slice(0, 200)}`));
              return;
            }
            resolve(Buffer.from(stdout, "utf-8"));
          }
        );
      });

      // Upload to S3
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const key = `backups/db_${timestamp}.sql`;
      const { key: s3Key, url } = await storagePut(key, dumpBuffer, "application/sql");

      return {
        success: true,
        key: s3Key,
        url,
        size: dumpBuffer.length,
      } as const;
    }),
});
