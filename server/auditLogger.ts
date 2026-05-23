/**
 * Audit Logger — ISO 27001 A.12.4 / SOC 2 CC7.2
 *
 * Writes immutable log entries to the audit_logs table for every significant
 * create, update, delete, and authentication event in the platform.
 *
 * Usage:
 *   import { writeAuditLog } from "./auditLogger";
 *   await writeAuditLog(ctx, {
 *     action: "create",
 *     entityType: "facility",
 *     entityId: String(facility.id),
 *     description: `Created facility "${facility.name}"`,
 *   });
 */

import { drizzle } from "drizzle-orm/mysql2";
import { auditLogs, InsertAuditLog } from "../drizzle/schema";

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try {
    return drizzle(process.env.DATABASE_URL);
  } catch {
    return null;
  }
}

export type AuditLogAction = InsertAuditLog["action"];
export type AuditLogEntityType = string;

export interface AuditLogContext {
  userId?: number | null;
  userName?: string | null;
  orgId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogEntry {
  action: AuditLogAction;
  entityType: AuditLogEntityType;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Write a single audit log entry. Failures are silently caught so that a
 * logging error never breaks the main request flow.
 */
export async function writeAuditLog(
  ctx: AuditLogContext,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const db = getDb();
    if (!db) return;

    await db.insert(auditLogs).values({
      userId: ctx.userId ?? null,
      userName: ctx.userName ?? null,
      orgId: ctx.orgId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      description: entry.description ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  } catch (err) {
    // Never let audit logging break the main request
    console.error("[AuditLog] Failed to write log entry:", err);
  }
}

/**
 * Build an AuditLogContext from a tRPC context object.
 * Extracts userId, userName, orgId, and request headers.
 */
export function buildLogContext(
  ctx: {
    user?: { id: number; name?: string | null } | null;
    orgId?: number | null;
    req?: { ip?: string; headers?: Record<string, string | string[] | undefined> };
  }
): AuditLogContext {
  const ip =
    (ctx.req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    ctx.req?.ip ??
    null;

  const ua = ctx.req?.headers?.["user-agent"] as string | undefined ?? null;

  return {
    userId: ctx.user?.id ?? null,
    userName: ctx.user?.name ?? null,
    orgId: ctx.orgId ?? null,
    ipAddress: ip,
    userAgent: ua ? ua.substring(0, 512) : null,
  };
}
