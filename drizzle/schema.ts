import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  json,
} from "drizzle-orm/mysql-core";

// ─── Organizations ────────────────────────────────────────────────────────────
// Each organization represents one client agency / company using the platform.
// All data (facilities, audits, incidents) is scoped to an organization.
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // URL-safe slug used for public incident report portal: /report/:slug
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  contactEmail: varchar("contactEmail", { length: 320 }),
  // Platform owner creates and manages organizations
  createdByUserId: int("createdByUserId"),
  // Subscription plan: free = Liability Scan only; paid = all modules unlocked
  plan: mysqlEnum("plan", ["free", "paid"]).default("free").notNull(),
  // Timestamp when plan was last changed (e.g. via webhook upgrade)
  planUpdatedAt: timestamp("planUpdatedAt"),
  // External subscription/customer ID from payment provider (e.g. Stripe customer ID)
  externalSubscriptionId: varchar("externalSubscriptionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Organization Members ─────────────────────────────────────────────────────
// Links users to organizations with a role.
// org_admin: full access to all org data + member management
// auditor: can create/edit facilities and audits
// viewer: read-only access to reports
export const orgMembers = mysqlTable("org_members", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("orgRole", ["super_admin", "admin", "auditor", "user", "viewer"]).default("user").notNull(),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  joinedAt: timestamp("joinedAt"),
  // Optional permission flags
  canTriggerAlerts: boolean("canTriggerAlerts").default(false).notNull(),
  canRunDrills: boolean("canRunDrills").default(false).notNull(),
  canExportReports: boolean("canExportReports").default(false).notNull(),
  canViewIncidentLogs: boolean("canViewIncidentLogs").default(false).notNull(),
  canSubmitAnonymousReports: boolean("canSubmitAnonymousReports").default(false).notNull(),
  canAccessEap: boolean("canAccessEap").default(false).notNull(),
  canManageSiteAssessments: boolean("canManageSiteAssessments").default(false).notNull(),
});
export type OrgMember = typeof orgMembers.$inferSelect;
export type InsertOrgMember = typeof orgMembers.$inferInsert;

