ALTER TABLE `incident_reports` ADD `followUpRequested` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `followUpMethod` enum('phone','email','in_person');--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `followUpContact` varchar(320);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `involvedPersonName` varchar(255);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `isRepeatIncident` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `repeatGroupId` varchar(64);