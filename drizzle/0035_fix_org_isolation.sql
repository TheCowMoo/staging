-- =============================================================
-- Fix #1: Add orgId to flagged_visitors table
-- This prevents cross-org data leak when org-level entries
-- (without facilityId) are shown to other orgs
-- =============================================================
ALTER TABLE `flagged_visitors` ADD COLUMN IF NOT EXISTS `orgId` int AFTER `id`;

-- =============================================================
-- Fix #2: Add orgId to visitor_logs table
-- Enables org-scoped visitor log queries
-- =============================================================
ALTER TABLE `visitor_logs` ADD COLUMN IF NOT EXISTS `orgId` int AFTER `id`;

-- =============================================================
-- Fix #3: Add orgId to tester_feedback table
-- Prevents admin-level cross-org data exposure
-- =============================================================
ALTER TABLE `tester_feedback` ADD COLUMN IF NOT EXISTS `orgId` int AFTER `id`;

-- =============================================================
-- Fix #4: Add orgId to question_flags table
-- Prevents admin-level cross-org data exposure
-- =============================================================
ALTER TABLE `question_flags` ADD COLUMN IF NOT EXISTS `orgId` int AFTER `id`;