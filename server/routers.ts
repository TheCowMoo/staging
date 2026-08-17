import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, auditorProcedure, adminProcedure, ultraAdminProcedure, superAdminProcedure, orgAdminProcedure, paidProcedure, router, paidSandboxRestrictedProcedure } from "./_core/trpc";
import {
  createFacility, getFacilitiesByUser, getFacilityById, updateFacility, duplicateFacility, deleteFacility,
  createAudit, getAuditsByFacility, getAuditsByUser, getAuditById, updateAudit, duplicateAuditResponses, deleteAudit,
  upsertAuditResponse, getResponsesByAudit,
  createThreatFinding, getThreatFindingsByAudit, deleteThreatFindingsByAudit,
  createAuditPhoto, getPhotosByAudit, deletePhoto,
  createTesterFeedback, getAllTesterFeedback, getFeedbackByAudit,
  createQuestionFlag, getAllQuestionFlags, getQuestionFlagsByAudit,
  createIncidentReport, getIncidentReports, getIncidentReportByToken, getIncidentReportById, updateIncidentReportStatus, updateIncidentThreatFlags, deleteAllIncidentReports, deleteIncidentReport,
  findSimilarIncidents, findIncidentsByPerson, markAsRepeatIncident,
  getFacilityAttachments, getFacilityAttachmentsByFacility, getFacilityAttachmentById, updateAttachmentAnalysis, deleteFacilityAttachment,
  getCorrectiveActionChecks, toggleCorrectiveActionCheck,
  createOrganization, getAllOrganizations, getOrganizationById, getOrganizationBySlug, updateOrganization, deleteOrganization,
  getOrgMembersForOrg, getOrgMembersWithLocations, getOrgMembershipForUser, getOrgMemberRecord, addOrgMember, updateOrgMemberRole, removeOrgMember,
  createOrgInvite, getOrgInviteByToken, getPendingInvitesForOrg, markInviteUsed, deleteOrgInvite,
  getFacilitiesByOrg, getIncidentReportsByOrg,
  getAuditLogsByOrg, getAllAuditLogs,
  upsertPersonnelLocation,
  createVisitorLog, getVisitorLogs, checkOutVisitor, updateVisitorLog, deleteVisitorLog,
  getFlaggedVisitors, getFlaggedVisitorsByOrg, getFlaggedVisitorById, stampFlaggedVisitorEscalation, addFlaggedVisitor, deactivateFlaggedVisitor, deleteFlaggedVisitor, checkVisitorAgainstWatchlist,
  getAllUsers, updateUserRole, updateOrgMemberPermissionFlags, getOrgMemberWithFlags, getUserByEmail,
  upsertUser, setPasswordResetToken, createUserInvite, listPendingUserInvites, deleteUserInvite,
  getEapSectionsByAudit, upsertEapSection, saveEapSectionVersion, getEapSectionVersions,
  createDrillTemplate, getDrillTemplates, getDrillTemplateById,
  createDrillSession, getDrillSessions, getDrillSessionById, updateDrillSession,
  addDrillParticipants, getDrillParticipants,
  createStaffCheckin, getStaffCheckins, deleteStaffCheckin, clearStaffCheckins,
  acceptTerms,
} from "./db";
import {
  calculateCategoryScore, calculateOverallScore, calculateThreatSeverity,
  AUDIT_CATEGORIES, CATEGORY_WEIGHTS, getCorrectiveActionRecommendation, PRIORITY_ORDER,
  getDecisionTreeScore, getResponseScore,
} from "../shared/auditFramework";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { writeAuditLog, buildLogContext } from "./auditLogger";
import { rasRouter } from "./rasRouter";
import { trainingModuleRouter } from "./trainingModuleRouter";
import { initVapid } from "./push";
import { clearPdfCache } from "./eapPdf";
import {
  insertLiabilityScan, getLiabilityScanById, getLiabilityScansForUser, deleteLiabilityScan,
  insertScanShareToken, getScanShareToken, updateLiabilityScanTierScores,
} from "./db";
import { randomBytes, createHash } from "crypto";
import { createApiKey, getApiKeyByHash, listApiKeysByUser, revokeApiKey } from "./db";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { generateLiabilityScanResult } from "./liabilityScanAi";
import {
  generateCaseNumber, createBtamCase, getBtamCases, getBtamCaseById, updateBtamCase,
  upsertBtamSubject, getBtamSubjectByCase,
  createBtamReferralIntake, getBtamReferralIntakeByCase,
  createBtamAssessment, getBtamAssessmentsByCase, getLatestBtamAssessment,
  createBtamManagementPlanItem, getBtamManagementPlanByCase, updateBtamManagementPlanItem, deleteBtamManagementPlanItem,
  createBtamCaseNote, getBtamCaseNotesByCase,
  createBtamStatusHistory, getBtamStatusHistoryByCase,
  getBtamCaseByLinkedIncidentId,
} from "./btamDb";
import { computeWavrScore } from "./btamScoring";
import { notifyOwner } from "./_core/notification";
import { scanText } from "./threatFlagEngine";
import { sendGhlEmail } from "./_core/ghl";
import { loadStateJurisdictionSection, loadJurisdictionGlossary } from "./jurisdictionDocs";
import { massNotificationRouter } from "./massNotificationRouter";
import { microDrillRouter } from "./microDrillRouter";
import { facilityMapRouter } from "./facilityMapRouter";
import { incidentCommunicationRouter } from "./incidentCommunicationRouter";
import { notificationRouter } from "./notificationRouter";
// â”€â”€â”€ Facility Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Initialise VAPID keys at server startup (no-op if keys not configured)
initVapid();;

const facilityRouter = router({
  list: paidProcedure.query(async ({ ctx }) => {
    // Resolve user's org and filter by org if member
    const memberships = await getOrgMembershipForUser(ctx.user.id);
    const orgId = memberships[0]?.orgId;
    if (orgId) {
      return getFacilitiesByOrg(orgId);
    }
    return getFacilitiesByUser(ctx.user.id);
  }),

  get: paidProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const facility = await getFacilityById(input.id);
    if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
    // Allow: direct owner, platform admin, or org member of the facility's org
    const isOwner = facility.userId === ctx.user.id;
    const isPlatformAdmin = (["admin","ultra_admin"].includes(ctx.user.role));
    let isOrgMember = false;
    if (!isOwner && !isPlatformAdmin && facility.orgId) {
      const membership = await getOrgMemberRecord(facility.orgId, ctx.user.id);
      isOrgMember = !!membership;
    }
    if (!isOwner && !isPlatformAdmin && !isOrgMember) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return facility;
  }),

  create: paidProcedure
    .input(z.object({
      name: z.string().min(1),
      facilityType: z.string(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      jurisdiction: z.string().optional(),
      squareFootage: z.number().optional(),
      floors: z.number().optional(),
      maxOccupancy: z.number().optional(),
      operatingHours: z.string().optional(),
      eveningOperations: z.boolean().optional(),
      multiTenant: z.boolean().optional(),
      publicAccessWithoutScreening: z.boolean().optional(),
      publicEntrances: z.number().optional(),
      staffEntrances: z.number().optional(),
      hasAlleyways: z.boolean().optional(),
      hasConcealedAreas: z.boolean().optional(),
      usedAfterDark: z.boolean().optional(),
      multiSite: z.boolean().optional(),
      emergencyCoordinator: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      operationalPolicies: z.string().optional(),
      coordinatorContacts: z.string().optional(),
      emergencyContacts: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Scope new facilities to the user's org so they appear in the org-filtered list
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships[0]?.orgId;
      const newFacility = await createFacility({ ...input, userId: ctx.user.id, orgId });
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "create",
        entityType: "facility",
        entityId: String(newFacility?.id ?? ""),
        description: `Created facility "${input.name}"`,
        metadata: { facilityType: input.name, city: input.city, state: input.state },
      });
      return newFacility;
    }),

  update: paidProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      facilityType: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      jurisdiction: z.string().optional(),
      squareFootage: z.number().optional(),
      floors: z.number().optional(),
      maxOccupancy: z.number().optional(),
      operatingHours: z.string().optional(),
      eveningOperations: z.boolean().optional(),
      multiTenant: z.boolean().optional(),
      publicAccessWithoutScreening: z.boolean().optional(),
      publicEntrances: z.number().optional(),
      staffEntrances: z.number().optional(),
      hasAlleyways: z.boolean().optional(),
      hasConcealedAreas: z.boolean().optional(),
      usedAfterDark: z.boolean().optional(),
      multiSite: z.boolean().optional(),
      emergencyCoordinator: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      emergencyRoles: z.string().optional(),
      aedOnSite: z.boolean().optional(),
      aedLocations: z.string().optional(),
      operationalPolicies: z.string().optional(),
      coordinatorContacts: z.string().optional(),
      emergencyContacts: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const facility = await getFacilityById(id);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      if (facility.userId !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await updateFacility(id, data);
      return getFacilityById(id);
    }),

  duplicate: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const facility = await getFacilityById(input.id);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      if (facility.userId !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      const newFacility = await duplicateFacility(input.id, ctx.user.id);
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "create",
        entityType: "facility",
        entityId: String(newFacility?.id ?? ""),
        description: `Duplicated facility "${facility.name}" as "${newFacility?.name}"`,
        metadata: { sourceId: input.id, newName: newFacility?.name },
      });
      return newFacility;
    }),

  delete: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const facility = await getFacilityById(input.id);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      if (facility.userId !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteFacility(input.id);
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "delete",
        entityType: "facility",
        entityId: String(input.id),
        description: `Deleted facility "${facility.name}"`,
      });
      return { success: true };
    }),
});

// â”€â”€â”€ Audit Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const auditRouter = router({
  listByFacility: paidProcedure
    .input(z.object({ facilityId: z.number() }))
    .query(async ({ ctx, input }) => {
      const facility = await getFacilityById(input.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      if (facility.userId !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      return getAuditsByFacility(input.facilityId);
    }),

  listMine: paidProcedure.query(async ({ ctx }) => {
    return getAuditsByUser(ctx.user.id);
  }),

  get: paidProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const audit = await getAuditById(input.id);
    if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
    // Verify caller has access to the facility this audit belongs to
    const facility = await getFacilityById(audit.facilityId);
    if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
    const isOwner = facility.userId === ctx.user.id || audit.auditorId === ctx.user.id;
    const isPlatformAdmin = (["admin","ultra_admin"].includes(ctx.user.role));
    let isOrgMember = false;
    if (!isOwner && !isPlatformAdmin && facility.orgId) {
      const membership = await getOrgMemberRecord(facility.orgId, ctx.user.id);
      isOrgMember = !!membership;
    }
    if (!isOwner && !isPlatformAdmin && !isOrgMember) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return audit;
  }),

  create: paidProcedure
    .input(z.object({ facilityId: z.number(), auditorNotes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const facility = await getFacilityById(input.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      const newAudit = await createAudit({
        facilityId: input.facilityId,
        auditorId: ctx.user.id,
        status: "in_progress",
        auditorNotes: input.auditorNotes,
      });
      return newAudit;
    }),

  saveResponse: paidProcedure
    .input(z.object({
      auditId: z.number(),
      categoryName: z.string(),
      questionId: z.string(),
      questionText: z.string(),
      // Decision-tree fields (new model)
      primaryResponse: z.enum(["Yes", "No", "Unknown", "Not Applicable", "Unavoidable"]).optional(),
      concernLevel: z.enum(["Minor", "Moderate", "Serious"]).optional(),
      // Legacy response field (kept for backward compat)
      // NOTE: includes both em-dash (—) and double-dash (--) variants for compatibility
      response: z.enum([
        // Positive polarity responses
        "Secure / Yes", "Partial", "Minor Concern", "Moderate Concern", "Serious Vulnerability",
        // Negative polarity responses (double-dash legacy)
        "No -- Not Present", "Unlikely / Minimal", "Partially Present", "Yes -- Present",
        // Negative polarity responses (em-dash variants sent by new frontend)
        "No \u2014 Not Present", "No \u2014 Not in place", "Yes \u2014 Present", "Yes \u2014 Secure",
        // Shared
        "Unknown", "Not Applicable", "Unavoidable",
        // Decision-tree aliases
        "Yes", "No",
      ]).optional(),
      conditionType: z.string().optional(),
      conditionTypes: z.array(z.string()).optional(), // multi-select condition types
      isUnavoidable: z.boolean().optional(), // permanent/structural constraint
      score: z.number().nullable().optional(),
      notes: z.string().optional(),
      recommendedActionNotes: z.string().optional(),
      remediationTimeline: z.enum(["30 days", "60 days", "90 days", "Long-Term"]).optional(),
      followUpResponse: z.string().optional(),
      photoUrls: z.array(z.string()).optional(),
      addToEap: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertAuditResponse(input as any);
      return { success: true };
    }),

  getResponses: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getResponsesByAudit(input.auditId);
    }),

  complete: paidProcedure
    .input(z.object({ auditId: z.number(), auditorNotes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const responses = await getResponsesByAudit(input.auditId);

      // Build polarity lookup from AUDIT_CATEGORIES (no DB schema change needed)
      const polarityMap: Record<string, "positive" | "negative"> = {};
      for (const cat of AUDIT_CATEGORIES) {
        for (const q of cat.questions) {
          polarityMap[q.id] = q.polarity;
        }
      }

      // Group responses by category, recomputing scores authoritatively
      const byCategory: Record<string, { score: number | null }[]> = {};
      for (const r of responses) {
        if (!byCategory[r.categoryName]) byCategory[r.categoryName] = [];
        // Recompute score from decision-tree fields (primaryResponse + concernLevel)
        // Falls back to legacy response field, then to stored score as last resort
        const polarity = polarityMap[r.questionId] ?? "positive";
        const computedScore = r.primaryResponse
          ? getDecisionTreeScore(r.primaryResponse, r.concernLevel ?? null, polarity)
          : r.response
            ? getResponseScore(r.response, polarity)
            : r.score;
        byCategory[r.categoryName].push({ score: computedScore });
      }

      // Calculate category scores
      const categoryScores: Record<string, { percentage: number; weight: number; riskLevel: string; rawScore: number; maxScore: number }> = {};
      for (const [catName, catResponses] of Object.entries(byCategory)) {
        const result = calculateCategoryScore(catResponses);
        categoryScores[catName] = {
          ...result,
          weight: CATEGORY_WEIGHTS[catName] ?? 0,
        };
      }

      // Calculate overall score
      const { overallScore, overallRiskLevel } = calculateOverallScore(categoryScores);

       await updateAudit(input.auditId, {
        status: "completed",
        completedAt: new Date(),
        overallScore,
        overallRiskLevel,
        categoryScores: categoryScores as any,
        auditorNotes: input.auditorNotes,
      });
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "audit_completed",
        entityType: "audit",
        entityId: String(input.auditId),
        description: `Completed audit -- overall risk: ${overallRiskLevel} (${overallScore?.toFixed(1)}%)`,
        metadata: { overallScore, overallRiskLevel },
      });
      return { success: true, overallScore, overallRiskLevel };
    }),

  updateNotes: paidProcedure
    .input(z.object({ auditId: z.number(), notes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await updateAudit(input.auditId, { auditorNotes: input.notes });
      return { success: true };
    }),
  saveEapContacts: paidProcedure
    .input(z.object({
      auditId: z.number(),
      eapContacts: z.object({
        primaryName: z.string().optional(),
        primaryTitle: z.string().optional(),
        primaryPhone: z.string().optional(),
        backupName: z.string().optional(),
        backupTitle: z.string().optional(),
        backupPhone: z.string().optional(),
        afterHoursContact: z.string().optional(),
        otherNotes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateAudit(input.auditId, { eapContacts: input.eapContacts as any });
      return { success: true };
    }),
  getEapContacts: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      return (audit?.eapContacts as any) ?? null;
    }),
  saveSectionEapNotes: paidProcedure
    .input(z.object({
      auditId: z.number(),
      sectionEapNotes: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateAudit(input.auditId, { sectionEapNotes: input.sectionEapNotes as any });
      return { success: true };
    }),
  getSectionEapNotes: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      return (audit?.sectionEapNotes as Record<string, string> | null) ?? {};
    }),
  duplicate: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sourceAudit = await getAuditById(input.auditId);
      if (!sourceAudit) throw new TRPCError({ code: "NOT_FOUND" });
      const facility = await getFacilityById(sourceAudit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      // Create new in_progress audit for same facility
      const newAudit = await createAudit({
        facilityId: sourceAudit.facilityId,
        auditorId: ctx.user.id,
        status: "in_progress",
        auditorNotes: `Duplicated from audit #${input.auditId}`,
      });
      if (!newAudit) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create new audit" });
      // Copy all responses from source to new audit
      await duplicateAuditResponses(input.auditId, newAudit.id);
      return { id: newAudit.id };
    }),

  reopen: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
      const facility = await getFacilityById(audit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      if (facility.userId !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await updateAudit(input.auditId, {
        status: "in_progress",
        completedAt: null as any,
        overallScore: null as any,
        overallRiskLevel: null as any,
        categoryScores: null as any,
      });
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "audit_reopened",
        entityType: "audit",
        entityId: String(input.auditId),
        description: `Reopened audit for editing`,
      });
      return { success: true };
    }),

  // Delete an audit and all its related data (facility owner or platform admin only)
  delete: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
      const facility = await getFacilityById(audit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      if (facility.userId !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteAudit(input.auditId);
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "delete",
        entityType: "audit",
        entityId: String(input.auditId),
        description: `Deleted audit #${input.auditId} for facility "${facility.name}"`,
        metadata: { facilityId: audit.facilityId },
      });
      return { success: true };
    }),
});
// â”€â”€â”€ Threat Findings Routerr â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const threatRouter = router({
  list: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getThreatFindingsByAudit(input.auditId);
    }),

  create: paidProcedure
    .input(z.object({
      auditId: z.number(),
      findingName: z.string().min(1),
      category: z.string(),
      likelihood: z.string(),
      impact: z.string(),
      preparedness: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { baseScore, modifier, finalScore, severityLevel, priority } = calculateThreatSeverity(
        input.likelihood, input.impact, input.preparedness
      );
      await createThreatFinding({
        ...input,
        baseScore,
        modifier,
        finalScore,
        severityLevel,
        priority,
      });
      return getThreatFindingsByAudit(input.auditId);
    }),

  deleteAll: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteThreatFindingsByAudit(input.auditId);
      return { success: true };
    }),
});

