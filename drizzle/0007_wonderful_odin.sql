ALTER TABLE `incident_reports` MODIFY COLUMN `incidentType` enum('threatening_behavior','suspicious_person','observed_safety_gap','workplace_violence','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `involvesInjuryOrIllness` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `injuryType` enum('injury','skin_disorder','respiratory','poisoning','hearing_loss','other_illness');--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `bodyPartAffected` varchar(128);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `injuryDescription` text;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `medicalTreatment` enum('first_aid_only','medical_treatment','emergency_room','hospitalized');--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `daysAwayFromWork` int;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `daysOnRestriction` int;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `lossOfConsciousness` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `workRelated` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `oshaRecordable` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `employeeName` varchar(255);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `employeeJobTitle` varchar(128);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `employeeDateOfBirth` varchar(16);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `employeeDateHired` varchar(16);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `physicianName` varchar(255);--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `treatedInER` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `incident_reports` ADD `hospitalizedOvernight` boolean DEFAULT false;