import { eq, desc, and, or, isNull, lte, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  facilities, InsertFacility,
  audits, InsertAudit,
  auditResponses, InsertAuditResponse,
  threatFindings, InsertThreatFinding,
  auditPhotos, InsertAuditPhoto,
  testerFeedback, InsertTesterFeedback,
  questionFlags, InsertQuestionFlag,
  incidentReports, InsertIncidentReport,
  facilityAttachments, InsertFacilityAttachment,
  correctiveActionChecks, InsertCorrectiveActionCheck,
  organizations, InsertOrganization,
  orgMembers, InsertOrgMember,
  orgInvites, InsertOrgInvite,
  userInvites, InsertUserInvite,
  personnelLocations, InsertPersonnelLocation,
  auditLogs,
  visitorLogs, InsertVisitorLog,
  eapSections, InsertEapSection,
  eapSectionVersions, InsertEapSectionVersion,
  flaggedVisitors,
  liabilityScans, InsertLiabilityScan,
  scanShareTokens, InsertScanShareToken,
  drillTemplates, InsertDrillTemplate,
  drillSessions, InsertDrillSession,
  drillParticipants, InsertDrillParticipant,
  staffCheckins, InsertStaffCheckin,
  apiKeys, InsertApiKey,
  trainingModules, InsertTrainingModule,
  microDrillAssignments, InsertMicroDrillAssignment,
  facilityFloorMaps, InsertFacilityFloorMap,
  alertEvents,
  pushSubscriptions,
  alertRecipients,
  alertStatusUpdates,
  facilityAlertSettings,
  notifications,
  btamManagementPlan,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "passwordHash", "passwordSalt"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ─── API Keys ──────────────────────────────────────────────────────────────
export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(apiKeys).values(data);
}

export async function getApiKeyByHash(hash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
  return result[0];
}

export async function getApiKeyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  return result[0];
}

export async function touchApiKeyLastUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}

export async function listApiKeysByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function revokeApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
}

// ─── Facilities ───────────────────────────────────────────────────────────────
export async function createFacility(data: InsertFacility) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const now = new Date();
  const [result] = await db.insert(facilities).values({ ...data, createdAt: now, updatedAt: now });
  const id = Number(result.insertId);
  if (!id || isNaN(id)) {
    throw new Error("Invalid insertId after facility insert");
  }
  return getFacilityById(id);
}

export async function getFacilitiesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(facilities).where(eq(facilities.userId, userId)).orderBy(desc(facilities.createdAt));
}

export async function getFacilityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(facilities).where(eq(facilities.id, id)).limit(1);
  return result[0];
}

export async function updateFacility(id: number, data: Partial<InsertFacility>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(facilities).set(data).where(eq(facilities.id, id));
}

export async function duplicateFacility(id: number, newUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const source = await getFacilityById(id);
  if (!source) throw new Error("Facility not found");
  const now = new Date();
  const [result] = await db.insert(facilities).values({
    userId: newUserId,
    orgId: source.orgId,
    name: `${source.name} (Copy)`,
    facilityType: source.facilityType,
    address: source.address,
    city: source.city,
    state: source.state,
    jurisdiction: source.jurisdiction,
    latitude: source.latitude,
    longitude: source.longitude,
    squareFootage: source.squareFootage,
    floors: source.floors,
    maxOccupancy: source.maxOccupancy,
    operatingHours: source.operatingHours,
    eveningOperations: source.eveningOperations,
    multiTenant: source.multiTenant,
    publicAccessWithoutScreening: source.publicAccessWithoutScreening,
    publicEntrances: source.publicEntrances,
    staffEntrances: source.staffEntrances,
    hasAlleyways: source.hasAlleyways,
    hasConcealedAreas: source.hasConcealedAreas,
    usedAfterDark: source.usedAfterDark,
    multiSite: source.multiSite,
    emergencyCoordinator: source.emergencyCoordinator,
    emergencyRoles: source.emergencyRoles,
    aedOnSite: source.aedOnSite,
    aedLocations: source.aedLocations,
    notes: source.notes,
    createdAt: now,
    updatedAt: now,
  });
  const newId = result.insertId;
  return getFacilityById(newId);
}

export async function deleteFacility(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Cascade delete all audits for this facility
  const auditsForFacility = await db.select({ id: audits.id }).from(audits).where(eq(audits.facilityId, id));
  for (const audit of auditsForFacility) {
    await deleteAudit(audit.id);
  }

  // Delete incident reports linked to this facility
  await db.delete(incidentReports).where(eq(incidentReports.facilityId, id));

  // Delete facility attachments not tied to a specific audit
  await db.delete(facilityAttachments).where(
    and(eq(facilityAttachments.facilityId, id), isNull(facilityAttachments.auditId))
  );

  // Delete floor maps for this facility
  await db.delete(facilityFloorMaps).where(eq(facilityFloorMaps.facilityId, id));

  // Delete related entities
  await db.delete(liabilityScans).where(eq(liabilityScans.facilityId, id));
  await db.delete(drillSessions).where(eq(drillSessions.facilityId, id));
  await db.delete(drillTemplates).where(eq(drillTemplates.facilityId, id));
  await db.delete(staffCheckins).where(eq(staffCheckins.facilityId, id));
  await db.delete(alertEvents).where(eq(alertEvents.facilityId, id));

  // Delete facility-level audit logs
  await db.delete(auditLogs).where(
    and(eq(auditLogs.entityType, "facility"), eq(auditLogs.entityId, String(id)))
  );

  // Finally delete the facility itself
  await db.delete(facilities).where(eq(facilities.id, id));
}

// ─── Audits ───────────────────────────────────────────────────────────────────
export async function createAudit(data: InsertAudit) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(audits).values(data);
  return getAuditById(result.insertId);
}

