/**
 * BTAM Database Helpers
 * All BTAM-related query helpers. Encryption/decryption of PII fields is applied here.
 */
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  btamCases, btamSubjects, btamReferralIntake, btamWavrAssessments,
  btamManagementPlan, btamCaseNotes, btamStatusHistory,
  type InsertBtamCase, type InsertBtamSubject, type InsertBtamReferralIntake,
  type InsertBtamWavrAssessment, type InsertBtamManagementPlan,
  type InsertBtamCaseNote, type InsertBtamStatusHistory,
} from "../drizzle/schema";
import { encryptPII, decryptPII } from "./btamEncryption";

// ─── Case Number Generator ────────────────────────────────────────────────────

export async function generateCaseNumber(orgId: number): Promise<string> {
  const db = await getDb();
  if (!db) return `BTAM-${new Date().getFullYear()}-0001`;
  const year = new Date().getFullYear();
  const prefix = `BTAM-${year}-`;
  const existing = await db
    .select({ caseNumber: btamCases.caseNumber })
    .from(btamCases)
    .where(eq(btamCases.orgId, orgId))
    .orderBy(desc(btamCases.createdAt));
  let maxSeq = 0;
  for (const row of existing) {
    if (row.caseNumber.startsWith(prefix)) {
      const seq = parseInt(row.caseNumber.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export async function createBtamCase(data: InsertBtamCase) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(btamCases).values(data);
  return (result as any).insertId as number;
}

export async function getBtamCases(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(btamCases).where(eq(btamCases.orgId, orgId)).orderBy(desc(btamCases.createdAt));
}

export async function getBtamCaseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(btamCases).where(eq(btamCases.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateBtamCase(id: number, data: Partial<InsertBtamCase>) {
  const db = await getDb();
  if (!db) return;
  await db.update(btamCases).set(data).where(eq(btamCases.id, id));
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function upsertBtamSubject(data: InsertBtamSubject) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const encrypted: InsertBtamSubject = {
    ...data,
    subjectAlias: encryptPII(data.subjectAlias ?? null),
    subjectContact: encryptPII(data.subjectContact ?? null),
  };
  const existing = await db.select().from(btamSubjects).where(eq(btamSubjects.caseId, data.caseId)).limit(1);
  if (existing.length > 0) {
    await db.update(btamSubjects).set(encrypted).where(eq(btamSubjects.caseId, data.caseId));
    return existing[0].id;
  }
  const [result] = await db.insert(btamSubjects).values(encrypted);
  return (result as any).insertId as number;
}

export async function getBtamSubjectByCase(caseId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(btamSubjects).where(eq(btamSubjects.caseId, caseId)).limit(1);
  if (!rows[0]) return null;
  return {
    ...rows[0],
    subjectAlias: decryptPII(rows[0].subjectAlias),
    subjectContact: decryptPII(rows[0].subjectContact),
  };
}

// ─── Referral Intake ──────────────────────────────────────────────────────────

export async function createBtamReferralIntake(data: InsertBtamReferralIntake) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const encrypted: InsertBtamReferralIntake = {
    ...data,
    targetDescription: encryptPII(data.targetDescription ?? null),
  };
  const [result] = await db.insert(btamReferralIntake).values(encrypted);
  return (result as any).insertId as number;
}

export async function getBtamReferralIntakeByCase(caseId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(btamReferralIntake).where(eq(btamReferralIntake.caseId, caseId)).limit(1);
  if (!rows[0]) return null;
  return {
    ...rows[0],
    targetDescription: decryptPII(rows[0].targetDescription),
  };
}

// ─── WAVR Assessments ─────────────────────────────────────────────────────────

export async function createBtamAssessment(data: InsertBtamWavrAssessment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(btamWavrAssessments).values(data);
  return (result as any).insertId as number;
}

export async function getBtamAssessmentsByCase(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(btamWavrAssessments).where(eq(btamWavrAssessments.caseId, caseId)).orderBy(desc(btamWavrAssessments.assessedAt));
}

export async function getLatestBtamAssessment(caseId: number) {
  const rows = await getBtamAssessmentsByCase(caseId);
  return rows[0] ?? null;
}

// ─── Management Plan ──────────────────────────────────────────────────────────

export async function createBtamManagementPlanItem(data: InsertBtamManagementPlan) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(btamManagementPlan).values(data);
  return (result as any).insertId as number;
}

export async function getBtamManagementPlanByCase(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(btamManagementPlan).where(eq(btamManagementPlan.caseId, caseId)).orderBy(btamManagementPlan.createdAt);
}

export async function updateBtamManagementPlanItem(id: number, data: Partial<InsertBtamManagementPlan>) {
  const db = await getDb();
  if (!db) return;
  await db.update(btamManagementPlan).set(data).where(eq(btamManagementPlan.id, id));
}

export async function deleteBtamManagementPlanItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(btamManagementPlan).where(eq(btamManagementPlan.id, id));
}

// ─── Case Notes ───────────────────────────────────────────────────────────────

export async function createBtamCaseNote(data: InsertBtamCaseNote) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const encrypted: InsertBtamCaseNote = {
    ...data,
    content: encryptPII(data.content) ?? data.content,
  };
  const [result] = await db.insert(btamCaseNotes).values(encrypted);
  return (result as any).insertId as number;
}

export async function getBtamCaseNotesByCase(caseId: number, includePrivileged: boolean) {
  const db = await getDb();
  if (!db) return [];
  const rows = includePrivileged
    ? await db.select().from(btamCaseNotes).where(eq(btamCaseNotes.caseId, caseId)).orderBy(desc(btamCaseNotes.createdAt))
    : await db.select().from(btamCaseNotes).where(and(eq(btamCaseNotes.caseId, caseId), eq(btamCaseNotes.isPrivileged, false))).orderBy(desc(btamCaseNotes.createdAt));
  return rows.map((r) => ({ ...r, content: decryptPII(r.content) ?? r.content }));
}

// ─── Status History ───────────────────────────────────────────────────────────

export async function createBtamStatusHistory(data: InsertBtamStatusHistory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(btamStatusHistory).values(data);
}

export async function getBtamStatusHistoryByCase(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(btamStatusHistory).where(eq(btamStatusHistory.caseId, caseId)).orderBy(desc(btamStatusHistory.changedAt));
}

// ─── Linked Incident Lookup ────────────────────────────────────────────────────────
/** Find the BTAM case (if any) that was escalated from a given incident report ID */
export async function getBtamCaseByLinkedIncidentId(linkedIncidentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(btamCases).where(eq(btamCases.linkedIncidentId, linkedIncidentId)).limit(1);
  return rows[0] ?? null;
}
