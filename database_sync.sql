-- Database Schema Sync
-- Generated from Drizzle schema
-- Total: 540 columns across 37 tables
-- Run: mysql -u root -pMarketingcow1! safeguard < database_sync.sql


-- ALERT_EVENTS (12 columns)
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS alertType ENUM('lockdown', 'lockout');
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS status ENUM('active', 'response_in_progress', 'resolved');
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS messageTitle VARCHAR(255);
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS messageBody LONGTEXT;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS roleInstructions JSON;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS createdByUserId INT;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS resolvedAt TIMESTAMP NULL;

-- ALERT_RECIPIENTS (9 columns)
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS alertEventId INT;
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS rasRoleAtTime ENUM('admin', 'responder', 'staff');
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS deliveryStatus ENUM('pending', 'delivered', 'failed');
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS deliveredAt TIMESTAMP NULL;
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS acknowledgedAt TIMESTAMP NULL;
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS responseStatus ENUM('acknowledged', 'responding');
ALTER TABLE alert_recipients ADD COLUMN IF NOT EXISTS responseUpdatedAt TIMESTAMP NULL;

-- ALERT_STATUS_UPDATES (6 columns)
ALTER TABLE alert_status_updates ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE alert_status_updates ADD COLUMN IF NOT EXISTS alertEventId INT;
ALTER TABLE alert_status_updates ADD COLUMN IF NOT EXISTS statusType ENUM('active', 'response_in_progress', 'resolved');
ALTER TABLE alert_status_updates ADD COLUMN IF NOT EXISTS shortMessage VARCHAR(255);
ALTER TABLE alert_status_updates ADD COLUMN IF NOT EXISTS createdByUserId INT;
ALTER TABLE alert_status_updates ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- AUDIT_LOGS (12 columns)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS userName VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entityType VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entityId VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description LONGTEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSON;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ipAddress VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS userAgent VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- AUDIT_PHOTOS (8 columns)
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS auditResponseId INT;
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS url LONGTEXT;
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS fileKey LONGTEXT;
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS caption VARCHAR(255);
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS photoType VARCHAR(255);
ALTER TABLE audit_photos ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- AUDIT_RESPONSES (20 columns)
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS categoryName VARCHAR(255);
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS questionId VARCHAR(255);
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS questionText LONGTEXT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS primaryResponse ENUM('Yes', 'No', 'Unknown', 'Not Applicable');
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS addToEap BOOLEAN;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS concernLevel ENUM('Minor', 'Moderate', 'Serious');
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS response VARCHAR(255);
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS conditionType VARCHAR(255);
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS conditionTypes JSON;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS isUnavoidable BOOLEAN;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS notes LONGTEXT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS recommendedActionNotes LONGTEXT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS remediationTimeline ENUM('30 days', '60 days', '90 days', 'Long-Term');
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS followUpResponse LONGTEXT;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS photoUrls JSON;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- AUDITS (19 columns)
ALTER TABLE audits ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS auditorId INT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS status ENUM('in_progress', 'completed', 'archived');
ALTER TABLE audits ADD COLUMN IF NOT EXISTS auditDate TIMESTAMP NULL;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS completedAt TIMESTAMP NULL;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS overallScore FLOAT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS overallRiskLevel VARCHAR(255);
ALTER TABLE audits ADD COLUMN IF NOT EXISTS categoryScores JSON;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS auditorNotes LONGTEXT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS eapContacts JSON;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS sectionEapNotes JSON;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS eapJson JSON;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS eapGeneratedAt TIMESTAMP NULL;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS executiveSummaryJson JSON;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS executiveSummaryGeneratedAt TIMESTAMP NULL;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- BTAM_CASE_NOTES (8 columns)
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS caseId INT;
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS authorId INT;
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS noteType ENUM('observation', 'interview', 'external_report', 'law_enforcement', 'legal', 'hr', 'general');
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS content LONGTEXT;
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS isPrivileged BOOLEAN;
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS attachments JSON;
ALTER TABLE btam_case_notes ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- BTAM_CASES (13 columns)
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS caseNumber VARCHAR(255);
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS status ENUM('open', 'monitoring', 'resolved', 'escalated', 'referred_law_enforcement');
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS concernLevel ENUM('pending', 'low', 'moderate', 'high', 'imminent');
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS violenceType ENUM('type_i_criminal', 'type_ii_client', 'type_iii_worker_on_worker', 'type_iv_personal_relationship');
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS createdBy INT;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS assignedAssessor INT;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS linkedIncidentId INT;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS isAnonymousReporter BOOLEAN;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS confidentialityFlag BOOLEAN;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE btam_cases ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- BTAM_MANAGEMENT_PLAN (12 columns)
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS caseId INT;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS createdBy INT;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS interventionType VARCHAR(255);
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS actionDescription LONGTEXT;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS responsibleParty INT;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS dueDate VARCHAR(255);
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS completed BOOLEAN;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS completionNotes LONGTEXT;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS nextReviewDate VARCHAR(255);
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE btam_management_plan ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- BTAM_REFERRAL_INTAKE (15 columns)
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS caseId INT;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS reporterRole ENUM('hr', 'manager', 'coworker', 'self', 'anonymous');
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS concernDescription LONGTEXT;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS dateOfConcern VARCHAR(255);
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS locationOfConcern VARCHAR(255);
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS witnessesPresent BOOLEAN;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS immediateThreathFelt BOOLEAN;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS weaponMentioned BOOLEAN;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS targetIdentified BOOLEAN;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS targetDescription LONGTEXT;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS priorIncidentsKnown BOOLEAN;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS priorIncidentsDescription LONGTEXT;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS supportingDocuments JSON;
ALTER TABLE btam_referral_intake ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- BTAM_STATUS_HISTORY (9 columns)
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS caseId INT;
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS changedBy INT;
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS changedAt TIMESTAMP NULL;
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS previousStatus VARCHAR(255);
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS newStatus VARCHAR(255);
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS previousConcernLevel VARCHAR(255);
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS newConcernLevel VARCHAR(255);
ALTER TABLE btam_status_history ADD COLUMN IF NOT EXISTS reason LONGTEXT;

