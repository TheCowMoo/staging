ALTER TABLE `audit_responses` MODIFY COLUMN `response` enum('Secure / Yes','Partial','Minor Concern','Moderate Concern','Serious Vulnerability','No — Not Present','Unlikely / Minimal','Partially Present','Yes — Present','Unknown','Not Applicable','Unavoidable');--> statement-breakpoint
ALTER TABLE `audit_responses` ADD `recommendedActionNotes` text;--> statement-breakpoint
ALTER TABLE `audit_responses` ADD `remediationTimeline` enum('30 days','60 days','90 days','Long-Term');--> statement-breakpoint
ALTER TABLE `audit_responses` ADD `followUpResponse` text;--> statement-breakpoint
ALTER TABLE `facilities` ADD `publicEntrances` int;--> statement-breakpoint
ALTER TABLE `facilities` ADD `staffEntrances` int;--> statement-breakpoint
ALTER TABLE `facilities` ADD `hasAlleyways` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `facilities` ADD `hasConcealedAreas` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `facilities` ADD `usedAfterDark` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `facilities` ADD `multiSite` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `facilities` ADD `emergencyCoordinator` varchar(255);