ALTER TABLE `users` ADD COLUMN `rasRole` enum('admin','responder','staff');
ALTER TABLE `users` ADD COLUMN `btamRole` enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none';
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(128);
ALTER TABLE `users` ADD COLUMN `passwordSalt` varchar(64);
ALTER TABLE `users` ADD COLUMN `emailVerified` boolean NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN `emailVerifyToken` varchar(128);
ALTER TABLE `users` ADD COLUMN `passwordResetToken` varchar(128);
ALTER TABLE `users` ADD COLUMN `passwordResetExpiresAt` timestamp NULL;
ALTER TABLE `users` ADD COLUMN `ghlContactId` varchar(64);
ALTER TABLE `users` ADD COLUMN `hasSeenWalkthrough` boolean NOT NULL DEFAULT false;

-- ─── 3. ORG MEMBERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `org_members` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `userId` int NOT NULL,
  `orgRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user',
  `invitedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `joinedAt` timestamp NULL,
  `canTriggerAlerts` boolean NOT NULL DEFAULT false,
  `canRunDrills` boolean NOT NULL DEFAULT false,
  `canExportReports` boolean NOT NULL DEFAULT false,
  `canViewIncidentLogs` boolean NOT NULL DEFAULT false,
  `canSubmitAnonymousReports` boolean NOT NULL DEFAULT false,
  `canAccessEap` boolean NOT NULL DEFAULT false,
  `canManageSiteAssessments` boolean NOT NULL DEFAULT false
);

ALTER TABLE `org_members` MODIFY COLUMN `orgRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user';
ALTER TABLE `org_members` ADD COLUMN `canTriggerAlerts` boolean NOT NULL DEFAULT false;
ALTER TABLE `org_members` ADD COLUMN `canRunDrills` boolean NOT NULL DEFAULT false;
ALTER TABLE `org_members` ADD COLUMN `canExportReports` boolean NOT NULL DEFAULT false;
ALTER TABLE `org_members` ADD COLUMN `canViewIncidentLogs` boolean NOT NULL DEFAULT false;
ALTER TABLE `org_members` ADD COLUMN `canSubmitAnonymousReports` boolean NOT NULL DEFAULT false;
ALTER TABLE `org_members` ADD COLUMN `canAccessEap` boolean NOT NULL DEFAULT false;
ALTER TABLE `org_members` ADD COLUMN `canManageSiteAssessments` boolean NOT NULL DEFAULT false;

-- ─── 4. ORG INVITES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `org_invites` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `inviteRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user',
  `token` varchar(64) NOT NULL UNIQUE,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE `org_invites` MODIFY COLUMN `inviteRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user';

-- ─── 5. FACILITIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `facilities` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `facilityType` varchar(64) NOT NULL,
  `address` text,
  `city` varchar(128),
  `state` varchar(64),
  `jurisdiction` varchar(64) DEFAULT 'United States',
  `squareFootage` int,
  `floors` int,
  `maxOccupancy` int,
  `operatingHours` varchar(128),
  `eveningOperations` boolean DEFAULT false,
  `multiTenant` boolean DEFAULT false,
  `publicAccessWithoutScreening` boolean DEFAULT false,
  `publicEntrances` int,
  `staffEntrances` int,
  `hasAlleyways` boolean DEFAULT false,
  `hasConcealedAreas` boolean DEFAULT false,
  `usedAfterDark` boolean DEFAULT false,
  `multiSite` boolean DEFAULT false,
  `emergencyCoordinator` varchar(255),
  `emergencyRoles` text,
  `aedOnSite` boolean DEFAULT false,
  `aedLocations` text,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE `facilities` ADD COLUMN `jurisdiction` varchar(64) DEFAULT 'United States';
ALTER TABLE `facilities` ADD COLUMN `publicEntrances` int;
ALTER TABLE `facilities` ADD COLUMN `staffEntrances` int;
ALTER TABLE `facilities` ADD COLUMN `hasAlleyways` boolean DEFAULT false;
ALTER TABLE `facilities` ADD COLUMN `hasConcealedAreas` boolean DEFAULT false;
ALTER TABLE `facilities` ADD COLUMN `usedAfterDark` boolean DEFAULT false;
ALTER TABLE `facilities` ADD COLUMN `multiSite` boolean DEFAULT false;
ALTER TABLE `facilities` ADD COLUMN `emergencyCoordinator` varchar(255);
ALTER TABLE `facilities` ADD COLUMN `emergencyRoles` text;
ALTER TABLE `facilities` ADD COLUMN `aedOnSite` boolean DEFAULT false;
ALTER TABLE `facilities` ADD COLUMN `aedLocations` text;

-- ─── 6. AUDITS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audits` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `facilityId` int NOT NULL,
  `auditorId` int NOT NULL,
  `status` enum('in_progress','completed','archived') NOT NULL DEFAULT 'in_progress',
  `auditDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  `overallScore` float,
  `overallRiskLevel` varchar(32),
  `categoryScores` json,
  `auditorNotes` text,
  `eapContacts` json,
  `sectionEapNotes` json,
  `eapJson` json,
  `eapGeneratedAt` timestamp NULL,
  `executiveSummaryJson` json,
  `executiveSummaryGeneratedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE `audits` ADD COLUMN `executiveSummaryJson` json;
