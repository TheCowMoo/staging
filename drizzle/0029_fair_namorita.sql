ALTER TABLE `org_invites` MODIFY COLUMN `inviteRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `org_members` MODIFY COLUMN `orgRole` enum('super_admin','admin','auditor','user','viewer') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('ultra_admin','admin','super_admin','auditor','viewer','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `org_members` ADD `canTriggerAlerts` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_members` ADD `canRunDrills` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_members` ADD `canExportReports` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_members` ADD `canViewIncidentLogs` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_members` ADD `canSubmitAnonymousReports` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_members` ADD `canAccessEap` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `org_members` ADD `canManageSiteAssessments` boolean DEFAULT false NOT NULL;--> statement-breakpoint

ALTER TABLE `users` ADD `impersonatingUserId` int;--> statement-breakpoint
