-- Migration 0043: Scan context metadata
-- Adds Organization, Number of Employees, and Facility/Location(s) to
-- liability_scans for the Assessment Context fields in the readiness scan.

ALTER TABLE `liability_scans` ADD COLUMN `organization` varchar(255) NULL;
ALTER TABLE `liability_scans` ADD COLUMN `employeeCount` varchar(64) NULL;
ALTER TABLE `liability_scans` ADD COLUMN `facilityLocation` text NULL;
