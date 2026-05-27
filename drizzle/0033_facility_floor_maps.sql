-- Facility Floor Maps Table
-- Stores uploaded floor plans and their annotations (markers, zones, etc.)
-- Supports both uploaded images and drawn maps

CREATE TABLE IF NOT EXISTS `facility_floor_maps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `facility_id` int NOT NULL,
  `org_id` int DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `floor` varchar(100) DEFAULT NULL,
  `image_url` text,
  `file_key` text,
  `map_data` json DEFAULT NULL,
  `annotations` json DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `created_by_user_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_facility_id` (`facility_id`),
  KEY `idx_org_id` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;