-- BTAM_SUBJECTS (18 columns)
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS caseId INT;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS subjectType ENUM('employee', 'former_employee', 'customer_client', 'contractor', 'visitor', 'unknown');
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS employmentStatus ENUM('active', 'terminated', 'suspended', 'on_leave', 'never_employed');
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS nameKnown BOOLEAN;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS subjectAlias LONGTEXT;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS subjectContact LONGTEXT;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS supervisorName VARCHAR(255);
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS tenureYears FLOAT;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS recentDisciplinaryAction BOOLEAN;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS pendingTermination BOOLEAN;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS grievanceFiled BOOLEAN;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS domesticSituationKnown BOOLEAN;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS accessCredentialsActive BOOLEAN;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE btam_subjects ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- BTAM_WAVR_ASSESSMENTS (55 columns)
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS caseId INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS assessorId INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS assessedAt TIMESTAMP NULL;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS grievanceFixation INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS grievanceFixationChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS grievanceWithTarget INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS grievanceWithTargetChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS desperationHopelessness INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS desperationHopelessnessChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS mentalHealthConcern INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS mentalHealthConcernChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS paranoidThinking INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS paranoidThinkingChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS depressionWithdrawal INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS depressionWithdrawalChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS narcissisticInjury INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS narcissisticInjuryChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS concerningCommunications INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS concerningCommunicationsChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS weaponsInterest INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS weaponsInterestChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS pathwayBehaviors INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS pathwayBehaviorsChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS leakage INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS leakageChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS priorViolenceHistory INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS priorViolenceHistoryChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS priorMentalHealthCrisis INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS priorMentalHealthCrisisChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS domesticViolenceHistory INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS domesticViolenceHistoryChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS recentStressor INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS recentStressorChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS socialIsolation INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS socialIsolationChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS personalCrisis INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS personalCrisisChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS helpSeeking INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS helpSeekingChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS socialSupport INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS socialSupportChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS futureOrientation INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS futureOrientationChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS finalActBehaviors INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS finalActBehaviorsChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS surveillanceOfTarget INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS surveillanceOfTargetChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS imminentCommunication INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS imminentCommunicationChange BOOLEAN;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS computedConcernLevel ENUM('low', 'moderate', 'high', 'imminent');
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS totalWeightedScore INT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS topContributingFactors JSON;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS assessorNotes LONGTEXT;
ALTER TABLE btam_wavr_assessments ADD COLUMN IF NOT EXISTS assessorAttestation BOOLEAN;

