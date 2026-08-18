-- ============================================================
-- Split 4/5: Liability Scans + Scan Share Tokens + EAP Sections + EAP Versions + Flagged Visitors + Drill Templates + Drill Sessions + Drill Participants
-- ============================================================

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
  `orgId` int,
  `name` varchar(255) NOT NULL,
  `reason` text,
  `addedByUserId` int NOT NULL,
  `facilityId` int,
  `active` boolean NOT NULL DEFAULT true,
  `flagLevel` enum('red','yellow') NOT NULL DEFAULT 'red',
  `lastEscalatedAt` timestamp NULL,
  `escalationCount` int NOT NULL DEFAULT 0,
  `photoUrl` text,
  `photoFileKey` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

-- ─── 24. DRILL PARTICIPANTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `drill_participants` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sessionId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(100),
  `attended` boolean NOT NULL DEFAULT true,
  `observations` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Split 4/5 done' AS result;