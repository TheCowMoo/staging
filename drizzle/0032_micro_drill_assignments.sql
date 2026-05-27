-- Micro Drill Assignments Table
-- Tracks individual drill assignments to personnel, completion status, choices made, and considerations checked

CREATE TABLE IF NOT EXISTS `micro_drill_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `org_id` int DEFAULT NULL,
  `assigned_by_user_id` int NOT NULL,
  `assigned_to_user_id` int DEFAULT NULL,
  `assigned_to_name` varchar(255) DEFAULT NULL,
  `assigned_to_email` varchar(320) DEFAULT NULL,
  `drill_id` int NOT NULL,
  `drill_category` varchar(255) NOT NULL,
  `drill_title` varchar(255) NOT NULL,
  `assigned_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completion_date` timestamp NULL,
  `due_date` timestamp NULL,
  `status` enum('pending','in_progress','completed','expired') NOT NULL DEFAULT 'pending',
  `step1_choice` varchar(10) DEFAULT NULL,
  `step2_choices` json DEFAULT NULL,
  `considerations_checked` json DEFAULT NULL,
  `completed_at` timestamp NULL,
  `completed_by_name` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assigned_to_user` (`assigned_to_user_id`),
  KEY `idx_assigned_to_org` (`org_id`),
  KEY `idx_drill_status` (`status`),
  KEY `idx_assigned_date` (`assigned_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;