ALTER TABLE `audits` ADD COLUMN `executiveSummaryGeneratedAt` timestamp NULL;

-- ─── 7. AUDIT RESPONSES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_responses` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `categoryName` varchar(128) NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `questionText` text NOT NULL,
  `primaryResponse` enum('Yes','No','Unknown','Not Applicable'),
  `addToEap` boolean DEFAULT false,
  `concernLevel` enum('Minor','Moderate','Serious'),
  `response` enum('Secure / Yes','Partial','Minor Concern','Moderate Concern','Serious Vulnerability','No — Not Present','Unlikely / Minimal','Partially Present','Yes — Present','Unknown','Not Applicable','Unavoidable'),
  `conditionType` varchar(128),
  `conditionTypes` json,
  `isUnavoidable` boolean DEFAULT false,
  `score` int,
  `notes` text,
  `recommendedActionNotes` text,
  `remediationTimeline` enum('30 days','60 days','90 days','Long-Term'),
  `followUpResponse` text,
  `photoUrls` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 8. THREAT FINDINGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `threat_findings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `findingName` varchar(255) NOT NULL,
  `category` varchar(128) NOT NULL,
  `likelihood` varchar(32) NOT NULL,
  `impact` varchar(32) NOT NULL,
  `preparedness` varchar(64) NOT NULL,
  `baseScore` int NOT NULL,
  `modifier` int NOT NULL,
  `finalScore` int NOT NULL,
  `severityLevel` varchar(32) NOT NULL,
  `priority` varchar(32) NOT NULL,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 9. AUDIT PHOTOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_photos` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `auditResponseId` int,
  `url` text NOT NULL,
  `fileKey` text NOT NULL,
  `caption` varchar(255),
  `photoType` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 10. TESTER FEEDBACK ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tester_feedback` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `facilityId` int NOT NULL,
  `userId` int NOT NULL,
  `facilityType` varchar(64),
  `completionTimeMinutes` int,
  `overallReportQuality` int,
  `scoringAccuracy` int,
  `correctiveActionRealism` int,
  `eapCompleteness` int,
  `questionRelevance` int,
  `missingQuestions` text,
  `irrelevantQuestions` text,
  `correctiveActionIssues` text,
  `scoringDisagreements` text,
  `eapFeedback` text,
  `generalNotes` text,
  `wouldUseForClient` boolean,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 11. QUESTION FLAGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `question_flags` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `userId` int NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `questionText` text NOT NULL,
  `categoryName` varchar(128) NOT NULL,
  `flagType` enum('wrong_response_options','question_unclear','not_applicable_to_facility','scoring_seems_wrong','missing_context','other') NOT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 12. INCIDENT REPORTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `incident_reports` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `facilityId` int,
  `facilityName` varchar(255),
  `incidentType` enum('threatening_behavior','suspicious_person','observed_safety_gap','workplace_violence','other') NOT NULL,
  `involvesInjuryOrIllness` boolean DEFAULT false,
  `injuryType` enum('injury','skin_disorder','respiratory','poisoning','hearing_loss','other_illness','other_injury'),
  `bodyPartAffected` varchar(128),
  `injuryDescription` text,
  `medicalTreatment` enum('first_aid_only','medical_treatment','emergency_room','hospitalized'),
  `daysAwayFromWork` int,
  `daysOnRestriction` int,
  `lossOfConsciousness` boolean DEFAULT false,
  `workRelated` boolean DEFAULT true,
  `oshaRecordable` boolean DEFAULT false,
  `employeeName` varchar(255),
  `employeeJobTitle` varchar(128),
  `employeeDateOfBirth` varchar(16),
  `employeeDateHired` varchar(16),
  `physicianName` varchar(255),
  `treatedInER` boolean DEFAULT false,
  `hospitalizedOvernight` boolean DEFAULT false,
  `severity` enum('low','moderate','high','critical') NOT NULL,
  `incidentDate` timestamp NULL,
  `location` varchar(255),
  `description` text NOT NULL,
  `involvedParties` text,
  `witnesses` text,
  `priorIncidents` boolean DEFAULT false,
  `reportedToAuthorities` boolean DEFAULT false,
  `reporterRole` varchar(64),
  `contactEmail` varchar(320),
  `status` enum('new','under_review','resolved','referred') NOT NULL DEFAULT 'new',
  `adminNotes` text,
  `reviewedBy` int,
  `reviewedAt` timestamp NULL,
  `trackingToken` varchar(64) UNIQUE,
  `followUpRequested` boolean DEFAULT false,
  `followUpMethod` enum('phone','email','in_person'),
  `followUpContact` varchar(320),
  `involvedPersonName` varchar(255),
  `isRepeatIncident` boolean DEFAULT false,
  `repeatGroupId` varchar(64),
  `threatFlags` text,
  `maxThreatSeverity` varchar(16),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add any missing columns to incident_reports
