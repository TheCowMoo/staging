CREATE TABLE IF NOT EXISTS personnel_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orgId INT NOT NULL,
  userId INT NOT NULL,
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'Active',
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_personnel_locations_org_user (orgId, userId),
  INDEX idx_personnel_locations_org (orgId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
