CREATE TABLE IF NOT EXISTS `training_modules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orgId` INT NULL,
  `createdByUserId` INT NOT NULL,
  `courseTitle` VARCHAR(255) NOT NULL,
  `launchPath` TEXT NOT NULL,
  `playerType` ENUM('Articulate_Storyline_Web') NOT NULL DEFAULT 'Articulate_Storyline_Web',
  `trackingType` ENUM('None') NOT NULL DEFAULT 'None',
  `storagePrefix` VARCHAR(512) NOT NULL,
  `sourceFileName` VARCHAR(255),
  `metaJson` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_training_modules_orgId` (`orgId`),
  INDEX `idx_training_modules_createdByUserId` (`createdByUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
