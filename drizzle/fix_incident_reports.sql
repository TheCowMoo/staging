-- Fix incident_reports: add all missing OSHA and extended columns
-- Run each line separately if needed — duplicate column errors are safe to ignore

ALTER TABLE `incident_reports` ADD COLUMN `involvesInjuryOrIllness` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `injuryType` enum('injury','skin_disorder','respiratory','poisoning','hearing_loss','other_illness','other_injury');
ALTER TABLE `incident_reports` ADD COLUMN `bodyPartAffected` varchar(128);
ALTER TABLE `incident_reports` ADD COLUMN `injuryDescription` text;
ALTER TABLE `incident_reports` ADD COLUMN `medicalTreatment` enum('none','first_aid','medical_beyond_first_aid','hospitalization','er_visit');
ALTER TABLE `incident_reports` ADD COLUMN `daysAwayFromWork` int;
ALTER TABLE `incident_reports` ADD COLUMN `daysOnRestriction` int;
ALTER TABLE `incident_reports` ADD COLUMN `lossOfConsciousness` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `workRelated` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `oshaRecordable` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `employeeName` varchar(255);
ALTER TABLE `incident_reports` ADD COLUMN `employeeJobTitle` varchar(128);
ALTER TABLE `incident_reports` ADD COLUMN `employeeDateOfBirth` date;
ALTER TABLE `incident_reports` ADD COLUMN `employeeDateHired` date;
ALTER TABLE `incident_reports` ADD COLUMN `physicianName` varchar(255);
ALTER TABLE `incident_reports` ADD COLUMN `treatedInER` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `hospitalizedOvernight` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `followUpRequested` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `followUpMethod` enum('phone','email','in_person','video');
ALTER TABLE `incident_reports` ADD COLUMN `followUpContact` varchar(255);
ALTER TABLE `incident_reports` ADD COLUMN `involvedPersonName` varchar(255);
ALTER TABLE `incident_reports` ADD COLUMN `isRepeatIncident` boolean NOT NULL DEFAULT false;
ALTER TABLE `incident_reports` ADD COLUMN `repeatGroupId` varchar(64);
ALTER TABLE `incident_reports` ADD COLUMN `threatFlags` json;
ALTER TABLE `incident_reports` ADD COLUMN `maxThreatSeverity` enum('low','moderate','high','critical');
