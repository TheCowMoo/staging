#!/usr/bin/env node

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Column definitions - table and columns to add
const columns = [
  { table: 'alert_events', columns: ['id INT', 'orgId INT', 'facilityId INT', 'alertType VARCHAR(255)', 'status VARCHAR(255)', 'messageTitle VARCHAR(255)', 'messageBody LONGTEXT', 'roleInstructions JSON', 'createdByUserId INT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'resolvedAt TIMESTAMP NULL'] },
  { table: 'alert_recipients', columns: ['id INT', 'alertEventId INT', 'userId INT', 'rasRoleAtTime VARCHAR(255)', 'deliveryStatus VARCHAR(255)', 'deliveredAt TIMESTAMP NULL', 'acknowledgedAt TIMESTAMP NULL', 'responseStatus VARCHAR(255)', 'responseUpdatedAt TIMESTAMP NULL'] },
  { table: 'alert_status_updates', columns: ['id INT', 'alertEventId INT', 'statusType VARCHAR(255)', 'shortMessage VARCHAR(255)', 'createdByUserId INT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'audit_logs', columns: ['id INT', 'userId INT', 'userName VARCHAR(255)', 'orgId INT', 'action VARCHAR(255)', 'entityType VARCHAR(255)', 'entityId VARCHAR(255)', 'description LONGTEXT', 'metadata JSON', 'ipAddress VARCHAR(255)', 'userAgent VARCHAR(255)', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'audit_photos', columns: ['id INT', 'auditId INT', 'auditResponseId INT', 'url LONGTEXT', 'fileKey LONGTEXT', 'caption VARCHAR(255)', 'photoType VARCHAR(255)', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'audit_responses', columns: ['id INT', 'auditId INT', 'categoryName VARCHAR(255)', 'questionId VARCHAR(255)', 'questionText LONGTEXT', 'primaryResponse VARCHAR(255)', 'addToEap BOOLEAN', 'concernLevel VARCHAR(255)', 'response VARCHAR(255)', 'conditionType VARCHAR(255)', 'conditionTypes JSON', 'isUnavoidable BOOLEAN', 'score INT', 'notes LONGTEXT', 'recommendedActionNotes LONGTEXT', 'remediationTimeline VARCHAR(255)', 'followUpResponse LONGTEXT', 'photoUrls JSON', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'audits', columns: ['id INT', 'orgId INT', 'facilityId INT', 'auditorId INT', 'status VARCHAR(255)', 'auditDate TIMESTAMP NULL', 'completedAt TIMESTAMP NULL', 'overallScore FLOAT', 'overallRiskLevel VARCHAR(255)', 'categoryScores JSON', 'auditorNotes LONGTEXT', 'eapContacts JSON', 'sectionEapNotes JSON', 'eapJson JSON', 'eapGeneratedAt TIMESTAMP NULL', 'executiveSummaryJson JSON', 'executiveSummaryGeneratedAt TIMESTAMP NULL', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'btam_case_notes', columns: ['id INT', 'caseId INT', 'authorId INT', 'noteType VARCHAR(255)', 'content LONGTEXT', 'isPrivileged BOOLEAN', 'attachments JSON', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'btam_cases', columns: ['id INT', 'orgId INT', 'caseNumber VARCHAR(255)', 'status VARCHAR(255)', 'concernLevel VARCHAR(255)', 'violenceType VARCHAR(255)', 'createdBy INT', 'assignedAssessor INT', 'linkedIncidentId INT', 'isAnonymousReporter BOOLEAN', 'confidentialityFlag BOOLEAN', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'btam_management_plan', columns: ['id INT', 'caseId INT', 'createdBy INT', 'interventionType VARCHAR(255)', 'actionDescription LONGTEXT', 'responsibleParty INT', 'dueDate VARCHAR(255)', 'completed BOOLEAN', 'completionNotes LONGTEXT', 'nextReviewDate VARCHAR(255)', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'btam_referral_intake', columns: ['id INT', 'caseId INT', 'reporterRole VARCHAR(255)', 'concernDescription LONGTEXT', 'dateOfConcern VARCHAR(255)', 'locationOfConcern VARCHAR(255)', 'witnessesPresent BOOLEAN', 'immediateThreathFelt BOOLEAN', 'weaponMentioned BOOLEAN', 'targetIdentified BOOLEAN', 'targetDescription LONGTEXT', 'priorIncidentsKnown BOOLEAN', 'priorIncidentsDescription LONGTEXT', 'supportingDocuments JSON', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'btam_status_history', columns: ['id INT', 'caseId INT', 'changedBy INT', 'changedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'previousStatus VARCHAR(255)', 'newStatus VARCHAR(255)', 'previousConcernLevel VARCHAR(255)', 'newConcernLevel VARCHAR(255)', 'reason LONGTEXT'] },
  { table: 'btam_subjects', columns: ['id INT', 'caseId INT', 'subjectType VARCHAR(255)', 'employmentStatus VARCHAR(255)', 'nameKnown BOOLEAN', 'subjectAlias LONGTEXT', 'subjectContact LONGTEXT', 'department VARCHAR(255)', 'location VARCHAR(255)', 'supervisorName VARCHAR(255)', 'tenureYears FLOAT', 'recentDisciplinaryAction BOOLEAN', 'pendingTermination BOOLEAN', 'grievanceFiled BOOLEAN', 'domesticSituationKnown BOOLEAN', 'accessCredentialsActive BOOLEAN', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'btam_wavr_assessments', columns: ['id INT', 'caseId INT', 'assessorId INT', 'assessedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'grievanceFixation INT', 'grievanceFixationChange BOOLEAN', 'grievanceWithTarget INT', 'grievanceWithTargetChange BOOLEAN', 'desperationHopelessness INT', 'desperationHopelessnessChange BOOLEAN', 'mentalHealthConcern INT', 'mentalHealthConcernChange BOOLEAN', 'paranoidThinking INT', 'paranoidThinkingChange BOOLEAN', 'depressionWithdrawal INT', 'depressionWithdrawalChange BOOLEAN', 'narcissisticInjury INT', 'narcissisticInjuryChange BOOLEAN', 'concerningCommunications INT', 'concerningCommunicationsChange BOOLEAN', 'weaponsInterest INT', 'weaponsInterestChange BOOLEAN', 'pathwayBehaviors INT', 'pathwayBehaviorsChange BOOLEAN', 'leakage INT', 'leakageChange BOOLEAN', 'priorViolenceHistory INT', 'priorViolenceHistoryChange BOOLEAN', 'priorMentalHealthCrisis INT', 'priorMentalHealthCrisisChange BOOLEAN', 'domesticViolenceHistory INT', 'domesticViolenceHistoryChange BOOLEAN', 'recentStressor INT', 'recentStressorChange BOOLEAN', 'socialIsolation INT', 'socialIsolationChange BOOLEAN', 'personalCrisis INT', 'personalCrisisChange BOOLEAN', 'helpSeeking INT', 'helpSeekingChange BOOLEAN', 'socialSupport INT', 'socialSupportChange BOOLEAN', 'futureOrientation INT', 'futureOrientationChange BOOLEAN', 'finalActBehaviors INT', 'finalActBehaviorsChange BOOLEAN', 'surveillanceOfTarget INT', 'surveillanceOfTargetChange BOOLEAN', 'imminentCommunication INT', 'imminentCommunicationChange BOOLEAN', 'computedConcernLevel VARCHAR(255)', 'totalWeightedScore INT', 'topContributingFactors JSON', 'assessorNotes LONGTEXT', 'assessorAttestation BOOLEAN'] },
  { table: 'corrective_action_checks', columns: ['id INT', 'auditId INT', 'questionId VARCHAR(255)', 'completedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'completedBy INT', 'notes VARCHAR(512)'] },
  { table: 'drill_participants', columns: ['id INT', 'sessionId INT', 'name VARCHAR(255)', 'role VARCHAR(255)', 'attended BOOLEAN', 'observations LONGTEXT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'drill_sessions', columns: ['id INT', 'templateId INT', 'facilityId INT', 'orgId INT', 'scheduledByUserId INT', 'scheduledAt TIMESTAMP NULL', 'completedAt TIMESTAMP NULL', 'status VARCHAR(255)', 'debriefData JSON', 'systemIntelligence JSON', 'participantCount INT', 'facilitatorNotes LONGTEXT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'drill_templates', columns: ['id INT', 'orgId INT', 'facilityId INT', 'createdByUserId INT', 'title VARCHAR(255)', 'drillType VARCHAR(255)', 'durationMinutes INT', 'industry VARCHAR(255)', 'jurisdiction VARCHAR(255)', 'generationMode VARCHAR(255)', 'userPrompt LONGTEXT', 'content JSON', 'regulatoryTags JSON', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'eap_section_versions', columns: ['id INT', 'eapSectionId INT', 'auditId INT', 'sectionId VARCHAR(255)', 'contentSnapshot LONGTEXT', 'savedByUserId INT', 'savedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'label VARCHAR(255)'] },
  { table: 'eap_sections', columns: ['id INT', 'auditId INT', 'sectionId VARCHAR(255)', 'sectionTitle VARCHAR(255)', 'contentOverride LONGTEXT', 'reviewed BOOLEAN', 'applicable BOOLEAN', 'auditorNotes LONGTEXT', 'auditorRecommendations JSON', 'lastEditedByUserId INT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'facilities', columns: ['id INT', 'orgId INT', 'userId INT', 'name VARCHAR(255)', 'facilityType VARCHAR(255)', 'address LONGTEXT', 'city VARCHAR(255)', 'state VARCHAR(255)', 'jurisdiction VARCHAR(255)', 'squareFootage INT', 'floors INT', 'maxOccupancy INT', 'operatingHours VARCHAR(255)', 'eveningOperations BOOLEAN', 'multiTenant BOOLEAN', 'publicAccessWithoutScreening BOOLEAN', 'publicEntrances INT', 'staffEntrances INT', 'hasAlleyways BOOLEAN', 'hasConcealedAreas BOOLEAN', 'usedAfterDark BOOLEAN', 'multiSite BOOLEAN', 'emergencyCoordinator VARCHAR(255)', 'emergencyRoles LONGTEXT', 'aedOnSite BOOLEAN', 'aedLocations LONGTEXT', 'notes LONGTEXT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'facility_alert_settings', columns: ['id INT', 'facilityId INT', 'orgId INT', 'lockdownTemplate JSON', 'lockoutTemplate JSON', 'pushEnabled BOOLEAN', 'escalationPreferences JSON', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'facility_attachments', columns: ['id INT', 'auditId INT', 'facilityId INT', 'uploadedBy INT', 'url LONGTEXT', 'fileKey LONGTEXT', 'filename VARCHAR(255)', 'mimeType VARCHAR(255)', 'fileSize INT', 'category VARCHAR(255)', 'caption VARCHAR(255)', 'aiAnalysis LONGTEXT', 'aiAnalyzedAt TIMESTAMP NULL', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'flagged_visitors', columns: ['id INT', 'name VARCHAR(255)', 'reason LONGTEXT', 'addedByUserId INT', 'facilityId INT', 'active BOOLEAN', 'flagLevel VARCHAR(255)', 'lastEscalatedAt TIMESTAMP NULL', 'escalationCount INT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'photoUrl LONGTEXT', 'photoFileKey LONGTEXT'] },
  { table: 'incident_reports', columns: ['id INT', 'orgId INT', 'facilityId INT', 'facilityName VARCHAR(255)', 'incidentType VARCHAR(255)', 'involvesInjuryOrIllness BOOLEAN', 'injuryType VARCHAR(255)', 'bodyPartAffected VARCHAR(255)', 'injuryDescription LONGTEXT', 'medicalTreatment VARCHAR(255)', 'daysAwayFromWork INT', 'daysOnRestriction INT', 'lossOfConsciousness BOOLEAN', 'workRelated BOOLEAN', 'oshaRecordable BOOLEAN', 'employeeName VARCHAR(255)', 'employeeJobTitle VARCHAR(255)', 'employeeDateOfBirth VARCHAR(255)', 'employeeDateHired VARCHAR(255)', 'physicianName VARCHAR(255)', 'treatedInER BOOLEAN', 'hospitalizedOvernight BOOLEAN', 'severity VARCHAR(255)', 'incidentDate TIMESTAMP NULL', 'location VARCHAR(255)', 'description LONGTEXT', 'involvedParties LONGTEXT', 'witnesses LONGTEXT', 'priorIncidents BOOLEAN', 'reportedToAuthorities BOOLEAN', 'reporterRole VARCHAR(255)', 'contactEmail VARCHAR(255)', 'status VARCHAR(255)', 'adminNotes LONGTEXT', 'reviewedBy INT', 'reviewedAt TIMESTAMP NULL', 'trackingToken VARCHAR(255)', 'followUpRequested BOOLEAN', 'followUpMethod VARCHAR(255)', 'followUpContact VARCHAR(255)', 'involvedPersonName VARCHAR(255)', 'isRepeatIncident BOOLEAN', 'repeatGroupId VARCHAR(255)', 'threatFlags LONGTEXT', 'maxThreatSeverity VARCHAR(255)', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'liability_scans', columns: ['id INT', 'userId INT', 'orgId INT', 'facilityId INT', 'score INT', 'classification VARCHAR(255)', 'riskMapLevel VARCHAR(255)', 'riskMapColor VARCHAR(255)', 'riskMapDescriptor LONGTEXT', 'jurisdiction VARCHAR(255)', 'industry VARCHAR(255)', 'topGaps JSON', 'categoryBreakdown JSON', 'immediateActions JSON', 'interpretation LONGTEXT', 'advisorSummary LONGTEXT', 'scorePercent INT', 'defensibilityStatus VARCHAR(255)', 'answers JSON', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'org_invites', columns: ['id INT', 'orgId INT', 'email VARCHAR(255)', 'role VARCHAR(255)', 'token VARCHAR(255)', 'expiresAt TIMESTAMP NULL', 'usedAt TIMESTAMP NULL', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'org_members', columns: ['id INT', 'orgId INT', 'userId INT', 'role VARCHAR(255)', 'invitedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'joinedAt TIMESTAMP NULL', 'canTriggerAlerts BOOLEAN', 'canRunDrills BOOLEAN', 'canExportReports BOOLEAN', 'canViewIncidentLogs BOOLEAN', 'canSubmitAnonymousReports BOOLEAN', 'canAccessEap BOOLEAN', 'canManageSiteAssessments BOOLEAN'] },
  { table: 'organizations', columns: ['id INT', 'name VARCHAR(255)', 'slug VARCHAR(255)', 'logoUrl LONGTEXT', 'contactEmail VARCHAR(255)', 'createdByUserId INT', 'plan VARCHAR(255)', 'planUpdatedAt TIMESTAMP NULL', 'externalSubscriptionId VARCHAR(255)', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'push_subscriptions', columns: ['id INT', 'userId INT', 'orgId INT', 'subscription JSON', 'endpoint VARCHAR(255)', 'userAgent LONGTEXT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
  { table: 'question_flags', columns: ['id INT', 'auditId INT', 'userId INT', 'questionId VARCHAR(255)', 'questionText LONGTEXT', 'categoryName VARCHAR(255)', 'flagType VARCHAR(255)', 'notes LONGTEXT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'scan_share_tokens', columns: ['id INT', 'scanId INT', 'token VARCHAR(255)', 'createdByUserId INT', 'expiresAt TIMESTAMP NULL', 'revokedAt TIMESTAMP NULL', 'label VARCHAR(255)', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'staff_checkins', columns: ['id INT', 'orgId INT', 'facilityId INT', 'staffName VARCHAR(255)', 'status VARCHAR(255)', 'location LONGTEXT', 'recordedByUserId INT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'tester_feedback', columns: ['id INT', 'auditId INT', 'facilityId INT', 'userId INT', 'facilityType VARCHAR(255)', 'completionTimeMinutes INT', 'overallReportQuality INT', 'scoringAccuracy INT', 'correctiveActionRealism INT', 'eapCompleteness INT', 'questionRelevance INT', 'missingQuestions LONGTEXT', 'irrelevantQuestions LONGTEXT', 'correctiveActionIssues LONGTEXT', 'scoringDisagreements LONGTEXT', 'eapFeedback LONGTEXT', 'generalNotes LONGTEXT', 'wouldUseForClient BOOLEAN', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'threat_findings', columns: ['id INT', 'auditId INT', 'findingName VARCHAR(255)', 'category VARCHAR(255)', 'likelihood VARCHAR(255)', 'impact VARCHAR(255)', 'preparedness VARCHAR(255)', 'baseScore INT', 'modifier INT', 'finalScore INT', 'severityLevel VARCHAR(255)', 'priority VARCHAR(255)', 'description LONGTEXT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'users', columns: ['id INT', 'openId VARCHAR(255)', 'name LONGTEXT', 'email VARCHAR(255)', 'loginMethod VARCHAR(255)', 'role VARCHAR(255)', 'impersonatingUserId INT', 'rasRole VARCHAR(255)', 'btamRole VARCHAR(255)', 'passwordHash VARCHAR(255)', 'passwordSalt VARCHAR(255)', 'emailVerified BOOLEAN', 'emailVerifyToken VARCHAR(255)', 'passwordResetToken VARCHAR(255)', 'passwordResetExpiresAt TIMESTAMP NULL', 'ghlContactId VARCHAR(255)', 'hasSeenWalkthrough BOOLEAN', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'lastSignedIn TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'] },
  { table: 'visitor_logs', columns: ['id INT', 'facilityId INT', 'loggedByUserId INT', 'visitorName VARCHAR(255)', 'company VARCHAR(255)', 'purposeOfVisit VARCHAR(255)', 'hostName VARCHAR(255)', 'timeIn TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'timeOut TIMESTAMP NULL', 'idVerified BOOLEAN', 'idType VARCHAR(255)', 'idNotes LONGTEXT', 'notes LONGTEXT', 'createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP', 'updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'] },
];

async function syncDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Marketingcow1!',
    database: process.env.DB_NAME || 'safeguard'
  });

  let success = 0;
  let failed = 0;
  const errors = [];

  console.log(`\n📊 Starting database sync with ${columns.reduce((sum, t) => sum + t.columns.length, 0)} columns...\n`);

  for (const tableConfig of columns) {
    const tableName = tableConfig.table;
    
    for (const columnDef of tableConfig.columns) {
      const columnName = columnDef.split(' ')[0];
      
      try {
        // Check if column exists
        const [rows] = await connection.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [process.env.DB_NAME || 'safeguard', tableName, columnName]
        );
        
        if (rows.length === 0) {
          // Column doesn't exist, add it
          const query = `ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`;
          await connection.execute(query);
          success++;
          console.log(`✓ ${tableName}.${columnName}`);
        } else {
          console.log(`⊘ ${tableName}.${columnName} (already exists)`);
        }
      } catch (error) {
        failed++;
        errors.push({ column: `${tableName}.${columnName}`, error: error.message });
        console.log(`✗ ${tableName}.${columnName} → ${error.message.substring(0, 50)}`);
      }
    }
  }

  await connection.end();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✓ Sync Complete: ${success} added, ${failed} failed`);
  console.log(`${'='.repeat(80)}\n`);

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  - ${e.column}: ${e.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

syncDatabase().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
