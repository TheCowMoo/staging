CREATE TABLE `drill_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(100),
	`attended` boolean NOT NULL DEFAULT true,
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drill_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drill_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`facilityId` int,
	`orgId` int,
	`scheduledByUserId` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`debriefData` json,
	`systemIntelligence` json,
	`participantCount` int,
	`facilitatorNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drill_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drill_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
	`facilityId` int,
	`createdByUserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`drillType` enum('micro','guided','operational','extended') NOT NULL,
	`durationMinutes` int NOT NULL,
	`industry` varchar(100),
	`jurisdiction` varchar(100),
	`generationMode` enum('system','user') NOT NULL DEFAULT 'system',
	`userPrompt` text,
	`content` json NOT NULL,
	`regulatoryTags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drill_templates_id` PRIMARY KEY(`id`)
);
