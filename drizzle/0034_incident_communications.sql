-- Incident Communications Table
-- Stores messages between admins and reporters regarding incident reports

CREATE TABLE IF NOT EXISTS `incident_communications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `incident_id` int NOT NULL,
  `sender_role` enum('admin','reporter') NOT NULL,
  `sender_name` varchar(255) DEFAULT NULL,
  `message` text NOT NULL,
  `is_from_admin` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_incident_id` (`incident_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;