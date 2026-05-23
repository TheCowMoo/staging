CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`orgId` int,
	`action` enum('create','update','delete','login','logout','invite_sent','invite_accepted','member_removed','role_changed','audit_completed','audit_reopened','incident_submitted','incident_reviewed','report_shared') NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64),
	`description` text,
	`metadata` json,
	`ipAddress` varchar(64),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
