-- ============================================================
-- Split 4/5: Liability Scans + Scan Share Tokens + EAP Sections + EAP Versions + Flagged Visitors + Drill Templates + Drill Sessions + Drill Participants
-- ============================================================

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

SELECT 'Split 4/5 done' AS result;