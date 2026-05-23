ALTER TABLE `audit_responses` ADD `conditionTypes` json;--> statement-breakpoint
ALTER TABLE `audit_responses` ADD `isUnavoidable` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `audits` ADD `eapContacts` json;