-- CORRECTIVE_ACTION_CHECKS (6 columns)
ALTER TABLE corrective_action_checks ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE corrective_action_checks ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE corrective_action_checks ADD COLUMN IF NOT EXISTS questionId VARCHAR(255);
ALTER TABLE corrective_action_checks ADD COLUMN IF NOT EXISTS completedAt TIMESTAMP NULL;
ALTER TABLE corrective_action_checks ADD COLUMN IF NOT EXISTS completedBy INT;
ALTER TABLE corrective_action_checks ADD COLUMN IF NOT EXISTS notes VARCHAR(255);

-- DRILL_PARTICIPANTS (7 columns)
ALTER TABLE drill_participants ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE drill_participants ADD COLUMN IF NOT EXISTS sessionId INT;
ALTER TABLE drill_participants ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE drill_participants ADD COLUMN IF NOT EXISTS role VARCHAR(255);
ALTER TABLE drill_participants ADD COLUMN IF NOT EXISTS attended BOOLEAN;
ALTER TABLE drill_participants ADD COLUMN IF NOT EXISTS observations LONGTEXT;
ALTER TABLE drill_participants ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- DRILL_SESSIONS (14 columns)
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS templateId INT;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS scheduledByUserId INT;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS scheduledAt TIMESTAMP NULL;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS completedAt TIMESTAMP NULL;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS status ENUM('scheduled', 'in_progress', 'completed', 'cancelled');
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS debriefData JSON;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS systemIntelligence JSON;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS participantCount INT;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS facilitatorNotes LONGTEXT;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE drill_sessions ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- DRILL_TEMPLATES (15 columns)
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS createdByUserId INT;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS drillType ENUM('micro', 'guided', 'operational', 'extended');
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS durationMinutes INT;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS industry VARCHAR(255);
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(255);
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS generationMode ENUM('system', 'user');
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS userPrompt LONGTEXT;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS content JSON;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS regulatoryTags JSON;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE drill_templates ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- EAP_SECTION_VERSIONS (8 columns)
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS eapSectionId INT;
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS sectionId VARCHAR(255);
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS contentSnapshot LONGTEXT;
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS savedByUserId INT;
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS savedAt TIMESTAMP NULL;
ALTER TABLE eap_section_versions ADD COLUMN IF NOT EXISTS label VARCHAR(255);