ALTER TABLE `incident_reports` MODIFY COLUMN `incidentType` enum('threatening_behavior','suspicious_person','observed_safety_gap','workplace_violence','other') NOT NULL;
ALTER TABLE `incident_reports` ADD COLUMN `involvesInjuryOrIllness` boolean DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `injuryType` enum('injury','skin_disorder','respiratory','poisoning','hearing_loss','other_illness','other_injury');
ALTER TABLE `incident_reports` ADD COLUMN `bodyPartAffected` varchar(128);
ALTER TABLE `incident_reports` ADD COLUMN `injuryDescription` text;
ALTER TABLE `incident_reports` ADD COLUMN `medicalTreatment` enum('first_aid_only','medical_treatment','emergency_room','hospitalized');
ALTER TABLE `incident_reports` ADD COLUMN `daysAwayFromWork` int;
ALTER TABLE `incident_reports` ADD COLUMN `daysOnRestriction` int;
ALTER TABLE `incident_reports` ADD COLUMN `lossOfConsciousness` boolean DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `workRelated` boolean DEFAULT true;
ALTER TABLE `incident_reports` ADD COLUMN `oshaRecordable` boolean DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `employeeName` varchar(255);
ALTER TABLE `incident_reports` ADD COLUMN `employeeJobTitle` varchar(128);
ALTER TABLE `incident_reports` ADD COLUMN `employeeDateOfBirth` varchar(16);
ALTER TABLE `incident_reports` ADD COLUMN `employeeDateHired` varchar(16);
ALTER TABLE `incident_reports` ADD COLUMN `physicianName` varchar(255);
ALTER TABLE `incident_reports` ADD COLUMN `treatedInER` boolean DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `hospitalizedOvernight` boolean DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `followUpRequested` boolean DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `followUpMethod` enum('phone','email','in_person');
ALTER TABLE `incident_reports` ADD COLUMN `followUpContact` varchar(320);
ALTER TABLE `incident_reports` ADD COLUMN `involvedPersonName` varchar(255);
ALTER TABLE `incident_reports` ADD COLUMN `isRepeatIncident` boolean DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `repeatGroupId` varchar(64);
ALTER TABLE `incident_reports` ADD COLUMN `threatFlags` text;
ALTER TABLE `incident_reports` ADD COLUMN `maxThreatSeverity` varchar(16);

