CREATE TABLE `staff_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
	`facilityId` int,
	`staffName` varchar(255) NOT NULL,
	`status` enum('reunification','injured','off_site','cannot_disclose') NOT NULL,
	`location` text,
	`recordedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `facilities` ADD `emergencyRoles` text;--> statement-breakpoint
ALTER TABLE `facilities` ADD `aedOnSite` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `facilities` ADD `aedLocations` text;--> statement-breakpoint
ALTER TABLE `flagged_visitors` ADD `flagLevel` enum('red','yellow') DEFAULT 'red' NOT NULL;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD `endpoint` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `rasRole` enum('admin','responder','staff');