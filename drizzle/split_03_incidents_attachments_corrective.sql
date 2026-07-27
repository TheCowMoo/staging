-- ============================================================
-- Split 3/5: Incident Reports + Facility Attachments + Corrective Action Checks + Audit Logs + Visitor Logs + Liability Scans + Scan Share Tokens
-- ============================================================

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

SELECT 'Split 3/5 done' AS result;