-- EAP_SECTIONS (12 columns)
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS sectionId VARCHAR(255);
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS sectionTitle VARCHAR(255);
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS contentOverride LONGTEXT;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS reviewed BOOLEAN;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS applicable BOOLEAN;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS auditorNotes LONGTEXT;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS auditorRecommendations JSON;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS lastEditedByUserId INT;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE eap_sections ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- FACILITIES (29 columns)
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS facilityType VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS address LONGTEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS state VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS squareFootage INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS floors INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS maxOccupancy INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS operatingHours VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS eveningOperations BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS multiTenant BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS publicAccessWithoutScreening BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS publicEntrances INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS staffEntrances INT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS hasAlleyways BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS hasConcealedAreas BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS usedAfterDark BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS multiSite BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS emergencyCoordinator VARCHAR(255);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS emergencyRoles LONGTEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS aedOnSite BOOLEAN;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS aedLocations LONGTEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS notes LONGTEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- FACILITY_ALERT_SETTINGS (8 columns)
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS lockdownTemplate JSON;
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS lockoutTemplate JSON;
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS pushEnabled BOOLEAN;
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS escalationPreferences JSON;
ALTER TABLE facility_alert_settings ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- FACILITY_ATTACHMENTS (14 columns)
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS uploadedBy INT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS url LONGTEXT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS fileKey LONGTEXT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS mimeType VARCHAR(255);
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS fileSize INT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS category VARCHAR(255);
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS caption VARCHAR(255);
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS aiAnalysis LONGTEXT;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS aiAnalyzedAt TIMESTAMP NULL;
ALTER TABLE facility_attachments ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- FLAGGED_VISITORS (11 columns)
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS reason LONGTEXT;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS addedByUserId INT;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS active BOOLEAN;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS flagLevel ENUM('red', 'yellow');
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS lastEscalatedAt TIMESTAMP NULL;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS escalationCount INT;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS photoUrl LONGTEXT;
ALTER TABLE flagged_visitors ADD COLUMN IF NOT EXISTS photoFileKey LONGTEXT;

-- INCIDENT_REPORTS (47 columns)
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS facilityName VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS incidentType VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS involvesInjuryOrIllness BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS injuryType ENUM('injury', 'skin_disorder', 'respiratory', 'poisoning', 'hearing_loss', 'other_illness', 'other_injury');
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS bodyPartAffected VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS injuryDescription LONGTEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS medicalTreatment ENUM('first_aid_only', 'medical_treatment', 'emergency_room', 'hospitalized');
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS daysAwayFromWork INT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS daysOnRestriction INT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS lossOfConsciousness BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS workRelated BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS oshaRecordable BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS employeeName VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS employeeJobTitle VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS employeeDateOfBirth VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS employeeDateHired VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS physicianName VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS treatedInER BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS hospitalizedOvernight BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS severity ENUM('low', 'moderate', 'high', 'critical');
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS incidentDate TIMESTAMP NULL;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS description LONGTEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS involvedParties LONGTEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS witnesses LONGTEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS priorIncidents BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS reportedToAuthorities BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS reporterRole VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS contactEmail VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS status ENUM('new', 'under_review', 'resolved', 'referred');
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS adminNotes LONGTEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS reviewedBy INT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS reviewedAt TIMESTAMP NULL;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS trackingToken VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS followUpRequested BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS followUpMethod ENUM('phone', 'email', 'in_person');
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS followUpContact VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS involvedPersonName VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS isRepeatIncident BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS repeatGroupId VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS threatFlags LONGTEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS maxThreatSeverity VARCHAR(255);
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- LIABILITY_SCANS (20 columns)
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS classification VARCHAR(255);
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS riskMapLevel VARCHAR(255);
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS riskMapColor VARCHAR(255);
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS riskMapDescriptor LONGTEXT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(255);
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS industry VARCHAR(255);
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS topGaps JSON;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS categoryBreakdown JSON;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS immediateActions JSON;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS interpretation LONGTEXT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS advisorSummary LONGTEXT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS scorePercent INT;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS defensibilityStatus VARCHAR(255);
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS answers JSON;
ALTER TABLE liability_scans ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- ORG_INVITES (8 columns)
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS role ENUM('super_admin', 'admin', 'auditor', 'user', 'viewer');
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS token VARCHAR(255);
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS expiresAt TIMESTAMP NULL;
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS usedAt TIMESTAMP NULL;
ALTER TABLE org_invites ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- ORG_MEMBERS (13 columns)
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS role ENUM('super_admin', 'admin', 'auditor', 'user', 'viewer');
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS invitedAt TIMESTAMP NULL;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS joinedAt TIMESTAMP NULL;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS canTriggerAlerts BOOLEAN;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS canRunDrills BOOLEAN;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS canExportReports BOOLEAN;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS canViewIncidentLogs BOOLEAN;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS canSubmitAnonymousReports BOOLEAN;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS canAccessEap BOOLEAN;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS canManageSiteAssessments BOOLEAN;