export async function duplicateAuditResponses(sourceAuditId: number, targetAuditId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const sourceResponses = await getResponsesByAudit(sourceAuditId);
  for (const r of sourceResponses) {
    await db.insert(auditResponses).values({
      auditId: targetAuditId,
      categoryName: r.categoryName,
      questionId: r.questionId,
      questionText: r.questionText,
      primaryResponse: r.primaryResponse,
      concernLevel: r.concernLevel,
      response: r.response,
      conditionType: r.conditionType,
      conditionTypes: r.conditionTypes,
      isUnavoidable: r.isUnavoidable,
      score: r.score,
      notes: r.notes,
      recommendedActionNotes: r.recommendedActionNotes,
      remediationTimeline: r.remediationTimeline,
      followUpResponse: r.followUpResponse,
      photoUrls: r.photoUrls,
      addToEap: (r as any).addToEap,
    });
  }
}

export async function getAuditsByFacility(facilityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(audits).where(eq(audits.facilityId, facilityId)).orderBy(desc(audits.createdAt));
}

export async function getAuditsByUser(auditorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(audits).where(eq(audits.auditorId, auditorId)).orderBy(desc(audits.createdAt));
}

export async function getAuditById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  return result[0];
}

export async function updateAudit(id: number, data: Partial<InsertAudit>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(audits).set(data).where(eq(audits.id, id));
}

export async function deleteAudit(auditId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Cascade-delete all related data
  await deleteResponsesByAudit(auditId);
  await deleteThreatFindingsByAudit(auditId);
  await db.delete(auditPhotos).where(eq(auditPhotos.auditId, auditId));
  await db.delete(testerFeedback).where(eq(testerFeedback.auditId, auditId));
  await db.delete(questionFlags).where(eq(questionFlags.auditId, auditId));
  await db.delete(correctiveActionChecks).where(eq(correctiveActionChecks.auditId, auditId));
  await db.delete(eapSections).where(eq(eapSections.auditId, auditId));
  await db.delete(eapSectionVersions).where(eq(eapSectionVersions.auditId, auditId));
  await db.delete(facilityAttachments).where(eq(facilityAttachments.auditId, auditId));
  await db.delete(auditLogs).where(
    and(eq(auditLogs.entityType, "audit"), eq(auditLogs.entityId, String(auditId)))
  );

  // Finally delete the audit record itself
  await db.delete(audits).where(eq(audits.id, auditId));
}

// ─── Audit Responses ──────────────────────────────────────────────────────────
export async function upsertAuditResponse(data: InsertAuditResponse) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Check if response already exists for this audit + questionId
  const existing = await db
    .select()
    .from(auditResponses)
    .where(and(eq(auditResponses.auditId, data.auditId), eq(auditResponses.questionId, data.questionId)))
    .limit(1);

  if (existing[0]) {
    return db.update(auditResponses).set(data).where(eq(auditResponses.id, existing[0].id));
  }
  return db.insert(auditResponses).values(data);
}

export async function getResponsesByAudit(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditResponses).where(eq(auditResponses.auditId, auditId));
}

export async function deleteResponsesByAudit(auditId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(auditResponses).where(eq(auditResponses.auditId, auditId));
}

// ─── Threat Findings ──────────────────────────────────────────────────────────
export async function createThreatFinding(data: InsertThreatFinding) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(threatFindings).values(data);
}

export async function getThreatFindingsByAudit(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(threatFindings).where(eq(threatFindings.auditId, auditId)).orderBy(desc(threatFindings.finalScore));
}

export async function deleteThreatFindingsByAudit(auditId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(threatFindings).where(eq(threatFindings.auditId, auditId));
}

// ─── Audit Photos ─────────────────────────────────────────────────────────────
export async function createAuditPhoto(data: InsertAuditPhoto) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(auditPhotos).values(data);
}

export async function getPhotosByAudit(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditPhotos).where(eq(auditPhotos.auditId, auditId));
}

export async function getPhotoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(auditPhotos).where(eq(auditPhotos.id, id)).limit(1);
  return result[0];
}

export async function deletePhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(auditPhotos).where(eq(auditPhotos.id, id));
}

// ─── Tester Feedback ───────────────────────────────────────────────────────────
export async function createTesterFeedback(data: InsertTesterFeedback) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(testerFeedback).values(data);
}

export async function getAllTesterFeedback() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(testerFeedback).orderBy(testerFeedback.createdAt);
}

export async function getFeedbackByAudit(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(testerFeedback).where(eq(testerFeedback.auditId, auditId));
}

export async function getFeedbackByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(testerFeedback).where(eq(testerFeedback.userId, userId));
}

// ─── Question Flags ───────────────────────────────────────────────────────────
export async function createQuestionFlag(data: InsertQuestionFlag) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.insert(questionFlags).values(data);
}

export async function getAllQuestionFlags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questionFlags).orderBy(questionFlags.createdAt);
}

export async function getQuestionFlagsByAudit(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questionFlags).where(eq(questionFlags.auditId, auditId));
}

// ─── Incident Reports ─────────────────────────────────────────────────────────
export async function createIncidentReport(data: InsertIncidentReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(incidentReports).values(data);
  return result;
}

export async function getIncidentReports(facilityId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (facilityId) {
    return db.select().from(incidentReports).where(eq(incidentReports.facilityId, facilityId)).orderBy(desc(incidentReports.createdAt));
  }
  return db.select().from(incidentReports).orderBy(desc(incidentReports.createdAt));
}

