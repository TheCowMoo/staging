-- 0045_audit_response_enum.sql
-- Fix audit_responses.response enum: append the legacy decision-tree + em-dash
-- variants the client sends (positive-polarity "No" -> "No — Not in place", raw
-- "Yes"/"No" aliases, double-dash legacy labels). Previously these were rejected
-- by the enum, so deficiency answers (positive + "No") failed to save under MySQL
-- strict mode and silently vanished from scoring — making results look secure
-- when the facility was actually deficient.
--
-- NOTE: append-only. Existing enum values keep their index so stored rows stay valid.
ALTER TABLE `audit_responses`
  MODIFY COLUMN `response` enum(
    'Secure / Yes',
    'Partial',
    'Minor Concern',
    'Moderate Concern',
    'Serious Vulnerability',
    'No — Not Present',
    'Unlikely / Minimal',
    'Partially Present',
    'Yes — Present',
    'Unknown',
    'Not Applicable',
    'Unavoidable',
    'No — Not in place',
    'Yes — Secure',
    'No -- Not Present',
    'Yes -- Present',
    'Yes',
    'No'
  ) DEFAULT NULL;