// â”€â”€â”€ Report Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const reportRouter = router({
  generate: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND" });

      const facility = await getFacilityById(audit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });

      const responses = await getResponsesByAudit(input.auditId);
      const threatFindings = await getThreatFindingsByAudit(input.auditId);
      const photos = await getPhotosByAudit(input.auditId);

      // Build polarity lookup from AUDIT_CATEGORIES
      const polarityMap: Record<string, "positive" | "negative"> = {};
      for (const cat of AUDIT_CATEGORIES) {
        for (const q of cat.questions) {
          polarityMap[q.id] = q.polarity;
        }
      }

      // Recompute scores live from primaryResponse + concernLevel (authoritative)
      // Falls back to legacy response field, then stored score as last resort
      const responsesWithLiveScores = responses.map((r) => {
        const polarity = polarityMap[r.questionId] ?? "positive";
        const liveScore = r.primaryResponse
          ? getDecisionTreeScore(r.primaryResponse, r.concernLevel ?? null, polarity)
          : r.response
            ? getResponseScore(r.response, polarity)
            : r.score;
        return { ...r, score: liveScore };
      });

      // Recompute category scores from live response scores
      const byCategory: Record<string, { score: number | null }[]> = {};
      for (const r of responsesWithLiveScores) {
        if (!byCategory[r.categoryName]) byCategory[r.categoryName] = [];
        byCategory[r.categoryName].push({ score: r.score });
      }
      const liveCategoryScores: Record<string, { percentage: number; weight: number; riskLevel: string; rawScore: number; maxScore: number }> = {};
      for (const [catName, catResponses] of Object.entries(byCategory)) {
        const result = calculateCategoryScore(catResponses);
        liveCategoryScores[catName] = { ...result, weight: CATEGORY_WEIGHTS[catName] ?? 0 };
      }
      // Fall back to stored categoryScores for categories with no responses yet
      const storedCategoryScores = (audit.categoryScores as any) ?? {};
      const categoryScores = Object.keys(liveCategoryScores).length > 0 ? liveCategoryScores : storedCategoryScores;

      // Recompute overall score live
      const { overallScore: liveOverallScore, overallRiskLevel: liveOverallRiskLevel } = calculateOverallScore(
        Object.fromEntries(Object.entries(categoryScores).map(([k, v]: [string, any]) => [k, { percentage: v.percentage, weight: v.weight }]))
      );
      // Merge live scores into audit object for display
      const auditWithLiveScore = {
        ...audit,
        overallScore: liveOverallScore,
        overallRiskLevel: liveOverallRiskLevel,
        categoryScores,
      };

      // Build corrective actions using live scores -- exclude items marked as unavoidable structural constraints
      const correctiveActions = responsesWithLiveScores
        .filter((r) => r.score !== null && (r.score ?? 0) >= 1 && !(r as any).isUnavoidable)
        .map((r) => ({
          questionId: r.questionId,
          category: r.categoryName,
          question: r.questionText,
          response: r.response ?? "Unknown",
          conditionType: r.conditionType ?? "Observed Condition",
          conditionTypes: (r as any).conditionTypes ?? null,
          isUnavoidable: false,
          score: r.score ?? 0,
          notes: r.notes ?? "",
          recommendation: getCorrectiveActionRecommendation(r.questionText, r.response ?? ""),
          priority: r.score === 3 ? "30 Day" : r.score === 2 ? "90 Day" : "Long-Term",
        }))
        .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
      // Collect unavoidable constraints separately (for EAP context)
      const unavoidableConstraints = responsesWithLiveScores
        .filter((r) => (r as any).isUnavoidable && r.score !== null && (r.score ?? 0) >= 1)
        .map((r) => ({
          category: r.categoryName,
          question: r.questionText,
          response: r.response ?? "Unknown",
          score: r.score ?? 0,
          notes: r.notes ?? "",
        }));

      return {
        facility,
        audit: auditWithLiveScore,
        categoryScores,
        threatFindings,
        correctiveActions,
        unavoidableConstraints,
        photos,
        generatedAt: new Date().toISOString(),
      };
    }),

  generateMarkdown: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
      const facility = await getFacilityById(audit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      const responses = await getResponsesByAudit(input.auditId);
      const findings = await getThreatFindingsByAudit(input.auditId);
      const categoryScores = (audit.categoryScores as Record<string, any>) ?? {};

      const correctiveActions = responses
        .filter((r) => (r.score ?? 0) >= 1)
        .map((r) => ({
          category: r.categoryName,
          question: r.questionText,
          response: r.response ?? "",
          priority: r.score === 3 ? "30 Day" : r.score === 2 ? "90 Day" : "Long-Term",
          notes: r.notes ?? "",
        }))
        .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

      const lines: string[] = [
        `# Workplace Violence Threat Assessment Report`,
        `## ${facility.name}`,
        `**Date of Assessment:** ${audit.auditDate ? new Date(audit.auditDate).toLocaleDateString() : "N/A"}`,
        `**Overall Facility Risk Rating:** ${(audit.overallRiskLevel ?? "Pending").toUpperCase()}`,
        `**Overall Score:** ${audit.overallScore ?? 0}%`,
        `\n---\n`,
        `## Executive Summary`,
        `This report details the findings of a Workplace Violence Threat Assessment conducted at **${facility.name}**. The assessment evaluated ${Object.keys(categoryScores).length} safety categories and identified ${correctiveActions.length} items requiring corrective action.`,
        `\n---\n`,
        `## Facility Overview`,
        `| Characteristic | Details |`,
        `|---|---|`,
        `| **Name** | ${facility.name} |`,
        `| **Type** | ${facility.facilityType} |`,
        `| **Address** | ${facility.address ?? "N/A"}, ${facility.city ?? ""}, ${facility.state ?? ""} |`,
        `| **Square Footage** | ${facility.squareFootage?.toLocaleString() ?? "N/A"} sq. ft. |`,
        `| **Operating Hours** | ${facility.operatingHours ?? "N/A"} |`,
        `\n---\n`,
        `## Risk Ratings by Category`,
        `| Category | Risk Level | Score (%) |`,
        `|---|---|:---:|`,
        ...Object.entries(categoryScores)
          .sort(([, a]: any, [, b]: any) => b.percentage - a.percentage)
          .map(([name, data]: any) => `| **${name}** | ${data.riskLevel} | ${data.percentage}% |`),
        `\n---\n`,
        `## Threat Severity Findings`,
        `| Threat Scenario | Likelihood | Impact | Preparedness | Final Score | Severity |`,
        `|---|---|---|---|:---:|:---:|`,
        ...findings.map((f) => `| **${f.findingName}** | ${f.likelihood} | ${f.impact} | ${f.preparedness} | ${f.finalScore} | **${f.severityLevel.toUpperCase()}** |`),
        `\n---\n`,
        `## Corrective Action Plan`,
        `| Priority | Category | Issue | Recommendation |`,
        `|---|---|---|---|`,
        ...correctiveActions.map((a) => `| **${a.priority}** | ${a.category} | ${a.question} | ${a.response} -- ${a.notes || "See recommendations."} |`),
        `\n---\n`,
        `## Emergency Action Plan Framework`,
        `### Emergency Contact Procedures`,
        `- **Immediate Danger:** Dial 911.`,
        `- **Internal Notification:** Contact the designated Emergency Coordinator.`,
        `\n### Evacuation Procedures`,
        `- Follow posted evacuation maps to the nearest exit.`,
        `- Assemble at the designated outdoor meeting point.`,
        `- Designated staff member to conduct head count.`,
        `\n### Lockdown Procedures`,
        `- Lock all accessible doors immediately.`,
        `- Turn off lights and silence all devices.`,
        `- Move away from windows and doors; remain out of sight.`,
        `- Do not open doors until law enforcement gives the all-clear.`,
        `\n### Shelter-in-Place`,
        `- Move to interior rooms away from windows.`,
        `- Await further instruction from emergency coordinator or law enforcement.`,
        `\n---\n`,
        `*Report generated by Five Stones Technology -- Workplace Safety Assessment Platform*`,
        `*Aligned with OSHA Workplace Violence Prevention, CISA Risk Principles, and NFPA 3000*`,
      ];

      return { markdown: lines.join("\n") };
    }),

  getEAP: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
      const facility = await getFacilityById(audit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      const rawEapJson = (audit as any).eapJson;
      console.log("[getEAP] audit", input.auditId, "eapJson type:", typeof rawEapJson, "value:", rawEapJson ? (typeof rawEapJson === 'string' ? rawEapJson.substring(0,100) : Object.keys(rawEapJson).slice(0,5).join(',')) : "null");
      if (!rawEapJson) return null;
      if (typeof rawEapJson === "string" && rawEapJson.trim() === "") return null;
      // MySQL/mysql2 can return JSON columns as strings -- parse if needed
      let eapData: Record<string, any>;
      if (typeof rawEapJson === "string") {
        try { eapData = JSON.parse(rawEapJson); } catch { console.error("[getEAP] JSON parse error"); return null; }
      } else {
        eapData = rawEapJson;
      }
      const categoryScores = (audit.categoryScores as Record<string, any>) ?? {};
      const highRiskCategories = Object.entries(categoryScores)
        .filter(([, d]: any) => ["Elevated", "High", "Critical"].includes(d.riskLevel))
        .map(([name, d]: any) => `${name} (${d.riskLevel} -- ${d.percentage}%)`);
      return {
        facilityName: facility.name,
        facilityType: facility.facilityType,
        address: `${facility.address ?? ""}, ${facility.city ?? ""}, ${facility.state ?? ""}`,
        overallRiskLevel: audit.overallRiskLevel ?? "Unknown",
        highRiskCategories,
        generatedAt: (audit as any).eapGeneratedAt,
        ...eapData,
      };
    }),

  generateEAP: paidSandboxRestrictedProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
      const facility = await getFacilityById(audit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      const responses = await getResponsesByAudit(input.auditId);
      const findings = await getThreatFindingsByAudit(input.auditId);
      const categoryScores = (audit.categoryScores as Record<string, any>) ?? {};

      // Build risk context for EAP
      const highRiskCategories = Object.entries(categoryScores)
        .filter(([, d]: any) => ["Elevated", "High", "Critical"].includes(d.riskLevel))
        .map(([name, d]: any) => `${name} (${d.riskLevel} -- ${d.percentage}%)`);
      const criticalFindings = responses
        .filter((r) => (r.score ?? 0) >= 2)
        .map((r) => r.questionText)
        .slice(0, 10);

      const facilityContext = [
        `Facility: ${facility.name}`,
        `Type: ${facility.facilityType}`,
        `Address: ${facility.address ?? ""}, ${facility.city ?? ""}, ${facility.state ?? ""}`,
        facility.squareFootage ? `Size: ${facility.squareFootage.toLocaleString()} sq. ft.` : "",
        facility.floors ? `Floors: ${facility.floors}` : "",
        facility.maxOccupancy ? `Max Occupancy: ${facility.maxOccupancy}` : "",
        facility.operatingHours ? `Operating Hours: ${facility.operatingHours}` : "",
        facility.eveningOperations ? "Evening/after-hours operations: Yes" : "",
        facility.multiTenant ? "Multi-tenant building: Yes" : "",
        facility.publicAccessWithoutScreening ? "Public access without screening: Yes" : "",
      ].filter(Boolean).join("\n");

      // Determine facility size for dynamic role assignment
      const occupancy = facility.maxOccupancy ?? 50;
      const facilitySize = occupancy <= 10 ? "micro" : occupancy <= 50 ? "small" : occupancy <= 150 ? "medium" : occupancy <= 500 ? "large" : "enterprise";
      const roleTiers: Record<string, string[]> = {
        micro: ["Site Lead (functions as Incident Commander per NIMS)", "Emergency Caller (911)", "Evacuation Coordinator"],
        small: ["Site Lead (functions as Incident Commander per NIMS)", "Secondary Lead / Backup", "Emergency Caller (911)", "Evacuation Coordinator", "Accountability Coordinator"],
        medium: ["Site Lead (functions as Incident Commander per NIMS)", "Secondary Lead / Backup", "Emergency Caller (911)", "Evacuation Coordinator", "Accountability Coordinator", "External Coordinator / Responder Liaison", "First Aid Coordinator"],
        large: ["Site Lead (functions as Incident Commander per NIMS)", "Secondary Lead / Backup", "Emergency Caller (911)", "Evacuation Coordinator", "Accountability Coordinator", "External Coordinator / Responder Liaison", "First Aid Coordinator", "Floor / Area Coordinators (one per floor/zone)"],
        enterprise: ["Site Lead (functions as Incident Commander per NIMS)", "Secondary Lead / Backup", "Emergency Caller (911)", "Evacuation Coordinator", "Accountability Coordinator", "External Coordinator / Responder Liaison", "First Aid Coordinator", "Floor / Area Coordinators (one per floor/zone)", "Communications Lead"],
      };
      const assignedRoles = roleTiers[facilitySize] ?? roleTiers.small;

      const today = new Date();
      const reviewDate = new Date(today);
      reviewDate.setFullYear(reviewDate.getFullYear() + 1);
      const effectiveDateStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const reviewDateStr = reviewDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // EAP coordinator contacts
      const eapContactsData = (audit.eapContacts as any) ?? {};
      const eapContactsSection = (eapContactsData.primaryName || eapContactsData.backupName || eapContactsData.afterHoursContact)
        ? `\nEMERGENCY COORDINATOR CONTACTS:\n${eapContactsData.primaryName ? `Primary: ${eapContactsData.primaryName}${eapContactsData.primaryTitle ? " (" + eapContactsData.primaryTitle + ")" : ""}${eapContactsData.primaryPhone ? " -- " + eapContactsData.primaryPhone : ""}` : ""}\n${eapContactsData.backupName ? `Backup: ${eapContactsData.backupName}${eapContactsData.backupTitle ? " (" + eapContactsData.backupTitle + ")" : ""}${eapContactsData.backupPhone ? " -- " + eapContactsData.backupPhone : ""}` : ""}\n${eapContactsData.afterHoursContact ? `After-Hours: ${eapContactsData.afterHoursContact}` : ""}\n${eapContactsData.otherNotes ? `Notes: ${eapContactsData.otherNotes}` : ""}\n`
        : "";

      // Attachment AI analysis (cap at 3 to keep prompt size manageable)
      const attachments = await getFacilityAttachments(input.auditId);
      const analyzedAttachments = attachments.filter((a: any) => a.aiAnalysis).slice(0, 3);
      const attachmentSection = analyzedAttachments.length > 0
        ? `\nFACILITY PHOTO OBSERVATIONS (from uploaded photos):\n${analyzedAttachments.map((a: any) => `[${(a.category ?? "photo").toUpperCase()}]: ${a.aiAnalysis}`).join("\n")}\n`
        : "";

      // Unavoidable constraints
      const unavoidableForEAP = responses
        .filter((r) => (r as any).isUnavoidable && r.score !== null && (r.score ?? 0) >= 1)
        .map((r) => `- ${r.questionText}`)
        .slice(0, 5);
      const unavoidableEAPSection = unavoidableForEAP.length > 0
        ? `\nPERMANENT CONSTRAINTS (plan around these, do not try to eliminate):\n${unavoidableForEAP.join("\n")}\n`
        : "";

      // Section EAP notes (auditor-entered per-section notes for EAP)
      const sectionEapNotes = (audit.sectionEapNotes as Record<string, string> | null) ?? {};
      const sectionEapNotesSection = Object.keys(sectionEapNotes).length > 0
        ? `\nAUDITOR SECTION NOTES (use these to populate the relevant EAP sections):\n${Object.entries(sectionEapNotes).map(([k, v]) => `[${k}]: ${v}`).join("\n")}\n`
        : "";

      // Responses flagged "Add to EAP" by auditor
      const eapFlaggedResponses = responses
        .filter((r) => (r as any).addToEap && r.questionText)
        .map((r) => `- [${r.categoryName}] ${r.questionText}: ${r.response ?? r.primaryResponse ?? "Unknown"}${r.notes ? " -- Auditor note: " + r.notes : ""}${(r as any).recommendedActionNotes ? " -- Recommended action: " + (r as any).recommendedActionNotes : ""}`)
        .slice(0, 15);
      const eapFlaggedSection = eapFlaggedResponses.length > 0
        ? `\nAUDITOR-FLAGGED ITEMS FOR EAP (these must be addressed in the relevant sections):\n${eapFlaggedResponses.join("\n")}\n`
        : "";

      // All scored responses with auditor notes (score >= 1, with notes)
      const notedResponses = responses
        .filter((r) => (r.score ?? 0) >= 1 && (r.notes || (r as any).recommendedActionNotes))
        .map((r) => `- [${r.categoryName}] ${r.questionText}${r.notes ? " -- Note: " + r.notes : ""}${(r as any).recommendedActionNotes ? " -- Action: " + (r as any).recommendedActionNotes : ""}`)
        .slice(0, 12);
      const notedResponsesSection = notedResponses.length > 0
        ? `\nAUDITOR FIELD NOTES (incorporate into relevant sections):\n${notedResponses.join("\n")}\n`
        : "";

      // Threat findings with descriptions
      const threatSummary = findings.slice(0, 10).map((f) => {
        const desc = (f as any).description ? ` -- ${(f as any).description}` : "";
        return `- ${f.findingName} [${f.severityLevel}]${desc}`;
      }).join("\n") || "None recorded";

      // Facility and audit notes
      const facilityNotesSection = (facility as any).notes
        ? `\nFACILITY NOTES: ${(facility as any).notes}\n`
        : "";
      const auditorNotesSection = (audit as any).auditorNotes
        ? `\nAUDITOR GENERAL NOTES: ${(audit as any).auditorNotes}\n`
        : "";

      // Load org-level website resource links for AI context injection
      let websiteResourceContext = "";
      try {
        const org = facility.orgId ? await getOrganizationById(facility.orgId) : null;
        if (org) {
          const rawLinks = (org as any).websiteResourceLinks;
          if (rawLinks) {
            let links: string[] = [];
            if (typeof rawLinks === "string") {
              try { links = JSON.parse(rawLinks); } catch { links = []; }
            } else if (Array.isArray(rawLinks)) {
              links = rawLinks;
            }
            if (links.length > 0) {
              websiteResourceContext = `\nORGANIZATION-SPECIFIC REGULATORY REFERENCES (these URLs have been added by the organization's administrators as relevant context for this facility):\n${links.map((url) => `- ${url}`).join("\n")}\n`;
            }
          }
        }
      } catch {
        // Non-blocking -- don't fail EAP generation if org lookup errors
      }

      const scoringContext = await (async () => {
        const { buildScoringContext: sc } = await import("./_core/aiContext");
        return sc();
      })();
      // Build shared facility context string for all LLM calls
      const sharedContext = `FACILITY CONTEXT:
${facilityContext}${facilityNotesSection}${auditorNotesSection}${eapContactsSection}${unavoidableEAPSection}${attachmentSection}${sectionEapNotesSection}${eapFlaggedSection}${notedResponsesSection}${websiteResourceContext}
Facility Size: ${facilitySize} (${occupancy} max occupancy)
Overall Risk Level: ${audit.overallRiskLevel ?? "Unknown"}
High-Risk Categories: ${highRiskCategories.length > 0 ? highRiskCategories.join("; ") : "None at elevated level"}
Critical Findings: ${criticalFindings.length > 0 ? criticalFindings.join("; ") : "None"}
Threat Scenarios:
${threatSummary}
ICS Roles: ${assignedRoles.join(", ")}
Effective Date: ${effectiveDateStr} | Review Date: ${reviewDateStr}

${scoringContext}`;

      const systemMsg = [
        "You are a professional emergency preparedness consultant with expertise in FEMA NIMS/ICS, NFPA 3000 (PS), OSHA 29 CFR 1910.38, OSHA 29 CFR 1910.165, NFPA 1600, and the ACTD (Assess, Commit, Take Action, Debrief) framework aligned with CISA active threat preparedness principles.",
        "CRITICAL CITATION RULES (NON-NEGOTIABLE):",
        "1. ACTD Framework is ONLY cited for live incident decision-making (Sections 8 and 9 only). NEVER cite ACTD as a regulatory basis for plan maintenance, business continuity, version control, after-action reviews, training rationale, or special populations.",
        "2. NFPA 3000 citations MUST include specific section numbers: S6 (Planning), S7 (Risk Assessment), S10-14 (Training/Competency), S17 (Recovery), S19 (Facility Preparedness). Never cite NFPA 3000 without a section number.",
        "3. NFPA 1600 is required for: business continuity, plan maintenance, recovery, and family reunification sections.",
        "4. OSHA 1910.165 is required for: employee alarm systems, lockdown notification, and distinct signal types.",
        "5. AHA/ILCOR 2020 + OSHA 3185 are required for any AED or medical response recommendation.",
        "6. ADA Title III + Section 504 are required for special populations recommendations.",
        "7. Site Lead must always be written as: Site Lead (functions as Incident Commander per NIMS).",
        "8. NEVER use Run/Hide/Fight language.",
        "9. Return ONLY valid JSON - no markdown, no code fences. Start your response with { and end with }.",
      ].join(" ");

      const { ENV } = await import("./_core/env");
      const { buildScoringContext } = await import("./_core/aiContext");
      const llmBase = ENV.llmBaseUrl ? ENV.llmBaseUrl.replace(/\/$/, "") : "https://api.openai.com";
      const apiUrl = `${llmBase}/v1/chat/completions`;
      const headers = { "content-type": "application/json", authorization: `Bearer ${ENV.openAiApiKey}` };

      // Helper to call LLM directly (bypasses invokeLLM's hardcoded thinking/max_tokens)
      async function callLLM(userPrompt: string): Promise<any[]> {
        const resp = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: ENV.llmModel || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 6000,
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `EAP LLM call failed: ${resp.status} ${errText.slice(0, 300)}` });
        }
        const json = await resp.json() as any;
        const raw = json.choices?.[0]?.message?.content ?? "[]";
        const rawStr = (typeof raw === "string" ? raw : JSON.stringify(raw)).trim();
        // Strip markdown code fences
        const cleaned = rawStr
          .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        let parsed: any;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          // LLM returned non-JSON -- return empty array so spread doesn't throw
          console.error("[EAP callLLM] JSON.parse failed. Raw response:", cleaned.slice(0, 500));
          return [];
        }
        // Normalise: accept array directly, or extract from {sections:[...]}, or wrap object in array
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.sections)) return parsed.sections;
        if (parsed && typeof parsed === "object") {
          // Try to extract any array value from the top-level object
          const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
          if (firstArray) return firstArray as any[];
          // Single section object -- wrap it
          if (parsed.id && parsed.content) return [parsed];
        }
        console.error("[EAP callLLM] Unexpected response shape:", JSON.stringify(parsed).slice(0, 300));
        return [];
      }

      // Build section prompts -- run sequentially to avoid parallel timeout issues
      const sectionPromptBase = `${sharedContext}

Return ONLY a raw JSON array -- no markdown, no code fences, no explanation. Start your response with '[' and end with ']'.
Each element must be an object with: id (string), title (string), content (string -- 3-4 paragraphs of facility-specific prose), recommendations (array of {action, priority, basis} where priority is one of: Immediate, 30 Days, 60 Days, 90 Days, Long-Term).`;

      const isHealthcare = (facility.facilityType ?? "").toLowerCase().includes("health") || (facility.facilityType ?? "").toLowerCase().includes("medical") || (facility.facilityType ?? "").toLowerCase().includes("hospital") || (facility.facilityType ?? "").toLowerCase().includes("clinic");

      const batch1Prompt = `${sectionPromptBase}

Generate these 6 EAP sections. For ALL recommendations, cite the correct standard from the Basis Library -- never use ACTD as a basis outside of Sections 8 and 9:
1. id: "s1_purpose" -- Purpose, Scope & Legal Authority: Define the plan's intent, who it covers (all staff, visitors, contractors), the regulatory basis (OSHA 29 CFR 1910.38, NFPA 3000 (PS) S6, FEMA NIMS/ICS), and the facility's commitment to safety. Basis for all recommendations: OSHA 29 CFR 1910.38.
2. id: "s2_facility_profile" -- Facility Profile & Threat Environment: Physical description, occupancy, operating hours, access points, known threat landscape specific to this facility type and location. Basis: NFPA 3000 (PS) S7.
3. id: "s3_risk_assessment" -- Risk Assessment Summary: Summarize the audit findings, risk levels by category, top vulnerabilities, and overall risk rating for this specific facility. Basis: NFPA 3000 (PS) S7.
4. id: "s4_roles" -- Roles, Responsibilities & ICS Structure: ICS roles assigned to this facility size (${facilitySize}). ALWAYS write Site Lead as "Site Lead (functions as Incident Commander per NIMS)". Include primary/backup assignments, chain of command, and specific duties. Basis: FEMA NIMS / ICS.
5. id: "s5_communication" -- Communication Protocols: Internal/external notification chains, mass notification systems, backup communication methods, and who notifies whom in what order. Basis: OSHA 29 CFR 1910.38 (Reporting Procedures), OSHA 29 CFR 1910.165.
6. id: "s6_evacuation" -- Evacuation Procedures: Primary/secondary evacuation routes specific to this facility, assembly points, accountability procedures, and special considerations. Basis: OSHA 29 CFR 1910.38 (Evacuation Procedures & Exit Routes).`;

      const batch2Prompt = `${sectionPromptBase}

Generate these 6 EAP sections. For ALL recommendations, cite the correct standard -- ACTD may ONLY be cited in sections s8_actd and s9_active_threat:
1. id: "s7_lockdown" -- Lockdown & Lockout Procedures: Step-by-step lockdown/lockout protocols specific to this facility's layout, door securing procedures, communication during lockdown, and when to use each protocol. Basis: OSHA 29 CFR 1910.38, OSHA 29 CFR 1910.165.
2. id: "s8_actd" -- ACTD Response Framework: Detailed Assess â†’ Commit â†’ Take Action (Lockout/Lockdown/Escape/Defend) â†’ Debrief protocol tailored to this facility's specific layout and threat profile. Basis: ACTD Framework (aligned with CISA active threat preparedness principles). This is the ONLY section where ACTD is cited as a basis.
3. id: "s9_active_threat" -- Active Threat & Active Shooter Response: Specific protocols for active shooter/threat scenarios using the ACTD model -- NEVER Run/Hide/Fight language. Tailor to this facility's access points and layout. Basis: ACTD Framework (aligned with CISA active threat preparedness principles), NFPA 3000 (PS) S19.
4. id: "s10_medical" -- Medical Emergency & Casualty Care: First aid response procedures, AED locations (if known), triage procedures, EMS coordination, and bleeding control (STOP THE BLEED protocol). For any AED recommendation, cite BOTH AHA/ILCOR 2020 Guidelines AND OSHA 3185. Basis: OSHA 29 CFR 1910.38 (Rescue & Medical Duties), AHA/ILCOR 2020 Guidelines, OSHA 3185.
5. id: "s11_reunification" -- Family Reunification & Accountability: Post-incident reunification site selection, accountability procedures, family notification process, and visitor release protocols. Basis: FEMA NIMS/ICS, NFPA 1600 (Family Reunification).
6. id: "s12_media" -- Media & Public Information Management: Designated spokesperson, approved messaging protocols, social media guidelines, and how to handle media inquiries during and after an incident. Basis: FEMA NIMS/ICS, NFPA 1600 (Crisis Communications).`;

      const batch3Prompt = `${sectionPromptBase}

Generate these 5 EAP sections. NEVER cite ACTD as a basis in any of these sections. Use only the standards listed:
1. id: "s13_training" -- Training, Drills & Exercise Program: Required drill frequency -- micro drills ongoing, extended drills minimum annually (NFPA 3000 alignment). Exercise types (tabletop, functional, full-scale), after-action review process, and staff training requirements. Basis: NFPA 3000 (PS) S10-14, OSHA 29 CFR 1910.38. DO NOT cite ACTD here.
2. id: "s14_continuity" -- Business Continuity & Recovery: Critical function restoration, alternate site operations, data/records recovery, vendor/supplier continuity, and recovery priorities. Basis: NFPA 1600 (Business Continuity & Recovery). DO NOT cite ACTD here.
3. id: "s15_special_populations" -- Special Populations & Accessibility: Procedures for individuals with disabilities, non-English speakers, visitors, and contractors. MUST cite ADA Title III and Section 504 (Rehabilitation Act) for disability-related recommendations. Basis: ADA Title III, Section 504 (Rehabilitation Act), OSHA 29 CFR 1910.38. DO NOT cite ACTD here.
4. id: "s16_maintenance" -- Plan Maintenance & Review Schedule: Annual review cycle, trigger events for immediate revision (incidents, facility changes, personnel changes), version control, and distribution list. Basis: OSHA 29 CFR 1910.38, NFPA 1600 (Plan Maintenance & Review). DO NOT cite ACTD here.
5. id: "s17_appendices" -- Appendices & Supporting Documents: Contact directories (emergency services, key staff, vendors), floor plan references, resource lists, mutual aid agreements, and supporting regulatory references. Basis: OSHA 29 CFR 1910.38 (Named Contact Person), FEMA NIMS/ICS. DO NOT cite ACTD here.`;

      // Batch 4: New required sections (TAT, Employee Alarm System, OSHA Compliance Mapping, conditional HIPAA)
      const batch4Prompt = `${sectionPromptBase}

Generate ${isHealthcare ? "4" : "3"} EAP sections. NEVER cite ACTD as a basis in any of these sections:
1. id: "s18_tat" -- Threat Assessment Team (TAT) & Pre-Incident Intervention: Multidisciplinary team structure (HR, security, management, legal), behavioral threat reporting process, escalation workflow from concern to intervention, and intervention protocols. Basis: NFPA 3000 (PS) S6 (Multidisciplinary Planning Requirements), NFPA 3000 (PS) S7 (Risk Assessment).
2. id: "s19_alarm_system" -- Employee Alarm & Notification System: Real-time alert capabilities, distinct signal types (lockdown vs. evacuation vs. shelter-in-place), system maintenance expectations, and testing frequency. Basis: OSHA 29 CFR 1910.165 (Employee Alarm Systems). This section MUST explicitly cite OSHA 1910.165 in every recommendation.
3. id: "s20_osha_compliance" -- OSHA 29 CFR 1910.38 Compliance Mapping: Explicitly map all 6 required elements: (1) Reporting procedures, (2) Evacuation procedures and exit routes, (3) Critical operations before evacuation, (4) Employee accountability, (5) Rescue and medical duties, (6) Named contact person by role/title. Format as a clear 1:1 mapping table in the content field. This section exists to allow an auditor to validate compliance in one place. Basis: OSHA 29 CFR 1910.38.${isHealthcare ? `
4. id: "s21_hipaa" -- HIPAA & Emergency Disclosure Considerations (Healthcare Only): 45 CFR 164.510 allowances for emergency disclosures, family notification boundaries during an incident, and media communication safeguards for protected health information. Basis: HIPAA 45 CFR 164.510 (Permitted Uses & Disclosures in Emergencies).` : ""}`;

      // Run all 4 batches sequentially to avoid parallel timeout/rate-limit issues
      const batch1Sections = await callLLM(batch1Prompt);
      const batch2Sections = await callLLM(batch2Prompt);
      const batch3Sections = await callLLM(batch3Prompt);
      const batch4Sections = await callLLM(batch4Prompt);

      const allSections = [...batch1Sections, ...batch2Sections, ...batch3Sections, ...batch4Sections];

      // Build the executive summary from the first batch result
      const execSummarySection = allSections.find((s: any) => s.id === "s3_risk_assessment");
      const executiveSummary = execSummarySection
        ? `This Emergency Action Plan has been developed for ${facility.name} following a comprehensive workplace safety assessment. The facility has been assessed at an overall risk level of ${audit.overallRiskLevel ?? "Unknown"}. ${execSummarySection.content?.split("\n")[0] ?? ""}`
        : `This Emergency Action Plan has been developed for ${facility.name} following a comprehensive workplace safety assessment conducted on ${effectiveDateStr}. The plan is aligned with FEMA NIMS/ICS, NFPA 3000 (PS), OSHA 29 CFR 1910.38, OSHA 29 CFR 1910.165, NFPA 1600, and the ACTD Framework (aligned with CISA active threat preparedness principles).`;

      const eapData = {
        planTitle: `Emergency Action Plan -- ${facility.name}`,
        effectiveDate: effectiveDateStr,
        reviewDate: reviewDateStr,
        facilitySize,
        assignedRoles,
        standardsAlignment: ["FEMA NIMS", "FEMA ICS", "NFPA 3000 (PS)", "OSHA 29 CFR 1910.38", "OSHA 29 CFR 1910.165", "NFPA 1600", "ACTD Framework (aligned with CISA active threat preparedness principles)"],
        executiveSummary,
        sections: allSections,
      };

      // Save the generated EAP to the database for fast retrieval
      // Drizzle json() column expects a plain JS object, not a string
      const plainEapData = JSON.parse(JSON.stringify(eapData));
      await updateAudit(input.auditId, {
        eapJson: plainEapData as any,
        eapGeneratedAt: new Date(),
      });

      // Verify the save worked by reading back
      const verify = await getAuditById(input.auditId);
      const saved = (verify as any)?.eapJson;
      if (!saved) {
        console.error("[EAP] Save verification failed -- eapJson is empty/truthy after updateAudit for audit", input.auditId);
        console.error("[EAP] saved value type:", typeof saved, "saved keys:", saved ? Object.keys(saved).slice(0,5) : "null");
      } else {
        console.log("[EAP] Save success for audit", input.auditId, "type:", typeof saved, "sections:", Array.isArray((saved as any)?.sections) ? (saved as any).sections.length : "N/A");
      }

      return {
        facilityName: facility.name,
        facilityType: facility.facilityType,
        address: `${facility.address ?? ""}, ${facility.city ?? ""}, ${facility.state ?? ""}`,
        overallRiskLevel: audit.overallRiskLevel ?? "Unknown",
        highRiskCategories,
        generatedAt: new Date(),
        ...eapData,
      };
    }),
    generateAIRecommendations: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND" });
      const facility = await getFacilityById(audit.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      const responses = await getResponsesByAudit(input.auditId);

      // Only process findings that scored >= 1 (have a concern) and are NOT marked unavoidable
      const findings = responses
        .filter((r) => r.score !== null && (r.score ?? 0) >= 1 && !(r as any).isUnavoidable)
        .map((r) => ({
          questionId: r.questionId,
          category: r.categoryName,
          question: r.questionText,
          response: r.response ?? "Unknown",
          score: r.score ?? 0,
          conditionType: r.conditionType ?? "Observed Condition",
          notes: r.notes ?? "",
          priority: r.score === 3 ? "Immediate" : r.score === 2 ? "30 Day" : r.score === 1 ? "90 Day" : "Long-Term",
        }))
        .sort((a, b) => b.score - a.score);
      // Unavoidable constraints -- pass to LLM as context so it can plan around them
      const unavoidableItems = responses
        .filter((r) => (r as any).isUnavoidable && r.score !== null && (r.score ?? 0) >= 1)
        .map((r) => `- ${r.questionText} (${r.response ?? "Unknown"})${r.notes ? " -- " + r.notes : ""}`);
      if (findings.length === 0) {
        return { recommendations: [] };
      }
      const facilityContext = [
        `Facility Name: ${facility.name}`,
        `Facility Type: ${facility.facilityType}`,
        facility.squareFootage ? `Size: ${facility.squareFootage.toLocaleString()} sq. ft.` : "",
        facility.floors ? `Floors: ${facility.floors}` : "",
        facility.maxOccupancy ? `Max Occupancy: ${facility.maxOccupancy}` : "",
        facility.operatingHours ? `Operating Hours: ${facility.operatingHours}` : "",
        facility.eveningOperations ? "Has evening/after-hours operations" : "",
        facility.multiTenant ? "Multi-tenant building" : "",
        facility.publicAccessWithoutScreening ? "Has public access without screening" : "",
      ].filter(Boolean).join(", ");

      const findingsText = findings.map((f, i) =>
        `${i + 1}. [${f.priority} Priority | Score: ${f.score}/3 | ${f.category}]\n   Issue: ${f.question}\n   Observed: ${f.response}${f.notes ? `\n   Auditor Notes: ${f.notes}` : ""}`
      ).join("\n\n");

      const unavoidableSection = unavoidableItems.length > 0
        ? `\nPERMANENT / UNAVOIDABLE CONSTRAINTS (these CANNOT be changed -- do NOT recommend corrective actions for these; instead, reference them as context when planning compensating controls for other findings):\n${unavoidableItems.join("\n")}\n`
        : "";
      const { buildScoringContext: bsc } = await import("./_core/aiContext");
      const scoringCtx = bsc();
      const prompt = `You are a professional workplace violence threat assessment expert and physical security consultant. Generate specific, actionable corrective action recommendations for the following audit findings.
FACILITY: ${facilityContext}${unavoidableSection}
SCORING METHODOLOGY TO USE:
${scoringCtx}

AUDIT FINDINGS REQUIRING CORRECTIVE ACTION:
${findingsText}
For each finding, provide a recommendation that:
1. Acknowledges real-world operational constraints (e.g., if parking cannot be removed, suggest compensating controls like mirrors, cameras, or increased patrols)
2. Offers both an ideal solution AND a practical compensating control if the ideal is not feasible
3. Is specific to the facility type and context
4. References applicable standards (OSHA, CISA, NFPA 3000, CPTED) where relevant
5. Is written in plain language that non-security professionals can understand and act on
6. Includes an estimated implementation difficulty: Low / Medium / High
7. Includes estimated cost range: No Cost / Low Cost (<$500) / Moderate ($500-$5,000) / Significant (>$5,000)

Return a JSON array with exactly ${findings.length} objects, one per finding, in the same order as the input findings:
[
  {
    "questionId": "the exact questionId from the finding",
    "primaryRecommendation": "The ideal corrective action (2-4 sentences)",
    "compensatingControl": "If the primary action is not feasible, this alternative mitigates the risk (1-3 sentences). Leave empty string if not applicable.",
    "implementationDifficulty": "Low|Medium|High",
    "estimatedCost": "No Cost|Low Cost (<$500)|Moderate ($500-$5,000)|Significant (>$5,000)",
    "standardsReference": "Relevant standard or principle (e.g., CPTED Principle: Natural Surveillance)",
    "timeframe": "Immediate|30 Days|90 Days|Long-Term"
  }
]`;

      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional physical security and workplace violence prevention consultant. Generate practical, context-aware corrective action recommendations. Return ONLY a raw JSON object -- no markdown, no code fences, no explanation. Start your response with '{' and end with '}'." },
          { role: "user", content: prompt },
        ],
      });
      const rawContent = llmResponse.choices?.[0]?.message?.content ?? "{}";
      const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const cleanedContent = contentStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      let recommendations: any[] = [];
      try {
        const parsed = JSON.parse(cleanedContent);
        recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendations ?? Object.values(parsed));
      } catch {
        recommendations = [];
      }
      // Merge AI recommendations back with original finding dataa
      const merged = findings.map((f) => {
        const aiRec = recommendations.find((r: any) => r.questionId === f.questionId) ?? {};
        return {
          ...f,
          primaryRecommendation: aiRec.primaryRecommendation ?? "",
          compensatingControl: aiRec.compensatingControl ?? "",
          implementationDifficulty: aiRec.implementationDifficulty ?? "Medium",
          estimatedCost: aiRec.estimatedCost ?? "Unknown",
          standardsReference: aiRec.standardsReference ?? "",
          timeframe: aiRec.timeframe ?? f.priority,
        };
      });

      return { recommendations: merged };
    }),
});

