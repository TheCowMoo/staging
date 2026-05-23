CREATE TABLE `liability_scans` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int,
  `orgId` int,
  `facilityId` int,
  `score` int NOT NULL,
  `classification` varchar(64) NOT NULL,
  `riskMapLevel` varchar(64) NOT NULL,
  `riskMapColor` varchar(16) NOT NULL,
  `riskMapDescriptor` text,
  `jurisdiction` varchar(128) NOT NULL,
  `industry` varchar(128) NOT NULL,
  `topGaps` json NOT NULL,
  `categoryBreakdown` json NOT NULL,
  `immediateActions` json NOT NULL,
  `interpretation` text,
  `advisorSummary` text,
  `answers` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `liability_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_share_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `scanId` int NOT NULL,
  `token` varchar(128) NOT NULL,
  `createdByUserId` int,
  `expiresAt` timestamp NOT NULL,
  `revokedAt` timestamp,
  `label` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `scan_share_tokens_id` PRIMARY KEY(`id`),
  CONSTRAINT `scan_share_tokens_token_unique` UNIQUE(`token`)
);