export async function getIncidentReportByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(incidentReports).where(eq(incidentReports.trackingToken, token)).limit(1);
  return result[0];
}
export async function getIncidentReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(incidentReports).where(eq(incidentReports.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updateIncidentReportStatus(
  id: number,
  status: "new" | "under_review" | "resolved" | "referred",
  adminNotes: string | null,
  reviewedBy: number,
  referredTo?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(incidentReports)
    .set({ status, adminNotes, reviewedBy, reviewedAt: new Date(), referredTo })
    .where(eq(incidentReports.id, id));
}

export async function updateIncidentThreatFlags(
  id: number,
  threatFlagsJson: string,
  maxThreatSeverity: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(incidentReports)
    .set({ threatFlags: threatFlagsJson, maxThreatSeverity: maxThreatSeverity ?? undefined })
    .where(eq(incidentReports.id, id));
}

/**
 * Find existing incidents with the same incidentType (and optionally same facility)
 * submitted in the last 12 months — used for repeat-pattern detection.
 */
export async function findSimilarIncidents(
  incidentType: string,
  facilityId?: number,
  excludeId?: number,
  orgId?: number
) {
  const db = await getDb();
  if (!db) return [];
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const rows = await db
    .select()
    .from(incidentReports)
    .where(
      and(
        eq(incidentReports.incidentType, incidentType as any),
        gte(incidentReports.createdAt, twelveMonthsAgo),
        orgId ? eq(incidentReports.orgId, orgId) : undefined
      )
    )
    .orderBy(desc(incidentReports.createdAt));
  return rows.filter((r) => r.id !== excludeId && (!facilityId || r.facilityId === facilityId));
}

/**
 * Find existing incidents involving the same named person (case-insensitive)
 * submitted in the last 12 months.
 */
export async function findIncidentsByPerson(
  personName: string,
  excludeId?: number,
  orgId?: number
) {
  const db = await getDb();
  if (!db) return [];
  if (!personName.trim()) return [];
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const rows = await db
    .select()
    .from(incidentReports)
    .where(
      and(
        gte(incidentReports.createdAt, twelveMonthsAgo),
        orgId ? eq(incidentReports.orgId, orgId) : undefined
      )
    )
    .orderBy(desc(incidentReports.createdAt));
  const normalized = personName.trim().toLowerCase();
  return rows.filter(
    (r) =>
      r.id !== excludeId &&
      r.involvedPersonName &&
      r.involvedPersonName.trim().toLowerCase() === normalized
  );
}

/** Mark a report as part of a repeat pattern */
export async function markAsRepeatIncident(
  id: number,
  repeatGroupId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(incidentReports)
    .set({ isRepeatIncident: true, repeatGroupId })
    .where(eq(incidentReports.id, id));
}

export async function deleteAllIncidentReports() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(incidentReports);
}

export async function deleteIncidentReport(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(incidentReports).where(eq(incidentReports.id, id));
  return (result as any)?.[0]?.affectedRows > 0;
}

// ─── Facility Attachments ─────────────────────────────────────────────────────
export async function createFacilityAttachment(data: InsertFacilityAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(facilityAttachments).values(data);
  return result[0];
}
export async function getFacilityAttachments(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(facilityAttachments)
    .where(eq(facilityAttachments.auditId, auditId))
    .orderBy(desc(facilityAttachments.createdAt));
}

export async function getFacilityAttachmentsByFacility(facilityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(facilityAttachments)
    .where(eq(facilityAttachments.facilityId, facilityId))
    .orderBy(desc(facilityAttachments.createdAt));
}
export async function getFacilityAttachmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(facilityAttachments).where(eq(facilityAttachments.id, id)).limit(1);
  return result[0];
}
export async function updateAttachmentAnalysis(id: number, aiAnalysis: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(facilityAttachments)
    .set({ aiAnalysis, aiAnalyzedAt: new Date() })
    .where(eq(facilityAttachments.id, id));
}
export async function deleteFacilityAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(facilityAttachments).where(eq(facilityAttachments.id, id));
}

// ─── Corrective Action Checks ─────────────────────────────────────────────────
export async function getCorrectiveActionChecks(auditId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(correctiveActionChecks).where(eq(correctiveActionChecks.auditId, auditId));
}
export async function toggleCorrectiveActionCheck(
  auditId: number,
  questionId: string,
  userId: number,
  notes?: string
): Promise<{ checked: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(correctiveActionChecks)
    .where(and(eq(correctiveActionChecks.auditId, auditId), eq(correctiveActionChecks.questionId, questionId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(correctiveActionChecks)
      .where(and(eq(correctiveActionChecks.auditId, auditId), eq(correctiveActionChecks.questionId, questionId)));
    return { checked: false };
  } else {
    await db.insert(correctiveActionChecks).values({ auditId, questionId, completedBy: userId, notes });
    return { checked: true };
  }
}

// ─── Organization Helpers ─────────────────────────────────────────────────────

export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(organizations).values(data);
  const result = await db.select().from(organizations).where(eq(organizations.slug, data.slug)).limit(1);
  return result[0];
}

export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(organizations.name);
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0];
}

export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return result[0];
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(organizations).set(data).where(eq(organizations.id, id));
}

export async function deleteOrganization(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(organizations).where(eq(organizations.id, id));
}

// ─── Org Members ──────────────────────────────────────────────────────────────
export async function getOrgMembersForOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: orgMembers.id,
    orgId: orgMembers.orgId,
    userId: orgMembers.userId,
    role: orgMembers.role,
    invitedAt: orgMembers.invitedAt,
    joinedAt: orgMembers.joinedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(orgMembers)
    .leftJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId));
}

export async function getOrgMembersWithLocations(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: orgMembers.id,
    orgId: orgMembers.orgId,
    userId: orgMembers.userId,
    role: orgMembers.role,
    invitedAt: orgMembers.invitedAt,
    joinedAt: orgMembers.joinedAt,
    userName: users.name,
    userEmail: users.email,
    locationLatitude: personnelLocations.latitude,
    locationLongitude: personnelLocations.longitude,
    locationStatus: personnelLocations.status,
    locationUpdatedAt: personnelLocations.updatedAt,
  })
    .from(orgMembers)
    .leftJoin(users, eq(orgMembers.userId, users.id))
    .leftJoin(
      personnelLocations,
      and(
        eq(orgMembers.userId, personnelLocations.userId),
        eq(orgMembers.orgId, personnelLocations.orgId),
      ),
    )
    .where(eq(orgMembers.orgId, orgId));
}

export async function upsertPersonnelLocation(data: InsertPersonnelLocation) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(personnelLocations)
    .where(and(eq(personnelLocations.orgId, data.orgId), eq(personnelLocations.userId, data.userId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(personnelLocations)
      .set({
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status ?? "Active",
        updatedAt: new Date(),
      })
      .where(eq(personnelLocations.id, existing[0].id));
    return;
  }

  await db.insert(personnelLocations).values({
    orgId: data.orgId,
    userId: data.userId,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status ?? "Active",
  });
}

export async function getOrgMembershipForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: orgMembers.id,
    orgId: orgMembers.orgId,
    userId: orgMembers.userId,
    role: orgMembers.role,
    joinedAt: orgMembers.joinedAt,
    orgName: organizations.name,
    orgSlug: organizations.slug,
    orgLogoUrl: organizations.logoUrl,
  })
    .from(orgMembers)
    .leftJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId));
}