// ─── Personnel Location Tracking ───────────────────────────────────────────────
export const personnelLocations = mysqlTable("personnel_locations", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  userId: int("userId").notNull(),
  latitude: float("latitude").notNull(),
  longitude: float("longitude").notNull(),
  status: varchar("status", { length: 64 }).default("Active").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PersonnelLocation = typeof personnelLocations.$inferSelect;
export type InsertPersonnelLocation = typeof personnelLocations.$inferInsert;

// ─── Organization Invites ─────────────────────────────────────────────────────
// Pending email invitations sent by org_admins.
// When the recipient logs in and uses the token, they are added to the org.
export const orgInvites = mysqlTable("org_invites", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("inviteRole", ["super_admin", "admin", "auditor", "user", "viewer"]).default("user").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OrgInvite = typeof orgInvites.$inferSelect;
export type InsertOrgInvite = typeof orgInvites.$inferInsert;

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Platform-level role: ultra_admin = Pursuit Pathways staff; super_admin = full org control; admin = operational owner; auditor = read/validate; user = general staff; viewer = read-only
  role: mysqlEnum("role", ["ultra_admin", "admin", "super_admin", "auditor", "viewer", "user"]).default("user").notNull(),
  // Impersonation support for ultra_admin
  impersonatingUserId: int("impersonatingUserId"),
  // RAS role: separate from platform role. null = no RAS access assigned.
  // admin = can activate/resolve alerts; responder = can acknowledge + mark responding; staff = receive + acknowledge only
  rasRole: mysqlEnum("rasRole", ["admin", "responder", "staff"]),
  // BTAM role: separate from platform role. null/none = no BTAM access.
  // tat_admin = full BTAM access; assessor = assigned cases; reporter = intake only; read_only = view assigned cases
  btamRole: mysqlEnum("btamRole", ["none", "tat_admin", "assessor", "reporter", "read_only"]).default("none"),
  // Self-hosted auth: hashed password and salt (null for accounts created via other methods)
  passwordHash: varchar("passwordHash", { length: 128 }),
  passwordSalt: varchar("passwordSalt", { length: 64 }),
  // Email verification
  emailVerified: boolean("emailVerified").default(false).notNull(),
  emailVerifyToken: varchar("emailVerifyToken", { length: 128 }),
  // Password reset (token expires after 1 hour)
  passwordResetToken: varchar("passwordResetToken", { length: 128 }),
  passwordResetExpiresAt: timestamp("passwordResetExpiresAt"),
  // GoHighLevel CRM contact ID (stored after contact is created on signup)
  ghlContactId: varchar("ghlContactId", { length: 64 }),
  // Onboarding walkthrough: false until user dismisses the first-login walkthrough
  hasSeenWalkthrough: boolean("hasSeenWalkthrough").default(false).notNull(),
  // Terms acceptance: timestamp when user accepted the current terms (null until accepted)
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── API Keys ───────────────────────────────────────────────────────────────
// Stores hashed API keys for programmatic access. Plaintext token is shown
// once at creation time and is not stored.
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgId: int("orgId"),
  label: varchar("label", { length: 255 }),
  keyHash: varchar("keyHash", { length: 128 }).notNull(),
  permissions: json("permissions"),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── Facilities ───────────────────────────────────────────────────────────────
export const facilities = mysqlTable("facilities", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),          // null = legacy / platform-owner facility
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  facilityType: varchar("facilityType", { length: 64 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  jurisdiction: varchar("jurisdiction", { length: 64 }).default("United States"),
  squareFootage: int("squareFootage"),
  floors: int("floors"),
  maxOccupancy: int("maxOccupancy"),
  operatingHours: varchar("operatingHours", { length: 128 }),
  eveningOperations: boolean("eveningOperations").default(false),
  multiTenant: boolean("multiTenant").default(false),
  publicAccessWithoutScreening: boolean("publicAccessWithoutScreening").default(false),
  // New Facility Profile fields (Phase 2 — drive conditional question logic)
  publicEntrances: int("publicEntrances"),
  staffEntrances: int("staffEntrances"),
  hasAlleyways: boolean("hasAlleyways").default(false),
  hasConcealedAreas: boolean("hasConcealedAreas").default(false),
  usedAfterDark: boolean("usedAfterDark").default(false),
  multiSite: boolean("multiSite").default(false),
  emergencyCoordinator: varchar("emergencyCoordinator", { length: 255 }),
  // Assigned emergency roles: JSON array of {role, primary, secondary, tertiary}
  emergencyRoles: text("emergencyRoles"),
  // AED on-site
  aedOnSite: boolean("aedOnSite").default(false),
  aedLocations: text("aedLocations"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = typeof facilities.$inferInsert;

// ─── Audits ───────────────────────────────────────────────────────────────────
export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),          // null = legacy
  facilityId: int("facilityId").notNull(),
  auditorId: int("auditorId").notNull(),
  status: mysqlEnum("status", ["in_progress", "completed", "archived"]).default("in_progress").notNull(),
  auditDate: timestamp("auditDate").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  overallScore: float("overallScore"),
  overallRiskLevel: varchar("overallRiskLevel", { length: 32 }),
  categoryScores: json("categoryScores"),
  auditorNotes: text("auditorNotes"),
  eapContacts: json("eapContacts"),
  sectionEapNotes: json("sectionEapNotes"),
  eapJson: json("eapJson"),
  eapGeneratedAt: timestamp("eapGeneratedAt"),
  executiveSummaryJson: json("executiveSummaryJson"),
  executiveSummaryGeneratedAt: timestamp("executiveSummaryGeneratedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;

// ─── Audit Responses ──────────────────────────────────────────────────────────
export const auditResponses = mysqlTable("audit_responses", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  categoryName: varchar("categoryName", { length: 128 }).notNull(),
  questionId: varchar("questionId", { length: 64 }).notNull(),
  questionText: text("questionText").notNull(),
  // Decision-tree Step 1: primary response (Unavoidable moved to conditionTypes)
  primaryResponse: mysqlEnum("primaryResponse", ["Yes", "No", "Unknown", "Not Applicable"]),
  // Step 4: flag this finding for EAP section auto-population
  addToEap: boolean("addToEap").default(false),
  // Decision-tree Step 2: concern level (shown when answer indicates deficiency)
  concernLevel: mysqlEnum("concernLevel", ["Minor", "Moderate", "Serious"]),
  // Legacy response column kept for backward compatibility
  response: mysqlEnum("response", [
    "Secure / Yes",
    "Partial",
    "Minor Concern",
    "Moderate Concern",
    "Serious Vulnerability",
    "No — Not Present",
    "Unlikely / Minimal",
    "Partially Present",
    "Yes — Present",
    "Unknown",
    "Not Applicable",
    "Unavoidable",
  ]),
  conditionType: varchar("conditionType", { length: 128 }),
  conditionTypes: json("conditionTypes"),
  isUnavoidable: boolean("isUnavoidable").default(false),
  score: int("score"),
  notes: text("notes"),
  // Recommended Action fields (separate from observation notes)
  recommendedActionNotes: text("recommendedActionNotes"),
  remediationTimeline: mysqlEnum("remediationTimeline", ["30 days", "60 days", "90 days", "Long-Term"]),
  // Conditional follow-up sub-question answer
  followUpResponse: text("followUpResponse"),
  photoUrls: json("photoUrls"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AuditResponse = typeof auditResponses.$inferSelect;
export type InsertAuditResponse = typeof auditResponses.$inferInsert;

// ─── Threat Severity Findings ─────────────────────────────────────────────────
export const threatFindings = mysqlTable("threat_findings", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  findingName: varchar("findingName", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }).notNull(),
  likelihood: varchar("likelihood", { length: 32 }).notNull(),
  impact: varchar("impact", { length: 32 }).notNull(),
  preparedness: varchar("preparedness", { length: 64 }).notNull(),
  baseScore: int("baseScore").notNull(),
  modifier: int("modifier").notNull(),
  finalScore: int("finalScore").notNull(),
  severityLevel: varchar("severityLevel", { length: 32 }).notNull(),
  priority: varchar("priority", { length: 32 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ThreatFinding = typeof threatFindings.$inferSelect;
export type InsertThreatFinding = typeof threatFindings.$inferInsert;

// ─── Audit Photos ─────────────────────────────────────────────────────────────
export const auditPhotos = mysqlTable("audit_photos", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  auditResponseId: int("auditResponseId"),
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  caption: varchar("caption", { length: 255 }),
  photoType: varchar("photoType", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditPhoto = typeof auditPhotos.$inferSelect;
export type InsertAuditPhoto = typeof auditPhotos.$inferInsert;

// ─── Tester Feedback ─────────────────────────────────────────────────────────
export const testerFeedback = mysqlTable("tester_feedback", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  facilityId: int("facilityId").notNull(),
  userId: int("userId").notNull(),
  facilityType: varchar("facilityType", { length: 64 }),
  completionTimeMinutes: int("completionTimeMinutes"),
  overallReportQuality: int("overallReportQuality"),
  scoringAccuracy: int("scoringAccuracy"),
  correctiveActionRealism: int("correctiveActionRealism"),
  eapCompleteness: int("eapCompleteness"),
  questionRelevance: int("questionRelevance"),
  missingQuestions: text("missingQuestions"),
  irrelevantQuestions: text("irrelevantQuestions"),
  correctiveActionIssues: text("correctiveActionIssues"),
  scoringDisagreements: text("scoringDisagreements"),
  eapFeedback: text("eapFeedback"),
  generalNotes: text("generalNotes"),
  wouldUseForClient: boolean("wouldUseForClient"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TesterFeedback = typeof testerFeedback.$inferSelect;
export type InsertTesterFeedback = typeof testerFeedback.$inferInsert;

// ─── Question Flags ───────────────────────────────────────────────────────────
export const questionFlags = mysqlTable("question_flags", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  userId: int("userId").notNull(),
  questionId: varchar("questionId", { length: 64 }).notNull(),
  questionText: text("questionText").notNull(),
  categoryName: varchar("categoryName", { length: 128 }).notNull(),
  flagType: mysqlEnum("flagType", [
    "wrong_response_options",
    "question_unclear",
    "not_applicable_to_facility",
    "scoring_seems_wrong",
    "missing_context",
    "other",
  ]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestionFlag = typeof questionFlags.$inferSelect;
export type InsertQuestionFlag = typeof questionFlags.$inferInsert;

// ─── Incident Reports (Anonymous) ────────────────────────────────────────────
export const incidentReports = mysqlTable("incident_reports", {
  id: int("id").autoincrement().primaryKey(),
  // Organization association — routes report to the correct org's admins
  orgId: int("orgId"),
  facilityId: int("facilityId"),
  facilityName: varchar("facilityName", { length: 255 }),
  incidentType: mysqlEnum("incidentType", [
    "threatening_behavior",
    "suspicious_person",
    "observed_safety_gap",
    "workplace_violence",
    "other",
  ]).notNull(),
  involvesInjuryOrIllness: boolean("involvesInjuryOrIllness").default(false),
  injuryType: mysqlEnum("injuryType", ["injury", "skin_disorder", "respiratory", "poisoning", "hearing_loss", "other_illness", "other_injury"]),
  bodyPartAffected: varchar("bodyPartAffected", { length: 128 }),
  injuryDescription: text("injuryDescription"),
  medicalTreatment: mysqlEnum("medicalTreatment", ["first_aid_only", "medical_treatment", "emergency_room", "hospitalized"]),
  daysAwayFromWork: int("daysAwayFromWork"),
  daysOnRestriction: int("daysOnRestriction"),
  lossOfConsciousness: boolean("lossOfConsciousness").default(false),
  workRelated: boolean("workRelated").default(true),
  oshaRecordable: boolean("oshaRecordable").default(false),
  employeeName: varchar("employeeName", { length: 255 }),
  employeeJobTitle: varchar("employeeJobTitle", { length: 128 }),
  employeeDateOfBirth: varchar("employeeDateOfBirth", { length: 16 }),
  employeeDateHired: varchar("employeeDateHired", { length: 16 }),
  physicianName: varchar("physicianName", { length: 255 }),
  treatedInER: boolean("treatedInER").default(false),
  hospitalizedOvernight: boolean("hospitalizedOvernight").default(false),
  severity: mysqlEnum("severity", ["low", "moderate", "high", "critical"]).notNull(),
  incidentDate: timestamp("incidentDate"),
  location: varchar("location", { length: 255 }),
  description: text("description").notNull(),
  involvedParties: text("involvedParties"),
  witnesses: text("witnesses"),
  priorIncidents: boolean("priorIncidents").default(false),
  reportedToAuthorities: boolean("reportedToAuthorities").default(false),
  reporterRole: varchar("reporterRole", { length: 64 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  status: mysqlEnum("status", ["new", "under_review", "resolved", "referred"]).default("new").notNull(),
  referredTo: int("referredTo"),
  adminNotes: text("adminNotes"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  trackingToken: varchar("trackingToken", { length: 64 }).unique(),
  // ── Follow-up request fields ──────────────────────────────────────────────
  followUpRequested: boolean("followUpRequested").default(false),
  followUpMethod: mysqlEnum("followUpMethod", ["phone", "email", "in_person"]),
  followUpContact: varchar("followUpContact", { length: 320 }),
  // ── Repeat incident tracking ──────────────────────────────────────────────
  // Normalized name of the involved person (for repeat-person detection)
  involvedPersonName: varchar("involvedPersonName", { length: 255 }),
  // Admin-set flag: this report is part of a repeat pattern
  isRepeatIncident: boolean("isRepeatIncident").default(false),
  repeatGroupId: varchar("repeatGroupId", { length: 64 }),
  // ── Threat keyword flags (JSON array of ThreatFlag objects from scanText) ──
  threatFlags: text("threatFlags"),
  // maxThreatSeverity: null | 'low' | 'moderate' | 'high' | 'critical'
  maxThreatSeverity: varchar("maxThreatSeverity", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IncidentReport = typeof incidentReports.$inferSelect;
export type InsertIncidentReport = typeof incidentReports.$inferInsert;

// ─── Facility Attachments (Floor Plans, Photos, Documents) ───────────────────
export const facilityAttachments = mysqlTable("facility_attachments", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  facilityId: int("facilityId").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: int("fileSize"),
  category: mysqlEnum("category", [
    "floor_plan",
    "interior_photo",
    "exterior_photo",
    "document",
    "other",
  ]).default("other").notNull(),
  caption: varchar("caption", { length: 255 }),
  aiAnalysis: text("aiAnalysis"),
  aiAnalyzedAt: timestamp("aiAnalyzedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FacilityAttachment = typeof facilityAttachments.$inferSelect;
export type InsertFacilityAttachment = typeof facilityAttachments.$inferInsert;

// ─── Corrective Action Checks (Checklist Completion Tracking) ────────────────
export const correctiveActionChecks = mysqlTable("corrective_action_checks", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  questionId: varchar("questionId", { length: 64 }).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  completedBy: int("completedBy").notNull(),
  notes: varchar("notes", { length: 512 }),
});
export type CorrectiveActionCheck = typeof correctiveActionChecks.$inferSelect;
export type InsertCorrectiveActionCheck = typeof correctiveActionChecks.$inferInsert;

// ─── Audit Logs (ISO 27001 A.12.4 / SOC 2 CC7.2) ─────────────────────────────
// Immutable record of every create, update, delete, and auth event.
// Used for security forensics, compliance audits, and incident investigation.
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  // Who performed the action (null for anonymous/system actions)
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  // Which organization this action belongs to (null for platform-level actions)
  orgId: int("orgId"),
  // What happened
  action: mysqlEnum("action", [
    "create",
    "update",
    "delete",
    "login",
    "logout",
    "invite_sent",
    "invite_accepted",
    "member_removed",
    "role_changed",
    "audit_completed",
    "audit_reopened",
    "incident_submitted",
    "incident_reviewed",
    "report_shared",
    "escalate",
  ]).notNull(),
  // What type of entity was affected
  entityType: varchar("entityType", { length: 64 }).notNull(),
  // The ID of the affected entity
  entityId: varchar("entityId", { length: 64 }),
  // Human-readable description of the change
  description: text("description"),
  // JSON snapshot of changed fields (before/after for updates)
  metadata: json("metadata"),
  // Network context (for security analysis)
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Visitor Logs ─────────────────────────────────────────────────────────────
// Tracks all visitors entering a facility: name, company, purpose, time in/out,
// and optional photo ID verification.
export const visitorLogs = mysqlTable("visitor_logs", {
  id: int("id").autoincrement().primaryKey(),
  // Facility this visitor is associated with (optional — can be standalone)
  facilityId: int("facilityId"),
  // Logged by which platform user
  loggedByUserId: int("loggedByUserId").notNull(),
  // Visitor details
  visitorName: varchar("visitorName", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  purposeOfVisit: varchar("purposeOfVisit", { length: 512 }).notNull(),
  hostName: varchar("hostName", { length: 255 }),
  // Time tracking
  timeIn: timestamp("timeIn").defaultNow().notNull(),
  timeOut: timestamp("timeOut"),
  // Photo ID verification
  idVerified: boolean("idVerified").default(false).notNull(),
  idType: varchar("idType", { length: 64 }),   // e.g. "Driver's License", "Passport"
  idNotes: text("idNotes"),
  // Additional notes
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VisitorLog = typeof visitorLogs.$inferSelect;
export type InsertVisitorLog = typeof visitorLogs.$inferInsert;

// ─── Liability Exposure Scans ────────────────────────────────────────────────
// Stores completed Liability Exposure Scan results for persistence and sharing.
// No full assessment data is ever placed in URLs — only scanId or share tokens.
export const liabilityScans = mysqlTable("liability_scans", {
  id: int("id").autoincrement().primaryKey(),
  // Optional associations — null for anonymous/unauthenticated scans
  userId: int("userId"),
  orgId: int("orgId"),
  facilityId: int("facilityId"),
  // Core result fields
  score: int("score").notNull(),
  classification: varchar("classification", { length: 64 }).notNull(),
  riskMapLevel: varchar("riskMapLevel", { length: 64 }).notNull(),
  riskMapColor: varchar("riskMapColor", { length: 16 }).notNull(),
  riskMapDescriptor: text("riskMapDescriptor"),
  jurisdiction: varchar("jurisdiction", { length: 128 }).notNull(),
  industry: varchar("industry", { length: 128 }).notNull(),
  // JSON blobs for structured result data
  topGaps: json("topGaps").notNull(),
  categoryBreakdown: json("categoryBreakdown").notNull(),
  immediateActions: json("immediateActions").notNull(),
  interpretation: text("interpretation"),
  advisorSummary: text("advisorSummary"),
  // Five Stones tier-based scoring (added post-launch)
  scorePercent: int("scorePercent"),          // Tier 1+2 structural score %
  defensibilityStatus: varchar("defensibilityStatus", { length: 32 }), // Low/Moderate/High/Critical Risk
  // Full raw answers stored for auditability (no PII)
  answers: json("answers"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LiabilityScan = typeof liabilityScans.$inferSelect;
export type InsertLiabilityScan = typeof liabilityScans.$inferInsert;

// ─── Scan Share Tokens ────────────────────────────────────────────────────────
// Tokenized read-only access links for sharing a single scan result with a client.
// Tokens are opaque (crypto-random), scoped to one scan, and support expiry/revocation.
export const scanShareTokens = mysqlTable("scan_share_tokens", {
  id: int("id").autoincrement().primaryKey(),
  scanId: int("scanId").notNull(),
  // 64-char crypto-random hex token — never derived from scanId
  token: varchar("token", { length: 128 }).notNull().unique(),
  createdByUserId: int("createdByUserId"),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  // Optional label for the advisor's reference (e.g. "Sent to ACME Corp")
  label: varchar("label", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScanShareToken = typeof scanShareTokens.$inferSelect;
export type InsertScanShareToken = typeof scanShareTokens.$inferInsert;

// ─── EAP Sections ─────────────────────────────────────────────────────────────
// Stores per-section editable overrides for the Emergency Action Plan.
// Each row represents one section of the EAP for a given audit.
// The LLM-generated content is the baseline; auditors can override any section.
// Version history is tracked via a separate eap_section_versions table.
export const eapSections = mysqlTable("eap_sections", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  // Section identifier from the 17-section framework (e.g. "s1_purpose", "s7_lockdown")
  sectionId: varchar("sectionId", { length: 64 }).notNull(),
  sectionTitle: varchar("sectionTitle", { length: 255 }).notNull(),
  // The editable content override (markdown). NULL means use LLM-generated content.
  contentOverride: text("contentOverride"),
  // Whether this section has been reviewed/approved by the auditor
  reviewed: boolean("reviewed").default(false).notNull(),
  // Whether this section is applicable to this facility (can be toggled off)
  applicable: boolean("applicable").default(true).notNull(),
  // Section-level notes added by the auditor (separate from main content)
  auditorNotes: text("auditorNotes"),
  // JSON array of section-level recommendations added by auditor
  auditorRecommendations: json("auditorRecommendations"),
  // Last edited by
  lastEditedByUserId: int("lastEditedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EapSection = typeof eapSections.$inferSelect;
export type InsertEapSection = typeof eapSections.$inferInsert;

// ─── EAP Section Version History ─────────────────────────────────────────────
// Tracks every save of a section override so auditors can revert to prior versions.
export const eapSectionVersions = mysqlTable("eap_section_versions", {
  id: int("id").autoincrement().primaryKey(),
  eapSectionId: int("eapSectionId").notNull(),
  auditId: int("auditId").notNull(),
  sectionId: varchar("sectionId", { length: 64 }).notNull(),
  // Snapshot of the content at time of save
  contentSnapshot: text("contentSnapshot"),
  savedByUserId: int("savedByUserId"),
  savedAt: timestamp("savedAt").defaultNow().notNull(),
  // Optional label (e.g. "Draft v1", "After law enforcement review")
  label: varchar("label", { length: 128 }),
});
export type EapSectionVersion = typeof eapSectionVersions.$inferSelect;
export type InsertEapSectionVersion = typeof eapSectionVersions.$inferInsert;

// ─── Flagged Visitors (Watchlist) ─────────────────────────────────────────────
// Admin-managed list of names that trigger an immediate alert when they check in.
export const flaggedVisitors = mysqlTable("flagged_visitors", {
  id: int("id").autoincrement().primaryKey(),
  // The name to match against (case-insensitive partial match)
  name: varchar("name", { length: 255 }).notNull(),
  // Optional reason/notes visible only to admin
  reason: text("reason"),
  // Admin who added this entry
  addedByUserId: int("addedByUserId").notNull(),
  // Optional: scope to a specific facility (null = platform-wide)
  facilityId: int("facilityId"),
  active: boolean("active").default(true).notNull(),
  // Flag level: red = serious concern, yellow = less serious
  flagLevel: mysqlEnum("flagLevel", ["red", "yellow"]).default("red").notNull(),
  // Escalation tracking
  lastEscalatedAt: timestamp("lastEscalatedAt"),
  escalationCount: int("escalationCount").default(0).notNull(),
  // Optional photo for the flagged person (stored in S3)
  photoUrl: text("photoUrl"),
  photoFileKey: text("photoFileKey"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FlaggedVisitor = typeof flaggedVisitors.$inferSelect;
export type InsertFlaggedVisitor = typeof flaggedVisitors.$inferInsert;

// ─── Drill Planning & Training (ACTD Framework) ──────────────────────────────

/**
 * drill_templates — AI-generated or user-prompted ACTD drill definitions.
 * Each template holds the full structured drill content (title, scenario,
 * ACTD phases, execution instructions, debrief questions, etc.) as JSON.
 */
export const drillTemplates = mysqlTable("drill_templates", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
  facilityId: int("facilityId"),
  createdByUserId: int("createdByUserId").notNull(),
  // Drill metadata
  title: varchar("title", { length: 255 }).notNull(),
  drillType: mysqlEnum("drillType", ["micro", "guided", "operational", "extended"]).notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  industry: varchar("industry", { length: 100 }),
  jurisdiction: varchar("jurisdiction", { length: 100 }),
  // Generation mode: system (facility-profile-based) or user (custom scenario)
  generationMode: mysqlEnum("generationMode", ["system", "user"]).notNull().default("system"),
  userPrompt: text("userPrompt"),
  // Full structured drill content as JSON (all 11 required sections)
  content: json("content").notNull(),
  // Regulatory alignment tags (e.g., ["OSHA", "DHS", "CSA Z1002"])
  regulatoryTags: json("regulatoryTags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DrillTemplate = typeof drillTemplates.$inferSelect;
export type InsertDrillTemplate = typeof drillTemplates.$inferInsert;

/**
 * drill_sessions — Scheduled or ad-hoc instances of a drill being run.
 * Links a template to a facility, date, and completion state.
 */
export const drillSessions = mysqlTable("drill_sessions", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  facilityId: int("facilityId"),
  orgId: int("orgId"),
  scheduledByUserId: int("scheduledByUserId").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).notNull().default("scheduled"),
  // After-action / debrief data captured post-drill
  debriefData: json("debriefData"),
  // System intelligence: next recommended drill, gaps, progression
  systemIntelligence: json("systemIntelligence"),
  participantCount: int("participantCount"),
  facilitatorNotes: text("facilitatorNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DrillSession = typeof drillSessions.$inferSelect;
export type InsertDrillSession = typeof drillSessions.$inferInsert;

/**
 * drill_participants — Individual participant records for a drill session.
 * Captures attendance, role, and optional individual observations.
 */
export const drillParticipants = mysqlTable("drill_participants", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  attended: boolean("attended").default(true).notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DrillParticipant = typeof drillParticipants.$inferSelect;
export type InsertDrillParticipant = typeof drillParticipants.$inferInsert;

// ─── Response Activation System (RAS) ────────────────────────────────────────
// Mission-critical alert system. Separate from platform role system.
// ras_role is stored on the user table via migration (see below).

/**
 * alert_events — One record per Lockdown or Lockout activation.
 * This is the authoritative record of an emergency event.
 */
export const alertEvents = mysqlTable("alert_events", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
  facilityId: int("facilityId").notNull(),
  alertType: mysqlEnum("alertType", ["lockdown", "lockout"]).notNull(),
  status: mysqlEnum("alertStatus", ["active", "response_in_progress", "resolved"]).default("active").notNull(),
  messageTitle: varchar("messageTitle", { length: 255 }).notNull(),
  messageBody: text("messageBody").notNull(),
  // Role-specific instruction bodies stored as JSON: { staff, responder, admin }
  roleInstructions: json("roleInstructions"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});
export type AlertEvent = typeof alertEvents.$inferSelect;
export type InsertAlertEvent = typeof alertEvents.$inferInsert;

/**
 * alert_recipients — One record per user targeted by an alert.
 * Tracks delivery, acknowledgement, and responder status.
 */
export const alertRecipients = mysqlTable("alert_recipients", {
  id: int("id").autoincrement().primaryKey(),
  alertEventId: int("alertEventId").notNull(),
  userId: int("userId").notNull(),
  rasRoleAtTime: mysqlEnum("rasRoleAtTime", ["admin", "responder", "staff"]).notNull(),
  deliveryStatus: mysqlEnum("deliveryStatus", ["pending", "delivered", "failed"]).default("pending").notNull(),
  deliveredAt: timestamp("deliveredAt"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  // null = not applicable (staff), "acknowledged" | "responding" for responders
  responseStatus: mysqlEnum("responseStatus", ["acknowledged", "responding"]),
  responseUpdatedAt: timestamp("responseUpdatedAt"),
});
export type AlertRecipient = typeof alertRecipients.$inferSelect;
export type InsertAlertRecipient = typeof alertRecipients.$inferInsert;

/**
 * alert_status_updates — Authorized status updates during an active alert.
 * Strictly limited to: active, response_in_progress, resolved.
 * Short optional note field — no freeform commentary.
 */
export const alertStatusUpdates = mysqlTable("alert_status_updates", {
  id: int("id").autoincrement().primaryKey(),
  alertEventId: int("alertEventId").notNull(),
  statusType: mysqlEnum("statusType", ["active", "response_in_progress", "resolved"]).notNull(),
  // Max 120 chars — tightly constrained, no freeform commentary
  shortMessage: varchar("shortMessage", { length: 120 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AlertStatusUpdate = typeof alertStatusUpdates.$inferSelect;
export type InsertAlertStatusUpdate = typeof alertStatusUpdates.$inferInsert;

/**
 * facility_alert_settings — Per-facility RAS configuration.
 * Stores message templates for Lockdown and Lockout.
 */
export const facilityAlertSettings = mysqlTable("facility_alert_settings", {
  id: int("id").autoincrement().primaryKey(),
  facilityId: int("facilityId").notNull().unique(),
  orgId: int("orgId"),
  // JSON templates: { title, body, staffInstruction, responderInstruction, adminInstruction }
  lockdownTemplate: json("lockdownTemplate"),
  lockoutTemplate: json("lockoutTemplate"),
  pushEnabled: boolean("pushEnabled").default(true).notNull(),
  // JSON for any escalation preferences (future use)
  escalationPreferences: json("escalationPreferences"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FacilityAlertSettings = typeof facilityAlertSettings.$inferSelect;
export type InsertFacilityAlertSettings = typeof facilityAlertSettings.$inferInsert;

/**
 * push_subscriptions — Browser/PWA push subscription objects per user.
 * Stored so server can fan out push notifications without user being online.
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgId: int("orgId"),
  // Full Web Push subscription JSON: { endpoint, keys: { p256dh, auth } }
  subscription: json("subscription").notNull(),
  // Extracted endpoint for uniqueness enforcement: unique index on (orgId, userId, endpoint)
  endpoint: varchar("endpoint", { length: 512 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ─── Staff Check-In ───────────────────────────────────────────────────────────
export const staffCheckins = mysqlTable("staff_checkins", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
  facilityId: int("facilityId"),
  staffName: varchar("staffName", { length: 255 }).notNull(),
  // Status: reunification | injured | off_site | cannot_disclose
  status: mysqlEnum("status", ["reunification", "injured", "off_site", "cannot_disclose"]).notNull(),
  // Location description (optional — used for reunification, injured, off_site)
  location: text("location"),
  recordedByUserId: int("recordedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StaffCheckin = typeof staffCheckins.$inferSelect;
export type InsertStaffCheckin = typeof staffCheckins.$inferInsert;

// ─── BTAM: Behavioral Threat Assessment & Management ─────────────────────────

export const btamCases = mysqlTable("btam_cases", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  // Auto-generated case number e.g. BTAM-2026-0001
  caseNumber: varchar("caseNumber", { length: 32 }).notNull().unique(),
  status: mysqlEnum("status", ["open", "monitoring", "resolved", "escalated", "referred_law_enforcement"]).default("open").notNull(),
  concernLevel: mysqlEnum("concernLevel", ["pending", "low", "moderate", "high", "imminent"]).default("pending").notNull(),
  violenceType: mysqlEnum("violenceType", ["type_i_criminal", "type_ii_client", "type_iii_worker_on_worker", "type_iv_personal_relationship"]),
  createdBy: int("createdBy").notNull(),
  assignedAssessor: int("assignedAssessor"),
  linkedIncidentId: int("linkedIncidentId"),
  isAnonymousReporter: boolean("isAnonymousReporter").default(false).notNull(),
  confidentialityFlag: boolean("confidentialityFlag").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BtamCase = typeof btamCases.$inferSelect;
export type InsertBtamCase = typeof btamCases.$inferInsert;

export const btamSubjects = mysqlTable("btam_subjects", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  subjectType: mysqlEnum("subjectType", ["employee", "former_employee", "customer_client", "contractor", "visitor", "unknown"]).notNull(),
  employmentStatus: mysqlEnum("employmentStatus", ["active", "terminated", "suspended", "on_leave", "never_employed"]),
  nameKnown: boolean("nameKnown").default(false).notNull(),
  // AES-256-GCM encrypted subject alias/name — stored as base64 ciphertext
  subjectAlias: text("subjectAlias"),
  // AES-256-GCM encrypted contact info
  subjectContact: text("subjectContact"),
  department: varchar("department", { length: 255 }),
  location: varchar("location", { length: 255 }),
  supervisorName: varchar("supervisorName", { length: 255 }),
  tenureYears: float("tenureYears"),
  recentDisciplinaryAction: boolean("recentDisciplinaryAction").default(false),
  pendingTermination: boolean("pendingTermination").default(false),
  grievanceFiled: boolean("grievanceFiled").default(false),
  domesticSituationKnown: boolean("domesticSituationKnown").default(false),
  accessCredentialsActive: boolean("accessCredentialsActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BtamSubject = typeof btamSubjects.$inferSelect;
export type InsertBtamSubject = typeof btamSubjects.$inferInsert;

export const btamReferralIntake = mysqlTable("btam_referral_intake", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  reporterRole: mysqlEnum("reporterRole", ["hr", "manager", "coworker", "self", "anonymous"]).notNull(),
  concernDescription: text("concernDescription").notNull(),
  dateOfConcern: varchar("dateOfConcern", { length: 32 }),
  locationOfConcern: varchar("locationOfConcern", { length: 255 }),
  witnessesPresent: boolean("witnessesPresent").default(false),
  immediateThreathFelt: boolean("immediateThreathFelt").default(false),
  weaponMentioned: boolean("weaponMentioned").default(false),
  targetIdentified: boolean("targetIdentified").default(false),
  // AES-256-GCM encrypted target description
  targetDescription: text("targetDescription"),
  priorIncidentsKnown: boolean("priorIncidentsKnown").default(false),
  priorIncidentsDescription: text("priorIncidentsDescription"),
  // JSON array of {fileKey, url, filename, mimeType}
  supportingDocuments: json("supportingDocuments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BtamReferralIntake = typeof btamReferralIntake.$inferSelect;
export type InsertBtamReferralIntake = typeof btamReferralIntake.$inferInsert;

export const btamWavrAssessments = mysqlTable("btam_wavr_assessments", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  assessorId: int("assessorId").notNull(),
  assessedAt: timestamp("assessedAt").defaultNow().notNull(),
  // Motivational factors (0=absent, 1=present, 2=prominent)
  grievanceFixation: int("grievanceFixation").default(0),
  grievanceFixationChange: boolean("grievanceFixationChange").default(false),
  grievanceWithTarget: int("grievanceWithTarget").default(0),
  grievanceWithTargetChange: boolean("grievanceWithTargetChange").default(false),
  desperationHopelessness: int("desperationHopelessness").default(0),
  desperationHopelessnessChange: boolean("desperationHopelessnessChange").default(false),
  // Psychological factors
  mentalHealthConcern: int("mentalHealthConcern").default(0),
  mentalHealthConcernChange: boolean("mentalHealthConcernChange").default(false),
  paranoidThinking: int("paranoidThinking").default(0),
  paranoidThinkingChange: boolean("paranoidThinkingChange").default(false),
  depressionWithdrawal: int("depressionWithdrawal").default(0),
  depressionWithdrawalChange: boolean("depressionWithdrawalChange").default(false),
  narcissisticInjury: int("narcissisticInjury").default(0),
  narcissisticInjuryChange: boolean("narcissisticInjuryChange").default(false),
  // Behavioral factors
  concerningCommunications: int("concerningCommunications").default(0),
  concerningCommunicationsChange: boolean("concerningCommunicationsChange").default(false),
  weaponsInterest: int("weaponsInterest").default(0),
  weaponsInterestChange: boolean("weaponsInterestChange").default(false),
  pathwayBehaviors: int("pathwayBehaviors").default(0),
  pathwayBehaviorsChange: boolean("pathwayBehaviorsChange").default(false),
  leakage: int("leakage").default(0),
  leakageChange: boolean("leakageChange").default(false),
  // Historical factors
  priorViolenceHistory: int("priorViolenceHistory").default(0),
  priorViolenceHistoryChange: boolean("priorViolenceHistoryChange").default(false),
  priorMentalHealthCrisis: int("priorMentalHealthCrisis").default(0),
  priorMentalHealthCrisisChange: boolean("priorMentalHealthCrisisChange").default(false),
  domesticViolenceHistory: int("domesticViolenceHistory").default(0),
  domesticViolenceHistoryChange: boolean("domesticViolenceHistoryChange").default(false),
  // Situational factors
  recentStressor: int("recentStressor").default(0),
  recentStressorChange: boolean("recentStressorChange").default(false),
  socialIsolation: int("socialIsolation").default(0),
  socialIsolationChange: boolean("socialIsolationChange").default(false),
  personalCrisis: int("personalCrisis").default(0),
  personalCrisisChange: boolean("personalCrisisChange").default(false),
  // Protective factors (inverse — higher = lower risk)
  helpSeeking: int("helpSeeking").default(0),
  helpSeekingChange: boolean("helpSeekingChange").default(false),
  socialSupport: int("socialSupport").default(0),
  socialSupportChange: boolean("socialSupportChange").default(false),
  futureOrientation: int("futureOrientation").default(0),
  futureOrientationChange: boolean("futureOrientationChange").default(false),
  // Pre-attack proximal factors (3x weight, any prominent → auto-escalate)
  finalActBehaviors: int("finalActBehaviors").default(0),
  finalActBehaviorsChange: boolean("finalActBehaviorsChange").default(false),
  surveillanceOfTarget: int("surveillanceOfTarget").default(0),
  surveillanceOfTargetChange: boolean("surveillanceOfTargetChange").default(false),
  imminentCommunication: int("imminentCommunication").default(0),
  imminentCommunicationChange: boolean("imminentCommunicationChange").default(false),
  // Computed result
  computedConcernLevel: mysqlEnum("computedConcernLevel", ["low", "moderate", "high", "imminent"]),
  totalWeightedScore: int("totalWeightedScore"),
  topContributingFactors: json("topContributingFactors"),
  assessorNotes: text("assessorNotes"),
  assessorAttestation: boolean("assessorAttestation").default(false).notNull(),
});
export type BtamWavrAssessment = typeof btamWavrAssessments.$inferSelect;
export type InsertBtamWavrAssessment = typeof btamWavrAssessments.$inferInsert;

export const btamManagementPlan = mysqlTable("btam_management_plan", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  createdBy: int("createdBy").notNull(),
  interventionType: mysqlEnum("interventionType", [
    "monitoring", "hr_meeting", "eap_referral", "mandatory_counseling",
    "credential_suspension", "law_enforcement_notification",
    "no_contact_order", "termination_with_safety_protocol",
    "hospitalization_referral", "other"
  ]).notNull(),
  actionDescription: text("actionDescription").notNull(),
  responsibleParty: int("responsibleParty"),
  dueDate: varchar("dueDate", { length: 32 }),
  completed: boolean("completed").default(false).notNull(),
  completionNotes: text("completionNotes"),
  nextReviewDate: varchar("nextReviewDate", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BtamManagementPlan = typeof btamManagementPlan.$inferSelect;
export type InsertBtamManagementPlan = typeof btamManagementPlan.$inferInsert;

export const btamCaseNotes = mysqlTable("btam_case_notes", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  authorId: int("authorId").notNull(),
  noteType: mysqlEnum("noteType", ["observation", "interview", "external_report", "law_enforcement", "legal", "hr", "general"]).notNull(),
  // AES-256-GCM encrypted note content
  content: text("content").notNull(),
  isPrivileged: boolean("isPrivileged").default(false).notNull(),
  // JSON array of {fileKey, url, filename, mimeType}
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BtamCaseNote = typeof btamCaseNotes.$inferSelect;
export type InsertBtamCaseNote = typeof btamCaseNotes.$inferInsert;

export const btamStatusHistory = mysqlTable("btam_status_history", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  changedBy: int("changedBy").notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  previousStatus: varchar("previousStatus", { length: 64 }),
  newStatus: varchar("newStatus", { length: 64 }),
  previousConcernLevel: varchar("previousConcernLevel", { length: 32 }),
  newConcernLevel: varchar("newConcernLevel", { length: 32 }),
  reason: text("reason"),
});
export type BtamStatusHistory = typeof btamStatusHistory.$inferSelect;
export type InsertBtamStatusHistory = typeof btamStatusHistory.$inferInsert;
