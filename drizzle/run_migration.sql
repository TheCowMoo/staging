-- ============================================================
-- SAFEGUARD SAFE MIGRATION SCRIPT
-- Run this on any server to bring the DB up to date.
-- Errors on already-existing columns are safe to ignore.
-- Usage: mysql -u root -pPASSWORD safeguard < drizzle/run_migration.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---- users ----
ALTER TABLE users ADD COLUMN impersonatingUserId int DEFAULT NULL;
ALTER TABLE users ADD COLUMN rasRole enum('admin','responder','staff') DEFAULT NULL;
ALTER TABLE users ADD COLUMN btamRole enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none';
ALTER TABLE users ADD COLUMN passwordHash varchar(128) DEFAULT NULL;
ALTER TABLE users ADD COLUMN passwordSalt varchar(64) DEFAULT NULL;
ALTER TABLE users ADD COLUMN emailVerified tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN emailVerifyToken varchar(128) DEFAULT NULL;
ALTER TABLE users ADD COLUMN passwordResetToken varchar(128) DEFAULT NULL;
ALTER TABLE users ADD COLUMN passwordResetExpiresAt timestamp NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN ghlContactId varchar(64) DEFAULT NULL;
ALTER TABLE users ADD COLUMN hasSeenWalkthrough tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN termsAcceptedAt timestamp NULL DEFAULT NULL;

-- ---- org_members ----
ALTER TABLE org_members ADD COLUMN orgId int NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN userId int NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN role enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user';
ALTER TABLE org_members ADD COLUMN invitedAt timestamp NOT NULL DEFAULT (now());
ALTER TABLE org_members ADD COLUMN joinedAt timestamp NULL DEFAULT NULL;
ALTER TABLE org_members ADD COLUMN canTriggerAlerts tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN canRunDrills tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN canExportReports tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN canViewIncidentLogs tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN canSubmitAnonymousReports tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN canAccessEap tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE org_members ADD COLUMN canManageSiteAssessments tinyint(1) NOT NULL DEFAULT 0;

-- ---- personnel_locations ----
ALTER TABLE personnel_locations ADD COLUMN orgId int NOT NULL DEFAULT 0;
ALTER TABLE personnel_locations ADD COLUMN userId int NOT NULL DEFAULT 0;
ALTER TABLE personnel_locations ADD COLUMN latitude float NOT NULL DEFAULT 0;
ALTER TABLE personnel_locations ADD COLUMN longitude float NOT NULL DEFAULT 0;
ALTER TABLE personnel_locations ADD COLUMN status varchar(64) NOT NULL DEFAULT 'Active';
ALTER TABLE personnel_locations ADD COLUMN updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;

-- ---- facilities ----
ALTER TABLE facilities ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN jurisdiction varchar(64) DEFAULT 'United States';
ALTER TABLE facilities ADD COLUMN operatingHours varchar(128) DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN eveningOperations tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN multiTenant tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN publicAccessWithoutScreening tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN publicEntrances int DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN staffEntrances int DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN hasAlleyways tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN hasConcealedAreas tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN usedAfterDark tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN multiSite tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN emergencyCoordinator varchar(255) DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN emergencyRoles text DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN aedOnSite tinyint(1) DEFAULT 0;
ALTER TABLE facilities ADD COLUMN aedLocations text DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN latitude float DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN longitude float DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN operationalPolicies text DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN coordinatorContacts text DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN emergencyContacts text DEFAULT NULL;
ALTER TABLE facilities ADD COLUMN notes text DEFAULT NULL;

-- ---- audits ----
ALTER TABLE audits ADD COLUMN menuSelection varchar(64) DEFAULT NULL;
ALTER TABLE audits ADD COLUMN orgId int DEFAULT NULL;

-- ---- audit_responses ----
ALTER TABLE audit_responses ADD COLUMN conditionTypes json DEFAULT NULL;
ALTER TABLE audit_responses ADD COLUMN primaryResponse varchar(64) DEFAULT NULL;
ALTER TABLE audit_responses ADD COLUMN concernLevel varchar(64) DEFAULT NULL;
ALTER TABLE audit_responses ADD COLUMN isUnavoidable tinyint(1) DEFAULT 0;
ALTER TABLE audit_responses ADD COLUMN crossFillApplied tinyint(1) DEFAULT 0;

-- ---- incident_reports ----
ALTER TABLE incident_reports ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE incident_reports ADD COLUMN trackingToken varchar(64) DEFAULT NULL;
ALTER TABLE incident_reports ADD COLUMN isAnonymous tinyint(1) DEFAULT 0;
ALTER TABLE incident_reports ADD COLUMN btamEscalated tinyint(1) DEFAULT 0;
ALTER TABLE incident_reports ADD COLUMN btamCaseId int DEFAULT NULL;

-- ---- liability_scans ----
ALTER TABLE liability_scans ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE liability_scans ADD COLUMN immediateActions json DEFAULT NULL;
ALTER TABLE liability_scans ADD COLUMN tier1Score float DEFAULT NULL;
ALTER TABLE liability_scans ADD COLUMN tier2Score float DEFAULT NULL;
ALTER TABLE liability_scans ADD COLUMN tier3Score float DEFAULT NULL;

-- ---- eap_sections ----
ALTER TABLE eap_sections ADD COLUMN auditorRecommendations json DEFAULT NULL;
ALTER TABLE eap_sections ADD COLUMN generatedContent text DEFAULT NULL;

