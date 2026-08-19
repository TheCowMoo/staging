-- ============================================================
-- Five Stones Safeguard — AUTHORITATIVE FULL DB SCHEMA
-- Generated from drizzle/schema.ts by scripts/dump-full-sync.ts
-- DO NOT EDIT BY HAND — re-run the generator instead.
--
-- Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS).
-- Usage: mysql -u root -p... safeguard < full_sync.sql
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `alert_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `facilityId` int NOT NULL,
  `alertType` enum('lockdown','lockout','fire','weather') NOT NULL,
  `alertStatus` enum('active','response_in_progress','resolved') NOT NULL DEFAULT 'active',
  `messageTitle` varchar(255) NOT NULL,
  `messageBody` text NOT NULL,
  `roleInstructions` json NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolvedAt` timestamp NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alert_recipients` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alertEventId` int NOT NULL,
  `userId` int NOT NULL,
  `rasRoleAtTime` enum('admin','responder','staff') NOT NULL,
  `deliveryStatus` enum('pending','delivered','failed') NOT NULL DEFAULT 'pending',
  `deliveredAt` timestamp NULL,
  `acknowledgedAt` timestamp NULL,
  `responseStatus` enum('acknowledged','responding') NULL,
  `responseUpdatedAt` timestamp NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alert_status_updates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `alertEventId` int NOT NULL,
  `statusType` enum('active','response_in_progress','resolved') NOT NULL,
  `shortMessage` varchar(120) NULL,
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `orgId` int NULL,
  `label` varchar(255) NULL,
  `keyHash` varchar(128) NOT NULL,
  `permissions` json NULL,
  `lastUsedAt` timestamp NULL,
  `revokedAt` timestamp NULL,
  `expiresAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NULL,
  `userName` varchar(255) NULL,
  `orgId` int NULL,
  `action` enum('create','update','delete','login','logout','invite_sent','invite_accepted','member_removed','role_changed','audit_completed','audit_reopened','incident_submitted','incident_reviewed','report_shared','escalate') NOT NULL,
  `entityType` varchar(64) NOT NULL,
  `entityId` varchar(64) NULL,
  `description` text NULL,
  `metadata` json NULL,
  `ipAddress` varchar(64) NULL,
  `userAgent` varchar(512) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_photos` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `auditResponseId` int NULL,
  `url` text NOT NULL,
  `fileKey` text NOT NULL,
  `caption` varchar(255) NULL,
  `photoType` varchar(64) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_responses` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `categoryName` varchar(128) NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `questionText` text NOT NULL,
  `primaryResponse` enum('Yes','No','Unknown','Not Applicable') NULL,
  `addToEap` boolean NULL DEFAULT false,
  `concernLevel` enum('Minor','Moderate','Serious') NULL,
  `response` enum('Secure / Yes','Partial','Minor Concern','Moderate Concern','Serious Vulnerability','No — Not Present','Unlikely / Minimal','Partially Present','Yes — Present','Unknown','Not Applicable','Unavoidable','No — Not in place','Yes — Secure','No -- Not Present','Yes -- Present','Yes','No') NULL,
  `conditionType` varchar(128) NULL,
  `conditionTypes` json NULL,
  `isUnavoidable` boolean NULL DEFAULT false,
  `score` int NULL,
  `notes` text NULL,
  `recommendedActionNotes` text NULL,
  `remediationTimeline` enum('30 days','60 days','90 days','Long-Term') NULL,
  `followUpResponse` text NULL,
  `photoUrls` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audits` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `facilityId` int NOT NULL,
  `auditorId` int NOT NULL,
  `status` enum('in_progress','completed','archived') NOT NULL DEFAULT 'in_progress',
  `auditDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  `overallScore` float NULL,
  `overallRiskLevel` varchar(32) NULL,
  `categoryScores` json NULL,
  `auditorNotes` text NULL,
  `eapContacts` json NULL,
  `sectionEapNotes` json NULL,
  `eapJson` json NULL,
  `eapGeneratedAt` timestamp NULL,
  `executiveSummaryJson` json NULL,
  `executiveSummaryGeneratedAt` timestamp NULL,
  `selectedMenu` enum('a','b') NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `btam_case_notes` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `authorId` int NOT NULL,
  `noteType` enum('observation','interview','external_report','law_enforcement','legal','hr','general') NOT NULL,
  `content` text NOT NULL,
  `isPrivileged` boolean NOT NULL DEFAULT false,
  `attachments` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `btam_cases` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `caseNumber` varchar(32) NOT NULL UNIQUE,
  `status` enum('open','monitoring','resolved','escalated','referred_law_enforcement') NOT NULL DEFAULT 'open',
  `concernLevel` enum('pending','low','moderate','high','imminent') NOT NULL DEFAULT 'pending',
  `violenceType` enum('type_i_criminal','type_ii_client','type_iii_worker_on_worker','type_iv_personal_relationship') NULL,
  `createdBy` int NOT NULL,
  `assignedAssessor` int NULL,
  `linkedIncidentId` int NULL,
  `isAnonymousReporter` boolean NOT NULL DEFAULT false,
  `confidentialityFlag` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `btam_management_plan` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `createdBy` int NOT NULL,
  `interventionType` enum('monitoring','hr_meeting','eap_referral','mandatory_counseling','credential_suspension','law_enforcement_notification','no_contact_order','termination_with_safety_protocol','hospitalization_referral','other') NOT NULL,
  `actionDescription` text NOT NULL,
  `responsibleParty` int NULL,
  `dueDate` varchar(32) NULL,
  `completed` boolean NOT NULL DEFAULT false,
  `completionNotes` text NULL,
  `nextReviewDate` varchar(32) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `btam_referral_intake` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `reporterRole` enum('hr','manager','coworker','self','anonymous') NOT NULL,
  `concernDescription` text NOT NULL,
  `dateOfConcern` varchar(32) NULL,
  `locationOfConcern` varchar(255) NULL,
  `witnessesPresent` boolean NULL DEFAULT false,
  `immediateThreathFelt` boolean NULL DEFAULT false,
  `weaponMentioned` boolean NULL DEFAULT false,
  `targetIdentified` boolean NULL DEFAULT false,
  `targetDescription` text NULL,
  `priorIncidentsKnown` boolean NULL DEFAULT false,
  `priorIncidentsDescription` text NULL,
  `supportingDocuments` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `btam_status_history` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `changedBy` int NOT NULL,
  `changedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `previousStatus` varchar(64) NULL,
  `newStatus` varchar(64) NULL,
  `previousConcernLevel` varchar(32) NULL,
  `newConcernLevel` varchar(32) NULL,
  `reason` text NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `btam_subjects` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `subjectType` enum('employee','former_employee','customer_client','contractor','visitor','unknown') NOT NULL,
  `employmentStatus` enum('active','terminated','suspended','on_leave','never_employed') NULL,
  `nameKnown` boolean NOT NULL DEFAULT false,
  `subjectAlias` text NULL,
  `subjectContact` text NULL,
  `department` varchar(255) NULL,
  `location` varchar(255) NULL,
  `supervisorName` varchar(255) NULL,
  `tenureYears` float NULL,
  `recentDisciplinaryAction` boolean NULL DEFAULT false,
  `pendingTermination` boolean NULL DEFAULT false,
  `grievanceFiled` boolean NULL DEFAULT false,
  `domesticSituationKnown` boolean NULL DEFAULT false,
  `accessCredentialsActive` boolean NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `btam_wavr_assessments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `caseId` int NOT NULL,
  `assessorId` int NOT NULL,
  `assessedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `grievanceFixation` int NULL DEFAULT 0,
  `grievanceFixationChange` boolean NULL DEFAULT false,
  `grievanceWithTarget` int NULL DEFAULT 0,
  `grievanceWithTargetChange` boolean NULL DEFAULT false,
  `desperationHopelessness` int NULL DEFAULT 0,
  `desperationHopelessnessChange` boolean NULL DEFAULT false,
  `mentalHealthConcern` int NULL DEFAULT 0,
  `mentalHealthConcernChange` boolean NULL DEFAULT false,
  `paranoidThinking` int NULL DEFAULT 0,
  `paranoidThinkingChange` boolean NULL DEFAULT false,
  `depressionWithdrawal` int NULL DEFAULT 0,
  `depressionWithdrawalChange` boolean NULL DEFAULT false,
  `narcissisticInjury` int NULL DEFAULT 0,
  `narcissisticInjuryChange` boolean NULL DEFAULT false,
  `concerningCommunications` int NULL DEFAULT 0,
  `concerningCommunicationsChange` boolean NULL DEFAULT false,
  `weaponsInterest` int NULL DEFAULT 0,
  `weaponsInterestChange` boolean NULL DEFAULT false,
  `pathwayBehaviors` int NULL DEFAULT 0,
  `pathwayBehaviorsChange` boolean NULL DEFAULT false,
  `leakage` int NULL DEFAULT 0,
  `leakageChange` boolean NULL DEFAULT false,
  `priorViolenceHistory` int NULL DEFAULT 0,
  `priorViolenceHistoryChange` boolean NULL DEFAULT false,
  `priorMentalHealthCrisis` int NULL DEFAULT 0,
  `priorMentalHealthCrisisChange` boolean NULL DEFAULT false,
  `domesticViolenceHistory` int NULL DEFAULT 0,
  `domesticViolenceHistoryChange` boolean NULL DEFAULT false,
  `recentStressor` int NULL DEFAULT 0,
  `recentStressorChange` boolean NULL DEFAULT false,
  `socialIsolation` int NULL DEFAULT 0,
  `socialIsolationChange` boolean NULL DEFAULT false,
  `personalCrisis` int NULL DEFAULT 0,
  `personalCrisisChange` boolean NULL DEFAULT false,
  `helpSeeking` int NULL DEFAULT 0,
  `helpSeekingChange` boolean NULL DEFAULT false,
  `socialSupport` int NULL DEFAULT 0,
  `socialSupportChange` boolean NULL DEFAULT false,
  `futureOrientation` int NULL DEFAULT 0,
  `futureOrientationChange` boolean NULL DEFAULT false,
  `finalActBehaviors` int NULL DEFAULT 0,
  `finalActBehaviorsChange` boolean NULL DEFAULT false,
  `surveillanceOfTarget` int NULL DEFAULT 0,
  `surveillanceOfTargetChange` boolean NULL DEFAULT false,
  `imminentCommunication` int NULL DEFAULT 0,
  `imminentCommunicationChange` boolean NULL DEFAULT false,
  `computedConcernLevel` enum('low','moderate','high','imminent') NULL,
  `totalWeightedScore` int NULL,
  `topContributingFactors` json NULL,
  `assessorNotes` text NULL,
  `assessorAttestation` boolean NOT NULL DEFAULT false
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `corrective_action_checks` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `completedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedBy` int NOT NULL,
  `notes` varchar(512) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `drill_participants` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sessionId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(100) NULL,
  `attended` boolean NOT NULL DEFAULT true,
  `observations` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `drill_sessions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `templateId` int NOT NULL,
  `facilityId` int NULL,
  `orgId` int NULL,
  `scheduledByUserId` int NOT NULL,
  `scheduledAt` timestamp NOT NULL,
  `completedAt` timestamp NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `debriefData` json NULL,
  `systemIntelligence` json NULL,
  `participantCount` int NULL,
  `facilitatorNotes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `drill_templates` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `facilityId` int NULL,
  `createdByUserId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `drillType` enum('micro','guided','operational','extended') NOT NULL,
  `durationMinutes` int NOT NULL,
  `industry` varchar(100) NULL,
  `jurisdiction` varchar(100) NULL,
  `generationMode` enum('system','user') NOT NULL DEFAULT 'system',
  `userPrompt` text NULL,
  `content` json NOT NULL,
  `regulatoryTags` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eap_section_versions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `eapSectionId` int NOT NULL,
  `auditId` int NOT NULL,
  `sectionId` varchar(64) NOT NULL,
  `contentSnapshot` text NULL,
  `savedByUserId` int NULL,
  `savedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `label` varchar(128) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `eap_sections` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `sectionId` varchar(64) NOT NULL,
  `sectionTitle` varchar(255) NOT NULL,
  `contentOverride` text NULL,
  `reviewed` boolean NOT NULL DEFAULT false,
  `applicable` boolean NOT NULL DEFAULT true,
  `auditorNotes` text NULL,
  `auditorRecommendations` json NULL,
  `lastEditedByUserId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `facilities` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `facilityType` varchar(64) NOT NULL,
  `address` text NULL,
  `city` varchar(128) NULL,
  `state` varchar(64) NULL,
  `jurisdiction` varchar(64) NULL DEFAULT 'United States',
  `squareFootage` int NULL,
  `floors` int NULL,
  `maxOccupancy` int NULL,
  `operatingHours` varchar(128) NULL,
  `eveningOperations` boolean NULL DEFAULT false,
  `multiTenant` boolean NULL DEFAULT false,
  `publicAccessWithoutScreening` boolean NULL DEFAULT false,
  `publicEntrances` int NULL,
  `staffEntrances` int NULL,
  `hasAlleyways` boolean NULL DEFAULT false,
  `hasConcealedAreas` boolean NULL DEFAULT false,
  `usedAfterDark` boolean NULL DEFAULT false,
  `multiSite` boolean NULL DEFAULT false,
  `emergencyCoordinator` varchar(255) NULL,
  `emergencyRoles` text NULL,
  `aedOnSite` boolean NULL DEFAULT false,
  `aedLocations` text NULL,
  `latitude` float NULL,
  `longitude` float NULL,
  `operationalPolicies` text NULL,
  `coordinatorContacts` text NULL,
  `emergencyContacts` text NULL,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `facility_alert_settings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facilityId` int NOT NULL UNIQUE,
  `orgId` int NULL,
  `lockdownTemplate` json NULL,
  `lockoutTemplate` json NULL,
  `pushEnabled` boolean NOT NULL DEFAULT true,
  `escalationPreferences` json NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `facility_attachments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `auditId` int NOT NULL,
  `facilityId` int NOT NULL,
  `uploadedBy` int NOT NULL,
  `url` text NOT NULL,
  `fileKey` text NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mimeType` varchar(128) NOT NULL,
  `fileSize` int NULL,
  `category` enum('floor_plan','interior_photo','exterior_photo','document','other') NOT NULL DEFAULT 'other',
  `caption` varchar(255) NULL,
  `aiAnalysis` text NULL,
  `aiAnalyzedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `facility_floor_maps` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `facility_id` int NOT NULL,
  `org_id` int NULL,
  `name` varchar(255) NOT NULL,
  `floor` varchar(100) NULL,
  `image_url` text NULL,
  `file_key` text NULL,
  `map_data` json NULL,
  `annotations` json NULL,
  `width` int NULL,
  `height` int NULL,
  `created_by_user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `flagged_visitors` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `name` varchar(255) NOT NULL,
  `reason` text NULL,
  `addedByUserId` int NOT NULL,
  `facilityId` int NULL,
  `active` boolean NOT NULL DEFAULT true,
  `flagLevel` enum('red','yellow') NOT NULL DEFAULT 'red',
  `lastEscalatedAt` timestamp NULL,
  `escalationCount` int NOT NULL DEFAULT 0,
  `photoUrl` text NULL,
  `photoFileKey` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incident_communications` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `incident_id` int NOT NULL,
  `sender_role` enum('admin','reporter') NOT NULL,
  `sender_name` varchar(255) NULL,
  `message` text NOT NULL,
  `is_from_admin` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `incident_reports` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `facilityId` int NULL,
  `facilityName` varchar(255) NULL,
  `incidentType` enum('threatening_behavior','suspicious_person','observed_safety_gap','workplace_violence','other') NOT NULL,
  `involvesInjuryOrIllness` boolean NULL DEFAULT false,
  `injuryType` enum('injury','skin_disorder','respiratory','poisoning','hearing_loss','other_illness','other_injury') NULL,
  `bodyPartAffected` varchar(128) NULL,
  `injuryDescription` text NULL,
  `medicalTreatment` enum('first_aid_only','medical_treatment','emergency_room','hospitalized') NULL,
  `daysAwayFromWork` int NULL,
  `daysOnRestriction` int NULL,
  `lossOfConsciousness` boolean NULL DEFAULT false,
  `workRelated` boolean NULL DEFAULT true,
  `oshaRecordable` boolean NULL DEFAULT false,
  `employeeName` varchar(255) NULL,
  `employeeJobTitle` varchar(128) NULL,
  `employeeDateOfBirth` varchar(16) NULL,
  `employeeDateHired` varchar(16) NULL,
  `physicianName` varchar(255) NULL,
  `treatedInER` boolean NULL DEFAULT false,
  `hospitalizedOvernight` boolean NULL DEFAULT false,
  `severity` enum('low','moderate','high','critical') NOT NULL,
  `incidentDate` timestamp NULL,
  `location` varchar(255) NULL,
  `description` text NOT NULL,
  `involvedParties` text NULL,
  `witnesses` text NULL,
  `priorIncidents` boolean NULL DEFAULT false,
  `reportedToAuthorities` boolean NULL DEFAULT false,
  `reporterRole` varchar(64) NULL,
  `contactEmail` varchar(320) NULL,
  `status` enum('new','under_review','resolved','referred') NOT NULL DEFAULT 'new',
  `referredTo` int NULL,
  `adminNotes` text NULL,
  `reviewedBy` int NULL,
  `reviewedAt` timestamp NULL,
  `trackingToken` varchar(64) NULL UNIQUE,
  `followUpRequested` boolean NULL DEFAULT false,
  `followUpMethod` enum('phone','email','in_person') NULL,
  `followUpContact` varchar(320) NULL,
  `involvedPersonName` varchar(255) NULL,
  `isRepeatIncident` boolean NULL DEFAULT false,
  `repeatGroupId` varchar(64) NULL,
  `threatFlags` text NULL,
  `maxThreatSeverity` varchar(16) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `liability_scans` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NULL,
  `orgId` int NULL,
  `facilityId` int NULL,
  `score` int NOT NULL,
  `classification` varchar(64) NOT NULL,
  `riskMapLevel` varchar(64) NOT NULL,
  `riskMapColor` varchar(16) NOT NULL,
  `riskMapDescriptor` text NULL,
  `jurisdiction` varchar(128) NOT NULL,
  `industry` varchar(128) NOT NULL,
  `organization` varchar(255) NULL,
  `employeeCount` varchar(64) NULL,
  `facilityLocation` text NULL,
  `topGaps` json NOT NULL,
  `categoryBreakdown` json NOT NULL,
  `immediateActions` json NOT NULL,
  `interpretation` text NULL,
  `advisorSummary` text NULL,
  `scorePercent` int NULL,
  `defensibilityStatus` varchar(32) NULL,
  `answers` json NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `micro_drill_assignments` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `org_id` int NULL,
  `assigned_by_user_id` int NOT NULL,
  `assigned_to_user_id` int NULL,
  `assigned_to_name` varchar(255) NULL,
  `assigned_to_email` varchar(320) NULL,
  `drill_id` int NOT NULL,
  `drill_category` varchar(255) NOT NULL,
  `drill_title` varchar(255) NOT NULL,
  `assigned_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completion_date` timestamp NULL,
  `due_date` timestamp NULL,
  `status` enum('pending','in_progress','completed','expired') NOT NULL DEFAULT 'pending',
  `step1_choice` varchar(10) NULL,
  `step2_choices` json NULL,
  `considerations_checked` json NULL,
  `completed_at` timestamp NULL,
  `completed_by_name` varchar(255) NULL,
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `org_id` int NULL,
  `type` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NULL,
  `link` varchar(512) NULL,
  `metadata` json NULL,
  `read` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `org_invites` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `inviteRole` enum('super_admin','admin','auditor','user','viewer','sandbox') NOT NULL DEFAULT 'user',
  `token` varchar(64) NOT NULL UNIQUE,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `org_members` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `userId` int NOT NULL,
  `orgRole` enum('super_admin','admin','auditor','user','viewer','sandbox') NOT NULL DEFAULT 'user',
  `invitedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `joinedAt` timestamp NULL,
  `canTriggerAlerts` boolean NOT NULL DEFAULT false,
  `canRunDrills` boolean NOT NULL DEFAULT false,
  `canExportReports` boolean NOT NULL DEFAULT false,
  `canViewIncidentLogs` boolean NOT NULL DEFAULT false,
  `canSubmitAnonymousReports` boolean NOT NULL DEFAULT false,
  `canAccessEap` boolean NOT NULL DEFAULT false,
  `canManageSiteAssessments` boolean NOT NULL DEFAULT false
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `slug` varchar(64) NOT NULL UNIQUE,
  `logoUrl` text NULL,
  `contactEmail` varchar(320) NULL,
  `createdByUserId` int NULL,
  `plan` enum('free','paid') NOT NULL DEFAULT 'free',
  `planUpdatedAt` timestamp NULL,
  `externalSubscriptionId` varchar(255) NULL,
  `websiteResourceLinks` text NULL DEFAULT ('[]'),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personnel_locations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NOT NULL,
  `userId` int NOT NULL,
  `latitude` float NOT NULL,
  `longitude` float NOT NULL,
  `status` varchar(64) NOT NULL DEFAULT 'Active',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `orgId` int NULL,
  `subscription` json NOT NULL,
  `endpoint` varchar(512) NULL,
  `userAgent` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `question_flags` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `auditId` int NOT NULL,
  `userId` int NOT NULL,
  `questionId` varchar(64) NOT NULL,
  `questionText` text NOT NULL,
  `categoryName` varchar(128) NOT NULL,
  `flagType` enum('wrong_response_options','question_unclear','not_applicable_to_facility','scoring_seems_wrong','missing_context','other') NOT NULL,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `scan_share_tokens` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `scanId` int NOT NULL,
  `token` varchar(128) NOT NULL UNIQUE,
  `createdByUserId` int NULL,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp NULL,
  `label` varchar(255) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_checkins` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `facilityId` int NULL,
  `staffName` varchar(255) NOT NULL,
  `status` enum('reunification','injured','off_site','cannot_disclose') NOT NULL,
  `location` text NULL,
  `recordedByUserId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tester_feedback` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `auditId` int NOT NULL,
  `facilityId` int NOT NULL,
  `userId` int NOT NULL,
  `facilityType` varchar(64) NULL,
  `completionTimeMinutes` int NULL,
  `overallReportQuality` int NULL,
  `scoringAccuracy` int NULL,
  `correctiveActionRealism` int NULL,
  `eapCompleteness` int NULL,
  `questionRelevance` int NULL,
  `missingQuestions` text NULL,
  `irrelevantQuestions` text NULL,
  `correctiveActionIssues` text NULL,
  `scoringDisagreements` text NULL,
  `eapFeedback` text NULL,
  `generalNotes` text NULL,
  `wouldUseForClient` boolean NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `description` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `training_modules` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `createdByUserId` int NOT NULL,
  `courseTitle` varchar(255) NOT NULL,
  `launchPath` text NOT NULL,
  `thumbnailUrl` text NULL,
  `playerType` enum('Articulate_Storyline_Web','external_link') NOT NULL DEFAULT 'Articulate_Storyline_Web',
  `trackingType` enum('None') NOT NULL DEFAULT 'None',
  `storagePrefix` varchar(512) NOT NULL,
  `sourceFileName` varchar(255) NULL,
  `metaJson` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_invites` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(320) NOT NULL,
  `inviteRole` enum('ultra_admin','super_admin','admin','auditor','user','viewer','sandbox') NOT NULL DEFAULT 'user',
  `token` varchar(64) NOT NULL UNIQUE,
  `invitedByUserId` int NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(64) NOT NULL UNIQUE,
  `name` text NULL,
  `email` varchar(320) NULL,
  `loginMethod` varchar(64) NULL,
  `role` enum('ultra_admin','admin','super_admin','auditor','viewer','user','sandbox') NOT NULL DEFAULT 'user',
  `impersonatingUserId` int NULL,
  `rasRole` enum('admin','responder','staff') NULL,
  `btamRole` enum('none','tat_admin','assessor','reporter','read_only') NULL DEFAULT 'none',
  `passwordHash` varchar(128) NULL,
  `passwordSalt` varchar(64) NULL,
  `emailVerified` boolean NOT NULL DEFAULT false,
  `emailVerifyToken` varchar(128) NULL,
  `passwordResetToken` varchar(128) NULL,
  `passwordResetExpiresAt` timestamp NULL,
  `ghlContactId` varchar(64) NULL,
  `hasSeenWalkthrough` boolean NOT NULL DEFAULT false,
  `termsAcceptedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `visitor_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `facilityId` int NULL,
  `loggedByUserId` int NOT NULL,
  `visitorName` varchar(255) NOT NULL,
  `company` varchar(255) NULL,
  `purposeOfVisit` varchar(512) NOT NULL,
  `hostName` varchar(255) NULL,
  `timeIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `timeOut` timestamp NULL,
  `idVerified` boolean NOT NULL DEFAULT false,
  `idType` varchar(64) NULL,
  `idNotes` text NULL,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Full DB sync complete.' AS result;
