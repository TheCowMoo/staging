-- ============================================================
-- SAFEGUARD SAFE MIGRATION SCRIPT v3
-- Each column is wrapped in its own stored procedure.
-- Errors on existing columns are silently skipped.
-- Usage: mysql -u root -pPASSWORD safeguard < drizzle/run_migration.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Helper: drop and recreate the safe_add procedure
DROP PROCEDURE IF EXISTS safe_add;
DELIMITER //
CREATE PROCEDURE safe_add(IN tbl VARCHAR(64), IN col VARCHAR(64), IN def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tbl
      AND COLUMN_NAME = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- ============================================================
-- users
-- ============================================================
CALL safe_add('users','impersonatingUserId','int DEFAULT NULL');
CALL safe_add('users','rasRole',"enum('admin','responder','staff') DEFAULT NULL");
CALL safe_add('users','btamRole',"enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none'");
CALL safe_add('users','passwordHash','varchar(128) DEFAULT NULL');
CALL safe_add('users','passwordSalt','varchar(64) DEFAULT NULL');
CALL safe_add('users','emailVerified','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('users','emailVerifyToken','varchar(128) DEFAULT NULL');
CALL safe_add('users','passwordResetToken','varchar(128) DEFAULT NULL');
CALL safe_add('users','passwordResetExpiresAt','timestamp NULL DEFAULT NULL');
CALL safe_add('users','ghlContactId','varchar(64) DEFAULT NULL');
CALL safe_add('users','hasSeenWalkthrough','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('users','termsAcceptedAt','timestamp NULL DEFAULT NULL');

-- ============================================================
-- org_members
-- ============================================================
CALL safe_add('org_members','orgId','int NOT NULL DEFAULT 0');
CALL safe_add('org_members','userId','int NOT NULL DEFAULT 0');
CALL safe_add('org_members','role',"enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'");
CALL safe_add('org_members','invitedAt','timestamp NOT NULL DEFAULT (now())');
CALL safe_add('org_members','joinedAt','timestamp NULL DEFAULT NULL');
CALL safe_add('org_members','canTriggerAlerts','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('org_members','canRunDrills','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('org_members','canExportReports','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('org_members','canViewIncidentLogs','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('org_members','canSubmitAnonymousReports','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('org_members','canAccessEap','tinyint(1) NOT NULL DEFAULT 0');
CALL safe_add('org_members','canManageSiteAssessments','tinyint(1) NOT NULL DEFAULT 0');

-- ============================================================
-- personnel_locations
-- ============================================================
CALL safe_add('personnel_locations','orgId','int NOT NULL DEFAULT 0');
CALL safe_add('personnel_locations','userId','int NOT NULL DEFAULT 0');
CALL safe_add('personnel_locations','latitude','float NOT NULL DEFAULT 0');
CALL safe_add('personnel_locations','longitude','float NOT NULL DEFAULT 0');
CALL safe_add('personnel_locations','status',"varchar(64) NOT NULL DEFAULT 'Active'");
CALL safe_add('personnel_locations','updatedAt','timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP');

-- ============================================================
-- facilities
-- ============================================================
CALL safe_add('facilities','orgId','int DEFAULT NULL');
CALL safe_add('facilities','jurisdiction',"varchar(64) DEFAULT 'United States'");
CALL safe_add('facilities','operatingHours','varchar(128) DEFAULT NULL');
CALL safe_add('facilities','eveningOperations','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','multiTenant','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','publicAccessWithoutScreening','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','publicEntrances','int DEFAULT NULL');
CALL safe_add('facilities','staffEntrances','int DEFAULT NULL');
CALL safe_add('facilities','hasAlleyways','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','hasConcealedAreas','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','usedAfterDark','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','multiSite','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','emergencyCoordinator','varchar(255) DEFAULT NULL');
CALL safe_add('facilities','emergencyRoles','text DEFAULT NULL');
CALL safe_add('facilities','aedOnSite','tinyint(1) DEFAULT 0');
CALL safe_add('facilities','aedLocations','text DEFAULT NULL');
CALL safe_add('facilities','latitude','float DEFAULT NULL');
CALL safe_add('facilities','longitude','float DEFAULT NULL');
CALL safe_add('facilities','operationalPolicies','text DEFAULT NULL');
CALL safe_add('facilities','coordinatorContacts','text DEFAULT NULL');
CALL safe_add('facilities','emergencyContacts','text DEFAULT NULL');
CALL safe_add('facilities','notes','text DEFAULT NULL');

-- ============================================================
-- audits
-- ============================================================
CALL safe_add('audits','menuSelection','varchar(64) DEFAULT NULL');
CALL safe_add('audits','orgId','int DEFAULT NULL');

-- ============================================================
-- audit_responses
-- ============================================================
CALL safe_add('audit_responses','conditionTypes','json DEFAULT NULL');
CALL safe_add('audit_responses','primaryResponse','varchar(64) DEFAULT NULL');
CALL safe_add('audit_responses','concernLevel','varchar(64) DEFAULT NULL');
CALL safe_add('audit_responses','isUnavoidable','tinyint(1) DEFAULT 0');
CALL safe_add('audit_responses','crossFillApplied','tinyint(1) DEFAULT 0');

-- ============================================================
-- incident_reports
-- ============================================================
CALL safe_add('incident_reports','orgId','int DEFAULT NULL');
CALL safe_add('incident_reports','trackingToken','varchar(64) DEFAULT NULL');
CALL safe_add('incident_reports','isAnonymous','tinyint(1) DEFAULT 0');
CALL safe_add('incident_reports','btamEscalated','tinyint(1) DEFAULT 0');
CALL safe_add('incident_reports','btamCaseId','int DEFAULT NULL');

-- ============================================================
-- liability_scans
-- ============================================================
CALL safe_add('liability_scans','orgId','int DEFAULT NULL');
CALL safe_add('liability_scans','immediateActions','json DEFAULT NULL');
CALL safe_add('liability_scans','tier1Score','float DEFAULT NULL');
CALL safe_add('liability_scans','tier2Score','float DEFAULT NULL');
CALL safe_add('liability_scans','tier3Score','float DEFAULT NULL');

-- ============================================================
-- eap_sections
-- ============================================================
CALL safe_add('eap_sections','auditorRecommendations','json DEFAULT NULL');
CALL safe_add('eap_sections','generatedContent','text DEFAULT NULL');

-- ============================================================
-- training_modules
-- ============================================================
CALL safe_add('training_modules','orgId','int NOT NULL DEFAULT 0');
CALL safe_add('training_modules','thumbnailUrl','text DEFAULT NULL');
CALL safe_add('training_modules','thumbnailKey','text DEFAULT NULL');

-- ============================================================
-- user_invites
-- ============================================================
CALL safe_add('user_invites','email',"varchar(320) NOT NULL DEFAULT ''");
CALL safe_add('user_invites','role',"enum('ultra_admin','super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user'");
CALL safe_add('user_invites','token',"varchar(64) NOT NULL DEFAULT ''");
CALL safe_add('user_invites','invitedByUserId','int NOT NULL DEFAULT 0');
CALL safe_add('user_invites','expiresAt','timestamp NOT NULL DEFAULT (now())');
CALL safe_add('user_invites','usedAt','timestamp NULL DEFAULT NULL');
CALL safe_add('user_invites','createdAt','timestamp NOT NULL DEFAULT (now())');

-- ============================================================
-- drill_sessions
-- ============================================================
CALL safe_add('drill_sessions','orgId','int DEFAULT NULL');

-- ============================================================
-- alert_events
-- ============================================================
CALL safe_add('alert_events','orgId','int DEFAULT NULL');
CALL safe_add('alert_events','facilityId','int DEFAULT NULL');

-- ============================================================
-- btam_cases
-- ============================================================
CALL safe_add('btam_cases','orgId','int DEFAULT NULL');
CALL safe_add('btam_cases','facilityId','int DEFAULT NULL');
CALL safe_add('btam_cases','assignedUserId','int DEFAULT NULL');
CALL safe_add('btam_cases','status',"varchar(64) DEFAULT 'open'");
CALL safe_add('btam_cases','priority','varchar(32) DEFAULT NULL');
CALL safe_add('btam_cases','managementPlan','json DEFAULT NULL');

-- ============================================================
-- btam_subjects
-- ============================================================
CALL safe_add('btam_subjects','caseId','int DEFAULT NULL');
CALL safe_add('btam_subjects','name','varchar(255) DEFAULT NULL');
CALL safe_add('btam_subjects','relationship','varchar(128) DEFAULT NULL');

-- ============================================================
-- btam_wavr_assessments
-- ============================================================
CALL safe_add('btam_wavr_assessments','caseId','int DEFAULT NULL');
CALL safe_add('btam_wavr_assessments','scores','json DEFAULT NULL');
CALL safe_add('btam_wavr_assessments','totalScore','int DEFAULT NULL');

-- ============================================================
-- btam_status_history
-- ============================================================
CALL safe_add('btam_status_history','caseId','int DEFAULT NULL');
CALL safe_add('btam_status_history','status','varchar(64) DEFAULT NULL');
CALL safe_add('btam_status_history','changedByUserId','int DEFAULT NULL');
CALL safe_add('btam_status_history','changedAt','timestamp NOT NULL DEFAULT (now())');

-- ============================================================
-- visitor_logs
-- ============================================================
CALL safe_add('visitor_logs','orgId','int DEFAULT NULL');
CALL safe_add('visitor_logs','facilityId','int DEFAULT NULL');
CALL safe_add('visitor_logs','photoUrl','text DEFAULT NULL');
CALL safe_add('visitor_logs','photoKey','text DEFAULT NULL');
CALL safe_add('visitor_logs','isFlagged','tinyint(1) DEFAULT 0');

-- ============================================================
-- flagged_visitors
-- ============================================================
CALL safe_add('flagged_visitors','orgId','int DEFAULT NULL');
CALL safe_add('flagged_visitors','photoUrl','text DEFAULT NULL');
CALL safe_add('flagged_visitors','photoKey','text DEFAULT NULL');

-- ============================================================
-- micro_drill_assignments
-- ============================================================
CALL safe_add('micro_drill_assignments','orgId','int DEFAULT NULL');
CALL safe_add('micro_drill_assignments','assignedToUserId','int DEFAULT NULL');
CALL safe_add('micro_drill_assignments','completedAt','timestamp NULL DEFAULT NULL');

-- ============================================================
-- facility_floor_maps
-- ============================================================
CALL safe_add('facility_floor_maps','facilityId','int DEFAULT NULL');
CALL safe_add('facility_floor_maps','fileUrl','text DEFAULT NULL');
CALL safe_add('facility_floor_maps','fileKey','text DEFAULT NULL');
CALL safe_add('facility_floor_maps','annotations','json DEFAULT NULL');

-- ============================================================
-- incident_communications
-- ============================================================
CALL safe_add('incident_communications','incidentId','int DEFAULT NULL');
CALL safe_add('incident_communications','senderUserId','int DEFAULT NULL');
CALL safe_add('incident_communications','message','text DEFAULT NULL');
CALL safe_add('incident_communications','isAdminMessage','tinyint(1) DEFAULT 0');

-- ============================================================
-- notifications
-- ============================================================
CALL safe_add('notifications','userId','int DEFAULT NULL');
CALL safe_add('notifications','orgId','int DEFAULT NULL');
CALL safe_add('notifications','title','varchar(255) DEFAULT NULL');
CALL safe_add('notifications','body','text DEFAULT NULL');
CALL safe_add('notifications','isRead','tinyint(1) DEFAULT 0');
CALL safe_add('notifications','createdAt','timestamp NOT NULL DEFAULT (now())');

-- ============================================================
-- Cleanup
-- ============================================================
DROP PROCEDURE IF EXISTS safe_add;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Done. Every column was checked individually before adding.
-- ============================================================
