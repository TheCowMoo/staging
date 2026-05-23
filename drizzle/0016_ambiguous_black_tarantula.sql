CREATE TABLE `visitor_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` int,
	`loggedByUserId` int NOT NULL,
	`visitorName` varchar(255) NOT NULL,
	`company` varchar(255),
	`purposeOfVisit` varchar(512) NOT NULL,
	`hostName` varchar(255),
	`timeIn` timestamp NOT NULL DEFAULT (now()),
	`timeOut` timestamp,
	`idVerified` boolean NOT NULL DEFAULT false,
	`idType` varchar(64),
	`idNotes` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitor_logs_id` PRIMARY KEY(`id`)
);
