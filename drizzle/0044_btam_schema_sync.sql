-- ============================================================================
-- 0044_btam_schema_sync.sql — bring btam_* tables to the CURRENT drizzle schema
-- ============================================================================
-- WHY THIS EXISTS
--   Prod's btam_* tables were created from the OLD schema in
--   drizzle/split_05_alerts_btam_cleanup.sql (or left stale because
--   database_sync.sql used MariaDB-only `ADD COLUMN IF NOT EXISTS`, which
--   silently no-ops on MySQL). The current drizzle schema (drizzle/schema.ts ->
--   drizzle/full_sync.sql) inserts columns those old tables don't have, so BTAM
--   referrals failed with:
--     Failed query: insert into `btam_cases` (...) ...  (Unknown column)
--   This file was verified against the known old (split_05) -> new (full_sync)
--   delta. Full BTAM reference: see ../BTAM_REFERENCE.md.
--
-- SCOPE
--   All 7 BTAM tables. Plain ADD/MODIFY/DROP (MySQL-safe — NO `ADD COLUMN IF
--   NOT EXISTS`, which only exists on MariaDB). Old-only columns are left as
--   inert extras (harmless to drizzle) EXCEPT the two that are NOT NULL without
--   a default and would therefore break drizzle INSERTs:
--     - btam_status_history.toStatus      (drizzle writes previousStatus/newStatus)
--     - btam_wavr_assessments.assessedBy  (drizzle writes assessorId)
--
-- APPLY ONCE ON PROD
--   mysql -u root -p safeguard < drizzle/0044_btam_schema_sync.sql
--   Verify current state first:  SHOW CREATE TABLE btam_cases;  (x7 tables)
--   BTAM tables should be EMPTY (no successful referrals yet); the NOT NULL
--   columns assume empty tables. If a DROP COLUMN errors "can't DROP ... check
--   that column exists", skip it — it was already removed.
--   PREFERRED: run `node scripts/diff-live-schema.mjs --write-fixes` ON THE
--   SERVER first (generates drizzle/live_schema_fixes.sql for the ACTUAL prod
--   state). Use THIS file for what the diff tool will not emit: the DROPs of
--   toStatus / assessedBy, plus any MODIFYs the tool flags for review.
-- ============================================================================

-- ── 1. btam_cases ─────────────────────────────────────────────────────────────
ALTER TABLE `btam_cases`
  ADD COLUMN `concernLevel` enum('pending','low','moderate','high','imminent') NOT NULL DEFAULT 'pending',
  ADD COLUMN `violenceType` enum('type_i_criminal','type_ii_client','type_iii_worker_on_worker','type_iv_personal_relationship') NULL,
  ADD COLUMN `assignedAssessor` int NULL,
  ADD COLUMN `linkedIncidentId` int NULL,
  ADD COLUMN `isAnonymousReporter` boolean NOT NULL DEFAULT false,
  ADD COLUMN `confidentialityFlag` boolean NOT NULL DEFAULT true;

ALTER TABLE `btam_cases`
  MODIFY COLUMN `status` enum('open','monitoring','resolved','escalated','referred_law_enforcement') NOT NULL DEFAULT 'open',
  MODIFY COLUMN `caseNumber` varchar(32) NOT NULL;
-- old-only extras kept (nullable/defaulted, harmless): priority, assignedTo, closedAt, closedBy, closureReason

