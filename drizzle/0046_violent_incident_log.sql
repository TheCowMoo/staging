-- ============================================================
-- California Violent Incident Log (SB 553 / Labor Code 6401.9)
-- PII-free: no victim/witness/perpetrator name/contact/address fields.
-- ============================================================

CREATE TABLE IF NOT EXISTS `violent_incident_logs` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `facilityId` int NULL,
  `incidentDate` timestamp NULL,
  `incidentTime` varchar(16) NULL,
  `location` varchar(255) NULL,
  `violenceType` enum('type_i_criminal','type_ii_client','type_iii_worker_on_worker','type_iv_personal_relationship') NULL,
  `perpetratorCategory` enum('customer_client','current_employee','former_employee','personal_relationship','stranger','other_unknown') NULL,
  `characteristics` json NULL,
  `weaponType` enum('none','firearm','edged','blunt','chemical','other') NULL,
  `weaponOther` varchar(255) NULL,
  `environmentalFactors` json NULL,
  `industryCircumstances` json NULL,
  `narrative` text NULL,
  `lawEnforcementContacted` boolean NOT NULL DEFAULT false,
  `leAgencyName` varchar(255) NULL,
  `policeReportNumber` varchar(128) NULL,
  `protectiveActions` text NULL,
  `hazardEvaluation` text NULL,
  `correctiveActions` text NULL,
  `loggedByUserId` int NULL,
  `loggedByName` varchar(255) NULL,
  `loggedByTitle` varchar(128) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `violent_incident_log_requests` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `orgId` int NULL,
  `requestedByUserId` int NULL,
  `requestedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dueAt` timestamp NULL,
  `status` enum('pending','fulfilled') NOT NULL DEFAULT 'pending',
  `notifiedDay1At` timestamp NULL,
  `notifiedDay10At` timestamp NULL,
  `notifiedDay14At` timestamp NULL,
  `fulfilledAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;