-- ============================================================
-- Five Stones Full DB Sync Script
-- Safe to run multiple times — duplicate columns are ignored
-- ============================================================

DROP PROCEDURE IF EXISTS add_col;
DELIMITER $$
CREATE PROCEDURE add_col(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN col_def TEXT
)
BEGIN
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END; -- ignore duplicate column
  SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', col_def);
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END$$

CREATE PROCEDURE modify_col(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN col_def TEXT
)
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
  SET @sql = CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', col_def);
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

-- ─── 1. ORGANIZATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `slug` varchar(64) NOT NULL UNIQUE,
  `logoUrl` text,
  `contactEmail` varchar(320),
  `createdByUserId` int,
  `plan` enum('free','paid') NOT NULL DEFAULT 'free',
  `planUpdatedAt` timestamp NULL,
  `externalSubscriptionId` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 2. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(64) NOT NULL UNIQUE,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('ultra_admin','admin','super_admin','auditor','viewer','user') NOT NULL DEFAULT 'user',
  `impersonatingUserId` int,
  `rasRole` enum('admin','responder','staff'),
  `btamRole` enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none',
  `passwordHash` varchar(128),
  `passwordSalt` varchar(64),
  `emailVerified` boolean NOT NULL DEFAULT false,
  `emailVerifyToken` varchar(128),
  `passwordResetToken` varchar(128),
  `passwordResetExpiresAt` timestamp NULL,
  `ghlContactId` varchar(64),
  `hasSeenWalkthrough` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL add_col('users','impersonatingUserId','int');
CALL add_col('users','rasRole',"enum('admin','responder','staff')");
CALL add_col('users','btamRole',"enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none'");
CALL add_col('users','passwordHash','varchar(128)');
CALL add_col('users','passwordSalt','varchar(64)');
CALL add_col('users','emailVerified','boolean NOT NULL DEFAULT false');
CALL add_col('users','emailVerifyToken','varchar(128)');
CALL add_col('users','passwordResetToken','varchar(128)');
CALL add_col('users','passwordResetExpiresAt','timestamp NULL');
CALL add_col('users','ghlContactId','varchar(64)');
CALL add_col('users','hasSeenWalkthrough','boolean NOT NULL DEFAULT false');

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

CALL modify_col('org_members','orgRole',"enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'");
CALL add_col('org_members','canTriggerAlerts','boolean NOT NULL DEFAULT false');
CALL add_col('org_members','canRunDrills','boolean NOT NULL DEFAULT false');
CALL add_col('org_members','canExportReports','boolean NOT NULL DEFAULT false');
CALL add_col('org_members','canViewIncidentLogs','boolean NOT NULL DEFAULT false');
CALL add_col('org_members','canSubmitAnonymousReports','boolean NOT NULL DEFAULT false');
CALL add_col('org_members','canAccessEap','boolean NOT NULL DEFAULT false');
CALL add_col('org_members','canManageSiteAssessments','boolean NOT NULL DEFAULT false');

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

CALL modify_col('org_invites','inviteRole',"enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'");

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
  `securityPersonnel` boolean DEFAULT false,
  `accessControlSystem` boolean DEFAULT false,
  `cctv` boolean DEFAULT false,
  `paSystem` boolean DEFAULT false,
  `aedOnSite` boolean DEFAULT false,
  `aedLocations` text,
  `emergencyRoles` json,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL add_col('facilities','jurisdiction',"varchar(64) DEFAULT 'United States'");
CALL add_col('facilities','aedOnSite','boolean DEFAULT false');
CALL add_col('facilities','aedLocations','text');
CALL add_col('facilities','emergencyRoles','json');