-- ─── 13. FACILITY ATTACHMENTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS `facility_attachments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `facilityId` int NOT NULL,
  `uploadedBy` int NOT NULL,
  `url` text NOT NULL,
  `fileKey` text NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mimeType` varchar(128) NOT NULL,
  `fileSize` int,
  `category` enum('floor_plan','interior_photo','exterior_photo','document','other') NOT NULL DEFAULT 'other',
  `caption` varchar(255),
  `aiAnalysis` text,
  `aiAnalyzedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 14. CORRECTIVE ACTION CHECKS ────────────────────────────
CREATE TABLE IF NOT EXISTS `corrective_action_checks` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `completedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedBy` int NOT NULL,
  `notes` varchar(512)
);

-- ─── 15. AUDIT LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `userName` varchar(255),
  `orgId` int,
  `action` enum('create','update','delete','login','logout','invite_sent','invite_accepted','member_removed','role_changed','audit_completed','audit_reopened','incident_submitted','incident_reviewed','report_shared','escalate') NOT NULL,
  `entityType` varchar(64) NOT NULL,
  `entityId` varchar(64),
  `description` text,
  `metadata` json,
  `ipAddress` varchar(64),
  `userAgent` varchar(512),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('create','update','delete','login','logout','invite_sent','invite_accepted','member_removed','role_changed','audit_completed','audit_reopened','incident_submitted','incident_reviewed','report_shared','escalate') NOT NULL;

-- ─── 16. VISITOR LOGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `visitor_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int,
  `loggedByUserId` int NOT NULL,
  `visitorName` varchar(255) NOT NULL,
  `company` varchar(255),
  `purposeOfVisit` varchar(512) NOT NULL,
  `hostName` varchar(255),
  `timeIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `timeOut` timestamp NULL,
  `idVerified` boolean NOT NULL DEFAULT false,
  `idType` varchar(64),
  `idNotes` text,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 17. LIABILITY SCANS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `liability_scans` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `orgId` int,
  `facilityId` int,
  `score` int NOT NULL,
  `classification` varchar(64) NOT NULL,
  `riskMapLevel` varchar(64) NOT NULL,
  `riskMapColor` varchar(16) NOT NULL,
  `riskMapDescriptor` text,
  `jurisdiction` varchar(128) NOT NULL,
  `industry` varchar(128) NOT NULL,
  `topGaps` json NOT NULL,
  `categoryBreakdown` json NOT NULL,
  `immediateActions` json NOT NULL,
  `interpretation` text,
  `advisorSummary` text,
  `scorePercent` int,
  `defensibilityStatus` varchar(32),
  `answers` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE `liability_scans` ADD COLUMN `scorePercent` int;
ALTER TABLE `liability_scans` ADD COLUMN `defensibilityStatus` varchar(32);
ALTER TABLE `liability_scans` ADD COLUMN `answers` json;

-- ─── 18. SCAN SHARE TOKENS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `scan_share_tokens` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `scanId` int NOT NULL,
  `token` varchar(128) NOT NULL UNIQUE,
  `createdByUserId` int,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NULL,
  `label` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 19. EAP SECTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `eap_sections` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `sectionId` varchar(64) NOT NULL,
  `sectionTitle` varchar(255) NOT NULL,
  `contentOverride` text,
  `reviewed` boolean NOT NULL DEFAULT false,
  `applicable` boolean NOT NULL DEFAULT true,
  `auditorNotes` text,
  `auditorRecommendations` json,
  `lastEditedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 20. EAP SECTION VERSIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS `eap_section_versions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `eapSectionId` int NOT NULL,
  `auditId` int NOT NULL,
  `sectionId` varchar(64) NOT NULL,
  `contentSnapshot` text,
  `savedByUserId` int,
  `savedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `label` varchar(128)
);

-- ─── 21. FLAGGED VISITORS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `flagged_visitors` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `reason` text,
  `addedByUserId` int NOT NULL,
  `facilityId` int,
  `active` boolean NOT NULL DEFAULT true,
  `flagLevel` enum('red','yellow') NOT NULL DEFAULT 'red',
  `lastEscalatedAt` timestamp NULL,
  `escalationCount` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE `flagged_visitors` ADD COLUMN `flagLevel` enum('red','yellow') NOT NULL DEFAULT 'red';
ALTER TABLE `flagged_visitors` ADD COLUMN `lastEscalatedAt` timestamp NULL;
ALTER TABLE `flagged_visitors` ADD COLUMN `escalationCount` int NOT NULL DEFAULT 0;

-- ─── 22. DRILL TEMPLATES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drill_templates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `facilityId` int,
  `createdByUserId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `drillType` enum('micro','guided','operational','extended') NOT NULL,
  `durationMinutes` int NOT NULL,
  `industry` varchar(100),
  `jurisdiction` varchar(100),
  `generationMode` enum('system','user') NOT NULL DEFAULT 'system',
  `userPrompt` text,
  `content` json NOT NULL,
  `regulatoryTags` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 23. DRILL SESSIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drill_sessions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `templateId` int NOT NULL,
  `facilityId` int,
  `orgId` int,
  `scheduledByUserId` int NOT NULL,
  `scheduledAt` timestamp NOT NULL,
  `completedAt` timestamp NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `debriefData` json,
  `systemIntelligence` json,
  `participantCount` int,
  `facilitatorNotes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 24. DRILL PARTICIPANTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `drill_participants` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sessionId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(100),
  `attended` boolean NOT NULL DEFAULT true,
  `observations` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 25. ALERT EVENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `alert_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `facilityId` int NOT NULL,
  `alertType` enum('lockdown','lockout') NOT NULL,
  `alertStatus` enum('active','response_in_progress','resolved') NOT NULL DEFAULT 'active',
  `messageTitle` varchar(255) NOT NULL,
  `messageBody` text NOT NULL,
  `roleInstructions` json,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolvedAt` timestamp NULL
);