-- ---- training_modules ----
ALTER TABLE training_modules ADD COLUMN orgId int NOT NULL DEFAULT 0;
ALTER TABLE training_modules ADD COLUMN thumbnailUrl text DEFAULT NULL;
ALTER TABLE training_modules ADD COLUMN thumbnailKey text DEFAULT NULL;

-- ---- user_invites ----
ALTER TABLE user_invites ADD COLUMN email varchar(320) NOT NULL DEFAULT '';
ALTER TABLE user_invites ADD COLUMN role enum('ultra_admin','super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user';
ALTER TABLE user_invites ADD COLUMN token varchar(64) NOT NULL DEFAULT '';
ALTER TABLE user_invites ADD COLUMN invitedByUserId int NOT NULL DEFAULT 0;
ALTER TABLE user_invites ADD COLUMN expiresAt timestamp NOT NULL DEFAULT (now());
ALTER TABLE user_invites ADD COLUMN usedAt timestamp NULL DEFAULT NULL;
ALTER TABLE user_invites ADD COLUMN createdAt timestamp NOT NULL DEFAULT (now());

-- ---- drill_sessions ----
ALTER TABLE drill_sessions ADD COLUMN orgId int DEFAULT NULL;

-- ---- alert_events ----
ALTER TABLE alert_events ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE alert_events ADD COLUMN facilityId int DEFAULT NULL;

-- ---- btam_cases ----
ALTER TABLE btam_cases ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE btam_cases ADD COLUMN facilityId int DEFAULT NULL;
ALTER TABLE btam_cases ADD COLUMN assignedUserId int DEFAULT NULL;
ALTER TABLE btam_cases ADD COLUMN status varchar(64) DEFAULT 'open';
ALTER TABLE btam_cases ADD COLUMN priority varchar(32) DEFAULT NULL;
ALTER TABLE btam_cases ADD COLUMN managementPlan json DEFAULT NULL;

-- ---- btam_subjects ----
ALTER TABLE btam_subjects ADD COLUMN caseId int DEFAULT NULL;
ALTER TABLE btam_subjects ADD COLUMN name varchar(255) DEFAULT NULL;
ALTER TABLE btam_subjects ADD COLUMN relationship varchar(128) DEFAULT NULL;

-- ---- btam_wavr_assessments ----
ALTER TABLE btam_wavr_assessments ADD COLUMN caseId int DEFAULT NULL;
ALTER TABLE btam_wavr_assessments ADD COLUMN scores json DEFAULT NULL;
ALTER TABLE btam_wavr_assessments ADD COLUMN totalScore int DEFAULT NULL;

-- ---- btam_status_history ----
ALTER TABLE btam_status_history ADD COLUMN caseId int DEFAULT NULL;
ALTER TABLE btam_status_history ADD COLUMN status varchar(64) DEFAULT NULL;
ALTER TABLE btam_status_history ADD COLUMN changedByUserId int DEFAULT NULL;
ALTER TABLE btam_status_history ADD COLUMN changedAt timestamp NOT NULL DEFAULT (now());

-- ---- visitor_logs ----
ALTER TABLE visitor_logs ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE visitor_logs ADD COLUMN facilityId int DEFAULT NULL;
ALTER TABLE visitor_logs ADD COLUMN photoUrl text DEFAULT NULL;
ALTER TABLE visitor_logs ADD COLUMN photoKey text DEFAULT NULL;
ALTER TABLE visitor_logs ADD COLUMN isFlagged tinyint(1) DEFAULT 0;

-- ---- flagged_visitors ----
ALTER TABLE flagged_visitors ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE flagged_visitors ADD COLUMN photoUrl text DEFAULT NULL;
ALTER TABLE flagged_visitors ADD COLUMN photoKey text DEFAULT NULL;

-- ---- micro_drill_assignments ----
ALTER TABLE micro_drill_assignments ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE micro_drill_assignments ADD COLUMN assignedToUserId int DEFAULT NULL;
ALTER TABLE micro_drill_assignments ADD COLUMN completedAt timestamp NULL DEFAULT NULL;

-- ---- facility_floor_maps ----
ALTER TABLE facility_floor_maps ADD COLUMN facilityId int DEFAULT NULL;
ALTER TABLE facility_floor_maps ADD COLUMN fileUrl text DEFAULT NULL;
ALTER TABLE facility_floor_maps ADD COLUMN fileKey text DEFAULT NULL;
ALTER TABLE facility_floor_maps ADD COLUMN annotations json DEFAULT NULL;

-- ---- incident_communications ----
ALTER TABLE incident_communications ADD COLUMN incidentId int DEFAULT NULL;
ALTER TABLE incident_communications ADD COLUMN senderUserId int DEFAULT NULL;
ALTER TABLE incident_communications ADD COLUMN message text DEFAULT NULL;
ALTER TABLE incident_communications ADD COLUMN isAdminMessage tinyint(1) DEFAULT 0;

-- ---- notifications ----
ALTER TABLE notifications ADD COLUMN userId int DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN orgId int DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN title varchar(255) DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN body text DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN isRead tinyint(1) DEFAULT 0;
ALTER TABLE notifications ADD COLUMN createdAt timestamp NOT NULL DEFAULT (now());

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Done. Errors on duplicate columns are safe to ignore.
-- ============================================================