export async function getOrgMemberRecord(orgId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
    .limit(1);
  return result[0];
}

export async function addOrgMember(data: InsertOrgMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(orgMembers).values(data);
}

export async function updateOrgMemberRole(orgId: number, userId: number, role: "super_admin" | "admin" | "auditor" | "user" | "viewer" | "sandbox") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orgMembers).set({ role }).where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
}

export async function removeOrgMember(orgId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(orgMembers).where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
}

// ─── Org Invites ──────────────────────────────────────────────────────────────
export async function createOrgInvite(data: InsertOrgInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(orgInvites).values(data);
}

export async function getOrgInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orgInvites).where(eq(orgInvites.token, token)).limit(1);
  return result[0];
}

export async function getPendingInvitesForOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orgInvites)
    .where(and(eq(orgInvites.orgId, orgId), isNull(orgInvites.usedAt)));
}

export async function markInviteUsed(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orgInvites).set({ usedAt: new Date() }).where(eq(orgInvites.token, token));
}

export async function deleteOrgInvite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(orgInvites).where(eq(orgInvites.id, id));
}

// ─── Org-scoped facility/incident queries ────────────────────────────────────
export async function getFacilitiesByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(facilities).where(eq(facilities.orgId, orgId)).orderBy(facilities.name);
}

export async function getIncidentReportsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(incidentReports)
    .where(eq(incidentReports.orgId, orgId))
    .orderBy(desc(incidentReports.createdAt));
}

// ─── Audit Log Queries (ISO 27001 A.12.4 / SOC 2 CC7.2) ─────────────────────
export async function getAuditLogsByOrg(orgId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs)
    .where(eq(auditLogs.orgId, orgId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getAllAuditLogs(limit = 500) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ─── Visitor Logs ─────────────────────────────────────────────────────────────
export async function createVisitorLog(data: InsertVisitorLog) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(visitorLogs).values(data);
  return result;
}

export async function getVisitorLogs(loggedByUserId: number, facilityId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(visitorLogs)
    .orderBy(desc(visitorLogs.timeIn));
  // Filter by user; optionally also by facility
  return rows.filter((r) =>
    r.loggedByUserId === loggedByUserId &&
    (facilityId == null || r.facilityId === facilityId)
  );
}

export async function checkOutVisitor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(visitorLogs)
    .set({ timeOut: new Date() })
    .where(eq(visitorLogs.id, id));
}

export async function updateVisitorLog(id: number, data: Partial<InsertVisitorLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(visitorLogs).set(data).where(eq(visitorLogs.id, id));
}

export async function deleteVisitorLog(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(visitorLogs).where(eq(visitorLogs.id, id));
}

// ─── EAP Section Helpers ──────────────────────────────────────────────────────
export async function getEapSectionsByAudit(auditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(eapSections).where(eq(eapSections.auditId, auditId));
}

