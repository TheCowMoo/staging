CREATE TABLE `eap_section_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eapSectionId` int NOT NULL,
	`auditId` int NOT NULL,
	`sectionId` varchar(64) NOT NULL,
	`contentSnapshot` text,
	`savedByUserId` int,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	`label` varchar(128),
	CONSTRAINT `eap_section_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eap_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`sectionId` varchar(64) NOT NULL,
	`sectionTitle` varchar(255) NOT NULL,
	`contentOverride` text,
	`reviewed` boolean NOT NULL DEFAULT false,
	`applicable` boolean NOT NULL DEFAULT true,
	`auditorNotes` text,
	`auditorRecommendations` json,
	`lastEditedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eap_sections_id` PRIMARY KEY(`id`)
);
