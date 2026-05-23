ALTER TABLE `audit_responses` MODIFY COLUMN `primaryResponse` enum('Yes','No','Unknown','Not Applicable');--> statement-breakpoint
ALTER TABLE `audit_responses` ADD `addToEap` boolean DEFAULT false;