export async function upsertEapSection(data: {
  auditId: number;
  sectionId: string;
  sectionTitle: string;
  contentOverride?: string | null;
  reviewed?: boolean;
  applicable?: boolean;
  auditorNotes?: string | null;
  auditorRecommendations?: unknown;
  lastEditedByUserId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  // Check if a row already exists
  const existing = await db.select({ id: eapSections.id })
    .from(eapSections)
    .where(and(eq(eapSections.auditId, data.auditId), eq(eapSections.sectionId, data.sectionId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(eapSections)
      .set({
        sectionTitle: data.sectionTitle,
        contentOverride: data.contentOverride ?? null,
        reviewed: data.reviewed ?? false,
        applicable: data.applicable ?? true,
        auditorNotes: data.auditorNotes ?? null,
        auditorRecommendations: data.auditorRecommendations as any ?? null,
        lastEditedByUserId: data.lastEditedByUserId,
      })
      .where(and(eq(eapSections.auditId, data.auditId), eq(eapSections.sectionId, data.sectionId)));
    return existing[0].id;
  } else {
    const result = await db.insert(eapSections).values({
      auditId: data.auditId,
      sectionId: data.sectionId,
      sectionTitle: data.sectionTitle,
      contentOverride: data.contentOverride ?? null,
      reviewed: data.reviewed ?? false,
      applicable: data.applicable ?? true,
      auditorNotes: data.auditorNotes ?? null,
      auditorRecommendations: data.auditorRecommendations as any ?? null,
      lastEditedByUserId: data.lastEditedByUserId,
    });
    return (result as any).insertId as number;
  }
}

export async function saveEapSectionVersion(data: InsertEapSectionVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(eapSectionVersions).values(data);
}

export async function getEapSectionVersions(auditId: number, sectionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(eapSectionVersions)
    .where(and(eq(eapSectionVersions.auditId, auditId), eq(eapSectionVersions.sectionId, sectionId)))
    .orderBy(desc(eapSectionVersions.savedAt));
}

// ─── Platform User Management (Admin only) ────────────────────────────────────
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    rasRole: users.rasRole,
    btamRole: users.btamRole,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    impersonatingUserId: users.impersonatingUserId,
  }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function updateUserRole(
  userId: number,
  role: "ultra_admin" | "admin" | "super_admin" | "auditor" | "viewer" | "user" | "sandbox"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Safe delete helper ───────────────────────────────────────────────────────
/**
 * Runs a DB operation but tolerates a missing table (schema drift).
 * MySQL error code 1146 (ER_NO_SUCH_TABLE) is swallowed so a table that was
 * never migrated on an older DB doesn't abort the whole user deletion.
 * All other errors are rethrown.
 */
async function safeDelete<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    const cause = err?.cause ?? err;
    const msg = String(cause?.message ?? cause?.sqlMessage ?? cause ?? "");
    const code = String(cause?.code ?? cause?.errno ?? "");
    if (
      code === "ER_NO_SUCH_TABLE" || code === "1146" ||
      /doesn'?t exist|does not exist|no such table/i.test(msg)
    ) {
      console.warn("[deleteUser] Skipping missing table:", msg);
      return null;
    }
    throw err;
  }
}

// ─── Delete User (hard delete + cleanup) ──────────────────────────────────────
/**
 * Permanently deletes a user and cleans up all related records.
 *
 * - Owned/assigned rows are deleted (org memberships, push subscriptions, api
 *   keys, personnel locations, micro-drill assignments, scans, drills, training,
 *   floor maps, notifications, alert recipients/updates, visitor logs, flagged
 *   visitors, feedback, question flags, user invites, attachments).
 * - Nullable references are detached (impersonation flags, audit logs, EAP edit
 *   history, BTAM responsible-party).
 * - Facilities owned by the user (and their audits + audit children) are either
 *   reassigned to `reassignToUserId` (when provided) or cascade-deleted.
 * - Alert events created by the user are removed together with their recipient
 *   and status-update rows.
 *
 * Note: BTAM cases created by the user are left in place (org-level records);
 * only `btam_management_plan.responsibleParty` is detached.
 */
export async function deleteUser(
  userId: number,
  reassignToUserId?: number
): Promise<{ facilitiesDeleted: number; auditsDeleted: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1) Delete owned / assigned personal rows
  await safeDelete(() => db.delete(orgMembers).where(eq(orgMembers.userId, userId)));
  await safeDelete(() => db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)));
  await safeDelete(() => db.delete(apiKeys).where(eq(apiKeys.userId, userId)));
  await safeDelete(() => db.delete(personnelLocations).where(eq(personnelLocations.userId, userId)));
  await safeDelete(() => db.delete(microDrillAssignments).where(or(
    eq(microDrillAssignments.assignedByUserId, userId),
    eq(microDrillAssignments.assignedToUserId, userId),
  )));
  await safeDelete(() => db.delete(staffCheckins).where(eq(staffCheckins.recordedByUserId, userId)));
  await safeDelete(() => db.delete(liabilityScans).where(eq(liabilityScans.userId, userId)));
  await safeDelete(() => db.delete(scanShareTokens).where(eq(scanShareTokens.createdByUserId, userId)));
  await safeDelete(() => db.delete(drillSessions).where(eq(drillSessions.scheduledByUserId, userId)));
  await safeDelete(() => db.delete(drillTemplates).where(eq(drillTemplates.createdByUserId, userId)));
  await safeDelete(() => db.delete(trainingModules).where(eq(trainingModules.createdByUserId, userId)));
  await safeDelete(() => db.delete(facilityFloorMaps).where(eq(facilityFloorMaps.createdByUserId, userId)));
  await safeDelete(() => db.delete(notifications).where(eq(notifications.userId, userId)));
  await safeDelete(() => db.delete(alertRecipients).where(eq(alertRecipients.userId, userId)));
  await safeDelete(() => db.delete(alertStatusUpdates).where(eq(alertStatusUpdates.createdByUserId, userId)));
  await safeDelete(() => db.delete(visitorLogs).where(eq(visitorLogs.loggedByUserId, userId)));
  await safeDelete(() => db.delete(flaggedVisitors).where(eq(flaggedVisitors.addedByUserId, userId)));
  await safeDelete(() => db.delete(testerFeedback).where(eq(testerFeedback.userId, userId)));
  await safeDelete(() => db.delete(questionFlags).where(eq(questionFlags.userId, userId)));
  await safeDelete(() => db.delete(userInvites).where(eq(userInvites.invitedByUserId, userId)));
  await safeDelete(() => db.delete(facilityAttachments).where(eq(facilityAttachments.uploadedBy, userId)));

  // 2) Detach nullable references
  await safeDelete(() => db.update(users).set({ impersonatingUserId: null }).where(eq(users.impersonatingUserId, userId)));
  await safeDelete(() => db.update(auditLogs).set({ userId: null }).where(eq(auditLogs.userId, userId)));
  await safeDelete(() => db.update(eapSections).set({ lastEditedByUserId: null }).where(eq(eapSections.lastEditedByUserId, userId)));
  await safeDelete(() => db.update(eapSectionVersions).set({ savedByUserId: null }).where(eq(eapSectionVersions.savedByUserId, userId)));
  await safeDelete(() => db.update(btamManagementPlan).set({ responsibleParty: null }).where(eq(btamManagementPlan.responsibleParty, userId)));

  // 3) Facilities + audits
  const userFacilities = await db.select({ id: facilities.id }).from(facilities).where(eq(facilities.userId, userId));
  const facilityIds = userFacilities.map((f) => f.id);
  let facilitiesDeleted = 0;
  let auditsDeleted = 0;

  if (reassignToUserId && reassignToUserId !== userId) {
    for (const f of userFacilities) {
      await safeDelete(() => db.update(facilities).set({ userId: reassignToUserId }).where(eq(facilities.id, f.id)));
    }
    await safeDelete(() => db.update(audits).set({ auditorId: reassignToUserId }).where(eq(audits.auditorId, userId)));
  } else {
    // Audit ids: audits of the user's facilities + audits they performed directly
    const auditIds: number[] = [];
    if (facilityIds.length > 0) {
      const linked = await db.select({ id: audits.id }).from(audits).where(inArray(audits.facilityId, facilityIds));
      auditIds.push(...linked.map((a) => a.id));
    }
    const performed = await db.select({ id: audits.id }).from(audits).where(eq(audits.auditorId, userId));
    for (const a of performed) {
      if (!auditIds.includes(a.id)) auditIds.push(a.id);
    }

    if (auditIds.length > 0) {
      await safeDelete(() => db.delete(auditResponses).where(inArray(auditResponses.auditId, auditIds)));
      await safeDelete(() => db.delete(threatFindings).where(inArray(threatFindings.auditId, auditIds)));
      await safeDelete(() => db.delete(auditPhotos).where(inArray(auditPhotos.auditId, auditIds)));
      await safeDelete(() => db.delete(correctiveActionChecks).where(inArray(correctiveActionChecks.auditId, auditIds)));
      await safeDelete(() => db.delete(eapSectionVersions).where(inArray(eapSectionVersions.auditId, auditIds)));
      await safeDelete(() => db.delete(eapSections).where(inArray(eapSections.auditId, auditIds)));
      await safeDelete(() => db.delete(facilityAttachments).where(inArray(facilityAttachments.auditId, auditIds)));
      await safeDelete(() => db.delete(audits).where(inArray(audits.id, auditIds)));
      auditsDeleted = auditIds.length;
    }

    if (facilityIds.length > 0) {
      await safeDelete(() => db.delete(facilityAlertSettings).where(inArray(facilityAlertSettings.facilityId, facilityIds)));
      await safeDelete(() => db.delete(facilityFloorMaps).where(inArray(facilityFloorMaps.facilityId, facilityIds)));
      await safeDelete(() => db.delete(facilities).where(inArray(facilities.id, facilityIds)));
      facilitiesDeleted = facilityIds.length;
    }
  }

  // 4) Alert events created by this user (with their recipients/updates)
  const userAlertEvents = await db.select({ id: alertEvents.id }).from(alertEvents).where(eq(alertEvents.createdByUserId, userId));
  const alertEventIds = userAlertEvents.map((e) => e.id);
  if (alertEventIds.length > 0) {
    await safeDelete(() => db.delete(alertRecipients).where(inArray(alertRecipients.alertEventId, alertEventIds)));
    await safeDelete(() => db.delete(alertStatusUpdates).where(inArray(alertStatusUpdates.alertEventId, alertEventIds)));
    await safeDelete(() => db.delete(alertEvents).where(inArray(alertEvents.id, alertEventIds)));
  }

  // 5) Delete the user
  await db.delete(users).where(eq(users.id, userId));

  return { facilitiesDeleted, auditsDeleted };
}