-- ─── 6. AUDITS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audits` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int NOT NULL,
  `userId` int NOT NULL,
  `orgId` int,
  `status` enum('in_progress','completed','archived') NOT NULL DEFAULT 'in_progress',
  `score` int,
  `maxScore` int,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 7. AUDIT RESPONSES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_responses` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `answer` enum('yes','no','na','partial') NOT NULL,
  `notes` text,
  `photoUrl` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 8. THREAT FINDINGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `threat_findings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `category` varchar(64) NOT NULL,
  `finding` text NOT NULL,
  `severity` enum('low','moderate','high','critical') NOT NULL,
  `recommendation` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 9. AUDIT PHOTOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_photos` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `questionId` varchar(64),
  `url` text NOT NULL,
  `caption` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 10. TESTER FEEDBACK ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tester_feedback` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `page` varchar(128),
  `rating` int,
  `comment` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 11. QUESTION FLAGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `question_flags` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `reason` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 12. INCIDENT REPORTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `incident_reports` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `facilityId` int,
  `facilityName` varchar(255),
  `incidentType` enum('threatening_behavior','suspicious_person','observed_safety_gap','workplace_violence','other') NOT NULL,
  `involvesInjuryOrIllness` boolean NOT NULL DEFAULT false,
  `injuryType` enum('injury','skin_disorder','respiratory','poisoning','hearing_loss','other_illness','other_injury'),
  `bodyPartAffected` varchar(128),
  `injuryDescription` text,
  `medicalTreatment` enum('none','first_aid','medical_beyond_first_aid','hospitalization','er_visit'),
  `daysAwayFromWork` int,
  `daysOnRestriction` int,
  `lossOfConsciousness` boolean NOT NULL DEFAULT false,
  `workRelated` boolean NOT NULL DEFAULT false,
  `oshaRecordable` boolean NOT NULL DEFAULT false,
  `employeeName` varchar(255),
  `employeeJobTitle` varchar(128),
  `employeeDateOfBirth` date,
  `employeeDateHired` date,
  `physicianName` varchar(255),
  `treatedInER` boolean NOT NULL DEFAULT false,
  `hospitalizedOvernight` boolean NOT NULL DEFAULT false,
  `severity` enum('low','moderate','high','critical') NOT NULL DEFAULT 'low',
  `incidentDate` timestamp NOT NULL,
  `location` varchar(255),
  `description` text NOT NULL,
  `involvedParties` text,
  `witnesses` text,
  `priorIncidents` boolean NOT NULL DEFAULT false,
  `reportedToAuthorities` boolean NOT NULL DEFAULT false,
  `reporterRole` varchar(64),
  `contactEmail` varchar(320),
  `status` enum('pending','reviewed','resolved','closed') NOT NULL DEFAULT 'pending',
  `adminNotes` text,
  `reviewedBy` int,
  `reviewedAt` timestamp NULL,
  `trackingToken` varchar(64) NOT NULL UNIQUE,
  `followUpRequested` boolean NOT NULL DEFAULT false,
  `followUpMethod` enum('phone','email','in_person','video'),
  `followUpContact` varchar(255),
  `involvedPersonName` varchar(255),
  `isRepeatIncident` boolean NOT NULL DEFAULT false,
  `repeatGroupId` varchar(64),
  `threatFlags` json,
  `maxThreatSeverity` enum('low','moderate','high','critical'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL add_col('incident_reports','involvesInjuryOrIllness','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','injuryType',"enum('injury','skin_disorder','respiratory','poisoning','hearing_loss','other_illness','other_injury')");
CALL add_col('incident_reports','bodyPartAffected','varchar(128)');
CALL add_col('incident_reports','injuryDescription','text');
CALL add_col('incident_reports','medicalTreatment',"enum('none','first_aid','medical_beyond_first_aid','hospitalization','er_visit')");
CALL add_col('incident_reports','daysAwayFromWork','int');
CALL add_col('incident_reports','daysOnRestriction','int');
CALL add_col('incident_reports','lossOfConsciousness','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','workRelated','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','oshaRecordable','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','employeeName','varchar(255)');
CALL add_col('incident_reports','employeeJobTitle','varchar(128)');
CALL add_col('incident_reports','employeeDateOfBirth','date');
CALL add_col('incident_reports','employeeDateHired','date');
CALL add_col('incident_reports','physicianName','varchar(255)');
CALL add_col('incident_reports','treatedInER','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','hospitalizedOvernight','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','followUpRequested','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','followUpMethod',"enum('phone','email','in_person','video')");
CALL add_col('incident_reports','followUpContact','varchar(255)');
CALL add_col('incident_reports','involvedPersonName','varchar(255)');
CALL add_col('incident_reports','isRepeatIncident','boolean NOT NULL DEFAULT false');
CALL add_col('incident_reports','repeatGroupId','varchar(64)');
CALL add_col('incident_reports','threatFlags','json');
CALL add_col('incident_reports','maxThreatSeverity',"enum('low','moderate','high','critical')");

-- ─── 13. FACILITY ATTACHMENTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS `facility_attachments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int NOT NULL,
  `userId` int NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `fileUrl` text NOT NULL,
  `fileType` varchar(64),
  `fileSize` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 14. CORRECTIVE ACTION CHECKS ────────────────────────────