-- ORGANIZATIONS (11 columns)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logoUrl LONGTEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contactEmail VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS createdByUserId INT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan ENUM('free', 'paid');
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS planUpdatedAt TIMESTAMP NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS externalSubscriptionId VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- PUSH_SUBSCRIPTIONS (8 columns)
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS subscription JSON;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255);
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS userAgent LONGTEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;

-- QUESTION_FLAGS (9 columns)
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS questionId VARCHAR(255);
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS questionText LONGTEXT;
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS categoryName VARCHAR(255);
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS flagType VARCHAR(255);
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS notes LONGTEXT;
ALTER TABLE question_flags ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- SCAN_SHARE_TOKENS (8 columns)
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS scanId INT;
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS token VARCHAR(255);
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS createdByUserId INT;
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS expiresAt TIMESTAMP NULL;
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS revokedAt TIMESTAMP NULL;
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS label VARCHAR(255);
ALTER TABLE scan_share_tokens ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- STAFF_CHECKINS (8 columns)
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS orgId INT;
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS staffName VARCHAR(255);
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS status ENUM('reunification', 'injured', 'off_site', 'cannot_disclose');
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS location LONGTEXT;
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS recordedByUserId INT;
ALTER TABLE staff_checkins ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- TESTER_FEEDBACK (19 columns)
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS userId INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS facilityType VARCHAR(255);
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS completionTimeMinutes INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS overallReportQuality INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS scoringAccuracy INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS correctiveActionRealism INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS eapCompleteness INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS questionRelevance INT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS missingQuestions LONGTEXT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS irrelevantQuestions LONGTEXT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS correctiveActionIssues LONGTEXT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS scoringDisagreements LONGTEXT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS eapFeedback LONGTEXT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS generalNotes LONGTEXT;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS wouldUseForClient BOOLEAN;
ALTER TABLE tester_feedback ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- THREAT_FINDINGS (14 columns)
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS auditId INT;
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS findingName VARCHAR(255);
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS category VARCHAR(255);
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS likelihood VARCHAR(255);
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS impact VARCHAR(255);
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS preparedness VARCHAR(255);
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS baseScore INT;
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS modifier INT;
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS finalScore INT;
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS severityLevel VARCHAR(255);
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS priority VARCHAR(255);
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS description LONGTEXT;
ALTER TABLE threat_findings ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;

-- USERS (20 columns)
ALTER TABLE users ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS openId VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name LONGTEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS loginMethod VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('ultra_admin', 'admin', 'super_admin', 'auditor', 'viewer', 'user');
ALTER TABLE users ADD COLUMN IF NOT EXISTS impersonatingUserId INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rasRole ENUM('admin', 'responder', 'staff');
ALTER TABLE users ADD COLUMN IF NOT EXISTS btamRole ENUM('none', 'tat_admin', 'assessor', 'reporter', 'read_only');
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordSalt VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerified BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerifyToken VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordResetToken VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordResetExpiresAt TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ghlContactId VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hasSeenWalkthrough BOOLEAN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastSignedIn TIMESTAMP NULL;

-- VISITOR_LOGS (15 columns)
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS id INT;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS facilityId INT;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS loggedByUserId INT;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS visitorName VARCHAR(255);
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS company VARCHAR(255);
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS purposeOfVisit VARCHAR(255);
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS hostName VARCHAR(255);
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS timeIn TIMESTAMP NULL;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS timeOut TIMESTAMP NULL;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS idVerified BOOLEAN;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS idType VARCHAR(255);
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS idNotes LONGTEXT;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS notes LONGTEXT;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP NULL;
ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP NULL;