// ─── Org Member Permission Flags ─────────────────────────────────────────────
export async function updateOrgMemberPermissionFlags(
  orgId: number,
  userId: number,
  flags: {
    canTriggerAlerts?: boolean;
    canRunDrills?: boolean;
    canExportReports?: boolean;
    canViewIncidentLogs?: boolean;
    canSubmitAnonymousReports?: boolean;
    canAccessEap?: boolean;
    canManageSiteAssessments?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(orgMembers)
    .set(flags)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
}

export async function getOrgMemberWithFlags(orgId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [member] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
    .limit(1);
  return member ?? null;
}

// ─── Liability Scans ─────────────────────────────────────────────────────────
// Storage: All scan results are persisted in the MySQL DB (liability_scans table).
// S3 MIGRATION NOTE: When migrating to S3, add a `storageKey` column to the
// liability_scans table and call storagePut() after the DB insert to write a
// JSON snapshot of the full scan result to S3. The DB row can then store only
// index fields (score, classification, userId, createdAt) and the S3 key.
// Use storageGet() in getLiabilityScanById() to hydrate the full result from S3.
//
export async function insertLiabilityScan(data: InsertLiabilityScan): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(liabilityScans).values(data);
  // mysql2 returns insertId on the result
  return (result as unknown as { insertId: number }[])[0]?.insertId ?? null;
}

export async function getLiabilityScanById(id: number): Promise<typeof liabilityScans.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(liabilityScans).where(eq(liabilityScans.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateLiabilityScanTierScores(
  scanId: number,
  scorePercent: number,
  defensibilityStatus: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(liabilityScans)
    .set({ scorePercent, defensibilityStatus })
    .where(eq(liabilityScans.id, scanId));
}
export async function getLiabilityScansForUser(userId: number): Promise<(typeof liabilityScans.$inferSelect)[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(liabilityScans)
    .where(eq(liabilityScans.userId, userId))
    .orderBy(desc(liabilityScans.createdAt));
}

export async function deleteLiabilityScan(scanId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(liabilityScans)
    .where(and(eq(liabilityScans.id, scanId), eq(liabilityScans.userId, userId)));
  return result[0]?.affectedRows > 0;
}

// ─── Scan Share Tokens ────────────────────────────────────────────────────────
export async function insertScanShareToken(data: InsertScanShareToken): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(scanShareTokens).values(data);
}

export async function getScanShareToken(token: string): Promise<typeof scanShareTokens.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(scanShareTokens)
    .where(eq(scanShareTokens.token, token))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Flagged Visitors (Watchlist) ─────────────────────────────────────────────
export async function getFlaggedVisitors(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(flaggedVisitors)
    .where(activeOnly ? eq(flaggedVisitors.active, true) : undefined)
    .orderBy(desc(flaggedVisitors.createdAt));
  return rows;
}

export async function getFlaggedVisitorsByOrg(orgId: number, activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  // Get all facilities in this org
  const orgFacilities = await db.select({ id: facilities.id })
    .from(facilities)
    .where(eq(facilities.orgId, orgId));
  const facilityIds = orgFacilities.map(f => f.id);
  // Filter by orgId OR by facilities belonging to this org — prevents cross-org data leak
  const rows = await db.select().from(flaggedVisitors)
    .where(activeOnly ? eq(flaggedVisitors.active, true) : undefined)
    .orderBy(desc(flaggedVisitors.createdAt));
  return rows.filter(r =>
    r.orgId === orgId || (r.facilityId && facilityIds.includes(r.facilityId))
  );
}

export async function addFlaggedVisitor(data: {
  name: string;
  reason?: string;
  addedByUserId: number;
  orgId?: number;
  facilityId?: number;
  flagLevel?: "red" | "yellow";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(flaggedVisitors).values({
    name: data.name,
    reason: data.reason ?? null,
    addedByUserId: data.addedByUserId,
    orgId: data.orgId ?? null,
    facilityId: data.facilityId ?? null,
    active: true,
    flagLevel: data.flagLevel ?? "red",
  });
}

export async function stampFlaggedVisitorEscalation(id: number) {
  const db = await getDb();
  if (!db) return;
  const row = await db.select({ count: flaggedVisitors.escalationCount }).from(flaggedVisitors).where(eq(flaggedVisitors.id, id)).limit(1);
  const current = row[0]?.count ?? 0;
  await db.update(flaggedVisitors)
    .set({ lastEscalatedAt: new Date(), escalationCount: current + 1 })
    .where(eq(flaggedVisitors.id, id));
}
export async function getFlaggedVisitorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(flaggedVisitors).where(eq(flaggedVisitors.id, id)).limit(1);
  return result[0];
}
export async function deactivateFlaggedVisitor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(flaggedVisitors)
    .set({ active: false })
    .where(eq(flaggedVisitors.id, id));
}

