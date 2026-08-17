-- ============================================================
-- Migration 0042: Add 'sandbox' role for prospect / demo users
--
-- Adds 'sandbox' to the platform role enums so sandbox users can be
-- provisioned via the registration webhook / super-admin invite flow.
-- NOTE: ALTER ENUM requires re-specifying all values; existing rows are
-- preserved (MySQL stores enum values as strings).
-- ============================================================

ALTER TABLE `users` MODIFY COLUMN `role`
  enum('ultra_admin','admin','super_admin','auditor','viewer','user','sandbox') NOT NULL DEFAULT 'user';

ALTER TABLE `org_members` MODIFY COLUMN `orgRole`
  enum('super_admin','admin','auditor','user','viewer','sandbox') NOT NULL DEFAULT 'auditor';

ALTER TABLE `org_invites` MODIFY COLUMN `inviteRole`
  enum('super_admin','admin','auditor','user','viewer','sandbox') NOT NULL DEFAULT 'auditor';

ALTER TABLE `user_invites` MODIFY COLUMN `inviteRole`
  enum('ultra_admin','super_admin','admin','auditor','user','viewer','sandbox') NOT NULL DEFAULT 'user';
