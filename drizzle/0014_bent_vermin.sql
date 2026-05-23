ALTER TABLE `audit_responses` MODIFY COLUMN `conditionType` varchar(128);--> statement-breakpoint
ALTER TABLE `audit_responses` ADD `primaryResponse` enum('Yes','No','Unknown','Not Applicable','Unavoidable');--> statement-breakpoint
ALTER TABLE `audit_responses` ADD `concernLevel` enum('Minor','Moderate','Serious');