// â”€â”€â”€ Photo Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const photoRouter = router({
  list: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getPhotosByAudit(input.auditId);
    }),

  upload: paidProcedure
    .input(z.object({
      auditId: z.number(),
      auditResponseId: z.number().optional(),
      base64Data: z.string(),
      mimeType: z.string(),
      caption: z.string().optional(),
      photoType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const fileKey = `audit-photos/${input.auditId}/${nanoid()}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await createAuditPhoto({
        auditId: input.auditId,
        auditResponseId: input.auditResponseId,
        url,
        fileKey,
        caption: input.caption,
        photoType: input.photoType,
      });
      return { url, fileKey };
    }),

  delete: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePhoto(input.id);
      return { success: true };
    }),
});

// â”€â”€â”€ Dashboard Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const dashboardRouter = router({
  summary: paidProcedure.query(async ({ ctx }) => {
    // Resolve the user's org
    const memberships = await getOrgMembershipForUser(ctx.user.id);
    const orgId = memberships[0]?.orgId;
    const isPlatformAdmin = (["admin","ultra_admin"].includes(ctx.user.role));

    let facilitiesForDashboard;
    if (orgId) {
      facilitiesForDashboard = await getFacilitiesByOrg(orgId);
    } else {
      facilitiesForDashboard = await getFacilitiesByUser(ctx.user.id);
    }

    // For audits, get by user if no org, otherwise get by org's facilities
    let userAudits = [];
    if (orgId) {
      // Get all audits for org's facilities
      const facilityIds = facilitiesForDashboard.map(f => f.id);
      const db = await getDb();
      if (db && facilityIds.length > 0) {
        const { inArray, desc } = await import("drizzle-orm");
        const { audits: auditsTable } = await import("../drizzle/schema");
        userAudits = await db.select().from(auditsTable)
          .where(inArray(auditsTable.facilityId, facilityIds))
          .orderBy(desc(auditsTable.createdAt));
      }
    } else {
      userAudits = await getAuditsByUser(ctx.user.id);
    }

    const completedAudits = userAudits.filter((a: any) => a.status === "completed");
    const inProgressAudits = userAudits.filter((a: any) => a.status === "in_progress");

    const riskDistribution: Record<string, number> = {
      Low: 0, Moderate: 0, Elevated: 0, High: 0, Critical: 0,
    };
    for (const audit of completedAudits) {
      if (audit.overallRiskLevel) {
        riskDistribution[audit.overallRiskLevel] = (riskDistribution[audit.overallRiskLevel] ?? 0) + 1;
      }
    }

    return {
      totalFacilities: facilitiesForDashboard.length,
      totalAudits: userAudits.length,
      completedAudits: completedAudits.length,
      inProgressAudits: inProgressAudits.length,
      riskDistribution,
      recentAudits: userAudits.slice(0, 5),
      facilities: facilitiesForDashboard,
    };
  }),
});

// â”€â”€â”€ Feedback Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const feedbackRouter = router({
  submitFeedback: paidProcedure
    .input(z.object({
      auditId: z.number(),
      facilityId: z.number(),
      facilityType: z.string().optional(),
      completionTimeMinutes: z.number().optional(),
      overallReportQuality: z.number().min(1).max(5).optional(),
      scoringAccuracy: z.number().min(1).max(5).optional(),
      correctiveActionRealism: z.number().min(1).max(5).optional(),
      eapCompleteness: z.number().min(1).max(5).optional(),
      questionRelevance: z.number().min(1).max(5).optional(),
      missingQuestions: z.string().optional(),
      irrelevantQuestions: z.string().optional(),
      correctiveActionIssues: z.string().optional(),
      scoringDisagreements: z.string().optional(),
      eapFeedback: z.string().optional(),
      generalNotes: z.string().optional(),
      wouldUseForClient: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createTesterFeedback({ ...input, userId: ctx.user.id });
      return { success: true };
    }),

  getFeedbackForAudit: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      return getFeedbackByAudit(input.auditId);
    }),

  listAll: paidProcedure.query(async ({ ctx }) => {
    if ((!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
    return getAllTesterFeedback();
  }),

  flagQuestion: paidProcedure
    .input(z.object({
      auditId: z.number(),
      questionId: z.string(),
      questionText: z.string(),
      categoryName: z.string(),
      flagType: z.enum([
        "wrong_response_options",
        "question_unclear",
        "not_applicable_to_facility",
        "scoring_seems_wrong",
        "missing_context",
        "other",
      ]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createQuestionFlag({ ...input, userId: ctx.user.id });
      return { success: true };
    }),

  getFlags: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      return getQuestionFlagsByAudit(input.auditId);
    }),

  getAllFlags: paidProcedure.query(async ({ ctx }) => {
    if ((!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
    return getAllQuestionFlags();
  }),
});

// â”€â”€â”€ App Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Incident Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const incidentRouter = router({
  // Public: submit anonymous incident report
  submit: publicProcedure
    .input(z.object({
      orgId: z.number().optional(),
      facilityId: z.number().optional(),
      facilityName: z.string().optional(),
      incidentType: z.enum([
        "threatening_behavior", "suspicious_person", "observed_safety_gap",
        "workplace_violence", "other"
      ]),
      severity: z.enum(["low", "moderate", "high", "critical"]),
      incidentDate: z.string().optional(),
      location: z.string().optional(),
      description: z.string().min(10),
      involvedParties: z.string().optional(),
      witnesses: z.string().optional(),
      priorIncidents: z.boolean().default(false),
      reportedToAuthorities: z.boolean().default(false),
      reporterRole: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      // OSHA 29 CFR 1904 fields
      involvesInjuryOrIllness: z.boolean().default(false),
      injuryType: z.enum(["injury", "skin_disorder", "respiratory", "poisoning", "hearing_loss", "other_illness", "other_injury"]).optional(),
      bodyPartAffected: z.string().optional(),
      injuryDescription: z.string().optional(),
      medicalTreatment: z.enum(["first_aid_only", "medical_treatment", "emergency_room", "hospitalized"]).optional(),
      daysAwayFromWork: z.number().int().optional(),
      daysOnRestriction: z.number().int().optional(),
      lossOfConsciousness: z.boolean().default(false),
      workRelated: z.boolean().default(true),
      oshaRecordable: z.boolean().default(false),
      employeeName: z.string().optional(),
      employeeJobTitle: z.string().optional(),
      employeeDateOfBirth: z.string().optional(),
      employeeDateHired: z.string().optional(),
      physicianName: z.string().optional(),
      treatedInER: z.boolean().default(false),
      hospitalizedOvernight: z.boolean().default(false),
      // Follow-up request fields
      followUpRequested: z.boolean().default(false),
      followUpMethod: z.enum(["phone", "email", "in_person"]).optional(),
      followUpContact: z.string().optional(),
      // Repeat incident tracking -- name of involved person
      involvedPersonName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const trackingToken = nanoid(16);
      const result = await createIncidentReport({
        ...input,
        incidentDate: input.incidentDate ? new Date(input.incidentDate) : undefined,
        contactEmail: input.contactEmail || undefined,
        followUpRequested: input.followUpRequested,
        followUpMethod: input.followUpMethod,
        followUpContact: input.followUpContact || undefined,
        involvedPersonName: input.involvedPersonName || undefined,
        trackingToken,
      });
      const newId = (result as any)?.insertId as number | undefined;
      // â”€â”€ Threat keyword scanning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (newId) {
        try {
          const scanResult = scanText(input.description, input.involvedParties, input.witnesses);
          if (scanResult.flags.length > 0) {
            await updateIncidentThreatFlags(
              newId,
              JSON.stringify(scanResult.flags),
              scanResult.maxSeverity
            );
          }
        } catch {
          // Non-blocking -- don't fail the submission if scanning errors
        }
      }
      // â”€â”€ Repeat incident detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const [similarIncidents, personIncidents] = await Promise.all([
        findSimilarIncidents(input.incidentType, input.facilityId, newId),
        input.involvedPersonName
          ? findIncidentsByPerson(input.involvedPersonName, newId)
          : Promise.resolve([]),
      ]);
      const notifyParts: string[] = [];
      if (similarIncidents.length > 0) {
        notifyParts.push(
          `âš ï¸ Repeat Pattern Detected: ${similarIncidents.length} similar incident(s) of type "${input.incidentType}" have been reported in the last 12 months.`
        );
      }
      if (personIncidents.length > 0) {
        notifyParts.push(
          `ðŸ‘¤ Repeat Person Detected: ${personIncidents.length} prior incident(s) involving "${input.involvedPersonName}" have been reported in the last 12 months.`
        );
      }
      if (notifyParts.length > 0) {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `ðŸ” Repeat Incident Alert -- ${input.incidentType.replace(/_/g, " ")}`,
          content: [
            `A new incident report (token: ${trackingToken}) has been submitted and matches existing patterns:`,
            ...notifyParts,
            `Facility: ${input.facilityName ?? "Not specified"}`,
            `Severity: ${input.severity}`,
            `Please review the Incident Dashboard for details.`,
          ].join("\n"),
        }).catch(() => {/* non-blocking */});
      }
      // Log anonymously -- no userId stored for anonymous reports
      await writeAuditLog(
        { orgId: input.orgId ?? null, ipAddress: null, userAgent: null },
        {
          action: "incident_submitted",
          entityType: "incident_report",
          entityId: trackingToken,
          description: `Anonymous incident report submitted (type: ${input.incidentType}, severity: ${input.severity})`,
          metadata: { incidentType: input.incidentType, severity: input.severity, orgId: input.orgId },
        }
      );
      return {
        success: true,
        trackingToken,
        repeatPatternDetected: similarIncidents.length > 0,
        repeatPersonDetected: personIncidents.length > 0,
      };
    }),
  // Public: check status by tracking token
  checkStatus: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const report = await getIncidentReportByToken(input.token);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      // Return limited info only -- no admin notes exposed publicly
      return {
        id: report.id,
        status: report.status,
        incidentType: report.incidentType,
        severity: report.severity,
        createdAt: report.createdAt,
        trackingToken: report.trackingToken,
      };
    }),

  // Protected (admin): list all incident reports
  list: paidProcedure
    .input(z.object({ facilityId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      // Ultra admins (FiveStones staff) can list across all orgs
      if (ctx.user.role === "ultra_admin") {
        return getIncidentReports(input.facilityId);
      }
      // Platform admin: scope to their org context or require facilityId
      if (ctx.user.role === "admin") {
        if (input.facilityId) {
          return getIncidentReports(input.facilityId);
        }
        const memberships = await getOrgMembershipForUser(ctx.user.id);
        const orgId = memberships[0]?.orgId;
        if (orgId) {
          return getIncidentReportsByOrg(orgId);
        }
        throw new TRPCError({ code: "FORBIDDEN", message: "facilityId or org membership required" });
      }
      // Org members: show only their org's incidents
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships[0]?.orgId;
      if (orgId) {
        return getIncidentReportsByOrg(orgId);
      }
      // Fallback: facility-owned reports
      if (!input.facilityId) throw new TRPCError({ code: "FORBIDDEN", message: "facilityId required" });
      const facility = await getFacilityById(input.facilityId);
      if (!facility) throw new TRPCError({ code: "NOT_FOUND" });
      const isOwner = facility.userId === ctx.user.id;
      if (!isOwner) throw new TRPCError({ code: "FORBIDDEN" });
      return getIncidentReports(input.facilityId);
    }),

  // Protected (admin): update status and notes
  updateStatus: paidProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "under_review", "resolved", "referred"]),
      adminNotes: z.string().optional(),
      referredTo: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateIncidentReportStatus(
        input.id,
        input.status,
        input.adminNotes ?? null,
        ctx.user.id,
        input.referredTo
      );

      const report = await getIncidentReportById(input.id);
      if (report?.contactEmail) {
        try {
          const statusLabels: Record<string, string> = {
            new: "Received",
            under_review: "Under Review",
            resolved: "Resolved",
            referred: "Referred",
          };
          const statusLabel = statusLabels[input.status] ?? input.status;
          const appUrl = process.env.APP_BASE_URL || "https://staging.fivestonestechnology.com";
          await sendGhlEmail({
            toEmail: report.contactEmail,
            toName: report.contactEmail,
            subject: "Your incident report has been updated",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <div style="background:#0B1F33;padding:16px 24px;border-radius:8px 8px 0 0;">
                  <h2 style="color:#fff;margin:0;font-size:18px;">FiveStones Workplace Violence Prevention</h2>
                </div>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
                  <p style="font-size:15px;color:#111827;margin-top:0;">Hello,</p>
                  <p style="font-size:14px;color:#374151;">The incident report you submitted has been updated by our safety team.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
                    <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;width:140px;">Report Token</td><td style="padding:8px;border:1px solid #e5e7eb;">${report.trackingToken}</td></tr>
                    <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;">Status</td><td style="padding:8px;border:1px solid #e5e7eb;">${statusLabel}</td></tr>
                    <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;">Incident Type</td><td style="padding:8px;border:1px solid #e5e7eb;">${(report.incidentType ?? "").replace(/_/g, " ")}</td></tr>
                    <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;">Severity</td><td style="padding:8px;border:1px solid #e5e7eb;">${report.severity ?? "--"}</td></tr>
                  </table>
                  <a href="${appUrl}/check-report?token=${encodeURIComponent(String(report.trackingToken ?? ""))}" style="display:inline-block;background:#0B1F33;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;margin-top:8px;">Check Status</a>
                  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">This is an automated notification from FiveStones WPV. Do not reply to this email.</p>
                </div>
              </div>
            `,
          });
        } catch (err) {
          console.error("[incident.updateStatus] Failed to send reporter notification email:", err);
        }
      }

      // Send email notification to the referred person
      if (input.status === "referred" && input.referredTo) {
        try {
          const report = await getIncidentReportById(input.id);
          const allUsers = await getAllUsers();
          const referredUser = allUsers.find(u => u.id === input.referredTo);
          const referredByName = ctx.user.name || ctx.user.email;
          if (referredUser?.email) {
            const appUrl = process.env.APP_BASE_URL || "https://staging.fivestonestechnology.com";
            await sendGhlEmail({
              toEmail: referredUser.email,
              toName: referredUser.name || referredUser.email,
              subject: "A concern has been raised with you \u2014 FiveStones WPV",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                  <div style="background:#0B1F33;padding:16px 24px;border-radius:8px 8px 0 0;">
                    <h2 style="color:#fff;margin:0;font-size:18px;">FiveStones Workplace Violence Prevention</h2>
                  </div>
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
                    <p style="font-size:15px;color:#111827;margin-top:0;">Hi ${referredUser.name || referredUser.email},</p>
                    <p style="font-size:14px;color:#374151;"><strong>${referredByName}</strong> has referred an incident report to you for review.</p>
                    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
                      <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;width:140px;">Report ID</td><td style="padding:8px;border:1px solid #e5e7eb;">#${report?.id ?? input.id}</td></tr>
                      <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;">Incident Type</td><td style="padding:8px;border:1px solid #e5e7eb;">${(report?.incidentType ?? "").replace(/_/g, " ") || "\u2014"}</td></tr>
                      <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;">Severity</td><td style="padding:8px;border:1px solid #e5e7eb;">${report?.severity ?? "\u2014"}</td></tr>
                      <tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;">Facility</td><td style="padding:8px;border:1px solid #e5e7eb;">${report?.facilityName ?? "\u2014"}</td></tr>
                      ${input.adminNotes ? `<tr><td style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:600;">Notes</td><td style="padding:8px;border:1px solid #e5e7eb;">${input.adminNotes}</td></tr>` : ""}
                    </table>
                    <a href="${appUrl}/incidents" style="display:inline-block;background:#0B1F33;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;margin-top:8px;">View Incident Reports</a>
                    <p style="font-size:12px;color:#9ca3af;margin-top:24px;">This is an automated notification from FiveStones WPV. Do not reply to this email.</p>
                  </div>
                </div>
              `,
            });
          }
        } catch (err) {
          // Non-blocking \u2014 don't fail the status update if email fails
          console.error("[incident.updateStatus] Failed to send referral email:", err);
        }
      }

      return { success: true };
    }),
  // Protected (admin/auditor): look up a specific incident report by tracking token
  adminLookup: paidProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const report = await getIncidentReportByToken(input.token);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "No report found with that tracking token." });
      return report;
    }),
  // Protected (admin): find similar incidents by type for repeat detection
  findSimilar: paidProcedure
    .input(z.object({
      incidentType: z.string(),
      facilityId: z.number().optional(),
      excludeId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return findSimilarIncidents(input.incidentType, input.facilityId, input.excludeId);
    }),
  // Protected (admin): find incidents involving the same person
  findByPerson: paidProcedure
    .input(z.object({
      personName: z.string().min(1),
      excludeId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return findIncidentsByPerson(input.personName, input.excludeId);
    }),
  // Protected (admin): manually mark a report as a repeat incident
  markRepeat: paidProcedure
    .input(z.object({
      id: z.number(),
      repeatGroupId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      await markAsRepeatIncident(input.id, input.repeatGroupId);
      return { success: true };
    }),

  // Delete an incident report (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const deleted = await deleteIncidentReport(input.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Incident report not found" });
      return { success: true };
    }),
});

// â”€â”€â”€ Attachment Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const attachmentTrpcRouter = router({
  list: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      return getFacilityAttachments(input.auditId);
    }),

  listByFacility: paidProcedure
    .input(z.object({ facilityId: z.number() }))
    .query(async ({ input }) => {
      return getFacilityAttachmentsByFacility(input.facilityId);
    }),

  delete: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const attachment = await getFacilityAttachmentById(input.id);
      if (!attachment) throw new TRPCError({ code: "NOT_FOUND" });
      if (attachment.uploadedBy !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteFacilityAttachment(input.id);
      return { success: true };
    }),

  analyze: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const attachment = await getFacilityAttachmentById(input.id);
      if (!attachment) throw new TRPCError({ code: "NOT_FOUND" });

      const isImage = attachment.mimeType.startsWith("image/");
      let analysis = "";

      if (isImage) {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a workplace safety and emergency preparedness expert. Analyze this facility image and identify:
1. Entry/exit points visible
2. Potential security vulnerabilities (blind spots, poor lighting, obstructions)
3. Emergency egress considerations
4. Structural features relevant to lockdown or evacuation planning
5. Any safety hazards or concerns
Be specific and concise. Focus only on safety and emergency preparedness observations.`,
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: attachment.url, detail: "high" } },
                { type: "text", text: `This is a ${attachment.category.replace("_", " ")} photo. Caption: "${attachment.caption || "none"}". Provide safety and EAP-relevant observations.` },
              ] as any,
            },
          ],
        });
        analysis = String(response.choices[0]?.message?.content || "No analysis available.");
      } else {
        analysis = "AI analysis is available for image files only. PDF and document analysis coming soon.";
      }

      await updateAttachmentAnalysis(input.id, analysis);
      return { success: true, analysis };
    }),
});

// â”€â”€â”€ Corrective Action Check Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const correctiveCheckRouter = router({
  list: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCorrectiveActionChecks(input.auditId);
    }),
  toggle: paidProcedure
    .input(z.object({
      auditId: z.number(),
      questionId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return toggleCorrectiveActionCheck(input.auditId, input.questionId, ctx.user.id, input.notes);
    }),
});

