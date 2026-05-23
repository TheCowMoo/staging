CREATE TABLE `org_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`inviteRole` enum('org_admin','auditor','viewer') NOT NULL DEFAULT 'auditor',
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`userId` int NOT NULL,
	`orgRole` enum('org_admin','auditor','viewer') NOT NULL DEFAULT 'auditor',
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`joinedAt` timestamp,
	CONSTRAINT `org_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`logoUrl` text,
	`contactEmail` varchar(320),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `audits` ADD `orgId` int;--> statement-breakpoint
ALTER TABLE `facilities` ADD `orgId` int;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `orgId` int;