export async function deleteFlaggedVisitor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(flaggedVisitors).where(eq(flaggedVisitors.id, id));
}

/** Set photo fields for a flagged visitor */
export async function setFlaggedVisitorPhoto(id: number, fileKey: string, url: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(flaggedVisitors)
    .set({ photoFileKey: fileKey, photoUrl: url })
    .where(eq(flaggedVisitors.id, id));
}

/** Check if a visitor name matches any active flagged entry (case-insensitive partial match) */
export async function checkVisitorAgainstWatchlist(visitorName: string): Promise<typeof flaggedVisitors.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const allActive = await db.select().from(flaggedVisitors)
    .where(eq(flaggedVisitors.active, true));
  const lower = visitorName.toLowerCase();
  const match = allActive.find(f => lower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(lower));
  return match ?? null;
}

// ─── Drill Planning & Training Helpers ───────────────────────────────────────

export async function createDrillTemplate(data: InsertDrillTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(drillTemplates).values(data);
  return result.insertId as number;
}

export async function getDrillTemplates(userId: number, facilityId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (facilityId) {
    return db.select().from(drillTemplates)
      .where(and(eq(drillTemplates.createdByUserId, userId), eq(drillTemplates.facilityId, facilityId)))
      .orderBy(desc(drillTemplates.createdAt));
  }
  return db.select().from(drillTemplates)
    .where(eq(drillTemplates.createdByUserId, userId))
    .orderBy(desc(drillTemplates.createdAt));
}

export async function getDrillTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(drillTemplates).where(eq(drillTemplates.id, id)).limit(1);
  return rows[0];
}

export async function createTrainingModule(data: InsertTrainingModule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(trainingModules).values(data);
  return result.insertId as number;
}

export async function getTrainingModulesByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trainingModules)
    .where(eq(trainingModules.orgId, orgId))
    .orderBy(desc(trainingModules.createdAt));
}

export async function getTrainingModulesByOrgOrGlobal(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trainingModules)
    .where(
      or(
        eq(trainingModules.orgId, orgId),
        isNull(trainingModules.orgId)
      )
    )
    .orderBy(desc(trainingModules.createdAt));
}

export async function getTrainingModuleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(trainingModules).where(eq(trainingModules.id, id)).limit(1);
  return rows[0];
}

export async function getTrainingModuleByStoragePrefix(storagePrefix: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(trainingModules).where(eq(trainingModules.storagePrefix, storagePrefix)).limit(1);
  return rows[0];
}

export async function deleteTrainingModule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(trainingModules).where(eq(trainingModules.id, id));
}

export async function createDrillSession(data: InsertDrillSession) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(drillSessions).values(data);
  return result.insertId as number;
}

export async function getDrillSessions(userId: number, facilityId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (facilityId) {
    return db.select().from(drillSessions)
      .where(and(eq(drillSessions.scheduledByUserId, userId), eq(drillSessions.facilityId, facilityId)))
      .orderBy(desc(drillSessions.scheduledAt));
  }
  return db.select().from(drillSessions)
    .where(eq(drillSessions.scheduledByUserId, userId))
    .orderBy(desc(drillSessions.scheduledAt));
}

export async function getDrillSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(drillSessions).where(eq(drillSessions.id, id)).limit(1);
  return rows[0];
}

export async function updateDrillSession(id: number, data: Partial<InsertDrillSession>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(drillSessions).set(data).where(eq(drillSessions.id, id));
}

export async function addDrillParticipants(participants: InsertDrillParticipant[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (participants.length === 0) return;
  await db.insert(drillParticipants).values(participants);
}

export async function getDrillParticipants(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drillParticipants).where(eq(drillParticipants.sessionId, sessionId));
}

// ─── Micro Drill Assignments ────────────────────────────────────────────────────

export async function createMicroDrillAssignment(data: InsertMicroDrillAssignment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(microDrillAssignments).values(data);
  return result.insertId as number;
}

export async function getMicroDrillAssignmentsByAssigner(userId: number, orgId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (orgId) {
    return db.select().from(microDrillAssignments)
      .where(and(eq(microDrillAssignments.assignedByUserId, userId), eq(microDrillAssignments.orgId, orgId)))
      .orderBy(desc(microDrillAssignments.assignedDate));
  }
  return db.select().from(microDrillAssignments)
    .where(eq(microDrillAssignments.assignedByUserId, userId))
    .orderBy(desc(microDrillAssignments.assignedDate));
}

export async function getMicroDrillAssignmentsToUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(microDrillAssignments)
    .where(eq(microDrillAssignments.assignedToUserId, userId))
    .orderBy(desc(microDrillAssignments.assignedDate));
}

export async function getMicroDrillAssignmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(microDrillAssignments).where(eq(microDrillAssignments.id, id)).limit(1);
  return rows[0];
}

export async function updateMicroDrillAssignment(id: number, data: Partial<InsertMicroDrillAssignment>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(microDrillAssignments).set(data).where(eq(microDrillAssignments.id, id));
}

export async function completeMicroDrillAssignment(
  id: number,
  step1Choice: string,
  step2Choices: string[],
  considerationsChecked: boolean[],
  completedByName: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(microDrillAssignments).set({
    status: "completed",
    step1Choice,
    step2Choices: JSON.stringify(step2Choices),
    considerationsChecked: JSON.stringify(considerationsChecked),
    completedAt: new Date(),
    completionDate: new Date(),
    completedByName,
  }).where(eq(microDrillAssignments.id, id));
}

export async function getMicroDrillAssignmentsByOrg(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(microDrillAssignments)
    .where(eq(microDrillAssignments.orgId, orgId))
    .orderBy(desc(microDrillAssignments.assignedDate));
}