CREATE TABLE IF NOT EXISTS `corrective_action_checks` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `checkedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checkedBy` int NOT NULL,
  `notes` text
);

-- ─── 15. AUDIT LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int,
  `userId` int,
  `action` varchar(128) NOT NULL,
  `targetType` varchar(64),
  `targetId` int,
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 16. VISITOR LOGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `visitor_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int NOT NULL,
  `orgId` int,
  `visitorName` varchar(255) NOT NULL,
  `visitorEmail` varchar(320),
  `visitorPhone` varchar(32),
  `purpose` varchar(255),
  `hostName` varchar(255),
  `checkInAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checkOutAt` timestamp NULL,
  `badgeNumber` varchar(64),
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 17. LIABILITY SCANS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `liability_scans` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `orgId` int,
  `facilityId` int,
  `jurisdiction` varchar(64),
  `industry` varchar(64),
  `score` int,
  `classification` varchar(64),
  `topGaps` json,
  `immediateActions` json,
  `output` json,
  `answers` json,
  `scorePercent` int,
  `defensibilityStatus` varchar(32),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL add_col('liability_scans','answers','json');
CALL add_col('liability_scans','scorePercent','int');
CALL add_col('liability_scans','defensibilityStatus','varchar(32)');

-- ─── 18. SCAN SHARE TOKENS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `scan_share_tokens` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `scanId` int NOT NULL,
  `token` varchar(64) NOT NULL UNIQUE,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` timestamp NULL
);

-- ─── 19. EAP SECTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `eap_sections` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int NOT NULL,
  `orgId` int,
  `sectionKey` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` longtext,
  `status` enum('draft','approved','archived') NOT NULL DEFAULT 'draft',
  `approvedBy` int,
  `approvedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 20. EAP SECTION VERSIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS `eap_section_versions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sectionId` int NOT NULL,
  `content` longtext,
  `savedBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 21. FLAGGED VISITORS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `flagged_visitors` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `aliases` text,
  `description` text,
  `photoUrl` text,
  `threatLevel` enum('watch','restricted','banned') NOT NULL DEFAULT 'watch',
  `notes` text,
  `addedBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 22. DRILL TEMPLATES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drill_templates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `drillType` varchar(64) NOT NULL,
  `description` text,
  `steps` json,
  `estimatedDurationMinutes` int,
  `createdBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 23. DRILL SESSIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drill_sessions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `facilityId` int,
  `templateId` int,
  `name` varchar(255) NOT NULL,
  `drillType` varchar(64) NOT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `scheduledAt` timestamp NULL,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `conductedBy` int,
  `participantCount` int,
  `notes` text,
  `outcomes` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 24. DRILL PARTICIPANTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `drill_participants` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sessionId` int NOT NULL,
  `userId` int,
  `name` varchar(255),
  `role` varchar(64),
  `attended` boolean NOT NULL DEFAULT false,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 25. ALERT EVENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `alert_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `facilityId` int,
  `triggeredBy` int,
  `alertType` varchar(64) NOT NULL,
  `severity` enum('low','moderate','high','critical') NOT NULL DEFAULT 'high',
  `message` text,
  `status` enum('active','resolved','cancelled') NOT NULL DEFAULT 'active',
  `resolvedAt` timestamp NULL,
  `resolvedBy` int,
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 26. ALERT RECIPIENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `alert_recipients` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alertEventId` int NOT NULL,
  `userId` int NOT NULL,
  `deliveredAt` timestamp NULL,
  `acknowledgedAt` timestamp NULL,
  `response` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 27. ALERT STATUS UPDATES ────────────────────────────────
