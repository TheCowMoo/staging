-- ============================================================
-- Split 5/5: Alerts + Push + Staff Checkins + BTAM + Cleanup
-- ============================================================

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

SELECT 'Split 5/5 done - Full sync complete!' AS result;