-- ============================================================
-- Split 2/5: Org Members + Org Invites + Facilities + Audits + Responses + Threats + Photos + Feedback + Questions + Incidents
-- ============================================================

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

SELECT 'Split 2/5 done' AS result;