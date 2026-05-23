ALTER TABLE `flagged_visitors` ADD `lastEscalatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `flagged_visitors` ADD `escalationCount` int DEFAULT 0 NOT NULL;