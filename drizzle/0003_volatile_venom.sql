CREATE TABLE `question_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`userId` int NOT NULL,
	`questionId` varchar(64) NOT NULL,
	`questionText` text NOT NULL,
	`categoryName` varchar(128) NOT NULL,
	`flagType` enum('wrong_response_options','question_unclear','not_applicable_to_facility','scoring_seems_wrong','missing_context','other') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `question_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tester_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`facilityId` int NOT NULL,
	`userId` int NOT NULL,
	`facilityType` varchar(64),
	`completionTimeMinutes` int,
	`overallReportQuality` int,
	`scoringAccuracy` int,
	`correctiveActionRealism` int,
	`eapCompleteness` int,
	`questionRelevance` int,
	`missingQuestions` text,
	`irrelevantQuestions` text,
	`correctiveActionIssues` text,
	`scoringDisagreements` text,
	`eapFeedback` text,
	`generalNotes` text,
	`wouldUseForClient` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tester_feedback_id` PRIMARY KEY(`id`)
);
