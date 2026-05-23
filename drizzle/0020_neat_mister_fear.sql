CREATE TABLE `flagged_visitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`reason` text,
	`addedByUserId` int NOT NULL,
	`facilityId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flagged_visitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liability_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`orgId` int,
	`facilityId` int,
	`score` int NOT NULL,
	`classification` varchar(64) NOT NULL,
	`riskMapLevel` varchar(64) NOT NULL,
	`riskMapColor` varchar(16) NOT NULL,
	`riskMapDescriptor` text,
	`jurisdiction` varchar(128) NOT NULL,
	`industry` varchar(128) NOT NULL,
	`topGaps` json NOT NULL,
	`categoryBreakdown` json NOT NULL,
	`immediateActions` json NOT NULL,
	`interpretation` text,
	`advisorSummary` text,
	`answers` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `liability_scans_id` PRIMARY KEY(`id`)
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
CREATE TABLE `scan_share_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`createdByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`label` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_share_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `scan_share_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
DROP TABLE `organisations`;--> statement-breakpoint
ALTER TABLE `audits` ADD `executiveSummaryJson` json;--> statement-breakpoint
ALTER TABLE `audits` ADD `executiveSummaryGeneratedAt` timestamp;--> statement-breakpoint
ALTER TABLE `facilities` ADD `jurisdiction` varchar(64) DEFAULT 'United States';