-- ─── 26. ALERT RECIPIENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `alert_recipients` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alertEventId` int NOT NULL,
  `userId` int NOT NULL,
  `rasRoleAtTime` enum('admin','responder','staff') NOT NULL,
  `deliveryStatus` enum('pending','delivered','failed') NOT NULL DEFAULT 'pending',
  `deliveredAt` timestamp NULL,
  `acknowledgedAt` timestamp NULL,
  `responseStatus` enum('acknowledged','responding'),
  `responseUpdatedAt` timestamp NULL
);

-- ─── 27. ALERT STATUS UPDATES ────────────────────────────────
CREATE TABLE IF NOT EXISTS `alert_status_updates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alertEventId` int NOT NULL,
  `statusType` enum('active','response_in_progress','resolved') NOT NULL,
  `shortMessage` varchar(120),
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 28. FACILITY ALERT SETTINGS ─────────────────────────────
CREATE TABLE IF NOT EXISTS `facility_alert_settings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int NOT NULL UNIQUE,
  `orgId` int,
  `lockdownTemplate` json,
  `lockoutTemplate` json,
  `pushEnabled` boolean NOT NULL DEFAULT true,
  `escalationPreferences` json,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 29. PUSH SUBSCRIPTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `orgId` int,
  `subscription` json NOT NULL,
  `endpoint` varchar(512),
  `userAgent` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE `push_subscriptions` ADD COLUMN `endpoint` varchar(512);