export async function getMicroDrillAssignmentsByDrillId(drillId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(microDrillAssignments)
    .where(eq(microDrillAssignments.drillId, drillId))
    .orderBy(desc(microDrillAssignments.assignedDate));
}

// ── Staff Check-Ins ───────────────────────────────────────────────────────────
export async function createStaffCheckin(data: InsertStaffCheckin) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(staffCheckins).values(data);
  return result;
}
export async function getStaffCheckins(facilityId?: number, orgId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (facilityId) conditions.push(eq(staffCheckins.facilityId, facilityId));
  if (orgId) conditions.push(eq(staffCheckins.orgId, orgId));
  const query = conditions.length > 0
    ? db.select().from(staffCheckins).where(and(...conditions)).orderBy(desc(staffCheckins.createdAt))
    : db.select().from(staffCheckins).orderBy(desc(staffCheckins.createdAt));
  return query;
}
export async function deleteStaffCheckin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(staffCheckins).where(eq(staffCheckins.id, id));
}
export async function clearStaffCheckins(facilityId?: number, orgId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const conditions = [];
  if (facilityId) conditions.push(eq(staffCheckins.facilityId, facilityId));
  if (orgId) conditions.push(eq(staffCheckins.orgId, orgId));
  if (conditions.length > 0) {
    await db.delete(staffCheckins).where(and(...conditions));
  }
}

// ─── Facility Floor Maps ────────────────────────────────────────────────────────

export async function createFacilityFloorMap(data: InsertFacilityFloorMap) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(facilityFloorMaps).values(data);
  return result.insertId as number;
}

export async function getFacilityFloorMapsByFacility(facilityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(facilityFloorMaps)
    .where(eq(facilityFloorMaps.facilityId, facilityId))
    .orderBy(desc(facilityFloorMaps.createdAt));
}

export async function getFacilityFloorMapById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(facilityFloorMaps).where(eq(facilityFloorMaps.id, id)).limit(1);
  return rows[0];
}

export async function updateFacilityFloorMap(id: number, data: Partial<InsertFacilityFloorMap>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(facilityFloorMaps).set(data).where(eq(facilityFloorMaps.id, id));
}

export async function deleteFacilityFloorMap(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(facilityFloorMaps).where(eq(facilityFloorMaps.id, id));
}

// ─── Freemium Plan Helpers ────────────────────────────────────────────────────

/**
 * Returns the plan ('free' | 'paid') of the first organization the user belongs to.
 * Platform admins (role === 'admin') are treated as paid regardless of org membership.
 * Returns 'free' if the user has no org membership or the DB is unavailable.
 */
export async function getOrgPlanForUser(userId: number, userRole?: string): Promise<"free" | "paid"> {
  // Platform admins (ultra_admin and admin) always have full paid access
  if (userRole === "ultra_admin" || userRole === "admin") return "paid";
  const db = await getDb();
  if (!db) return "free";
  const rows = await db
    .select({ plan: organizations.plan })
    .from(orgMembers)
    .leftJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId))
    .limit(1);
  if (rows.length === 0 || !rows[0].plan) return "free";
  return rows[0].plan as "free" | "paid";
}

/**
 * Update an organization's plan (used by the webhook endpoint).
 * Accepts either orgId or externalSubscriptionId to locate the org.
 */
export async function updateOrgPlan(
  identifier: { orgId: number } | { externalSubscriptionId: string },
  plan: "free" | "paid",
  externalSubscriptionId?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const condition =
    "orgId" in identifier
      ? eq(organizations.id, identifier.orgId)
      : eq(organizations.externalSubscriptionId, identifier.externalSubscriptionId);
  await db
    .update(organizations)
    .set({
      plan,
      planUpdatedAt: new Date(),
      ...(externalSubscriptionId ? { externalSubscriptionId } : {}),
    })
    .where(condition);
}

// ─── Email Verification ───────────────────────────────────────────────────────

/** Set the email verification token for a user (called after registration). */
export async function setEmailVerifyToken(userId: number, token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerifyToken: token, emailVerified: false }).where(eq(users.id, userId));
}

/** Verify a user's email by token. Returns the user if the token matches, null otherwise. */
export async function verifyEmailToken(token: string): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.emailVerifyToken, token)).limit(1);
  if (!result[0]) return null;
  await db.update(users).set({ emailVerified: true, emailVerifyToken: null }).where(eq(users.id, result[0].id));
  return result[0];
}

/** Store the GHL contact ID on a user record. */
export async function setGhlContactId(userId: number, ghlContactId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ghlContactId }).where(eq(users.id, userId));
}

/** Accept the Terms and Conditions for a user. */
export async function acceptTerms(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ termsAcceptedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Password Reset ───────────────────────────────────────────────────────────

/** Set a password reset token on a user (expires in 1 hour). Returns false if user not found. */
export async function setPasswordResetToken(email: string, token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const result = await db
    .update(users)
    .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
    .where(eq(users.email, email.toLowerCase().trim()));
  return ((result[0] as any)?.affectedRows ?? 0) > 0;
}

/** Consume a password reset token and update the password. Returns true on success. */
export async function resetPasswordWithToken(
  token: string,
  newPasswordHash: string,
  newPasswordSalt: string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(users).where(eq(users.passwordResetToken, token)).limit(1);
  const user = result[0];
  if (!user) return false;
  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) return false;
  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      passwordSalt: newPasswordSalt,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    .where(eq(users.id, user.id));
  return true;
}

// ─── Platform User Invites (ultra_admin) ────────────────────────────────────

export async function createUserInvite(data: InsertUserInvite): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userInvites).values(data);
}

export async function getUserInviteByToken(token: string): Promise<typeof userInvites.$inferSelect | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userInvites).where(eq(userInvites.token, token)).limit(1);
  return result[0];
}

export async function listPendingUserInvites(): Promise<(typeof userInvites.$inferSelect)[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userInvites)
    .where(and(isNull(userInvites.usedAt), gte(userInvites.expiresAt, new Date())))
    .orderBy(desc(userInvites.createdAt));
}

export async function markUserInviteUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userInvites).set({ usedAt: new Date() }).where(eq(userInvites.token, token));
}

export async function deleteUserInvite(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userInvites).where(eq(userInvites.id, id));
}
