CREATE TABLE `facility_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`facilityId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSize` int,
	`category` enum('floor_plan','interior_photo','exterior_photo','document','other') NOT NULL DEFAULT 'other',
	`caption` varchar(255),
	`aiAnalysis` text,
	`aiAnalyzedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `facility_attachments_id` PRIMARY KEY(`id`)
);
