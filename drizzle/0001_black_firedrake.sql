CREATE TABLE `audit_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`auditResponseId` int,
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
	`caption` varchar(255),
	`photoType` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`categoryName` varchar(128) NOT NULL,
	`questionId` varchar(64) NOT NULL,
	`questionText` text NOT NULL,
	`response` enum('Secure / Yes','Minor Concern','Moderate Concern','Serious Vulnerability','Unknown','Not Applicable'),
	`conditionType` enum('Observed Condition','Potential Risk','Unknown Condition','Recommended Action'),
	`score` int,
	`notes` text,
	`photoUrls` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int NOT NULL,
	`auditorId` int NOT NULL,
	`status` enum('in_progress','completed','archived') NOT NULL DEFAULT 'in_progress',
	`auditDate` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`overallScore` float,
	`overallRiskLevel` varchar(32),
	`categoryScores` json,
	`auditorNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`facilityType` varchar(64) NOT NULL,
	`address` text,
	`city` varchar(128),
	`state` varchar(64),
	`squareFootage` int,
	`floors` int,
	`maxOccupancy` int,
	`operatingHours` varchar(128),
	`eveningOperations` boolean DEFAULT false,
	`multiTenant` boolean DEFAULT false,
	`publicAccessWithoutScreening` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threat_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`findingName` varchar(255) NOT NULL,
	`category` varchar(128) NOT NULL,
	`likelihood` varchar(32) NOT NULL,
	`impact` varchar(32) NOT NULL,
	`preparedness` varchar(64) NOT NULL,
	`baseScore` int NOT NULL,
	`modifier` int NOT NULL,
	`finalScore` int NOT NULL,
	`severityLevel` varchar(32) NOT NULL,
	`priority` varchar(32) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `threat_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','auditor','client','admin') NOT NULL DEFAULT 'auditor';