-- ── 2. btam_subjects ──────────────────────────────────────────────────────────
ALTER TABLE `btam_subjects`
  ADD COLUMN `subjectType` enum('employee','former_employee','customer_client','contractor','visitor','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `nameKnown` boolean NOT NULL DEFAULT false,
  ADD COLUMN `subjectAlias` text NULL,
  ADD COLUMN `subjectContact` text NULL,
  ADD COLUMN `location` varchar(255) NULL,
  ADD COLUMN `tenureYears` float NULL,
  ADD COLUMN `recentDisciplinaryAction` boolean NULL DEFAULT false,
  ADD COLUMN `pendingTermination` boolean NULL DEFAULT false,
  ADD COLUMN `grievanceFiled` boolean NULL DEFAULT false,
  ADD COLUMN `domesticSituationKnown` boolean NULL DEFAULT false,
  ADD COLUMN `accessCredentialsActive` boolean NULL DEFAULT true;

ALTER TABLE `btam_subjects`
  MODIFY COLUMN `employmentStatus` enum('active','terminated','suspended','on_leave','never_employed') NULL,
  MODIFY COLUMN `department` varchar(255) NULL;
-- old-only extras kept: firstName, lastName, dateOfBirth, gender, relationship, contactInfo, photoUrl

-- ── 3. btam_referral_intake ───────────────────────────────────────────────────
ALTER TABLE `btam_referral_intake`
  ADD COLUMN `reporterRole` enum('hr','manager','coworker','self','anonymous') NOT NULL DEFAULT 'anonymous',
  ADD COLUMN `dateOfConcern` varchar(32) NULL,
  ADD COLUMN `locationOfConcern` varchar(255) NULL,
  ADD COLUMN `witnessesPresent` boolean NULL DEFAULT false,
  ADD COLUMN `immediateThreathFelt` boolean NULL DEFAULT false,
  ADD COLUMN `weaponMentioned` boolean NULL DEFAULT false,
  ADD COLUMN `targetIdentified` boolean NULL DEFAULT false,
  ADD COLUMN `targetDescription` text NULL,
  ADD COLUMN `priorIncidentsKnown` boolean NULL DEFAULT false,
  ADD COLUMN `priorIncidentsDescription` text NULL,
  ADD COLUMN `supportingDocuments` json NULL;
-- old-only extras kept: referredBy, referralSource, referralDate, behaviorObserved, priorIncidents, priorIncidentDetails, immediateRisk

-- ── 4. btam_status_history ────────────────────────────────────────────────────
-- DROP toStatus: old NOT NULL-without-default column that breaks drizzle's
-- INSERT (drizzle writes previousStatus/newStatus). Skip this DROP if the
-- column no longer exists.
ALTER TABLE `btam_status_history`
  DROP COLUMN `toStatus`,
  ADD COLUMN `changedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `previousStatus` varchar(64) NULL,
  ADD COLUMN `newStatus` varchar(64) NULL,
  ADD COLUMN `previousConcernLevel` varchar(32) NULL,
  ADD COLUMN `newConcernLevel` varchar(32) NULL;
-- old-only extras kept: fromStatus (nullable), createdAt (defaulted); `reason` exists in both schemas

-- ── 5. btam_wavr_assessments ──────────────────────────────────────────────────
-- DROP assessedBy: old NOT NULL-without-default column that breaks drizzle's
-- INSERT (drizzle writes assessorId). Skip this DROP if the column no longer exists.
ALTER TABLE `btam_wavr_assessments`
  DROP COLUMN `assessedBy`,
  ADD COLUMN `assessorId` int NOT NULL,
  ADD COLUMN `assessedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN `grievanceFixation` int NULL DEFAULT 0,
  ADD COLUMN `grievanceFixationChange` boolean NULL DEFAULT false,
  ADD COLUMN `grievanceWithTarget` int NULL DEFAULT 0,
  ADD COLUMN `grievanceWithTargetChange` boolean NULL DEFAULT false,
  ADD COLUMN `desperationHopelessness` int NULL DEFAULT 0,
  ADD COLUMN `desperationHopelessnessChange` boolean NULL DEFAULT false,
  ADD COLUMN `mentalHealthConcern` int NULL DEFAULT 0,
  ADD COLUMN `mentalHealthConcernChange` boolean NULL DEFAULT false,
  ADD COLUMN `paranoidThinking` int NULL DEFAULT 0,
  ADD COLUMN `paranoidThinkingChange` boolean NULL DEFAULT false,
  ADD COLUMN `depressionWithdrawal` int NULL DEFAULT 0,
  ADD COLUMN `depressionWithdrawalChange` boolean NULL DEFAULT false,
  ADD COLUMN `narcissisticInjury` int NULL DEFAULT 0,
  ADD COLUMN `narcissisticInjuryChange` boolean NULL DEFAULT false,
  ADD COLUMN `concerningCommunications` int NULL DEFAULT 0,
  ADD COLUMN `concerningCommunicationsChange` boolean NULL DEFAULT false,
  ADD COLUMN `weaponsInterest` int NULL DEFAULT 0,
  ADD COLUMN `weaponsInterestChange` boolean NULL DEFAULT false,
  ADD COLUMN `pathwayBehaviors` int NULL DEFAULT 0,
  ADD COLUMN `pathwayBehaviorsChange` boolean NULL DEFAULT false,
  ADD COLUMN `leakage` int NULL DEFAULT 0,
  ADD COLUMN `leakageChange` boolean NULL DEFAULT false,
  ADD COLUMN `priorViolenceHistory` int NULL DEFAULT 0,
  ADD COLUMN `priorViolenceHistoryChange` boolean NULL DEFAULT false,
  ADD COLUMN `priorMentalHealthCrisis` int NULL DEFAULT 0,
  ADD COLUMN `priorMentalHealthCrisisChange` boolean NULL DEFAULT false,
  ADD COLUMN `domesticViolenceHistory` int NULL DEFAULT 0,
  ADD COLUMN `domesticViolenceHistoryChange` boolean NULL DEFAULT false,
  ADD COLUMN `recentStressor` int NULL DEFAULT 0,
  ADD COLUMN `recentStressorChange` boolean NULL DEFAULT false,
  ADD COLUMN `socialIsolation` int NULL DEFAULT 0,
  ADD COLUMN `socialIsolationChange` boolean NULL DEFAULT false,
  ADD COLUMN `personalCrisis` int NULL DEFAULT 0,
  ADD COLUMN `personalCrisisChange` boolean NULL DEFAULT false,
  ADD COLUMN `helpSeeking` int NULL DEFAULT 0,
  ADD COLUMN `helpSeekingChange` boolean NULL DEFAULT false,
  ADD COLUMN `socialSupport` int NULL DEFAULT 0,
  ADD COLUMN `socialSupportChange` boolean NULL DEFAULT false,
  ADD COLUMN `futureOrientation` int NULL DEFAULT 0,
  ADD COLUMN `futureOrientationChange` boolean NULL DEFAULT false,
  ADD COLUMN `finalActBehaviors` int NULL DEFAULT 0,
  ADD COLUMN `finalActBehaviorsChange` boolean NULL DEFAULT false,
  ADD COLUMN `surveillanceOfTarget` int NULL DEFAULT 0,
  ADD COLUMN `surveillanceOfTargetChange` boolean NULL DEFAULT false,
  ADD COLUMN `imminentCommunication` int NULL DEFAULT 0,
  ADD COLUMN `imminentCommunicationChange` boolean NULL DEFAULT false,
  ADD COLUMN `computedConcernLevel` enum('low','moderate','high','imminent') NULL,
  ADD COLUMN `totalWeightedScore` int NULL,
  ADD COLUMN `topContributingFactors` json NULL,
  ADD COLUMN `assessorNotes` text NULL,
  ADD COLUMN `assessorAttestation` boolean NOT NULL DEFAULT false;
-- old-only extras kept: assessmentDate (defaulted), wavrScore, riskLevel, factors, narrative, recommendations

-- ── 6. btam_management_plan ───────────────────────────────────────────────────
ALTER TABLE `btam_management_plan`
  ADD COLUMN `actionDescription` text NOT NULL,
  ADD COLUMN `responsibleParty` int NULL,
  ADD COLUMN `dueDate` varchar(32) NULL,
  ADD COLUMN `completed` boolean NOT NULL DEFAULT false,
  ADD COLUMN `completionNotes` text NULL;

ALTER TABLE `btam_management_plan`
  MODIFY COLUMN `interventionType` enum('monitoring','hr_meeting','eap_referral','mandatory_counseling','credential_suspension','law_enforcement_notification','no_contact_order','termination_with_safety_protocol','hospitalization_referral','other') NOT NULL,
  MODIFY COLUMN `nextReviewDate` varchar(32) NULL;
-- old-only extras kept: objectives, actions, monitoringFrequency, status (has a default -> harmless)

-- ── 7. btam_case_notes ────────────────────────────────────────────────────────
ALTER TABLE `btam_case_notes`
  ADD COLUMN `isPrivileged` boolean NOT NULL DEFAULT false;

ALTER TABLE `btam_case_notes`
  MODIFY COLUMN `noteType` enum('observation','interview','external_report','law_enforcement','legal','hr','general') NOT NULL;
-- old-only extras kept: isConfidential (defaulted), updatedAt (defaulted)

-- ============================================================================
-- VERIFY AFTER APPLYING
--   SHOW CREATE TABLE btam_cases;         (x7 btam tables)
--   node scripts/diff-live-schema.mjs     (run on the server; should report no
--                                          missing columns for btam_*)
--   Then submit a test referral on /btam/new. Server-side logs now print the
--   real MySQL error via the tRPC errorFormatter (server/_core/trpc.ts).
-- ============================================================================
