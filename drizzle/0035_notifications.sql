-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `org_id` int,
  `type` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text,
  `link` varchar(512),
  `metadata` json,
  `read` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_read` (`user_id`, `read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
