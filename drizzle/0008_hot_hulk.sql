CREATE TABLE `corrective_action_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`questionId` varchar(64) NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`completedBy` int NOT NULL,
	`notes` varchar(512),
	CONSTRAINT `corrective_action_checks_id` PRIMARY KEY(`id`)
);