CREATE TABLE IF NOT EXISTS `alert_status_updates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alertEventId` int NOT NULL,
  `userId` int NOT NULL,
  `status` varchar(64) NOT NULL,
  `location` varchar(255),
  `message` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 28. FACILITY ALERT SETTINGS ─────────────────────────────
CREATE TABLE IF NOT EXISTS `facility_alert_settings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int NOT NULL UNIQUE,
  `orgId` int NOT NULL,
  `defaultAlertType` varchar(64),
  `autoNotifyAll` boolean NOT NULL DEFAULT true,
  `escalationDelayMinutes` int DEFAULT 5,
  `settings` json,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 29. PUSH SUBSCRIPTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 30. STAFF CHECKINS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `staff_checkins` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `facilityId` int,
  `userId` int NOT NULL,
  `alertEventId` int,
  `status` enum('safe','needs_help','unknown') NOT NULL DEFAULT 'unknown',
  `location` varchar(255),
  `message` text,
  `checkedInAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 31. BTAM CASES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_cases` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `caseNumber` varchar(64) NOT NULL UNIQUE,
  `status` enum('open','monitoring','closed','archived') NOT NULL DEFAULT 'open',
  `priority` enum('low','moderate','high','critical') NOT NULL DEFAULT 'moderate',
  `assignedTo` int,
  `createdBy` int NOT NULL,
  `closedAt` timestamp NULL,
  `closedBy` int,
  `closureReason` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 32. BTAM SUBJECTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_subjects` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `firstName` varchar(128),
  `lastName` varchar(128),
  `dateOfBirth` date,
  `gender` varchar(32),
  `relationship` varchar(128),
  `employmentStatus` varchar(64),
  `department` varchar(128),
  `supervisorName` varchar(255),
  `contactInfo` json,
  `photoUrl` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 33. BTAM REFERRAL INTAKE ────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_referral_intake` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `referredBy` int,
  `referralSource` varchar(128),
  `referralDate` timestamp NULL,
  `concernDescription` text,
  `behaviorObserved` json,
  `priorIncidents` boolean DEFAULT false,
  `priorIncidentDetails` text,
  `immediateRisk` boolean DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 34. BTAM WAVR ASSESSMENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_wavr_assessments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `assessedBy` int NOT NULL,
  `assessmentDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `wavrScore` int,
  `riskLevel` enum('low','moderate','high','critical'),
  `factors` json,
  `narrative` text,
  `recommendations` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 35. BTAM MANAGEMENT PLAN ────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_management_plan` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `createdBy` int NOT NULL,
  `interventionType` varchar(128),
  `objectives` json,
  `actions` json,
  `monitoringFrequency` varchar(64),
  `nextReviewDate` date,
  `status` enum('active','completed','on_hold') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 36. BTAM CASE NOTES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_case_notes` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `authorId` int NOT NULL,
  `noteType` enum('general','observation','intervention','follow_up','escalation') NOT NULL DEFAULT 'general',
  `content` text NOT NULL,
  `isConfidential` boolean NOT NULL DEFAULT false,
  `attachments` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 37. BTAM STATUS HISTORY ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `btam_status_history` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `changedBy` int NOT NULL,
  `fromStatus` varchar(32),
  `toStatus` varchar(32) NOT NULL,
  `reason` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── CLEANUP ─────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS add_col;
DROP PROCEDURE IF EXISTS modify_col;

SELECT 'Full DB sync complete.' AS result;