-- ─── 30. STAFF CHECK-INS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `staff_checkins` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `facilityId` int,
  `staffName` varchar(255) NOT NULL,
  `status` enum('reunification','injured','off_site','cannot_disclose') NOT NULL,
  `location` text,
  `recordedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 31. BTAM CASES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_cases` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `caseNumber` varchar(32) NOT NULL UNIQUE,
  `status` enum('open','monitoring','resolved','escalated','referred_law_enforcement') NOT NULL DEFAULT 'open',
  `concernLevel` enum('pending','low','moderate','high','imminent') NOT NULL DEFAULT 'pending',
  `violenceType` enum('type_i_criminal','type_ii_client','type_iii_worker_on_worker','type_iv_personal_relationship'),
  `createdBy` int NOT NULL,
  `assignedAssessor` int,
  `linkedIncidentId` int,
  `isAnonymousReporter` boolean NOT NULL DEFAULT false,
  `confidentialityFlag` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 32. BTAM SUBJECTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_subjects` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `subjectType` enum('employee','former_employee','customer_client','contractor','visitor','unknown') NOT NULL,
  `employmentStatus` enum('active','terminated','suspended','on_leave','never_employed'),
  `nameKnown` boolean NOT NULL DEFAULT false,
  `subjectAlias` text,
  `subjectContact` text,
  `department` varchar(255),
  `location` varchar(255),
  `supervisorName` varchar(255),
  `tenureYears` float,
  `recentDisciplinaryAction` boolean DEFAULT false,
  `pendingTermination` boolean DEFAULT false,
  `grievanceFiled` boolean DEFAULT false,
  `domesticSituationKnown` boolean DEFAULT false,
  `accessCredentialsActive` boolean DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 33. BTAM REFERRAL INTAKE ────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_referral_intake` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `reporterRole` enum('hr','manager','coworker','self','anonymous') NOT NULL,
  `concernDescription` text NOT NULL,
  `dateOfConcern` varchar(32),
  `locationOfConcern` varchar(255),
  `witnessesPresent` boolean DEFAULT false,
  `immediateThreathFelt` boolean DEFAULT false,
  `weaponMentioned` boolean DEFAULT false,
  `targetIdentified` boolean DEFAULT false,
  `targetDescription` text,
  `priorIncidentsKnown` boolean DEFAULT false,
  `priorIncidentsDescription` text,
  `supportingDocuments` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 34. BTAM WAVR ASSESSMENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_wavr_assessments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `assessorId` int NOT NULL,
  `assessedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `grievanceFixation` int DEFAULT 0,
  `grievanceFixationChange` boolean DEFAULT false,
  `grievanceWithTarget` int DEFAULT 0,
  `grievanceWithTargetChange` boolean DEFAULT false,
  `desperationHopelessness` int DEFAULT 0,
  `desperationHopelessnessChange` boolean DEFAULT false,
  `mentalHealthConcern` int DEFAULT 0,
  `mentalHealthConcernChange` boolean DEFAULT false,
  `paranoidThinking` int DEFAULT 0,
  `paranoidThinkingChange` boolean DEFAULT false,
  `depressionWithdrawal` int DEFAULT 0,
  `depressionWithdrawalChange` boolean DEFAULT false,
  `narcissisticInjury` int DEFAULT 0,
  `narcissisticInjuryChange` boolean DEFAULT false,
  `concerningCommunications` int DEFAULT 0,
  `concerningCommunicationsChange` boolean DEFAULT false,
  `weaponsInterest` int DEFAULT 0,
  `weaponsInterestChange` boolean DEFAULT false,
  `pathwayBehaviors` int DEFAULT 0,
  `pathwayBehaviorsChange` boolean DEFAULT false,
  `leakage` int DEFAULT 0,
  `leakageChange` boolean DEFAULT false,
  `priorViolenceHistory` int DEFAULT 0,
  `priorViolenceHistoryChange` boolean DEFAULT false,
  `priorMentalHealthCrisis` int DEFAULT 0,
  `priorMentalHealthCrisisChange` boolean DEFAULT false,
  `domesticViolenceHistory` int DEFAULT 0,
  `domesticViolenceHistoryChange` boolean DEFAULT false,
  `recentStressor` int DEFAULT 0,
  `recentStressorChange` boolean DEFAULT false,
  `socialIsolation` int DEFAULT 0,
  `socialIsolationChange` boolean DEFAULT false,
  `personalCrisis` int DEFAULT 0,
  `personalCrisisChange` boolean DEFAULT false,
  `helpSeeking` int DEFAULT 0,
  `helpSeekingChange` boolean DEFAULT false,
  `socialSupport` int DEFAULT 0,
  `socialSupportChange` boolean DEFAULT false,
  `futureOrientation` int DEFAULT 0,
  `futureOrientationChange` boolean DEFAULT false,
  `finalActBehaviors` int DEFAULT 0,
  `finalActBehaviorsChange` boolean DEFAULT false,
  `surveillanceOfTarget` int DEFAULT 0,
  `surveillanceOfTargetChange` boolean DEFAULT false,
  `imminentCommunication` int DEFAULT 0,
  `imminentCommunicationChange` boolean DEFAULT false,
  `computedConcernLevel` enum('low','moderate','high','imminent'),
  `totalWeightedScore` int,
  `topContributingFactors` json,
  `assessorNotes` text,
  `assessorAttestation` boolean NOT NULL DEFAULT false
);

-- ─── 35. BTAM MANAGEMENT PLAN ────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_management_plan` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `createdBy` int NOT NULL,
  `interventionType` enum('monitoring','hr_meeting','eap_referral','mandatory_counseling','credential_suspension','law_enforcement_notification','no_contact_order','termination_with_safety_protocol','hospitalization_referral','other') NOT NULL,
  `actionDescription` text NOT NULL,
  `responsibleParty` int,
  `dueDate` varchar(32),
  `completed` boolean NOT NULL DEFAULT false,
  `completedAt` timestamp NULL,
  `completedBy` int,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 36. BTAM CASE NOTES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_case_notes` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `authorId` int NOT NULL,
  `noteType` enum('observation','contact','intervention','legal','other') NOT NULL DEFAULT 'observation',
  `content` text NOT NULL,
  `isConfidential` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 37. BTAM STATUS HISTORY ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_status_history` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `changedBy` int NOT NULL,
  `fromStatus` varchar(64),
  `toStatus` varchar(64) NOT NULL,
  `fromConcernLevel` varchar(32),
  `toConcernLevel` varchar(32),
  `reason` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- HOW TO RUN:
-- mysql -u root -pMarketingcow1! -h 127.0.0.1 safeguard < five_stones_full_sync.sql
--
-- NOTE: Duplicate column errors on ALTER TABLE are expected and
-- safe to ignore — they mean the column already exists.
-- ============================================================