// â”€â”€â”€ Organization Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const orgRouter = router({
  // Platform admin: list all orgs
  listAll: paidProcedure.query(async ({ ctx }) => {
    if ((!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
    return getAllOrganizations();
  }),

  // Platform admin: create org
  create: paidProcedure
    .input(z.object({
      name: z.string().min(2),
      slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
      contactEmail: z.string().email().optional().or(z.literal("")),
      logoUrl: z.string().url().optional().or(z.literal("")),
    }))
    .mutation(async ({ ctx, input }) => {
      if ((!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      const existing = await getOrganizationBySlug(input.slug);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "An organization with this slug already exists" });
      return createOrganization({
        name: input.name,
        slug: input.slug,
        contactEmail: input.contactEmail || undefined,
        logoUrl: input.logoUrl || undefined,
        createdByUserId: ctx.user.id,
      });
    }),

  // Platform admin: update org
  update: paidProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      logoUrl: z.string().url().optional().or(z.literal("")),
      websiteResourceLinks: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if ((!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      // Serialize websiteResourceLinks to JSON string for storage
      const updateData: Record<string, unknown> = { ...data };
      if (updateData.websiteResourceLinks) {
        updateData.websiteResourceLinks = JSON.stringify(updateData.websiteResourceLinks);
      }
      await updateOrganization(id, updateData as any);
      return getOrganizationById(id);
    }),

  // Platform admin: delete org
  delete: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if ((!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteOrganization(input.id);
      return { success: true };
    }),

  // Get org by slug (public -- used for incident report portal branding)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const org = await getOrganizationBySlug(input.slug);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      // Return only public-safe fields
      return { id: org.id, name: org.name, slug: org.slug, logoUrl: org.logoUrl };
    }),

  // Get org by ID (accessible to org members)
  get: paidProcedure.input(z.object({ orgId: z.number() })).query(async ({ ctx, input }) => {
    const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
    if (!member && (!["admin", "ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
    return getOrganizationById(input.orgId);
  }),

  // Update org website resource links (accessible to org super_admin/admin or platform admin)
  updateResourceLinks: paidProcedure
    .input(z.object({
      orgId: z.number(),
      websiteResourceLinks: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      const isOrgAdmin = member?.role === "super_admin" || member?.role === "admin";
      if (!isOrgAdmin && (!["admin", "ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await updateOrganization(input.orgId, { websiteResourceLinks: JSON.stringify(input.websiteResourceLinks) } as any);
      return { success: true };
    }),

  // Get current user's org memberships
  myMemberships: paidProcedure.query(async ({ ctx }) => {
    return getOrgMembershipForUser(ctx.user.id);
  }),

  // Get members of an org (org_admin or platform admin)
  members: paidProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      if (!member && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      return getOrgMembersForOrg(input.orgId);
    }),

  personnel: router({
    list: paidProcedure
      .input(z.object({ orgId: z.number() }))
      .query(async ({ ctx, input }) => {
        const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
        if (!member && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
        return getOrgMembersWithLocations(input.orgId);
      }),

    updateLocation: paidProcedure
      .input(z.object({
        orgId: z.number(),
        latitude: z.number(),
        longitude: z.number(),
        status: z.string().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
        if (!member && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
        await upsertPersonnelLocation({
          orgId: input.orgId,
          userId: ctx.user.id,
          latitude: input.latitude,
          longitude: input.longitude,
          status: input.status ?? "Active",
        });
        return { success: true };
      }),
  }),

  // Invite a user to an org (org_admin or platform admin)
  invite: paidProcedure
    .input(z.object({
      orgId: z.number(),
      email: z.string().email(),
      role: z.enum(["super_admin", "admin", "auditor", "user", "viewer", "sandbox"]).default("auditor"),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      const isOrgSuperAdmin = member?.role === "super_admin";
      const isOrgAdminRole = member?.role === "admin";
      // Org admin can invite auditors and below, but NOT super_admin
      if (isOrgAdminRole && input.role === "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Org admins cannot invite super admins" });
      if (!isOrgSuperAdmin && !isOrgAdminRole && (!(["admin","ultra_admin"].includes(ctx.user.role)))) throw new TRPCError({ code: "FORBIDDEN" });
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await createOrgInvite({ orgId: input.orgId, email: input.email, role: input.role, token, expiresAt });
      await writeAuditLog(buildLogContext({ user: ctx.user, orgId: input.orgId, req: ctx.req }), {
        action: "invite_sent",
        entityType: "org_invite",
        description: `Invited ${input.email} to org as ${input.role}`,
        metadata: { email: input.email, role: input.role, orgId: input.orgId },
      });
      const org = await getOrganizationById(input.orgId);
      const inviteUrl = `${input.origin}/join?token=${token}`;
      // Notify platform owner of the invite
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `New org invite: ${input.email} â†’ ${org?.name}`,
          content: `Invite URL: ${inviteUrl}\nRole: ${input.role}\nExpires: ${expiresAt.toISOString()}`,
        });
      } catch {}
      return { success: true, inviteUrl, token };
    }),

  // Cancel a pending invite
  cancelInvite: paidProcedure
    .input(z.object({ inviteId: z.number(), orgId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      const isOrgAdmin = member?.role === "super_admin" || member?.role === "admin";
      if (!isOrgAdmin && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteOrgInvite(input.inviteId);
      return { success: true };
    }),

  // List pending invites for an org
  pendingInvites: paidProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      if (!member && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      return getPendingInvitesForOrg(input.orgId);
    }),

  // Accept an invite (called after login with token in URL)
  acceptInvite: paidProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await getOrgInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or already used" });
      if (invite.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This invite has already been used" });
      if (new Date() > invite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This invite has expired" });
      // Check if already a member
      const existing = await getOrgMemberRecord(invite.orgId, ctx.user.id);
      if (!existing) {
        await addOrgMember({ orgId: invite.orgId, userId: ctx.user.id, role: invite.role, joinedAt: new Date() });
      }
      await markInviteUsed(input.token);
      await writeAuditLog(buildLogContext({ user: ctx.user, orgId: invite.orgId, req: ctx.req }), {
        action: "invite_accepted",
        entityType: "org_member",
        entityId: String(ctx.user.id),
        description: `${ctx.user.name ?? ctx.user.email ?? "User"} accepted invite and joined org as ${invite.role}`,
        metadata: { orgId: invite.orgId, role: invite.role },
      });
       return { success: true, orgId: invite.orgId };
    }),
  // Update a member's role
  updateMemberRole: paidProcedure
    .input(z.object({ orgId: z.number(), userId: z.number(), role: z.enum(["super_admin", "admin", "auditor", "user", "viewer", "sandbox"]) }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      const isOrgSuperAdmin2 = member?.role === "super_admin";
      const isOrgAdminRole2 = member?.role === "admin";
      // Org admin cannot elevate anyone to super_admin
      if (isOrgAdminRole2 && input.role === "super_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Org admins cannot assign super_admin role" });
      if (!isOrgSuperAdmin2 && !isOrgAdminRole2 && (!(["admin","ultra_admin"].includes(ctx.user.role)))) throw new TRPCError({ code: "FORBIDDEN" });
      await updateOrgMemberRole(input.orgId, input.userId, input.role);
      return { success: true };
    }),

  // Remove a member
  removeMember: paidProcedure
    .input(z.object({ orgId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      const isOrgAdmin = member?.role === "super_admin" || member?.role === "admin";
      if (!isOrgAdmin && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      await removeOrgMember(input.orgId, input.userId);
      await writeAuditLog(buildLogContext({ user: ctx.user, orgId: input.orgId, req: ctx.req }), {
        action: "member_removed",
        entityType: "org_member",
        entityId: String(input.userId),
        description: `Removed member (userId: ${input.userId}) from org`,
        metadata: { orgId: input.orgId, removedUserId: input.userId },
      });
      return { success: true };
    }),

  // Get org facilities (org_admin / auditor / viewer)
  facilities: paidProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      if (!member && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      return getFacilitiesByOrg(input.orgId);
    }),

  // Get org incident reports (org_admin, auditor, viewer -- all org members)
  incidents: paidProcedure
    .input(z.object({ orgId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      // Allow any org member (org_admin, auditor, viewer) or platform admin
      if (!member && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      return getIncidentReportsByOrg(input.orgId);
    }),

  // Get audit logs for an org (org_admin only) -- ISO 27001 A.12.4
  logs: paidProcedure
    .input(z.object({ orgId: z.number(), limit: z.number().min(1).max(500).default(200) }))
    .query(async ({ ctx, input }) => {
      const member = await getOrgMemberRecord(input.orgId, ctx.user.id);
      const isOrgAdmin = member?.role === "super_admin" || member?.role === "admin";
      if (!isOrgAdmin && (!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      return getAuditLogsByOrg(input.orgId, input.limit);
    }),

  // Get all audit logs -- platform admin only
  allLogs: paidProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(500) }))
    .query(async ({ ctx, input }) => {
      if ((!["admin","ultra_admin"].includes(ctx.user.role))) throw new TRPCError({ code: "FORBIDDEN" });
      return getAllAuditLogs(input.limit);
    }),
});

// â”€â”€â”€ Visitor Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ EAP Section Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const eapRouter = router({
  getSections: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      return getEapSectionsByAudit(input.auditId);
    }),

  saveSection: paidProcedure
    .input(z.object({
      auditId: z.number(),
      sectionId: z.string(),
      sectionTitle: z.string(),
      contentOverride: z.string().nullable().optional(),
      reviewed: z.boolean().optional(),
      applicable: z.boolean().optional(),
      auditorNotes: z.string().nullable().optional(),
      auditorRecommendations: z.array(z.object({
        action: z.string(),
        priority: z.string(),
        basis: z.string(),
      })).optional(),
      saveVersion: z.boolean().optional(),
      versionLabel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sectionRowId = await upsertEapSection({
        auditId: input.auditId,
        sectionId: input.sectionId,
        sectionTitle: input.sectionTitle,
        contentOverride: input.contentOverride,
        reviewed: input.reviewed,
        applicable: input.applicable,
        auditorNotes: input.auditorNotes,
        auditorRecommendations: input.auditorRecommendations,
        lastEditedByUserId: ctx.user.id,
      });
      if (input.saveVersion && input.contentOverride) {
        await saveEapSectionVersion({
          eapSectionId: sectionRowId,
          auditId: input.auditId,
          sectionId: input.sectionId,
          contentSnapshot: input.contentOverride,
          savedByUserId: ctx.user.id,
          label: input.versionLabel ?? null,
        });
      }
      // Invalidate the cached PDF so the next download reflects the latest content
      clearPdfCache(input.auditId);
      return { success: true };
    }),
  getVersions: paidProcedure
    .input(z.object({ auditId: z.number(), sectionId: z.string() }))
    .query(async ({ input }) => {
      return getEapSectionVersions(input.auditId, input.sectionId);
    }),

  generateExecutiveSummary: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .mutation(async ({ input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
      if (audit.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Audit must be completed" });

      const facility = await getFacilityById(audit.facilityId);
      const categoryScores = (audit.categoryScores ?? {}) as Record<string, {
        percentage: number; riskLevel: string; rawScore: number; maxScore: number; weight: number;
      }>;

      // Build a compact, data-grounded context for the LLM
      const scoringContext = (await import("./_core/aiContext")).buildScoringContext();
      const overallRisk = audit.overallRiskLevel ?? "Unknown";
      const overallScore = audit.overallScore ?? 0;

      // Separate categories by risk tier
      const highCritical = Object.entries(categoryScores)
        .filter(([, v]) => ["High", "Critical"].includes(v.riskLevel))
        .sort(([, a], [, b]) => b.percentage - a.percentage);
      const elevated = Object.entries(categoryScores)
        .filter(([, v]) => v.riskLevel === "Elevated")
        .sort(([, a], [, b]) => b.percentage - a.percentage);
      const moderate = Object.entries(categoryScores)
        .filter(([, v]) => v.riskLevel === "Moderate")
        .sort(([, a], [, b]) => b.percentage - a.percentage);

      const priorityCategories = [...highCritical, ...elevated].slice(0, 6);

      // Build recommended actions from actionEngine (same logic as frontend)
      const { generateRecommendedActions } = await import("../shared/actionEngine");
      const { actions: recommendedActions } = generateRecommendedActions({
        categoryScores,
        facilityState: facility?.state ?? null,
        facilityType: facility?.facilityType ?? null,
      });
      const topActions = recommendedActions.slice(0, 4);

      const categoryContext = priorityCategories.length > 0
        ? priorityCategories.map(([name, v]) => `- ${name}: ${v.percentage.toFixed(1)}% (${v.riskLevel})`).join("\n")
        : moderate.slice(0, 4).map(([name, v]) => `- ${name}: ${v.percentage.toFixed(1)}% (${v.riskLevel})`).join("\n");

      const actionsContext = topActions.length > 0
        ? topActions.map((a) => `- [${a.priority.toUpperCase()}] ${a.title}: ${a.description}`).join("\n")
        : "No high-priority actions identified.";

      const hasHighRisk = highCritical.length > 0;
      const hasElevated = elevated.length > 0;
      const toneGuidance = hasHighRisk
        ? "High/Critical risk: be direct about the exposure gaps. Name them. State what they affect operationally. No softening."
        : hasElevated
        ? "Elevated risk: confident and clear. State what needs to change and why it matters. No hedging."
        : "Low risk: be concise and confident. 3 sentences maximum. State the strength, name the one or two gaps worth addressing, and close with a forward directive. Do not over-explain or pad with qualifications."

      const BANNED_PHRASES = [
        "potential vulnerabilities", "it is important to note", "proactive measures are essential",
        "these findings indicate", "it should be noted", "it is worth noting",
        "overall, the facility", "in conclusion", "moving forward",
        "it is recommended", "best practices", "at the end of the day",
        "going forward", "leverage", "synergies", "holistic approach",
        "demonstrates", "reflects", "indicates", "well-positioned",
        "it is clear", "it is evident", "this suggests", "this highlights",
      ];

      const systemPrompt = `You are a senior workplace safety consultant writing an executive summary for a facility safety audit report. You have 20 years of field experience conducting threat assessments for schools, healthcare facilities, and corporate campuses.

YOUR WRITING RULES:
1. Sound like a senior consultant, not a report template. Every sentence must add meaning.
2. Translate risk into operational impact -- connect each gap to what it affects: response time, staff decision-making, visibility, control, or incident escalation.
3. Be specific. Name the actual categories. Describe what the gap means in practice.
4. Use operational language: response readiness, situational awareness, threat recognition, protective action, incident control, staff decision-making under pressure.
5. Be direct. No hedging. No passive voice. No filler.
6. Never use weak observational verbs: demonstrates, reflects, indicates, suggests, highlights. State facts directly.
7. The Leadership Focus line must be a directive, not a suggestion. It should read as an instruction, not a recommendation.

STRICTLY FORBIDDEN PHRASES (do not use any of these or similar):
- "demonstrates", "reflects", "indicates", "suggests", "highlights"
- "well-positioned", "it is clear", "it is evident"
- "potential vulnerabilities"
- "it is important to note"
- "proactive measures are essential"
- "these findings indicate"
- "it should be noted"
- "best practices"
- "moving forward"
- "in conclusion"
- "overall, the facility"
- Any phrase that could appear in any other audit report without modification

TONE REFERENCE (match this quality -- do not copy):
"The facility presents a moderate overall risk profile, with the most meaningful exposure concentrated in domestic violence preparedness, lockdown capability, lighting and visibility, and parking area security. These are not isolated issues -- they directly impact how quickly staff can recognize a threat, take protective action, and maintain control during an incident. While foundational controls are in place, gaps in these areas reduce response confidence and increase reliance on individual decision-making under pressure."

Each summary must be unique and grounded in the specific audit data provided. Do not produce generic output.`;

      const userPrompt = `AUDIT DATA:
Facility: ${facility?.name ?? "Unknown"} | Type: ${facility?.facilityType ?? "General"} | Location: ${facility?.city ?? ""}${facility?.state ? ", " + facility.state : ""}
Overall Risk: ${overallRisk} (${overallScore.toFixed(1)}% exposure score)

Highest-exposure categories (sorted by risk):
${categoryContext}

Top recommended actions:
${actionsContext}

Tone guidance: ${toneGuidance}

WRITE a JSON object with exactly these three fields:

"summary": Maximum 4 sentences -- prefer 3 for low-risk audits. Open by stating the overall risk posture and naming the 2--3 highest-exposure areas by name. In 1--2 sentences, state what those gaps mean operationally -- how they affect staff response, threat recognition, or incident control. Close with a single forward-looking statement about what the data requires next. Do NOT start with "The facility" -- vary the opening. Do NOT use any forbidden phrases. Do NOT use observational verbs (demonstrates, reflects, indicates). Write in direct, declarative sentences only.

"topPriorities": Write 2--4 bullets. Each bullet must be a specific, actionable directive tied directly to one of the top exposure categories or recommended actions. Start each with a strong action verb (Address, Establish, Implement, Conduct, Strengthen, Deploy). Maximum 20 words per bullet. No generic bullets.

"leadershipFocus": One sentence starting with "Leadership should" that reads as a direct instruction, not a suggestion. Name a specific near-term action tied to the highest-risk finding. Use imperative framing -- e.g. 'Leadership should schedule...' or 'Leadership should deploy...' -- not 'Leadership should consider...' or 'Leadership should look into...'.

Return only valid JSON. No markdown fences. No extra keys.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "executive_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                topPriorities: { type: "array", items: { type: "string" } },
                leadershipFocus: { type: "string" },
              },
              required: ["summary", "topPriorities", "leadershipFocus"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = String(response.choices?.[0]?.message?.content ?? "{}");
      let parsed: { summary: string; topPriorities: string[]; leadershipFocus: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse LLM response" });
      }

      // Enforce content rules: cap topPriorities to 4
      if (parsed.topPriorities.length > 4) parsed.topPriorities = parsed.topPriorities.slice(0, 4);
      if (parsed.topPriorities.length < 2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Insufficient priorities generated" });

      // Banned-phrase guard -- if any banned phrase appears, retry once with a stricter note
      const summaryLower = parsed.summary.toLowerCase();
      const hasBannedPhrase = BANNED_PHRASES.some((p) => summaryLower.includes(p.toLowerCase()));
      if (hasBannedPhrase) {
        const retryResponse = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
            { role: "assistant", content: raw },
            { role: "user", content: "The previous summary contains generic or forbidden phrases. Rewrite it completely. Every sentence must be specific to this facility's actual data. Do not use any of the forbidden phrases listed in the system prompt. Return only valid JSON with the same three fields." },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "executive_summary",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  topPriorities: { type: "array", items: { type: "string" } },
                  leadershipFocus: { type: "string" },
                },
                required: ["summary", "topPriorities", "leadershipFocus"],
                additionalProperties: false,
              },
            },
          },
        });
        try {
          const retryRaw = String(retryResponse.choices?.[0]?.message?.content ?? "{}");
          const retryParsed = JSON.parse(retryRaw) as typeof parsed;
          if (retryParsed.summary && retryParsed.topPriorities?.length >= 2) {
            parsed = retryParsed;
            if (parsed.topPriorities.length > 4) parsed.topPriorities = parsed.topPriorities.slice(0, 4);
          }
        } catch { /* use original if retry parse fails */ }
      }

      // Persist the generated summary to the audits table
      const summaryPayload = {
        summary: parsed.summary,
        topPriorities: parsed.topPriorities,
        leadershipFocus: parsed.leadershipFocus,
        overallRisk,
        overallScore: overallScore.toFixed(1),
        generatedAt: new Date().toISOString(),
      };
      await updateAudit(input.auditId, {
        executiveSummaryJson: summaryPayload as any,
        executiveSummaryGeneratedAt: new Date(),
      });
      return summaryPayload;
    }),
  getExecutiveSummary: paidProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) return null;
      const json = (audit as any).executiveSummaryJson as {
        summary: string;
        topPriorities: string[];
        leadershipFocus: string;
        overallRisk: string;
        overallScore: string;
        generatedAt: string;
      } | null;
      return json ?? null;
    }),
});
const visitorRouter = router({
  // List all visitor logs for the current user (optionally filtered by facility)
  list: paidProcedure
    .input(z.object({ facilityId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getVisitorLogs(ctx.user.id, input.facilityId);
    }),

  // Log a new visitor in
  create: paidProcedure
    .input(z.object({
      facilityId: z.number().optional(),
      visitorName: z.string().min(1),
      company: z.string().optional(),
      purposeOfVisit: z.string().min(1),
      hostName: z.string().optional(),
      timeIn: z.date().optional(),
      idVerified: z.boolean().default(false),
      idType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve orgId from facility or user membership
      let orgId: number | undefined;
      if (input.facilityId) {
        const facility = await getFacilityById(input.facilityId);
        if (facility?.orgId) orgId = facility.orgId;
      }
      if (!orgId) {
        const memberships = await getOrgMembershipForUser(ctx.user.id);
        orgId = memberships[0]?.orgId;
      }
      return createVisitorLog({
        ...input,
        loggedByUserId: ctx.user.id,
        orgId: orgId ?? null,
        timeIn: input.timeIn ?? new Date(),
      });
    }),

  // Record time-out for a visitor
  checkOut: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await checkOutVisitor(input.id);
      return { success: true };
    }),

  // Update visitor record (e.g., add notes or correct details)
  update: paidProcedure
    .input(z.object({
      id: z.number(),
      visitorName: z.string().optional(),
      company: z.string().optional(),
      purposeOfVisit: z.string().optional(),
      hostName: z.string().optional(),
      idVerified: z.boolean().optional(),
      idType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateVisitorLog(id, data);
      return { success: true };
    }),

  // Delete a visitor log entry
  delete: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteVisitorLog(input.id);
      return { success: true };
    }),
});

// â”€â”€â”€ Flagged Visitors (Watchlist) Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const flaggedVisitorRouter = router({
  list: paidProcedure
    .input(z.object({ activeOnly: z.boolean().optional().default(true) }))
    .query(async ({ ctx, input }) => {
      // Resolve user's org membership to scope flagged visitors by org
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships[0]?.orgId;
      if (orgId) {
        return getFlaggedVisitorsByOrg(orgId, input.activeOnly);
      }
      return getFlaggedVisitors(input.activeOnly);
    }),
  add: paidProcedure
    .input(z.object({
      name: z.string().min(1),
      reason: z.string().optional(),
      facilityId: z.number().optional(),
      flagLevel: z.enum(["red", "yellow"]).optional().default("red"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve orgId from user's membership for proper org-scoping
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships[0]?.orgId;
      await addFlaggedVisitor({
        name: input.name,
        reason: input.reason,
        addedByUserId: ctx.user.id,
        orgId,
        facilityId: input.facilityId,
        flagLevel: input.flagLevel,
      });
      return { success: true };
    }),
  deactivate: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deactivateFlaggedVisitor(input.id);
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFlaggedVisitor(input.id);
      return { success: true };
    }),
  checkName: paidProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ input }) => {
      const match = await checkVisitorAgainstWatchlist(input.name);
      return { flagged: !!match, entry: match ?? null };
    }),
  escalate: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await getFlaggedVisitorById(input.id);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Watchlist entry not found" });
      // Stamp escalation timestamp and increment count
      await stampFlaggedVisitorEscalation(input.id);
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `âš ï¸ Escalated Watchlist Entry: ${entry.name}`,
          content: [
            `A flagged visitor entry has been escalated for immediate review.`,
            `Name: ${entry.name}`,
            entry.reason ? `Reason: ${entry.reason}` : null,
            `Escalated by: ${ctx.user.name ?? ctx.user.email ?? `User #${ctx.user.id}`}`,
            `Added to watchlist: ${entry.createdAt.toISOString()}`,
            `Total escalations: ${(entry.escalationCount ?? 0) + 1}`,
          ].filter(Boolean).join("\n"),
        });
      } catch {}
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "escalate",
        entityType: "flagged_visitor",
        entityId: String(entry.id),
        description: `Escalated watchlist entry for "${entry.name}"`,
        metadata: { name: entry.name, reason: entry.reason },
      });
      return { success: true };
    }),
});

// â”€â”€â”€ Admin User Management Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminUserRouter = router({
  listAll: adminProcedure.query(async () => {
    return getAllUsers();
  }),
  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["ultra_admin", "admin", "super_admin", "auditor", "viewer", "user", "sandbox"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only ultra_admin can assign ultra_admin role
      if (input.role === "ultra_admin" && ctx.user.role !== "ultra_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Ultra Admins can assign the Ultra Admin role." });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // Update optional permission flags for an org member
  updatePermissionFlags: superAdminProcedure
    .input(z.object({
      orgId: z.number(),
      userId: z.number(),
      flags: z.object({
        canTriggerAlerts: z.boolean().optional(),
        canRunDrills: z.boolean().optional(),
        canExportReports: z.boolean().optional(),
        canViewIncidentLogs: z.boolean().optional(),
        canSubmitAnonymousReports: z.boolean().optional(),
        canAccessEap: z.boolean().optional(),
        canManageSiteAssessments: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await updateOrgMemberPermissionFlags(input.orgId, input.userId, input.flags);
      return { success: true };
    }),

  // Get org member with permission flags
  getMemberFlags: superAdminProcedure
    .input(z.object({ orgId: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      return getOrgMemberWithFlags(input.orgId, input.userId);
    }),

  // Ultra Admin: impersonate a user
  impersonateUser: ultraAdminProcedure
    .input(z.object({ targetUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Use the real admin's ID -- ctx.realAdmin is set when already impersonating
      const adminId = ctx.realAdmin?.id ?? ctx.user!.id;
      await db.update(usersTable)
        .set({ impersonatingUserId: input.targetUserId })
        .where(eq(usersTable.id, adminId));
      return { success: true, impersonatingUserId: input.targetUserId };
    }),

  // Ultra Admin: stop impersonating
  stopImpersonation: ultraAdminProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Use the real admin's ID to clear the impersonation flag
      const adminId2 = ctx.realAdmin?.id ?? ctx.user!.id;
      await db.update(usersTable)
        .set({ impersonatingUserId: null })
        .where(eq(usersTable.id, adminId2));
      return { success: true };
    }),
  // Ultra Admin: invite a new user to the platform
  inviteUser: ultraAdminProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["ultra_admin", "super_admin", "admin", "auditor", "user", "viewer", "sandbox"]).default("user"),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      // Check if user already exists
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists." });
      }
      // Create the user account with a temporary unusable password
      const { randomBytes: rb, createHash: ch } = await import("crypto");
      const openId = rb(16).toString("hex");
      const tempSalt = rb(16).toString("hex");
      const tempHash = ch("sha256")
        .update(tempSalt + rb(32).toString("hex"))
        .digest("hex");
      await upsertUser({
        openId,
        email,
        loginMethod: "email",
        name: email.split("@")[0],
        passwordHash: tempHash,
        passwordSalt: tempSalt,
        role: input.role,
        lastSignedIn: new Date(),
      });
      const newUser = await getUserByEmail(email);
      if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user." });

      // ── Sandbox provisioning ─────────────────────────────────────────────
      // Give the sandbox invitee an isolated org on the 'paid' plan so the
      // standard paidProcedure modules are reachable. Granular sandbox locks
      // are enforced separately (nav / route / procedure level).
      if (input.role === "sandbox") {
        const org = await createOrganization({
          name: `Sandbox — ${email.split("@")[0]}`,
          slug: `sandbox-${rb(4).toString("hex")}`,
          createdByUserId: newUser.id,
          contactEmail: email,
          plan: "paid",
        });
        if (org) {
          await addOrgMember({ orgId: org.id, userId: newUser.id, role: "sandbox", joinedAt: new Date() });
        }
      }
      // Set a password-reset token (48-hour expiry) used as the set-password link
      const setPasswordToken = rb(32).toString("hex");
      await setPasswordResetToken(email, setPasswordToken);
      // Also track the invite in user_invites for UI visibility
      const { nanoid } = await import("nanoid");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createUserInvite({
        email,
        role: input.role,
        token: setPasswordToken,
        invitedByUserId: ctx.user!.id,
        expiresAt,
      });
      // Build invite URL matching the SetPassword.tsx route
      const appUrl = process.env.APP_BASE_URL || input.origin;
      const inviteUrl = `${appUrl}/set-password?token=${encodeURIComponent(setPasswordToken)}`;
      const roleLabels: Record<string, string> = {
        ultra_admin: "Ultra Admin",
        super_admin: "Super Admin",
        admin: "Admin",
        auditor: "Auditor",
        user: "Staff",
        viewer: "Viewer",
        sandbox: "Sandbox (Demo)",
      };
      // Send invite email via GHL
      try {
        await sendGhlEmail({
          toEmail: email,
          toName: email.split("@")[0],
          subject: `You've been invited to FiveStones Workplace Violence Prevention`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:#0B1F33;padding:16px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:18px;">FiveStones Workplace Violence Prevention</h2>
              </div>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
                <p style="font-size:15px;color:#111827;margin-top:0;">Hello,</p>
                <p style="font-size:14px;color:#374151;">
                  You have been invited to join <strong>FiveStones WPV</strong> with the role of
                  <strong>${roleLabels[input.role] ?? input.role}</strong>.
                </p>
                <p style="font-size:14px;color:#374151;">
                  Click the button below to set your password and activate your account.
                </p>
                <a href="${inviteUrl}" style="display:inline-block;background:#0B1F33;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:15px;margin:16px 0;">Set Password & Activate Account</a>
                <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
                  This invitation expires in 48 hours. If you did not expect this invitation, you can ignore this email.
                </p>
              </div>
            </div>
          `.trim(),
        });
      } catch (emailErr: any) {
        console.warn("[Invite] Failed to send email to invitee:", emailErr?.message ?? emailErr);
      }
      return { inviteUrl };
    }),

  // Ultra Admin: list pending user invites
  listInvites: ultraAdminProcedure.query(async () => {
    return listPendingUserInvites();
  }),

  // Ultra Admin: cancel a pending invite
  cancelInvite: ultraAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteUserInvite(input.id);
      return { success: true };
    }),

  // Ultra Admin: get org memberships for a user
  getUserOrgs: ultraAdminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getOrgMembershipForUser(input.userId);
    }),

  // Ultra Admin: assign a user to an organization with a role
  assignToOrg: ultraAdminProcedure
    .input(z.object({
      userId: z.number(),
      orgId: z.number(),
      role: z.enum(["super_admin", "admin", "auditor", "user", "viewer", "sandbox"]),
    }))
    .mutation(async ({ input }) => {
      const existing = await getOrgMemberRecord(input.orgId, input.userId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a member of this organization" });
      }
      await addOrgMember({ orgId: input.orgId, userId: input.userId, role: input.role, joinedAt: new Date() });
      return { success: true };
    }),

  // Ultra Admin: remove a user from an organization
  removeFromOrg: ultraAdminProcedure
    .input(z.object({ userId: z.number(), orgId: z.number() }))
    .mutation(async ({ input }) => {
      await removeOrgMember(input.orgId, input.userId);
      return { success: true };
    }),

  // Ultra Admin: update a user's role within an organization
  updateOrgRole: ultraAdminProcedure
    .input(z.object({
      userId: z.number(),
      orgId: z.number(),
      role: z.enum(["super_admin", "admin", "auditor", "user", "viewer", "sandbox"]),
    }))
    .mutation(async ({ input }) => {
      await updateOrgMemberRole(input.orgId, input.userId, input.role);
      return { success: true };
    }),
});

// ─── Liability Scan Router ─

// â”€â”€â”€ Liability Scan Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const liabilityScanRouter = router({
  // Save a completed scan result; returns the new scanId
  save: protectedProcedure
    .input(z.object({
      score: z.number().int(),
      classification: z.string(),
      riskMapLevel: z.string(),
      riskMapColor: z.string(),
      riskMapDescriptor: z.string().optional(),
      jurisdiction: z.string(),
      industry: z.string(),
      topGaps: z.array(z.any()),
      categoryBreakdown: z.record(z.string(), z.any()),
      immediateActions: z.array(z.any()),
      interpretation: z.string().optional(),
      advisorSummary: z.string().optional(),
      answers: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve the user's orgId from their org memberships
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships.length > 0 ? memberships[0].orgId : null;
      const scanId = await insertLiabilityScan({
        userId: ctx.user.id,
        orgId,
        score: input.score,
        classification: input.classification,
        riskMapLevel: input.riskMapLevel,
        riskMapColor: input.riskMapColor,
        riskMapDescriptor: input.riskMapDescriptor ?? null,
        jurisdiction: input.jurisdiction,
        industry: input.industry,
        topGaps: input.topGaps,
        categoryBreakdown: input.categoryBreakdown,
        immediateActions: input.immediateActions,
        interpretation: input.interpretation ?? null,
        advisorSummary: input.advisorSummary ?? null,
        answers: input.answers ?? null,
        // scorePercent and defensibilityStatus are patched separately via updateTierScores
        // once the computeScore mutation resolves (avoids breaking saves if migration pending)
      });
      if (!scanId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save scan" });
      return { scanId };
    }),

  // Update tier-based scores on an existing scan (called after computeScore resolves)
  updateTierScores: protectedProcedure
    .input(z.object({
      scanId: z.number().int(),
      scorePercent: z.number().int(),
      defensibilityStatus: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const scan = await getLiabilityScanById(input.scanId);
      if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
      // Owner can always update; admins must share same org as the scan owner
      if (scan.userId === ctx.user.id) {
        await updateLiabilityScanTierScores(input.scanId, input.scorePercent, input.defensibilityStatus);
        return { success: true };
      }
      if (!["admin","ultra_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Admin: verify same org membership as the scan owner
      if (scan.orgId) {
        const membership = await getOrgMemberRecord(scan.orgId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      } else {
        // Scan has no org -- only the owner or ultra_admin can access it
        if (ctx.user.role !== "ultra_admin") throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateLiabilityScanTierScores(input.scanId, input.scorePercent, input.defensibilityStatus);
      return { success: true };
    }),
  // Get a single scan by ID (must belong to the requesting user or share same org)
  get: protectedProcedure
    .input(z.object({ scanId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const scan = await getLiabilityScanById(input.scanId);
      if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
      // Owner can always view
      if (scan.userId === ctx.user.id) return scan;
      if (!["admin","ultra_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Admin: verify same org membership as the scan owner
      if (scan.orgId) {
        const membership = await getOrgMemberRecord(scan.orgId, ctx.user.id);
        if (!membership) throw new TRPCError({ code: "FORBIDDEN" });
      } else if (ctx.user.role !== "ultra_admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return scan;
    }),
  // List all scans for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getLiabilityScansForUser(ctx.user.id);
  }),

  // Delete a scan (must belong to the requesting user)
  delete: protectedProcedure
    .input(z.object({ scanId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteLiabilityScan(input.scanId, ctx.user.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Scan not found or not authorized" });
      return { success: true };
    }),

  // Create a tokenized share link for a scan (expires in 30 days)
  createShareToken: protectedProcedure
    .input(z.object({
      scanId: z.number().int(),
      label: z.string().optional(),
      expiresInDays: z.number().int().min(1).max(90).default(30),
    }))
    .mutation(async ({ ctx, input }) => {
      const scan = await getLiabilityScanById(input.scanId);
      if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
      if (scan.userId !== ctx.user.id && (!["admin","ultra_admin"].includes(ctx.user.role))) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const token = randomBytes(48).toString("hex"); // 96-char hex token
      const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
      await insertScanShareToken({
        scanId: input.scanId,
        token,
        createdByUserId: ctx.user.id,
        expiresAt,
        label: input.label ?? null,
      });
      return { token };
    }),

  // Public: fetch a scan by share token (validates expiry, no auth required)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const shareToken = await getScanShareToken(input.token);
      if (!shareToken) throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found" });
      if (shareToken.revokedAt) throw new TRPCError({ code: "FORBIDDEN", message: "This share link has been revoked" });
      if (shareToken.expiresAt < new Date()) throw new TRPCError({ code: "FORBIDDEN", message: "This share link has expired" });
      const scan = await getLiabilityScanById(shareToken.scanId);
      if (!scan) throw new TRPCError({ code: "NOT_FOUND" });
      return { scan, expiresAt: shareToken.expiresAt };
    }),
  // Compute defensibility-based score from answers (server-side, no DB write)
  computeScore: publicProcedure
    .input(z.object({
      answers: z.record(z.string(), z.union([z.string(), z.boolean()])),
      jurisdiction: z.string().optional(),
      industry: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await generateLiabilityScanResult({
        answers: input.answers,
        jurisdiction: input.jurisdiction ?? "Not specified",
        industry: input.industry ?? "Not specified",
      });
    }),

  // Send scan results email to the logged-in user via GHL
  sendScanEmail: protectedProcedure
    .input(z.object({
      scanId: z.number().int(),
      score: z.number().int(),
      riskLevel: z.string(),
      structuralLabel: z.string(),
      scorePercent: z.number().int(),
      shareUrl: z.string().optional(),
      jurisdiction: z.string().optional(),
      industry: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user.email) return { sent: false, reason: "no_email" };

      const scanUrl = input.shareUrl
        ? input.shareUrl
        : `${process.env.APP_URL ?? "https://app.fivestonestechnology.com"}/liability-scan`;

      const riskColor = input.riskLevel === "Low Risk" ? "#22C55E"
        : input.riskLevel === "Moderate Risk" ? "#F59E0B"
        : input.riskLevel === "High Risk" ? "#F97316"
        : "#E5484D";

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F8F9FB;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#0B1F33;padding:28px 32px;">
          <p style="margin:0;color:#C9A86A;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Five Stones Technology</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Your Liability Exposure Scan Results</h1>
        </td></tr>
        <!-- Score block -->
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0 0 6px;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Liability Risk Level</p>
          <div style="display:inline-block;background:${riskColor};color:#fff;font-size:18px;font-weight:700;padding:8px 20px;border-radius:24px;margin-bottom:16px;">${input.riskLevel}</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;border-radius:8px;padding:16px;margin-bottom:20px;">
            <tr>
              <td style="text-align:center;padding:8px 16px;">
                <p style="margin:0;color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;">Structural Score</p>
                <p style="margin:4px 0 0;color:#0B1F33;font-size:28px;font-weight:800;">${input.scorePercent}%</p>
                <p style="margin:2px 0 0;color:#64748B;font-size:13px;">${input.structuralLabel}</p>
              </td>
              ${input.jurisdiction ? `<td style="text-align:center;padding:8px 16px;"><p style="margin:0;color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;">Jurisdiction</p><p style="margin:4px 0 0;color:#0B1F33;font-size:16px;font-weight:600;">${input.jurisdiction}</p></td>` : ""}
              ${input.industry ? `<td style="text-align:center;padding:8px 16px;"><p style="margin:0;color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;">Industry</p><p style="margin:4px 0 0;color:#0B1F33;font-size:16px;font-weight:600;">${input.industry}</p></td>` : ""}
            </tr>
          </table>
          <p style="color:#334155;font-size:14px;line-height:1.6;">
            A copy of your Liability Exposure Scan (Scan #${input.scanId}) has been saved to your account.
            You can view your full results, top priorities, and recommended actions at any time by clicking the button below.
          </p>
        </td></tr>
        <!-- CTA -->
        <tr><td style="padding:20px 32px 28px;">
          <a href="${scanUrl}" style="display:inline-block;background:#0B1F33;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">View My Scan Results</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#F1F5F9;padding:20px 32px;border-top:1px solid #E2E8F0;">
          <p style="margin:0;color:#94A3B8;font-size:12px;">
            This email was sent to ${user.email} because you completed a Liability Exposure Scan on the Five Stones Workplace Safety Platform.
            &copy; ${new Date().getFullYear()} Five Stones Technology. All rights reserved.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const sent = await sendGhlEmail({
        toEmail: user.email,
        toName: user.name ?? "User",
        subject: `Your Liability Exposure Scan Results -- ${input.riskLevel} (${input.scorePercent}%)`,
        html,
        ghlContactId: user.ghlContactId ?? null,
      });

      return { sent, reason: sent ? null : "ghl_failed" };
    }),
});

// â”€â”€â”€ Facility Onboarding Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Accepts a full facility profile in one shot, creates the facility record,
// kicks off an in-progress audit, and optionally seeds an EAP skeleton.
const onboardingRouter = router({
  submitProfile: paidProcedure
    .input(z.object({
      // â”€â”€ Step 1: Facility Identity â”€â”€
      name: z.string().min(1),
      facilityType: z.string(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      jurisdiction: z.string().optional(),
      // â”€â”€ Step 2: Physical Characteristics â”€â”€
      squareFootage: z.number().optional(),
      floors: z.number().optional(),
      maxOccupancy: z.number().optional(),
      publicEntrances: z.number().optional(),
      staffEntrances: z.number().optional(),
      hasAlleyways: z.boolean().optional(),
      hasConcealedAreas: z.boolean().optional(),
      multiTenant: z.boolean().optional(),
      // â”€â”€ Step 3: Operations â”€â”€
      operatingHours: z.string().optional(),
      eveningOperations: z.boolean().optional(),
      usedAfterDark: z.boolean().optional(),
      publicAccessWithoutScreening: z.boolean().optional(),
      multiSite: z.boolean().optional(),
      // ── Step 4: Personnel & Contacts ──
            emergencyCoordinator: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      emergencyRoles: z.string().optional(),      aedOnSite: z.boolean().optional(),
      aedLocations: z.string().optional(),
      operationalPolicies: z.string().optional(),
      coordinatorContacts: z.string().optional(),
      emergencyContacts: z.string().optional(),
      notes: z.string().optional(),
      // â”€â”€ Options â”€â”€
      createAudit: z.boolean().default(true),
      orgId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createAudit: shouldCreateAudit, orgId: inputOrgId, ...facilityData } = input;
      // Default orgId to the user's org so the facility appears in the org-scoped list
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = inputOrgId ?? memberships[0]?.orgId;
      // 1. Create the facility record
      const newFacility = await createFacility({ ...facilityData, userId: ctx.user.id, orgId });
      if (!newFacility) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Facility creation failed" });
      await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
        action: "create",
        entityType: "facility",
        entityId: String(newFacility.id),
        description: `Onboarding: created facility "${newFacility.name}"`,
        metadata: { facilityType: newFacility.facilityType, city: newFacility.city, state: newFacility.state },
      });
      // 2. Optionally create an in-progress audit pre-linked to the facility
      let auditId: number | null = null;
      if (shouldCreateAudit) {
        const newAudit = await createAudit({
          facilityId: newFacility.id,
          auditorId: ctx.user.id,
          status: "in_progress",
          auditorNotes: `Initial audit created during facility onboarding for ${newFacility.name}.`,
        });
        auditId = newAudit?.id ?? null;
        await writeAuditLog(buildLogContext({ user: ctx.user, req: ctx.req }), {
          action: "create",
          entityType: "audit",
          entityId: String(auditId ?? ""),
          description: `Onboarding: created initial audit for facility "${newFacility.name}"`,
          metadata: { facilityId: newFacility.id },
        });
      }
      return {
        facilityId: newFacility.id,
        facilityName: newFacility.name,
        auditId,
      };
    }),
});
// â”€â”€â”€ Drill Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const drillRouter = router({
  /**
   * Generate a new ACTD drill using LLM.
   * Supports two modes: system (facility-profile-based) and user (custom scenario).
   */
  generate: paidProcedure
    .input(z.object({
      facilityId: z.number().optional(),
      drillType: z.enum(["micro", "extended"]),
      industry: z.string().optional(),
      jurisdiction: z.string().optional(),
      generationMode: z.enum(["system", "user"]).default("system"),
      userPrompt: z.string().optional(),
      facilityContext: z.string().optional(), // summary of facility profile for system mode
      // Parameterized scenario generator inputs
      environment: z.string().optional(),
      threatType: z.string().optional(),
      behavioralIndicators: z.array(z.string()).optional(),
      responsePressure: z.string().optional(),
      responseFocus: z.string().optional(),
      complexityLevel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const DRILL_TYPE_LABELS: Record<string, string> = {
        micro: "Micro Drill (1--2 min) -- Single decision point, outcome-based feedback, no movement required",
        extended: "Extended Scenario (10--15 min) -- Multiple decision points, admin/facilitator use, tabletop or simulation",
      };
      const systemPrompt = `You are an AI Drill & Training Specialist embedded within a Workplace Safety and Liability Prevention Platform.
Your role is to design scenario-based training drills using the ACTD Framework.
ACTD = Assess, Commit, Take Action, Debrief
- ACTD is NOT linear. It is a dynamic, real-time decision-making framework.
- NEVER reference or use "Run, Hide, Fight."
ACTD DEFINITIONS:
ASSESS: What is being noticed -- behavioral/environmental threat indicators, ability to override denial/hesitation/social proof, rapid situational interpretation under stress.
COMMIT: What decision must be made despite ambiguity -- avoid freeze response, accept ownership, prioritize movement over perfection.
TAKE ACTION: What actions are available given current conditions -- adaptive, NOT pre-scripted or linear. Adapt based on environment, threat proximity, exits/barriers, people present.
DEBRIEF: What must be captured after the event -- observations, decisions, actions, gaps identified.
This system trains decision-making under stress. It is not a checklist. It is not compliance training. It is a liability reduction and human performance system.
TONE: Direct, professional, execution-focused. No fluff. No trauma-inducing realism. No surprise drills.

==================================================
CORE RULE -- WORKPLACE VIOLENCE & ACTIVE THREAT ONLY (NON-NEGOTIABLE)
==================================================
ALL drills -- regardless of drill type, industry, or user prompt -- MUST relate to one or more of the following:
  - Workplace violence (targeted, domestic spillover, or co-worker initiated)
  - Active threat scenarios (armed, unarmed, or ambiguous)
  - Suspicious or escalating human behavior in or around the facility
  - Unauthorized access by a person (not a system or equipment failure)
  - Weapon indicators (visible, reported, or suspected)
  - Pre-incident behavioral warning signs (leakage, grievance, fixation, boundary violations)

BANNED DRILL TOPICS -- NEVER generate drills about:
  - Equipment failure or mechanical malfunction
  - Production disruptions, supply chain issues, or operational downtime
  - General workplace safety (slips, trips, falls, ergonomics, fire safety without human threat)
  - HR or interpersonal conflict that does NOT involve threat escalation, intimidation, or violence
  - Cybersecurity incidents without a physical threat component
  - Natural disasters or weather events without a human threat element

If a user prompt describes a banned topic, redirect the scenario to the closest applicable workplace violence or active threat context and note the redirection in the scenario text.
If no human threat is present after redirection, REJECT the generation and return an error message instead of a drill.

==================================================
SYSTEM OVERRIDE -- THREAT DOMAIN CORRECTION
==================================================
All drills are categorized strictly as ACTIVE THREAT / UNAUTHORIZED ACCESS ESCALATION scenarios.

REMOVED from all drill generation:
  - Theft-only scenarios (no escalation toward people)
  - Equipment misuse as the primary threat driver
  - General workplace safety incidents (no human threat escalation)
  - Operational disruption without human threat escalation

FIVE-ELEMENT SCENARIO REQUIREMENT -- every scenario MUST include ALL five:
  1. UNKNOWN OR UNAUTHORIZED INDIVIDUAL -- a person whose identity, authorization, or intent is unverified
  2. BOUNDARY VIOLATION -- entry, movement, or access to a space the individual is not authorized to be in
  3. BEHAVIORAL ESCALATION INDICATORS -- observable behaviors signaling risk: evasion, aggression, deception, non-compliance, avoidance of staff, inconsistent answers, accelerating movement
  4. FORWARD PROGRESSION -- the individual is actively moving deeper into controlled space, toward people, toward assets, or toward restricted areas. Static presence alone does not qualify.
  5. IMPLIED OR POTENTIAL THREAT TO HUMAN SAFETY -- the scenario must create a reasonable basis for concern about harm to a person, not just property or operations

REJECT AND REGENERATE if ANY of the following are true:
  - The primary risk is operational (equipment, process, productivity) with no human threat
  - There is no human threat escalation -- concern must cross from observation to action
  - The individual is NOT progressing deeper into controlled space
  - All five elements above are not present

LANGUAGE REPLACEMENT RULES:
  - "sabotage" â†’ ONLY use if the act is tied to escalation toward people or a facility breach. Do NOT use for equipment-only sabotage.
  - "continue working" â†’ BANNED as a viable option in any escalation scenario. No option may suggest that normal work can safely continue while an unresolved escalation is active.
  - "monitor the situation" â†’ BANNED as a standalone option. Observation must always be paired with an escalation threshold or coordination intent.
  - "wait and see" â†’ BANNED in any form. Every option must represent a conscious decision under pressure, not passive behavior.

OUTPUT TRAINING GOAL -- all drills MUST train this sequence:
  RECOGNITION â†’ CONTROL â†’ COORDINATION â†’ CONTAINMENT
  This is NOT workplace safety training. This is threat recognition and response training.
  Every drill must force the participant to recognize a threat signal, make a control decision, activate coordination, and understand containment implications.

==================================================
REQUIRED DRILL STRUCTURE -- ALL DRILL TYPES
==================================================
Every drill MUST include all seven of the following structural elements. These are non-negotiable regardless of drill type (micro, guided, operational, extended):

1. SCENARIO TYPE
   Must be one of: Suspicious Person | Unauthorized Access | Escalating Behavior | Domestic Spillover | Weapon Suspicion | Active Threat
   Include this as the "scenarioType" field in the JSON output.

2. PRE-INCIDENT INDICATOR
   An observable behavior or environmental condition that signals risk BEFORE the threat escalates.
   Must be specific and behavioral -- not abstract (e.g., "individual has been pacing near the entrance for 12 minutes, making repeated eye contact with staff but not approaching the desk").
   Include as "preIncidentIndicator" in the JSON output.

3. ESCALATION MOMENT
   A clear, observable transition from concern to active threat or imminent danger.
   Must name what changes -- what the individual does, says, or reveals that crosses the line.
   Include as "escalationMoment" in the JSON output.

4. DECISION POINT (ACTD)
   The specific moment where the participant must choose an action.
   Must be framed as a concrete choice under time pressure, not a theoretical question.
   This maps to the COMMIT phase of ACTD.

5. ROLE-BASED ACTIONS
   Every drill must define distinct expected actions for at least two of the following roles:
     - Staff (protective action: shelter, evacuate, lock down, report)
     - Responder / Security (response action: intercept, contain, communicate, coordinate)
     - Admin / Supervisor (coordination/communication: notify, document, activate EAP, contact authorities)
   Include as "roleBasedActions" array in the JSON output: [ { role, action, rationale } ]

6. COMMUNICATION REQUIREMENT
   Who communicates what, to whom, and when.
   Must be specific: name the sender role, the recipient role, the message content, and the timing trigger.
   Include as "communicationRequirement" in the JSON output: { sender, recipient, message, trigger }

7. EXPECTED OUTCOME
   The consequence of a correct decision vs. an incorrect decision.
   Must be operationally specific -- name what is preserved or lost based on the choice made.
   Include as "expectedOutcome" in the JSON output: { correctDecision, incorrectDecision }

==================================================
VALIDATION LAYER -- AUTO-ENFORCED BEFORE OUTPUT
==================================================
Before generating the final JSON output, validate the drill against ALL of the following rules.
If ANY rule fails, REJECT the drill and regenerate from scratch:

REJECT if:
  - No human threat is present in the scenario (equipment, weather, or process failures do not qualify)
  - No escalation moment is defined (the scenario must cross a line from concern to threat)
  - No decision point exists (participant must have a concrete choice to make)
  - No role-based action is included (at least two roles must have distinct expected actions)

KEYWORD VALIDATION -- the scenario text MUST include at least one of the following words or phrases:
  threat | weapon | suspicious | aggressive | unauthorized | violence | escalation | armed | hostile | threatening | assault | confrontation | intruder | stalking | domestic | grievance

If none of these keywords appear in the scenario after generation, REJECT and regenerate.

TOPIC VALIDATION -- confirm the drill does NOT fall into a banned category:
  - No equipment failure as the primary scenario driver
  - No general safety hazard (slip/trip/fall, chemical spill without human threat)
  - No HR conflict without threat escalation
  - No IT/cybersecurity incident without physical threat

==================================================
OUTPUT STANDARD -- ALL DRILL TYPES
==================================================
Drills MUST be:
  - CONCISE: scenario text 3--8 sentences depending on drill type; no padding
  - REALISTIC: grounded in the specific industry/environment provided; avoid generic "workplace" language
  - ENVIRONMENT-SPECIFIC: name the setting (e.g., "retail pharmacy", "hospital emergency department", "manufacturing floor", "corporate lobby") -- not just "the workplace"
  - OPERATIONAL: describe what people do, where they are, and what they observe -- not theoretical frameworks

Drills MUST NOT include:
  - Long narrative backstories (no more than 2 sentences of context before the threat indicator appears)
  - Unnecessary detail about non-threat elements (equipment specs, organizational charts, HR policies)
  - Generic safety language ("always follow your organization's safety procedures", "refer to your EAP")
  - Resolved or completed outcomes (all outcomes must remain open and uncertain -- see UNCERTAINTY IS MANDATORY rules below)

CRITICAL GENERATION RULE -- THREAT-BASED ENGINE:
Do NOT generate drills based only on job context or industry.
Generate drills based primarily on:
1. PRIMARY THREAT SIGNAL: escalating behavior, unauthorized access, unattended item, suspicious object, environmental anomaly, boundary violation, threatening communication, known internal threat, unknown external threat
2. BEHAVIORAL/ENVIRONMENTAL CUES: agitation, avoidance, boundary violation, verbal tone shifts, movement patterns, environmental inconsistency
3. DECISION PRESSURE: ambiguity, time urgency, incomplete information, social pressure, conflicting cues, role uncertainty, bystander presence, fear of escalation
4. CONTEXT (secondary): industry, role, environment, facility profile
Every drill MUST clearly state a primaryThreatSignal and decisionPressure.
Goal: Train perception and decision-making, not just task execution.

ACTD LANGUAGE RULES (ALL DRILL TYPES):
AVOID generic phrases: "verbal cues", "unchecked entry", "non-compliance", "suspicious behavior" (too vague)
USE specific behavioral descriptions:
- "entered without pausing at the access point, made no eye contact with staff, and continued moving deeper into the space"
- "shifted body orientation away from staff when questioned directly"
- "gave a vague, inconsistent answer when asked the purpose of the visit"
- "escalating agitation after redirection -- voice volume increased, physical space narrowed"
- "environmental anomaly inconsistent with normal conditions at this time of day"
ACTD must read like real-time situational awareness thinking, not policy language.

DECISION QUALITY STANDARD (ALL CHOICE-BASED DRILLS):
- At least 2 options must feel plausible under stress
- Weaker options must fail for realistic, human reasons -- not because they are obviously wrong
- Outcomes must differ meaningfully based on risk trajectory
- NEVER label options as "Correct", "Wrong", or "Best"
- Use risk tiers: "Low Risk" | "Moderate Risk" | "Elevated Risk" | "Introduces Additional Risk"
- "Lowest Risk Response" may be used only when the distinction is clearly earned

==================================================
DECISION VALIDATION ENFORCEMENT
==================================================
All decision options MUST be REALISTIC, DEFENSIBLE, and DOCTRINE-ALIGNED.

EACH OPTION MUST:
  - Represent a plausible real-world action that a trained person in this role would actually take
  - Align with one of the following three action categories:
      â€¢ CONTROL ATTEMPT: direct action to stop, redirect, or contain the individual
      â€¢ COORDINATION ACTIVATION: alerting, notifying, or activating the response chain
      â€¢ OBSERVATION WITH INTENT TO ESCALATE: structured monitoring with a defined escalation threshold (NOT passive watching)

REMOVE ANY OPTION THAT:
  - Ignores the situation (no action taken, no awareness maintained)
  - Continues normal work while an unresolved escalation is active
  - Assumes benign intent without verification (e.g., "they probably have a reason to be here")
  - Delays response without a defined justification, threshold, or coordination intent
  - Frames the situation as something that can be safely left unaddressed

REQUIRED OPTION STRUCTURE -- every set of three options MUST include:
  1. LOW EXPOSURE / HIGH COORDINATION option: activates the response chain early, maintains safe distance, preserves documentation window; slower to achieve direct control but reduces personal risk and organizational liability
  2. MODERATE CONTROL option: balances direct action with coordination; moderate personal exposure; attempts to manage the individual while keeping backup informed
  3. HIGH EXPOSURE / DIRECT CONTROL option (if appropriate to the scenario and role): immediate physical or verbal intervention; fastest path to control but highest personal exposure and escalation risk; appropriate only when delay would result in imminent harm

ALL OPTIONS MUST REFLECT:
  â†’ A conscious decision under pressure
  â†’ NOT passive behavior
  â†’ NOT a choice to ignore or normalize the threat

VALIDATION CHECK -- before finalizing any set of three options, confirm:
  - None of the three options allows the participant to do nothing
  - None of the three options allows the participant to continue normal work
  - Each option represents a meaningfully different strategy (not just different wording of the same approach)
  - At least one option activates coordination (alerts security, notifies supervisor, initiates response chain)
  - At least one option involves direct engagement or positioning relative to the individual
  If any check fails, rewrite the failing option before proceeding.

==================================================
UNIVERSAL DECISION DOCTRINE
==================================================
Every drill, option, outcome, and coaching note must align with these 5 principles:
1. Preserve life and reduce immediate exposure
2. Maintain control of space
3. Use the lowest-force effective response
4. Activate coordination early
5. Create a defensible record

This doctrine applies across ALL drill types (micro, guided, operational, extended) and ALL scenario types:
- unauthorized access | suspicious object | escalating behavior | coworker concern
- visitor management | environmental anomaly | threatening communication | emergency access violations
The scenario changes. The decision doctrine does not.

DOCTRINE EVALUATION MODEL:
For every response option, you MUST evaluate it against 5 dimensions BEFORE assigning labels, writing outcomes, or writing expert reasoning.
Store this as "doctrine_evaluation" on every option object:
{
  "exposure_effect": "positive" | "neutral" | "negative",      // Principle 1: reduces/preserves vs increases personal/group exposure
  "control_effect": "positive" | "neutral" | "negative",       // Principle 2: restores/preserves vs loses control of environment
  "escalation_effect": "positive" | "neutral" | "negative",    // Principle 3: avoids vs provokes escalation
  "coordination_effect": "positive" | "neutral" | "negative",  // Principle 4: activates vs delays/isolates response chain
  "documentation_effect": "positive" | "neutral" | "negative", // Principle 5: preserves vs closes documentation window
  "notes": string[]  // optional: explain non-obvious evaluations
}
This evaluation is the SOURCE OF TRUTH for all downstream generation.

DOCTRINE-DERIVED LABEL RULES:
Labels MUST be derived from the doctrine_evaluation object. Do NOT use:
- "correct", "wrong", "best answer", "Low Risk", "Moderate Risk", "Elevated Risk", "Introduces Additional Risk"
Instead, generate compound contextual labels naming the tradeoff explicitly. Examples:
- "Reduces exposure, preserves spatial control; response chain activated, documentation window preserved; subject likely to redirect or comply."
- "High personal exposure, immediate control; backup protocol bypassed; subject reaction unpredictable."
- "Delayed coordination, increased loss of visibility; documentation window at risk; subject gains ground."
- "Strong coordination, reduced direct control; notification chain intact; subject may hesitate or redirect."
The label must reflect: (a) personal/exposure implication, (b) org/system implication, (c) subject behavioral reaction.

DOCTRINE-SHAPED OUTCOME RULES:
Every outcome must reflect doctrine consequences. Use the evaluation to shape outcomes:
- exposure_effect positive â†’ reduces immediate personal or group risk
- exposure_effect negative â†’ increases direct exposure or leaves others exposed
- control_effect positive â†’ restores or preserves control of environment
- control_effect negative â†’ allows deeper access, concealment, or loss of visibility
- escalation_effect positive â†’ reduces likelihood of provoking escalation
- escalation_effect negative â†’ increases agitation, unpredictability, or confrontation risk
- coordination_effect positive â†’ activates support/resources early
- coordination_effect negative â†’ isolates the responder or delays chain of response
- documentation_effect positive â†’ improves ability to record and defend actions later
- documentation_effect negative â†’ creates confusion or loss of key details
Outcomes must NOT be generic. They must clearly reflect what the choice changes.

DOCTRINE-REFERENCED EXPERT REASONING RULES:
Expert reasoning must explicitly reference doctrine dimensions in plain language (do NOT use the principle names directly).
Examples:
- "This option preserves distance and activates coordination, but sacrifices immediate control."
- "This option restores control quickly, but increases personal exposure and escalation potential."
- "This option delays intervention, allowing the individual to gain ground and reducing visibility."
Do NOT write expert reasoning as policy summary. Write it as situational decision analysis.
Forbidden tone: "ideal", "perfect", "the correct", "best answer", "always do", "never do", "policy requires".
Frame poor choices as understandable but consequential: "This is a natural instinct, but it introduces [specific risk]."

ACTD DOCTRINE MAPPING:
ACTD phases must be generated using doctrine as the underlying logic:
- ASSESS: evaluate exposure + evaluate control of space + identify need for coordination
- COMMIT: choose the lowest-force effective response + decide whether immediate coordination is required
- TAKE ACTION: act in a way that preserves life, manages space, and avoids unnecessary escalation
- DOCUMENT: capture what happened, what was observed, what was done, and what gaps remain

==================================================
DRILL-TYPE SPECIFIC RULES
==================================================

MICRO DRILL (drillType = "micro") -- 1--3 minutes:
Purpose: rapid recognition, fast commitment, no movement required.

==================================================
MICRO DRILL INTENSITY ADJUSTMENT -- MANDATORY
==================================================
Micro drills MUST represent EARLY ESCALATION MOMENTS with IMMEDIATE DECISION PRESSURE.

REQUIRED IN EVERY MICRO DRILL:
  - CLEAR ABNORMAL BEHAVIOR: the individual is doing something that a reasonable person would immediately recognize as out of place -- not a vague "something seems off"
  - NON-COMPLIANCE OR EVASION: the individual has already ignored, avoided, or bypassed a control point, instruction, or staff member
  - MOVEMENT DEEPER INTO CONTROLLED SPACE: the individual is actively progressing toward a more sensitive area, not standing still at an entry point

BANNED IN MICRO DRILLS:
  - Passive observation-only scenarios (the participant watches but has no decision to make)
  - Situations where no action is required (the threat is already resolved or clearly benign)
  - Scenarios where the participant can safely "wait and see" without consequence -- if waiting is a safe option, the scenario is INVALID and must be regenerated
  - Scenarios where the individual is stationary and not progressing

EVERY MICRO DRILL MUST FORCE:
  â†’ An immediate decision between at least two of the following:
      SAFETY: move away, shelter, protect others, increase distance
      CONTROL: verbal engagement, physical positioning, direct intervention
      COORDINATION: alert security, notify supervisor, activate response chain
  The decision must be time-pressured. The participant must feel that delaying will make the situation worse.

INVALID SCENARIO TEST -- before finalizing a micro drill scenario, ask:
  "Can the participant safely do nothing for the next 60 seconds?"
  If YES -- the scenario is INVALID. Regenerate with higher escalation pressure.
  If NO -- the scenario is valid. Proceed.

- Short scenario (3--5 sentences max)
- Add "responseOptions": 2--4 realistic choices reflecting real human behavior under stress
- Add "outcomeMap" where each key is the option text and value has EXACTLY these fields:
  { riskLevel, consequence (1--2 sentences, environment/behavior/timing-specific), tradeoff (what this choice sacrifices or introduces), humanRealismNote (acknowledges social pressure, hesitation, or natural human bias), coachingConnection (choice â†’ risk introduced â†’ stronger mental model; tone: coaching not correction), likelyOutcome (2--3 sentences, next 60--120 seconds, grounded not cinematic: Low Risk = controlled progression; Moderate Risk = uncertainty/escalation window open; Elevated/Additional Risk = loss of control/faster escalation), whyThisMatters (1 sentence tying decision to trajectory change) }
- Replace guidedResponse with "compressedGuidedResponse" -- EXACTLY 4 keys:
  { howAnExpertReadsThis: string[] (1--2 bullets), criticalDecision: string (1 sentence), mostLikelyMistake: string (1 sentence), bestNextMove: string (1 sentence) }
- Add "microDebriefQuestion": string (1 short reflective question)
- ACTD: Assess + Commit emphasis only; Take Action = best available move; Debrief = brief and reflective
- Do NOT generate long ACTD text blocks
- Set guidedResponse to null for micro drills

==================================================
NON-PRESCRIPTIVE OUTPUT REQUIREMENT -- ALL DRILL TYPES
==================================================
All drill output MUST be non-prescriptive. This is a legal safety requirement.

REMOVE any language that:
  - Labels a response as "correct", "wrong", "best", "ideal", or "perfect"
  - Implies a single right answer to a decision under uncertainty
  - Grades participant performance as pass/fail
  - Uses "the correct decision" or "the correct response" in any form

REPLACE with:
  - Response tradeoffs: what each option gains and what risk it introduces
  - Potential outcomes: what may happen as a result of each path -- uncertain, evolving, not resolved
  - Decision impact framing: how each decision type affects the situation trajectory

DECISION IMPACT FIELD ("decisionImpact") -- REQUIRED IN ALL DRILLS:
  Include a "decisionImpact" object with three keys:
  - "highCoordinationPath": what changes when a low-exposure, high-coordination decision is made
  - "moderateControlPath": what changes when a moderate control action is taken
  - "highExposurePath": what changes when a high-exposure direct action is taken
  Each value: 1--2 sentences. Describe the situation trajectory -- NOT whether it was correct.
  BANNED: "This was the correct choice", "This was the wrong choice", "This is the best option"
  REQUIRED: evolving, uncertain language -- "the response chain is now active but...", "the individual redirects but..."

SHORT DEBRIEF FIELD ("shortDebrief") -- REQUIRED IN ALL DRILLS:
  Include a "shortDebrief" array of 2--3 strings.
  Each string is a debrief question focused on awareness, recognition, and response readiness.
  BANNED: questions that imply a single correct answer ("What should you have done?")
  REQUIRED: open-ended, reflective questions ("What behavioral cue first signaled concern?", "At what point did the situation cross from observation to action?", "What coordination step would have changed the outcome trajectory?")

GUIDED DRILL (drillType = "guided") -- 3--7 minutes:
Purpose: Forced decision-based interaction. Participants must make active choices before seeing outcomes. No passive reading.
- Richer scenario (5--8 sentences) that sets up a realistic, ambiguous situation
- Add "guidedCheckpoints": array of EXACTLY 2 checkpoint objects. This is the core interaction engine.

  CHECKPOINT 1 (phase: "initial"):
  - Presents the opening situation requiring an immediate decision
  - Add "priorityFraming": string -- a single sentence starting with "Your priority:" that names the participant's primary objective at this moment.
      Must be one of: containment, delay, visibility, coordination, or a combination.
      Examples: "Your priority: establish visibility and alert the response chain before the situation moves."
               "Your priority: delay escalation and preserve your position until backup arrives."
               "Your priority: coordinate an immediate response without direct confrontation."
  - Must have exactly 3 options. REAL-WORLD VIABILITY STANDARDS: every option must pass all four tests:
      1. POLICY ALIGNMENT -- reflects realistic workplace protocols (corporate, healthcare, or public safety). No actions that violate standard guidelines.
      2. ROLE APPROPRIATENESS -- matches the authority and training level of the role described. An employee does not physically restrain; security does not abandon post without protocol.
      3. ESCALATION AWARENESS -- each action must consider how the individual may react: comply, evade, hesitate, or escalate.
      4. NO THEATRICAL ACTIONS -- no yelling unnecessarily, dramatic confrontation, or exaggerated behaviors. Actions must be practical, controlled, and defensible in a real training program.
      CONTEXT-SENSITIVE ACTIONS: If generating an option that involves activating a facility alert system (e.g., "Code Red", "emergency alert"), it MUST include conditional framing:
        - Label must include "(if appropriate to your facility)"
        - Description must include "If your organization has a defined alert protocol, activate it according to policy..."
        - riskLabel must include "high disruption potential" as one of the risk dimensions
        This is because many facilities do NOT have a Code Red system, and premature activation can cause panic.
      If an option would not be taught in a real training program, do not generate it.
  - Each option: { label, description, riskLabel, outcome, tradeoff, reasoning }
    - label: short action phrase (e.g., "Alert security immediately")
    - description: 1 sentence. MUST include ALL THREE of the following elements:
        1. WHAT the user does (the specific action taken)
        2. HOW they do it (the method or approach)
        3. INTENT or DECISION TRIGGER (the purpose, condition, or threshold that drives the action)
      RULES:
        - Every description must represent a complete, plausible action that could appear in a real training program.
        - BANNED -- weak or incomplete descriptions:
            "Observe only"
            "Follow without purpose"
            "Wait without escalation criteria"
            "Monitor the situation"
            "Watch and see what happens"
            Any description that lacks a clear intent or leaves the user without a decision framework.
        - REQUIRED -- descriptions must be operationally grounded:
            Specify what the user does physically or verbally.
            Specify how they maintain awareness, distance, or communication.
            Specify the condition or threshold that would trigger the next action.
        - OPTION DISTINCTIVENESS: the three descriptions must represent clearly different approaches:
            Option A (DIRECT CONTROL): emphasize immediate positioning, verbal engagement, or physical intervention.
            Option B (COORDINATION-FIRST): emphasize alerting, notifying, or activating the response chain while maintaining a safe position.
            Option C (STRUCTURED OBSERVATION -- DELAYED ESCALATION): maintain safe distance and visual contact while continuing to monitor the individual's movements and behavior. The weakness of this option is DELAYED ACTION on escalation that is already warranted -- NOT a conditional trigger based on future behavior. The individual has already breached access control or ignored instructions; escalation is appropriate at this stage. Option C acknowledges this but delays acting on it. The description must make clear that the delay is the suboptimal element, not that escalation depends on what happens next.
            REQUIRED structure for Option C description:
              (1) The observational action being taken (maintain distance, monitor movements, sustain visual contact)
              (2) The continued engagement or awareness method
              (3) An explicit acknowledgment that escalation is already warranted, but is being delayed
            BANNED for Option C:
              - Framing escalation as conditional on future behavior ("if they enter a restricted area", "if non-compliance continues", "if the individual moves toward...")
              - Implying escalation is optional or uncertain at this stage
              - Informal behaviors (asking a colleague for advice, casual consultation, hesitation without structure)
              - Passive watching without any operational framing
            EXAMPLE CORRECT:
              "Maintain observation from a safe distance while continuing to monitor the individual's movements and maintaining awareness of their direction, delaying immediate alert activation despite clear indicators that escalation is warranted."
              "Follow at a safe distance while observing behavior and maintaining situational awareness, delaying activation of the response chain despite the individual's continued non-compliance."
      EXAMPLE BEFORE (BANNED -- incomplete):
        "Follow him from a distance and observe."
      EXAMPLE AFTER (REQUIRED -- complete, intent-driven):
        "Follow at a safe distance while maintaining visual contact and preparing to escalate to security if the individual continues deeper into restricted areas."
    - riskLabel: STANDARDIZED four-segment format. Must follow this EXACT structure:
      FORMAT: [Exposure], [Control/Coordination], [Organizational Impact], [Behavior Risk]
      RULES:
        - Use commas ONLY to separate segments (no semicolons, no dashes)
        - Each segment must be 3--6 words maximum
        - Use ONLY approved terms from the lists below
        - No full sentences, no narrative prose, no qualifiers beyond the approved terms
        - NEVER use bare labels like "Low Risk", "Moderate Risk", "Elevated Risk", "Introduces Additional Risk"
        - HIDDEN from participant until after selection
      APPROVED TERMS -- use ONLY these EXACT phrases, word-for-word. Do NOT invent new phrasing or paraphrase.
      EXACT CASING REQUIRED -- copy each term exactly as written below. Do NOT lowercase any segment.
        Exposure segment (choose exactly one):
          "Low personal exposure" | "Moderate personal exposure" | "High personal exposure" | "Critical personal exposure"
        Coordination/Control segment (choose exactly one):
          "Strong coordination" | "Coordination active" | "Delayed coordination" | "No coordination" | "Immediate control attempt" | "Loss of control"
        Organizational Impact segment (choose exactly one):
          "Low disruption" | "Moderate disruption" | "High disruption" | "Operational disruption"
        Behavior Risk segment (choose exactly one):
          "Low escalation risk" | "Moderate escalation risk" | "High escalation risk" | "Subject likely to comply" | "Subject likely to evade" | "Subject likely to escalate"
      EXAMPLE CORRECT LABELS (exact casing as shown):
        "Low personal exposure, Strong coordination, Moderate disruption, High escalation risk"
        "High personal exposure, Immediate control attempt, Moderate disruption, Subject likely to escalate"
        "Moderate personal exposure, Delayed coordination, Operational disruption, Subject likely to evade"
        "Critical personal exposure, Loss of control, High disruption, High escalation risk"
        "Low personal exposure, Coordination active, Low disruption, Subject likely to comply"
      INVALID EXAMPLES (never generate these):
        "Low personal exposure; coordination active; subject likely to redirect or hesitate." â† semicolons banned
        "High personal exposure, backup bypassed; subject reaction unpredictable." â† invented phrasing banned
        "Reduces exposure, preserves spatial control; response chain activated" â† narrative prose banned
        "Low Risk" or "Moderate Risk" â† bare tier labels banned
        "Minimal disruption" â† not in approved list
        "Unpredictable subject response" â† not in approved list
        "high escalation risk" â† wrong casing (must be "High escalation risk")
        "subject likely to evade" â† wrong casing (must be "Subject likely to evade")
      If the Code Red option is generated, its riskLabel MUST use "High disruption" or "Operational disruption" as the Organizational Impact segment.
    - outcome: 1--2 sentences. MUST include ALL THREE elements:
        1. How the INDIVIDUAL REACTS -- subject must be active, not static. Use: accelerates, hesitates, redirects, evades, escalates, tests boundaries, appears to comply.
           RULE: Never write a passive subject. The individual must do something in response to the participant's action.
        2. What CHANGES in the environment or situation (position, access, bystander exposure, response timing)
        3. What REMAINS UNRESOLVED -- every outcome, including strong actions, MUST end in an open state. No outcome may imply full resolution, guaranteed interception, or confirmed compliance.

      UNCERTAINTY IS MANDATORY -- apply to ALL outcomes:
        BANNED PHRASES (never use these or close paraphrases):
          "Security intercepts the individual"
          "The individual complies"
          "The situation is under control"
          "Security is able to intercept"
          "The individual stops"
          "The threat is neutralized"
          "Control is established"
          Any phrasing that implies a resolved, completed, or guaranteed outcome.
        REQUIRED LANGUAGE PATTERNS -- use evolving, in-progress constructions:
          "Security is moving to intercept, but..."
          "The individual appears to hesitate, though..."
          "The situation remains dynamic..."
          "The window for controlled intervention is narrowing..."
          "Control is not yet established..."
          "Response is en route but arrival is not confirmed..."
          "The individual redirects but has not stopped..."

      OUTCOME TIER RULES:
        STRONG action â†’ subject hesitates or redirects; response chain is activated and moving; containment is possible but not confirmed. A timing gap or positional uncertainty must remain.
        PLAUSIBLE but suboptimal â†’ subject tests the boundary or continues moving; uncertainty window widens; org response timeline is delayed but not lost.
        POOR action â†’ subject escalates or evades; a specific organizational consequence is named (access breach, bypassed notification, documentation window lost); situation is deteriorating.
      Outcomes must NOT be neutral or similar across all three options.

      EXAMPLE BEFORE (BANNED -- resolved language):
        "Security is now tracking him and will intercept shortly."
      EXAMPLE AFTER (REQUIRED -- uncertain, evolving language):
        "Security is moving to intercept, but the individual continues deeper into the space. The window for controlled intervention is narrowing."
    - tradeoff: 1 sentence. Format: "Gained [X]; introduced [Y]."
    - reasoning: 2--3 sentences. STRICT STRUCTURE -- follow this EXACTLY:

        SENTENCE 1 -- PRIORITY ALIGNMENT (REQUIRED, appears ONCE and ONLY ONCE):
          Begin with EXACTLY one of these three openers, word-for-word. Do not paraphrase.
            "This option supports the priority by [specific mechanism]."
            "This option partially supports the priority by [X], but sacrifices [Y]."
            "This option conflicts with the priority because [specific reason]."

        SENTENCE 2 and beyond -- MECHANISM AND OUTCOME ONLY:
          Explain HOW the action works and WHAT it leads to.
          These sentences MUST NOT reference priority alignment in any form.
          BANNED PHRASES IN SENTENCE 2+:
            "supports the priority"
            "aligns with the priority"
            "advances the priority"
            "consistent with the priority"
            "in line with the priority"
            "reinforces the priority"
            "this aligns with"
            "it supports the priority"
            "this reinforces the priority"
            "this is consistent with"
            Any restatement or paraphrase of the Sentence 1 alignment.

        TONE RULES (apply to all sentences):
          NEVER use "ideal", "perfect", or "the correct" -- use "effective in this context", "strong option given current conditions", "appropriate given the information available".
          Frame poor choices as understandable but consequential: "This is a natural instinct, but it introduces [specific risk]."

        EXAMPLE CORRECT:
          "This option supports the priority by activating coordination early. It reduces personal exposure and enables a structured response from security. However, it allows the individual to gain additional ground before interception."

        EXAMPLE INCORRECT -- NEVER generate this:
          "This option supports the priority by activating coordination early. It aligns with the priority because it keeps the responder at a safe distance. This reinforces the priority of minimizing exposure."
          (Reason: Sentence 2 and 3 restate priority alignment -- this is a hard fail.)
  - prompt: the decision question

  CHECKPOINT 2 (phase: "escalation"):
  - Add "priorityFraming": string -- same format as checkpoint 1, but reflecting the escalated situation.
  - Add "escalationVariants": object with exactly 3 keys. Each variant MUST use subject-driven language -- name what the individual is doing, not just the abstract state.
    HARD RULE -- BANNED OPENING PHRASES (never use any of these, in any form):
      "The situation has progressed"
      "The situation has progressed significantly"
      "The situation has developed"
      "The situation has evolved"
      "The situation has changed"
      "Based on your previous action"
      "Based on your previous choice"
      "Following your previous action"
      "Following your previous decision"
      "Following your previous choice"
      "As a result of your previous action"
      "As a result of your previous choice"
      "Things have escalated"
      "The scenario has advanced"
      "Regardless of your previous choice"
      "Regardless of your previous action"
      If any variant, escalationContext, or checkpoint prompt opens with any of the above phrases or a close paraphrase, the output is INVALID. Rewrite from scratch.
    REQUIRED FLOW -- every checkpoint and escalation variant MUST follow this exact structure:
      1. Situation Update: state-based, causal -- what is observable right now (no transition narration)
      2. Priority: "Your priority: [directive]"
      3. Decision question: follows directly from the Situation Update with no transitional narration
      Example:
        Situation Update: The individual has moved toward the secondary corridor and is now out of your direct line of sight.
        Your priority: Maintain visibility and delay further movement.
        The individual is now attempting to open a door. What is your next move?
    REQUIRED: Every variant MUST open with a concrete, observable fact -- what a person in the room would see or hear at that exact moment. No abstract state descriptions. No transition language. Start with the subject or the environment, not with a summary of what happened.
      "alertInitiated": 2--3 sentences. Open directly with what security or the response chain is doing. Then describe what the individual is doing in response. Then name the remaining gap.
        Example: "Security has been notified and is en route. The individual has noticed the change in activity and is moving toward a secondary area. The window to establish containment before arrival is closing."
      "directIntervention": 2--3 sentences. Open directly with the consequence of the participant's action. Then describe how the individual reacted. Then name the current state.
        Example: "After your direct intervention, the individual resisted and moved deeper into the office. You are now in close proximity with no backup confirmed. The situation requires an immediate reassessment."
      "noAction": 2--3 sentences. Open directly with what has happened without an alert. Then describe what the individual is doing now. Then name what has been lost.
        Example: "No formal alert has been initiated. The individual has continued deeper into the workspace and is now near a restricted area. The response chain has not been activated and the situation is developing faster than expected."
    Each variant MUST adjust: individual's current position, level of control established, whether coordination is active.
    RULE: NEVER use "Regardless of your previous choice" or "Regardless of your previous action" anywhere in this drill. This is a hard ban.
    RULE: Escalation text must NEVER be identical across variants. Each must reflect a distinct situational state.
  - escalationContext: 2--3 sentences -- the default escalation setup (used when variant cannot be determined). Must reference prior decision context using subject-driven language.
  - Must reflect INCREASED pressure, ambiguity, or a new complication
  - Must have exactly 3 options with the same structure as checkpoint 1 (including viability standards and priorityFraming)
  - prompt: the new decision question reflecting the escalated situation

  GLOBAL RULES FOR GUIDED DRILLS:
  - Do NOT reveal riskLabel before selection
  - All outcomes must be realistic and grounded -- no dramatic language, no theatrical actions
  - OPTION DIFFERENTIATION IS REQUIRED: each checkpoint must have exactly 3 options representing distinct strategies:
      A. DIRECT CONTROL -- immediate intervention or physical positioning; high personal exposure; fast but risky
      B. COORDINATION-FIRST -- alert + observe; lower personal exposure; slower containment; depends on backup arriving
      C. STRUCTURED OBSERVATION -- DELAYED ESCALATION -- maintain safe distance and visual contact while monitoring the individual's movements; the individual has already breached access control or ignored instructions, so escalation is already warranted at this stage; the weakness of this option is that it delays acting on that escalation, not that it waits for a future trigger; suboptimal because it allows the individual to gain ground while the response chain remains inactive; plausible because it avoids premature confrontation and preserves situational awareness.
         HARD RULE: Do NOT frame Option C escalation as conditional on future behavior. The delay IS the weakness. Escalation is already appropriate; Option C simply does not act on it immediately.
         BANNED for Option C: framing escalation as "if they enter a restricted area" or "if non-compliance continues"; asking a colleague for advice; casual consultation; informal hesitation; passive watching without operational framing.
    Options must NOT overlap in intent or outcome. If two options represent the same strategy, rewrite one.
  - PRIORITY ALIGNMENT IS REQUIRED in Sentence 1 of every reasoning field, for every option, at every checkpoint.
    Use EXACTLY one of these three openers:
      - "This option supports the priority by [clear alignment]."
      - "This option partially supports the priority by [X], but sacrifices [Y]."
      - "This option conflicts with the priority because [X]."
    FAIL CONDITION 1: reasoning that implies alignment without stating it explicitly in Sentence 1 is not acceptable.
    FAIL CONDITION 2: any restatement of priority alignment after Sentence 1 is not acceptable. The phrase "supports the priority", "aligns with the priority", "advances the priority", or any synonym MUST NOT appear in Sentence 2 or beyond.
    FAIL CONDITION 3: using the old format "Supports the priority of [X]" (without "This option" opener) is not acceptable.
  - PASSIVE LANGUAGE IS BANNED: never write "the situation progresses", "the situation develops", "the situation evolves", or any phrasing where the situation acts on itself.
    REPLACE with subject-driven language: "The individual continues moving...", "The individual attempts to access...", "The individual redirects toward..."
  - THEATRICAL LANGUAGE IS BANNED: no yelling, no dramatic confrontation, no exaggerated behaviors.
    REPLACE "Call out loudly" with "Use a firm, audible command to draw attention while maintaining a safe position."
    All actions must be practical, controlled, and defensible in a real incident review.
  - The escalation checkpoint must feel like a genuine progression connected to checkpoint 1
  - Consequence differentiation is REQUIRED: strong/weak/poor actions must produce clearly different outcomes
  - Strong action outcomes must still contain friction, timing gaps, and incomplete resolution.
    OUTCOME TENSION RULE: avoid "Security is able to intercept" -- this implies a resolved state.
    Use instead: "Security is positioning to intercept", "Security is closing in", "Security is en route but has not yet arrived".
    Always maintain: tension, incomplete control, timing gap.
  - Poor action outcomes must name a specific organizational, access, or documentation consequence.
    DOCUMENTATION WINDOW PHRASING: replace "documentation window at risk" with "loss of clear incident documentation due to lack of early reporting".
    Use specific consequence language: "no formal notification has been made", "the incident response protocol has been bypassed", "the documentation window has closed before security arrives".
  - Every outcome must include an active subject reaction -- no static or passive subject behavior
  - No option may be framed as purely "safe" -- every choice introduces some form of personal, organizational, or situational risk

- Add "roleSpecificCues": array of objects { role: string, cue: string } -- role-specific decision triggers
- Add "documentationSection": { whatToCapture: string[], timeframe: string }
- guidedResponse: tightened 5-section expert thinking panel -- total reading time ~60--90 seconds. Each section: 1 bullet max, 1--2 sentences max. No padding. High-signal only.
  { howAnExpertAssesses: string[] (1 bullet), decisionMakingLens: string[] (1 bullet), actionConsiderations: string[] (1 bullet), commonHumanErrors: string[] (1 bullet), performanceStandard: string (1 sentence) }
- ACTD: all four phases, moderate depth
- Set responseOptions, outcomeMap, compressedGuidedResponse, microDebriefQuestion, responsePaths, decisionCheckpoints to null

EXTENDED SCENARIO (drillType = "extended") -- 15+ minutes:
Purpose: tabletop, walkthrough, or simulation; progressive escalation; role-based coordination.
- Add "exerciseType": "tabletop" | "walkthrough" | "simulation"
- Add "facilitatorSetup": { roomSetup: string, materialsNeeded: string[], preExerciseBriefing: string }
- Add "injects": array of objects { injectNumber: number, timeMarker: string, event: string, expectedDecision: string, facilitatorNote: string } -- minimum 3 injects with progressive escalation
- Add "participantRoles": array of objects { role: string, briefing: string, keyDecision: string }
- Add "criticalDecisions": string[] -- the 3--5 most important decision points in the scenario
- Add "communicationsFlow": { internalNotification: string, externalNotification: string, publicCommunication: string }
- Add "afterActionTemplate": { strengthsPrompt: string, gapsPrompt: string, improvementActions: string, followUpDeadline: string }
- guidedResponse: full expert thinking panel with facilitator-level depth
- ACTD: all four phases, full depth, progressive
- Must be clearly distinguished from operational drills -- tabletop/simulation format, not live execution
- Set responseOptions, outcomeMap, compressedGuidedResponse, microDebriefQuestion to null

==================================================
JSON SCHEMA (return ONLY valid JSON matching this schema)
==================================================
{
  "title": string,
  "drillType": "micro" | "guided" | "operational" | "extended",
  "scenarioType": "Suspicious Person" | "Unauthorized Access" | "Escalating Behavior" | "Domestic Spillover" | "Weapon Suspicion" | "Active Threat",
  "preIncidentIndicator": string,
  "escalationMoment": string,
  "roleBasedActions": [ { "role": string, "action": string, "rationale": string } ],
  "communicationRequirement": { "sender": string, "recipient": string, "message": string, "trigger": string },
  "expectedOutcome": { "correctDecision": string, "incorrectDecision": string },
  "durationMinutes": number,
  "primaryThreatSignal": string,
  "decisionPressure": string,
  "behavioralCues": string[],
  "objective": string,
  "scenario": string,
  "actd": {
    "assess": { "whatToNotice": string[], "signalsThatMatter": string[] },
    "commit": { "decisionRequired": string, "hesitationRisks": string[] },
    "takeAction": { "availableActions": string[], "adaptabilityNote": string },
    "debrief": { "whatToDocument": string[], "whatToImprove": string[] }
  },
  "guidedResponse": {
    "howAnExpertAssesses": string[],
    "decisionMakingLens": string[],
    "actionConsiderations": string[],
    "commonHumanErrors": string[],
    "performanceStandard": string
  } | null,
  "executionInstructions": string[],
  "expectedOutcomes": string[],
  "commonBreakdowns": string[],
  "debriefQuestions": string[],
  "regulatoryAlignment": string[],
  "responseOptions": string[] | null,
  "outcomeMap": { [key: string]: { "riskLevel": string, "consequence": string, "tradeoff": string, "humanRealismNote": string, "coachingConnection": string, "likelyOutcome": string, "whyThisMatters": string } } | null,
  "compressedGuidedResponse": { "howAnExpertReadsThis": string[], "criticalDecision": string, "mostLikelyMistake": string, "bestNextMove": string } | null,
  "microDebriefQuestion": string | null,
  "responsePaths": [ { "pathLabel": string, "description": string, "riskLevel": string, "guidanceNote": string, "outcomeProgression": string } ] | null,
  "decisionCheckpoints": [ { "prompt": string, "placement": "early" | "mid" } ] | null,
  "guidedCheckpoints": [
    {
      "phase": "initial" | "escalation",
      "prompt": string,
      "priorityFraming": string,
      "escalationContext": string | null,
      "escalationVariants": { "alertInitiated": string, "directIntervention": string, "noAction": string } | null,
      "options": [
        { "label": string, "description": string, "riskLabel": string, "outcome": string, "tradeoff": string, "reasoning": string, "doctrine_evaluation": { "exposure_effect": string, "control_effect": string, "escalation_effect": string, "coordination_effect": string, "documentation_effect": string, "notes": string[] } },
        { "label": string, "description": string, "riskLabel": string, "outcome": string, "tradeoff": string, "reasoning": string, "doctrine_evaluation": { "exposure_effect": string, "control_effect": string, "escalation_effect": string, "coordination_effect": string, "documentation_effect": string, "notes": string[] } },
        { "label": string, "description": string, "riskLabel": string, "outcome": string, "tradeoff": string, "reasoning": string, "doctrine_evaluation": { "exposure_effect": string, "control_effect": string, "escalation_effect": string, "coordination_effect": string, "documentation_effect": string, "notes": string[] } }
      ]
    }
  ] | null,
  "roleSpecificCues": [ { "role": string, "cue": string } ] | null,
  "documentationSection": { "whatToCapture": string[], "timeframe": string } | null,
  "teamRoles": [ { "role": string, "primaryAction": string, "communicationTrigger": string } ] | null,
  "scenarioTimeline": [ { "timeMarker": string, "event": string, "expectedAction": string } ] | null,
  "communicationCheckpoints": string[] | null,
  "decisionBranches": [ { "trigger": string, "ifYes": string, "ifNo": string, "riskLabel": string } ] | null,
  "exerciseType": "tabletop" | "walkthrough" | "simulation" | null,
  "facilitatorSetup": { "roomSetup": string, "materialsNeeded": string[], "preExerciseBriefing": string } | null,
  "injects": [ { "injectNumber": number, "timeMarker": string, "event": string, "expectedDecision": string, "facilitatorNote": string } ] | null,
  "participantRoles": [ { "role": string, "briefing": string, "keyDecision": string } ] | null,
  "criticalDecisions": string[] | null,
  "communicationsFlow": { "internalNotification": string, "externalNotification": string, "publicCommunication": string } | null,
  "afterActionTemplate": { "strengthsPrompt": string, "gapsPrompt": string, "improvementActions": string, "followUpDeadline": string } | null
}`;

      const coreRuleReminder = `SYSTEM OVERRIDE -- THREAT DOMAIN ENFORCEMENT: This drill MUST be categorized as an ACTIVE THREAT / UNAUTHORIZED ACCESS ESCALATION scenario. BANNED: theft-only scenarios, equipment misuse as primary threat, general workplace safety incidents, operational disruption without human threat escalation. FIVE-ELEMENT REQUIREMENT -- the scenario MUST include ALL FIVE: (1) unknown or unauthorized individual, (2) boundary violation, (3) behavioral escalation indicators (evasion, aggression, deception, non-compliance), (4) forward progression deeper into controlled space, (5) implied or potential threat to human safety. REJECT AND REGENERATE if any element is missing. LANGUAGE BANS: do NOT use "continue working" as a viable option; do NOT use "monitor the situation" as a standalone option; do NOT use "wait and see" in any form. DECISION VALIDATION: every option must represent a conscious decision under pressure -- control attempt, coordination activation, or structured observation with escalation intent. No option may ignore the situation, assume benign intent without verification, or allow normal work to continue. MICRO DRILL INTENSITY (if drillType = micro): the scenario MUST include clear abnormal behavior + non-compliance or evasion + movement deeper into controlled space. INVALID if the participant can safely do nothing for 60 seconds. OUTPUT TRAINING GOAL: Recognition â†’ Control â†’ Coordination â†’ Containment. KEYWORD VALIDATION: scenario text MUST include at least one of: threat, weapon, suspicious, aggressive, unauthorized, violence, escalation, armed, hostile, threatening, assault, confrontation, intruder, stalking, domestic, grievance.`;

      const userMessage = input.generationMode === "user" && input.userPrompt
        ? `${coreRuleReminder}\n\nGenerate a ${DRILL_TYPE_LABELS[input.drillType]} for the following scenario:\n\n${input.userPrompt}\n\nIndustry: ${input.industry ?? "General"}\nJurisdiction: ${input.jurisdiction ?? "United States"}`
        : `${coreRuleReminder}\n\nGenerate a ${DRILL_TYPE_LABELS[input.drillType]} for a ${input.industry ?? "general workplace"} facility.\n\nFacility context:\n${input.facilityContext ?? "No specific facility data provided -- generate a baseline drill and note assumptions."}\n\nJurisdiction: ${input.jurisdiction ?? "United States"}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      });

      let content: Record<string, unknown>;
      try {
        content = JSON.parse(response.choices[0].message.content as string);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse drill content from AI" });
      }

      const templateId = await createDrillTemplate({
        createdByUserId: ctx.user.id,
        facilityId: input.facilityId,
        title: (content.title as string) ?? "ACTD Drill",
        drillType: input.drillType,
        durationMinutes: (content.durationMinutes as number) ?? 5,
        industry: input.industry,
        jurisdiction: input.jurisdiction,
        generationMode: input.generationMode,
        userPrompt: input.userPrompt,
        content,
        regulatoryTags: (content.regulatoryAlignment as string[]) ?? [],
      });

      return { templateId, content };
    }),

  /** List all drill templates for the current user */
  listTemplates: paidProcedure
    .input(z.object({ facilityId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getDrillTemplates(ctx.user.id, input.facilityId);
    }),

  /** Get a single drill template by ID */
  getTemplate: paidProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const t = await getDrillTemplateById(input.id);
      if (!t || t.createdByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      return t;
    }),

  /** Schedule a drill session from a template */
  schedule: paidSandboxRestrictedProcedure
    .input(z.object({
      templateId: z.number(),
      facilityId: z.number().optional(),
      scheduledAt: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sessionId = await createDrillSession({
        templateId: input.templateId,
        facilityId: input.facilityId,
        scheduledByUserId: ctx.user.id,
        scheduledAt: input.scheduledAt,
        status: "scheduled",
      });
      return { sessionId };
    }),

  /** List all drill sessions for the current user */
  listSessions: paidProcedure
    .input(z.object({ facilityId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getDrillSessions(ctx.user.id, input.facilityId);
    }),

  /** Get a single drill session with its template and participants */
  getSession: paidProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const session = await getDrillSessionById(input.id);
      if (!session || session.scheduledByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const template = await getDrillTemplateById(session.templateId);
      const participants = await getDrillParticipants(session.id);
      return { session, template, participants };
    }),

  /** Mark a session as in_progress */
  start: paidSandboxRestrictedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getDrillSessionById(input.id);
      if (!session || session.scheduledByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await updateDrillSession(input.id, { status: "in_progress" });
      return { success: true };
    }),

  /** Complete a drill session and save participant list */
  complete: paidSandboxRestrictedProcedure
    .input(z.object({
      id: z.number(),
      participantCount: z.number().optional(),
      facilitatorNotes: z.string().optional(),
      participants: z.array(z.object({
        name: z.string(),
        role: z.string().optional(),
        attended: z.boolean().default(true),
        observations: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await getDrillSessionById(input.id);
      if (!session || session.scheduledByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      await updateDrillSession(input.id, {
        status: "completed",
        completedAt: new Date(),
        participantCount: input.participantCount,
        facilitatorNotes: input.facilitatorNotes,
      });
      if (input.participants && input.participants.length > 0) {
        await addDrillParticipants(input.participants.map(p => ({ ...p, sessionId: input.id })));
      }
      return { success: true };
    }),

  /** Save after-action debrief data and generate system intelligence */
  debrief: paidSandboxRestrictedProcedure
    .input(z.object({
      id: z.number(),
      debriefAnswers: z.record(z.string(), z.string()),
      gapsIdentified: z.string().optional(),
      followUpActions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await getDrillSessionById(input.id);
      if (!session || session.scheduledByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const template = await getDrillTemplateById(session.templateId);

      // Generate system intelligence via LLM
      let systemIntelligence: Record<string, unknown> = {};
      try {
        const siResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are a drill training analyst. Based on the debrief data provided, return a JSON object with:
{ "nextRecommendedDrill": string, "skillProgressionSuggestion": string, "trainingGapsIdentified": string[], "overallAssessment": string }` },
            { role: "user", content: `Drill: ${template?.title ?? "Unknown"}\nType: ${template?.drillType ?? "unknown"}\nDebrief answers: ${JSON.stringify(input.debriefAnswers)}\nGaps: ${input.gapsIdentified ?? "None noted"}\nFollow-up actions: ${input.followUpActions ?? "None"}` },
          ],
          response_format: { type: "json_object" },
        });
        systemIntelligence = JSON.parse(siResponse.choices[0].message.content as string);
      } catch { /* non-fatal */ }

      await updateDrillSession(input.id, {
        debriefData: {
          answers: input.debriefAnswers,
          gapsIdentified: input.gapsIdentified,
          followUpActions: input.followUpActions,
        },
        systemIntelligence,
      });
      return { success: true, systemIntelligence };
    }),
});

const staffCheckinRouter = router({
  list: paidProcedure
    .input(z.object({ facilityId: z.number().optional(), orgId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      // Require at least one filter to prevent cross-org data leak
      const resolvedOrgId = input.orgId;
      if (!input.facilityId && !resolvedOrgId) {
        // Default to user's primary org if no filter provided
        const memberships = await getOrgMembershipForUser(ctx.user.id);
        if (memberships[0]?.orgId) {
          return getStaffCheckins(undefined, memberships[0].orgId);
        }
        return [];
      }
      return getStaffCheckins(input.facilityId, resolvedOrgId);
    }),
  create: paidProcedure
    .input(z.object({
      staffName: z.string().min(1),
      status: z.enum(["reunification", "injured", "off_site", "cannot_disclose"]),
      location: z.string().optional(),
      facilityId: z.number().optional(),
      orgId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Resolve orgId: prefer client-provided, fall back to user's primary membership
      let resolvedOrgId = input.orgId;
      if (!resolvedOrgId) {
        const memberships = await getOrgMembershipForUser(ctx.user.id);
        resolvedOrgId = memberships[0]?.orgId;
      }
      const data: any = {
        staffName: input.staffName,
        status: input.status,
        location: input.location ?? null,
        recordedByUserId: ctx.user.id,
      };
      if (input.facilityId) data.facilityId = input.facilityId;
      if (resolvedOrgId) data.orgId = resolvedOrgId;
      return createStaffCheckin(data);
    }),
  delete: paidProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteStaffCheckin(input.id);
      return { success: true };
    }),
  clearAll: paidProcedure
    .input(z.object({ facilityId: z.number().optional(), orgId: z.number().optional() }))
    .mutation(async ({ input }) => {
      await clearStaffCheckins(input.facilityId, input.orgId);
      return { success: true };
    }),
});

// â”€â”€â”€ BTAM Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const btamRouter = router({
  // List all cases for the user's org
  listCases: paidProcedure.query(async ({ ctx }) => {
    const memberships = await getOrgMembershipForUser(ctx.user.id);
    const orgId = memberships[0]?.orgId ?? 0;
    return getBtamCases(orgId);
  }),

  // Get full case detail (case + subject + intake + latest assessment + plan + notes + history)
  getCase: paidProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input, ctx }) => {
      const c = await getBtamCaseById(input.caseId);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      const [subject, intake, latestAssessment, allAssessments, plan, history] = await Promise.all([
        getBtamSubjectByCase(input.caseId),
        getBtamReferralIntakeByCase(input.caseId),
        getLatestBtamAssessment(input.caseId),
        getBtamAssessmentsByCase(input.caseId),
        getBtamManagementPlanByCase(input.caseId),
        getBtamStatusHistoryByCase(input.caseId),
      ]);
      const isTatAdmin = (["admin","ultra_admin"].includes(ctx.user.role)) || (ctx.user as any).btamRole === "tat_admin";
      const notes = await getBtamCaseNotesByCase(input.caseId, isTatAdmin);
      return { case: c, subject, intake, latestAssessment, allAssessments, plan, notes, history };
    }),

  // Create a new referral (intake + subject + case in one transaction)
  createReferral: paidProcedure
    .input(z.object({
      // Intake fields
      reporterRole: z.enum(["hr", "manager", "coworker", "self", "anonymous"]),
      concernDescription: z.string().min(10),
      dateOfConcern: z.string().optional(),
      locationOfConcern: z.string().optional(),
      witnessesPresent: z.boolean().default(false),
      immediateThreathFelt: z.boolean().default(false),
      weaponMentioned: z.boolean().default(false),
      targetIdentified: z.boolean().default(false),
      targetDescription: z.string().optional(),
      priorIncidentsKnown: z.boolean().default(false),
      priorIncidentsDescription: z.string().optional(),
      supportingDocuments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
      // Subject fields
      subjectType: z.enum(["employee", "former_employee", "customer_client", "contractor", "visitor", "unknown"]),
      employmentStatus: z.enum(["active", "terminated", "suspended", "on_leave", "never_employed"]).optional(),
      nameKnown: z.boolean().default(false),
      subjectAlias: z.string().optional(),
      subjectContact: z.string().optional(),
      department: z.string().optional(),
      location: z.string().optional(),
      supervisorName: z.string().optional(),
      tenureYears: z.number().optional(),
      recentDisciplinaryAction: z.boolean().default(false),
      pendingTermination: z.boolean().default(false),
      grievanceFiled: z.boolean().default(false),
      domesticSituationKnown: z.boolean().default(false),
      accessCredentialsActive: z.boolean().default(true),
      // Case options
      violenceType: z.enum(["type_i_criminal", "type_ii_client", "type_iii_worker_on_worker", "type_iv_personal_relationship"]).optional(),
      isAnonymousReporter: z.boolean().default(false),
      linkedIncidentId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const memberships = await getOrgMembershipForUser(ctx.user.id);
      const orgId = memberships[0]?.orgId ?? 0;
      const caseNumber = await generateCaseNumber(orgId);
      // Create case
      const caseId = await createBtamCase({
        orgId,
        caseNumber,
        status: "open",
        concernLevel: "pending",
        violenceType: input.violenceType,
        createdBy: ctx.user.id,
        isAnonymousReporter: input.isAnonymousReporter,
        confidentialityFlag: true,
        linkedIncidentId: input.linkedIncidentId,
      });
      // Create subject
      await upsertBtamSubject({
        caseId,
        subjectType: input.subjectType,
        employmentStatus: input.employmentStatus,
        nameKnown: input.nameKnown,
        subjectAlias: input.subjectAlias,
        subjectContact: input.subjectContact,
        department: input.department,
        location: input.location,
        supervisorName: input.supervisorName,
        tenureYears: input.tenureYears,
        recentDisciplinaryAction: input.recentDisciplinaryAction,
        pendingTermination: input.pendingTermination,
        grievanceFiled: input.grievanceFiled,
        domesticSituationKnown: input.domesticSituationKnown,
        accessCredentialsActive: input.accessCredentialsActive,
      });
      // Create intake
      await createBtamReferralIntake({
        caseId,
        reporterRole: input.reporterRole,
        concernDescription: input.concernDescription,
        dateOfConcern: input.dateOfConcern,
        locationOfConcern: input.locationOfConcern,
        witnessesPresent: input.witnessesPresent,
        immediateThreathFelt: input.immediateThreathFelt,
        weaponMentioned: input.weaponMentioned,
        targetIdentified: input.targetIdentified,
        targetDescription: input.targetDescription,
        priorIncidentsKnown: input.priorIncidentsKnown,
        priorIncidentsDescription: input.priorIncidentsDescription,
        supportingDocuments: input.supportingDocuments ? JSON.stringify(input.supportingDocuments) : null,
      });
      // Record initial status history
      await createBtamStatusHistory({
        caseId,
        changedBy: ctx.user.id,
        previousStatus: null,
        newStatus: "open",
        previousConcernLevel: null,
        newConcernLevel: "pending",
        reason: "Case created via referral intake",
      });
      // Notify owner
      await notifyOwner({
        title: `New BTAM Referral: ${caseNumber}`,
        content: `A new behavioral threat referral has been submitted.\nCase: ${caseNumber}\nConcern: ${input.concernDescription.slice(0, 120)}...`,
      });
      return { caseId, caseNumber };
    }),

  // Update case status / concern level
  updateCaseStatus: paidProcedure
    .input(z.object({
      caseId: z.number(),
      status: z.enum(["open", "monitoring", "resolved", "escalated", "referred_law_enforcement"]).optional(),
      concernLevel: z.enum(["pending", "low", "moderate", "high", "imminent"]).optional(),
      assignedAssessor: z.number().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getBtamCaseById(input.caseId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await updateBtamCase(input.caseId, {
        ...(input.status ? { status: input.status } : {}),
        ...(input.concernLevel ? { concernLevel: input.concernLevel } : {}),
        ...(input.assignedAssessor !== undefined ? { assignedAssessor: input.assignedAssessor } : {}),
      });
      await createBtamStatusHistory({
        caseId: input.caseId,
        changedBy: ctx.user.id,
        previousStatus: existing.status,
        newStatus: input.status ?? existing.status,
        previousConcernLevel: existing.concernLevel,
        newConcernLevel: input.concernLevel ?? existing.concernLevel,
        reason: input.reason,
      });
      // Escalation notification
      if (input.concernLevel === "imminent" || input.status === "referred_law_enforcement") {
        await notifyOwner({
          title: `BTAM ESCALATION: ${existing.caseNumber}`,
          content: `Case ${existing.caseNumber} has been escalated to concern level: ${input.concernLevel ?? existing.concernLevel}.`,
        });
      }
      return { ok: true };
    }),

  // Get a single incident report by ID (for linked incident card in BTAM case detail)
  getLinkedIncident: paidProcedure
    .input(z.object({ incidentId: z.number() }))
    .query(async ({ input }) => {
      const report = await getIncidentReportById(input.incidentId);
      if (!report) return null;
      return {
        id: report.id,
        incidentType: report.incidentType,
        severity: report.severity,
        status: report.status,
        description: report.description,
        location: report.location,
        facilityName: report.facilityName,
        incidentDate: report.incidentDate,
        createdAt: report.createdAt,
        trackingToken: report.trackingToken,
      };
    }),
  // Find the BTAM case linked to a given incident report (for Incident Dashboard escalation badge)
  getCaseByLinkedIncident: paidProcedure
    .input(z.object({ incidentId: z.number() }))
    .query(async ({ input }) => {
      const c = await getBtamCaseByLinkedIncidentId(input.incidentId);
      if (!c) return null;
      return { caseId: c.id, caseNumber: c.caseNumber, status: c.status, concernLevel: c.concernLevel };
    }),
  // Analyze free text for threat keywords -- returns flags without persisting
  analyzeText: paidProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      return scanText(input.text);
    }),
  // Submit WAVR assessment
  submitAssessment: paidProcedure
    .input(z.object({
      caseId: z.number(),
      factors: z.object({
        grievanceFixation: z.number().min(0).max(2).default(0),
        grievanceWithTarget: z.number().min(0).max(2).default(0),
        desperationHopelessness: z.number().min(0).max(2).default(0),
        mentalHealthConcern: z.number().min(0).max(2).default(0),
        paranoidThinking: z.number().min(0).max(2).default(0),
        depressionWithdrawal: z.number().min(0).max(2).default(0),
        narcissisticInjury: z.number().min(0).max(2).default(0),
        concerningCommunications: z.number().min(0).max(2).default(0),
        weaponsInterest: z.number().min(0).max(2).default(0),
        pathwayBehaviors: z.number().min(0).max(2).default(0),
        leakage: z.number().min(0).max(2).default(0),
        priorViolenceHistory: z.number().min(0).max(2).default(0),
        priorMentalHealthCrisis: z.number().min(0).max(2).default(0),
        domesticViolenceHistory: z.number().min(0).max(2).default(0),
        recentStressor: z.number().min(0).max(2).default(0),
        socialIsolation: z.number().min(0).max(2).default(0),
        personalCrisis: z.number().min(0).max(2).default(0),
        helpSeeking: z.number().min(0).max(2).default(0),
        socialSupport: z.number().min(0).max(2).default(0),
        futureOrientation: z.number().min(0).max(2).default(0),
        finalActBehaviors: z.number().min(0).max(2).default(0),
        surveillanceOfTarget: z.number().min(0).max(2).default(0),
        imminentCommunication: z.number().min(0).max(2).default(0),
      }),
      changeFlags: z.record(z.string(), z.boolean()).optional(),
      assessorNotes: z.string().optional(),
      assessorAttestation: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.assessorAttestation) throw new TRPCError({ code: "BAD_REQUEST", message: "Assessor attestation required" });
      const scoring = computeWavrScore(input.factors);
      const assessmentId = await createBtamAssessment({
        caseId: input.caseId,
        assessorId: ctx.user.id,
        ...input.factors,
        ...(input.changeFlags ?? {}),
        computedConcernLevel: scoring.computedConcernLevel,
        totalWeightedScore: scoring.totalWeightedScore,
        topContributingFactors: JSON.stringify(scoring.topContributingFactors),
        assessorNotes: input.assessorNotes,
        assessorAttestation: input.assessorAttestation,
      });
      // Auto-update case concern level
      const existing = await getBtamCaseById(input.caseId);
      if (existing) {
        await updateBtamCase(input.caseId, { concernLevel: scoring.computedConcernLevel });
        await createBtamStatusHistory({
          caseId: input.caseId,
          changedBy: ctx.user.id,
          previousStatus: existing.status,
          newStatus: existing.status,
          previousConcernLevel: existing.concernLevel,
          newConcernLevel: scoring.computedConcernLevel,
          reason: `WAVR assessment completed. Score: ${scoring.totalWeightedScore}. Auto-escalated: ${scoring.autoEscalated}`,
        });
        if (scoring.computedConcernLevel === "imminent") {
          await notifyOwner({
            title: `BTAM IMMINENT THREAT: ${existing.caseNumber}`,
            content: `WAVR assessment for case ${existing.caseNumber} has returned an IMMINENT concern level. Immediate action required.\nTop factors: ${scoring.topContributingFactors.join(", ")}`,
          });
        }
      }
      return { assessmentId, scoring };
    }),

  // Management plan CRUD
  addPlanItem: paidProcedure
    .input(z.object({
      caseId: z.number(),
      interventionType: z.enum(["monitoring", "hr_meeting", "eap_referral", "mandatory_counseling", "credential_suspension", "law_enforcement_notification", "no_contact_order", "termination_with_safety_protocol", "hospitalization_referral", "other"]),
      actionDescription: z.string().min(5),
      responsibleParty: z.number().optional(),
      dueDate: z.string().optional(),
      nextReviewDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createBtamManagementPlanItem({
        caseId: input.caseId,
        createdBy: ctx.user.id,
        interventionType: input.interventionType,
        actionDescription: input.actionDescription,
        responsibleParty: input.responsibleParty,
        dueDate: input.dueDate,
        nextReviewDate: input.nextReviewDate,
        completed: false,
      });
      return { id };
    }),

  completePlanItem: paidProcedure
    .input(z.object({ itemId: z.number(), completionNotes: z.string().optional() }))
    .mutation(async ({ input }) => {
      await updateBtamManagementPlanItem(input.itemId, { completed: true, completionNotes: input.completionNotes });
      return { ok: true };
    }),

  deletePlanItem: paidProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBtamManagementPlanItem(input.itemId);
      return { ok: true };
    }),

  // Case notes
  addNote: paidProcedure
    .input(z.object({
      caseId: z.number(),
      noteType: z.enum(["observation", "interview", "external_report", "law_enforcement", "legal", "hr", "general"]),
      content: z.string().min(5),
      isPrivileged: z.boolean().default(false),
      attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createBtamCaseNote({
        caseId: input.caseId,
        authorId: ctx.user.id,
        noteType: input.noteType,
        content: input.content,
        isPrivileged: input.isPrivileged,
        attachments: input.attachments ? JSON.stringify(input.attachments) : null,
      });
      return { id };
    }),

  // File upload for BTAM attachments
  getUploadUrl: paidProcedure
    .input(z.object({ filename: z.string(), contentType: z.string() }))
    .mutation(async ({ input }) => {
      const key = `btam-attachments/${nanoid()}-${input.filename}`;
      const { url } = await storagePut(key, Buffer.alloc(0), input.contentType);
      return { key, url };
    }),

  uploadAttachment: paidProcedure
    .input(z.object({ filename: z.string(), contentType: z.string(), base64Data: z.string() }))
    .mutation(async ({ input }) => {
      const key = `btam-attachments/${nanoid()}-${input.filename}`;
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(key, buffer, input.contentType);
      return { key, url };
    }),
});


// â”€â”€â”€ Settings Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const settingsRouter = router({
  // Update the current user's display name
  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(usersTable).set({ name: input.name }).where(eq(usersTable.id, ctx.user.id));
      return { success: true };
    }),

  // Change the current user's password (requires current password verification)
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { createHash, randomBytes: rb } = await import("crypto");
      const hashPw = (pw: string, salt: string) =>
        createHash("sha256").update(salt + pw).digest("hex");
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ctx.user.id)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (!user.passwordHash || !user.passwordSalt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password change is not available for accounts created via SSO. Use your identity provider to change your password.",
        });
      }
      const currentHash = hashPw(input.currentPassword, user.passwordSalt);
      if (currentHash !== user.passwordHash) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Current password is incorrect." });
      }
      const newSalt = rb(16).toString("hex");
      const newHash = hashPw(input.newPassword, newSalt);
      await db.update(usersTable)
        .set({ passwordHash: newHash, passwordSalt: newSalt })
        .where(eq(usersTable.id, ctx.user.id));
      return { success: true };
    }),

  // Mark the onboarding walkthrough as seen for the current user
  markWalkthroughSeen: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users: usersTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(usersTable).set({ hasSeenWalkthrough: true }).where(eq(usersTable.id, ctx.user.id));
      return { success: true };
    }),

  // Request a data export (submits a request; actual export is handled by support)
  requestDataExport: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Log the request in audit logs for compliance
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { auditLogs: auditLogsTable } = await import("../drizzle/schema");
      await db.insert(auditLogsTable).values({
        userId: ctx.user.id,
        orgId: null,
        action: "data_export_request",
        resource: "user",
        resourceId: String(ctx.user.id),
        description: `User ${ctx.user.email ?? ctx.user.id} requested a data export`,
        metadata: { requestedAt: new Date().toISOString() },
      } as any);
      return { success: true };
    }),
});

const jurisdictionRouter = router({
  getStateDoc: publicProcedure
    .input(z.object({ stateCode: z.string().min(1) }))
    .query(async ({ input }) => {
      const result = await loadStateJurisdictionSection(input.stateCode);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: `No jurisdiction document found for state code ${input.stateCode}` });
      }
      return result;
    }),
  getGlossary: publicProcedure
    .query(async () => {
      return await loadJurisdictionGlossary();
    }),
});

export const appRouter = router({
  incidentCommunication: incidentCommunicationRouter,
  notification: notificationRouter,
  facilityMap: facilityMapRouter,
  microDrill: microDrillRouter,
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      const { user, realAdmin } = opts.ctx;
      if (!user) return null;
      // When impersonating, return the target user but annotate with impersonation state
      return {
        ...user,
        _isImpersonated: !!realAdmin,
        _realAdminId: realAdmin?.id ?? null,
        _realAdminName: realAdmin?.name ?? null,
        _realAdminEmail: realAdmin?.email ?? null,
        _realAdminRole: realAdmin?.role ?? null,
      };
    }),
    // Returns the current user's org plan ('free' | 'paid') -- used by client for UI gating
    myPlan: publicProcedure.query((opts) => opts.ctx.orgPlan ?? "free"),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    acceptTerms: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      await acceptTerms(ctx.user.id);
      return { success: true } as const;
    }),
  }),
  facility: facilityRouter,
  audit: auditRouter,
  threat: threatRouter,
  report: reportRouter,
  photo: photoRouter,
  dashboard: dashboardRouter,
  feedback: feedbackRouter,
   incident: incidentRouter,
  attachment: attachmentTrpcRouter,
  correctiveCheck: correctiveCheckRouter,
  org: orgRouter,
  visitor: visitorRouter,
  eap: eapRouter,
  adminUser: adminUserRouter,
  flaggedVisitor: flaggedVisitorRouter,
  liabilityScan: liabilityScanRouter,
  jurisdictions: jurisdictionRouter,
  onboarding: onboardingRouter,
  drill: drillRouter,
  ras: rasRouter,
  staffCheckin: staffCheckinRouter,
  trainingModule: trainingModuleRouter,
  massNotification: massNotificationRouter,
  // API Key management (create/list/revoke) -- accessible to org admins and platform admins
  apiKeys: router({
    create: orgAdminProcedure
      .input(z.object({ label: z.string().optional(), orgId: z.number().optional(), expiresInDays: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const token = randomBytes(32).toString("hex");
        const hash = createHash("sha256").update(token).digest("hex");
        const expiresAt = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000) : undefined;
        await createApiKey({
          userId: ctx.user.id,
          orgId: input.orgId ?? undefined,
          label: input.label ?? undefined,
          keyHash: hash,
          permissions: [],
          expiresAt,
        });
        return { token };
      }),

    list: orgAdminProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const rows = await listApiKeysByUser(ctx.user.id);
      return rows.map(r => ({ id: r.id, label: r.label, orgId: r.orgId, revokedAt: r.revokedAt, expiresAt: r.expiresAt, createdAt: r.createdAt }));
    }),

    revoke: orgAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await revokeApiKey(input.id);
      return { success: true } as const;
    }),
  }),
  btam: btamRouter,
  settings: settingsRouter,
  migrate: router({
    runPending: publicProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No DB" });
      const stmts = [
        { name: "CREATE staff_checkins", q: sql`CREATE TABLE IF NOT EXISTS \`staff_checkins\` (\`id\` int AUTO_INCREMENT NOT NULL, \`orgId\` int, \`facilityId\` int, \`staffName\` varchar(255) NOT NULL, \`status\` enum('reunification','injured','off_site','cannot_disclose') NOT NULL, \`location\` text, \`recordedByUserId\` int, \`createdAt\` timestamp NOT NULL DEFAULT (now()), CONSTRAINT \`staff_checkins_id\` PRIMARY KEY(\`id\`))` },
        { name: "ADD facilities.emergencyRoles", q: sql`ALTER TABLE \`facilities\` ADD COLUMN IF NOT EXISTS \`emergencyRoles\` text` },
        { name: "ADD facilities.aedOnSite", q: sql`ALTER TABLE \`facilities\` ADD COLUMN IF NOT EXISTS \`aedOnSite\` boolean DEFAULT false` },
        { name: "ADD facilities.aedLocations", q: sql`ALTER TABLE \`facilities\` ADD COLUMN IF NOT EXISTS \`aedLocations\` text` },
        { name: "ADD flagged_visitors.flagLevel", q: sql`ALTER TABLE \`flagged_visitors\` ADD COLUMN IF NOT EXISTS \`flagLevel\` enum('red','yellow') DEFAULT 'red' NOT NULL` },
        { name: "ADD users.rasRole", q: sql`ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`rasRole\` enum('admin','responder','staff')` },
        { name: "ADD incident_reports.followUpRequested", q: sql`ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`followUpRequested\` boolean DEFAULT false` },
        { name: "ADD incident_reports.followUpMethod", q: sql`ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`followUpMethod\` enum('phone','email','in_person')` },
        { name: "ADD incident_reports.followUpContact", q: sql`ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`followUpContact\` varchar(320)` },
        { name: "ADD incident_reports.involvedPersonName", q: sql`ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`involvedPersonName\` varchar(255)` },
        { name: "ADD incident_reports.isRepeatIncident", q: sql`ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`isRepeatIncident\` boolean DEFAULT false` },
        { name: "ADD incident_reports.repeatGroupId", q: sql`ALTER TABLE \`incident_reports\` ADD COLUMN IF NOT EXISTS \`repeatGroupId\` varchar(64)` },
        // BTAM tables
        { name: "ADD users.btamRole", q: sql`ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`btamRole\` enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none'` },
        { name: "CREATE btam_cases", q: sql`CREATE TABLE IF NOT EXISTS \`btam_cases\` (\`id\` int AUTO_INCREMENT NOT NULL, \`orgId\` int NOT NULL, \`caseNumber\` varchar(32) NOT NULL, \`status\` enum('open','monitoring','resolved','escalated','referred_law_enforcement') NOT NULL DEFAULT 'open', \`concernLevel\` enum('pending','low','moderate','high','imminent') NOT NULL DEFAULT 'pending', \`violenceType\` enum('type_i_criminal','type_ii_client','type_iii_worker_on_worker','type_iv_personal_relationship'), \`createdBy\` int NOT NULL, \`assignedAssessor\` int, \`linkedIncidentId\` int, \`isAnonymousReporter\` boolean NOT NULL DEFAULT false, \`confidentialityFlag\` boolean NOT NULL DEFAULT true, \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT \`btam_cases_id\` PRIMARY KEY(\`id\`), CONSTRAINT \`btam_cases_caseNumber_unique\` UNIQUE(\`caseNumber\`))` },
        { name: "CREATE btam_subjects", q: sql`CREATE TABLE IF NOT EXISTS \`btam_subjects\` (\`id\` int AUTO_INCREMENT NOT NULL, \`caseId\` int NOT NULL, \`subjectType\` enum('employee','former_employee','customer_client','contractor','visitor','unknown') NOT NULL, \`employmentStatus\` enum('active','terminated','suspended','on_leave','never_employed'), \`nameKnown\` boolean NOT NULL DEFAULT false, \`subjectAlias\` text, \`subjectContact\` text, \`department\` varchar(255), \`location\` varchar(255), \`supervisorName\` varchar(255), \`tenureYears\` float, \`recentDisciplinaryAction\` boolean DEFAULT false, \`pendingTermination\` boolean DEFAULT false, \`grievanceFiled\` boolean DEFAULT false, \`domesticSituationKnown\` boolean DEFAULT false, \`accessCredentialsActive\` boolean DEFAULT true, \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT \`btam_subjects_id\` PRIMARY KEY(\`id\`))` },
        { name: "CREATE btam_referral_intake", q: sql`CREATE TABLE IF NOT EXISTS \`btam_referral_intake\` (\`id\` int AUTO_INCREMENT NOT NULL, \`caseId\` int NOT NULL, \`reporterRole\` enum('hr','manager','coworker','self','anonymous') NOT NULL, \`concernDescription\` text NOT NULL, \`dateOfConcern\` varchar(32), \`locationOfConcern\` varchar(255), \`witnessesPresent\` boolean DEFAULT false, \`immediateThreathFelt\` boolean DEFAULT false, \`weaponMentioned\` boolean DEFAULT false, \`targetIdentified\` boolean DEFAULT false, \`targetDescription\` text, \`priorIncidentsKnown\` boolean DEFAULT false, \`priorIncidentsDescription\` text, \`supportingDocuments\` json, \`createdAt\` timestamp NOT NULL DEFAULT (now()), CONSTRAINT \`btam_referral_intake_id\` PRIMARY KEY(\`id\`))` },
        { name: "CREATE btam_wavr_assessments", q: sql`CREATE TABLE IF NOT EXISTS \`btam_wavr_assessments\` (\`id\` int AUTO_INCREMENT NOT NULL, \`caseId\` int NOT NULL, \`assessorId\` int NOT NULL, \`assessedAt\` timestamp NOT NULL DEFAULT (now()), \`grievanceFixation\` int DEFAULT 0, \`grievanceFixationChange\` boolean DEFAULT false, \`grievanceWithTarget\` int DEFAULT 0, \`grievanceWithTargetChange\` boolean DEFAULT false, \`desperationHopelessness\` int DEFAULT 0, \`desperationHopelessnessChange\` boolean DEFAULT false, \`mentalHealthConcern\` int DEFAULT 0, \`mentalHealthConcernChange\` boolean DEFAULT false, \`paranoidThinking\` int DEFAULT 0, \`paranoidThinkingChange\` boolean DEFAULT false, \`depressionWithdrawal\` int DEFAULT 0, \`depressionWithdrawalChange\` boolean DEFAULT false, \`narcissisticInjury\` int DEFAULT 0, \`narcissisticInjuryChange\` boolean DEFAULT false, \`concerningCommunications\` int DEFAULT 0, \`concerningCommunicationsChange\` boolean DEFAULT false, \`weaponsInterest\` int DEFAULT 0, \`weaponsInterestChange\` boolean DEFAULT false, \`pathwayBehaviors\` int DEFAULT 0, \`pathwayBehaviorsChange\` boolean DEFAULT false, \`leakage\` int DEFAULT 0, \`leakageChange\` boolean DEFAULT false, \`priorViolenceHistory\` int DEFAULT 0, \`priorViolenceHistoryChange\` boolean DEFAULT false, \`priorMentalHealthCrisis\` int DEFAULT 0, \`priorMentalHealthCrisisChange\` boolean DEFAULT false, \`domesticViolenceHistory\` int DEFAULT 0, \`domesticViolenceHistoryChange\` boolean DEFAULT false, \`recentStressor\` int DEFAULT 0, \`recentStressorChange\` boolean DEFAULT false, \`socialIsolation\` int DEFAULT 0, \`socialIsolationChange\` boolean DEFAULT false, \`personalCrisis\` int DEFAULT 0, \`personalCrisisChange\` boolean DEFAULT false, \`helpSeeking\` int DEFAULT 0, \`helpSeekingChange\` boolean DEFAULT false, \`socialSupport\` int DEFAULT 0, \`socialSupportChange\` boolean DEFAULT false, \`futureOrientation\` int DEFAULT 0, \`futureOrientationChange\` boolean DEFAULT false, \`finalActBehaviors\` int DEFAULT 0, \`finalActBehaviorsChange\` boolean DEFAULT false, \`surveillanceOfTarget\` int DEFAULT 0, \`surveillanceOfTargetChange\` boolean DEFAULT false, \`imminentCommunication\` int DEFAULT 0, \`imminentCommunicationChange\` boolean DEFAULT false, \`computedConcernLevel\` enum('low','moderate','high','imminent'), \`totalWeightedScore\` int, \`topContributingFactors\` json, \`assessorNotes\` text, \`assessorAttestation\` boolean NOT NULL DEFAULT false, CONSTRAINT \`btam_wavr_assessments_id\` PRIMARY KEY(\`id\`))` },
        { name: "CREATE btam_management_plan", q: sql`CREATE TABLE IF NOT EXISTS \`btam_management_plan\` (\`id\` int AUTO_INCREMENT NOT NULL, \`caseId\` int NOT NULL, \`createdBy\` int NOT NULL, \`interventionType\` enum('monitoring','hr_meeting','eap_referral','mandatory_counseling','credential_suspension','law_enforcement_notification','no_contact_order','termination_with_safety_protocol','hospitalization_referral','other') NOT NULL, \`actionDescription\` text NOT NULL, \`responsibleParty\` int, \`dueDate\` varchar(32), \`completed\` boolean NOT NULL DEFAULT false, \`completionNotes\` text, \`nextReviewDate\` varchar(32), \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT \`btam_management_plan_id\` PRIMARY KEY(\`id\`))` },
        { name: "CREATE btam_case_notes", q: sql`CREATE TABLE IF NOT EXISTS \`btam_case_notes\` (\`id\` int AUTO_INCREMENT NOT NULL, \`caseId\` int NOT NULL, \`authorId\` int NOT NULL, \`noteType\` enum('observation','interview','external_report','law_enforcement','legal','hr','general') NOT NULL, \`content\` text NOT NULL, \`isPrivileged\` boolean NOT NULL DEFAULT false, \`attachments\` json, \`createdAt\` timestamp NOT NULL DEFAULT (now()), CONSTRAINT \`btam_case_notes_id\` PRIMARY KEY(\`id\`))` },
        { name: "ADD organizations.plan", q: sql`ALTER TABLE \`organizations\` ADD COLUMN IF NOT EXISTS \`plan\` enum('free','paid') NOT NULL DEFAULT 'free'` },
        { name: "ADD organizations.planUpdatedAt", q: sql`ALTER TABLE \`organizations\` ADD COLUMN IF NOT EXISTS \`planUpdatedAt\` timestamp` },
        { name: "ADD organizations.externalSubscriptionId", q: sql`ALTER TABLE \`organizations\` ADD COLUMN IF NOT EXISTS \`externalSubscriptionId\` varchar(255)` },
        { name: "ADD organizations.websiteResourceLinks", q: sql`ALTER TABLE \`organizations\` ADD COLUMN IF NOT EXISTS \`websiteResourceLinks\` text DEFAULT '[]'` },
        { name: "ADD users.emailVerified", q: sql`ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`emailVerified\` boolean NOT NULL DEFAULT false` },
        { name: "ADD users.emailVerifyToken", q: sql`ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`emailVerifyToken\` varchar(128)` },
        { name: "ADD users.passwordResetToken", q: sql`ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`passwordResetToken\` varchar(128)` },
        { name: "ADD users.passwordResetExpiresAt", q: sql`ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`passwordResetExpiresAt\` timestamp` },
        { name: "ADD users.ghlContactId", q: sql`ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`ghlContactId\` varchar(64)` },
        { name: "CREATE btam_status_history", q: sql`CREATE TABLE IF NOT EXISTS \`btam_status_history\` (\`id\` int AUTO_INCREMENT NOT NULL, \`caseId\` int NOT NULL, \`changedBy\` int NOT NULL, \`changedAt\` timestamp NOT NULL DEFAULT (now()), \`previousStatus\` varchar(64), \`newStatus\` varchar(64), \`previousConcernLevel\` varchar(32), \`newConcernLevel\` varchar(32), \`reason\` text, CONSTRAINT \`btam_status_history_id\` PRIMARY KEY(\`id\`))` },
        { name: "CREATE api_keys", q: sql`CREATE TABLE IF NOT EXISTS \`api_keys\` (\`id\` int AUTO_INCREMENT NOT NULL, \`userId\` int NOT NULL, \`orgId\` int, \`label\` varchar(255), \`keyHash\` varchar(128) NOT NULL, \`permissions\` json, \`lastUsedAt\` timestamp, \`revokedAt\` timestamp, \`expiresAt\` timestamp, \`createdAt\` timestamp NOT NULL DEFAULT (now()), CONSTRAINT \`api_keys_id\` PRIMARY KEY(\`id\`))` },
      
        { name: "CREATE training_modules", q: sql`CREATE TABLE IF NOT EXISTS \`training_modules\` (\`id\` int AUTO_INCREMENT NOT NULL, \`orgId\` int, \`createdByUserId\` int NOT NULL, \`courseTitle\` varchar(255) NOT NULL, \`launchPath\` text NOT NULL, \`playerType\` enum('Articulate_Storyline_Web') NOT NULL DEFAULT 'Articulate_Storyline_Web', \`trackingType\` enum('None') NOT NULL DEFAULT 'None', \`storagePrefix\` varchar(512) NOT NULL, \`sourceFileName\` varchar(255), \`metaJson\` text, \`createdAt\` timestamp NOT NULL DEFAULT (now()), \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT \`training_modules_id\` PRIMARY KEY(\`id\`))` },
        { name: "ADD training_modules.thumbnailUrl", q: sql`ALTER TABLE \`training_modules\` ADD COLUMN IF NOT EXISTS \`thumbnailUrl\` text AFTER \`launchPath\`` },
        { name: "MODIFY training_modules.playerType external_link", q: sql`ALTER TABLE \`training_modules\` MODIFY COLUMN \`playerType\` enum('Articulate_Storyline_Web','external_link') NOT NULL DEFAULT 'Articulate_Storyline_Web'` },
];
      const results: { name: string; ok: boolean; err?: string }[] = [];
      for (const s of stmts) {
        try { await db.execute(s.q); results.push({ name: s.name, ok: true }); }
        catch (e: any) { results.push({ name: s.name, ok: false, err: e?.message ?? String(e) }); }
      }
      return results;
    }),
  }),
});

export type AppRouter = typeof appRouter;
