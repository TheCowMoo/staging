-- ============================================================
-- Split 1/5: Stored Procedures + Organizations + Users
-- ============================================================

DROP PROCEDURE IF EXISTS add_col;
DELIMITER $$
CREATE PROCEDURE add_col(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN col_def TEXT
)
BEGIN
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
  SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', col_def);
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END$$

CREATE PROCEDURE modify_col(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN col_def TEXT
)
BEGIN
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
  SET @sql = CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN `', col, '` ', col_def);
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

-- ─── 1. ORGANIZATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `slug` varchar(64) NOT NULL UNIQUE,
  `logoUrl` text,
  `contactEmail` varchar(320),
  `createdByUserId` int,
  `plan` enum('free','paid') NOT NULL DEFAULT 'free',
  `planUpdatedAt` timestamp NULL,
  `externalSubscriptionId` varchar(255),
  `websiteResourceLinks` text DEFAULT '[]',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 2. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `openId` varchar(64) NOT NULL UNIQUE,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('ultra_admin','admin','super_admin','auditor','viewer','user') NOT NULL DEFAULT 'user',
  `impersonatingUserId` int,
  `rasRole` enum('admin','responder','staff'),
  `btamRole` enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none',
  `passwordHash` varchar(128),
  `passwordSalt` varchar(64),
  `emailVerified` boolean NOT NULL DEFAULT false,
  `emailVerifyToken` varchar(128),
  `passwordResetToken` varchar(128),
  `passwordResetExpiresAt` timestamp NULL,
  `ghlContactId` varchar(64),
  `hasSeenWalkthrough` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CALL add_col('users','impersonatingUserId','int');
CALL add_col('users','rasRole',"enum('admin','responder','staff')");
CALL add_col('users','btamRole',"enum('none','tat_admin','assessor','reporter','read_only') DEFAULT 'none'");
CALL add_col('users','passwordHash','varchar(128)');
CALL add_col('users','passwordSalt','varchar(64)');
CALL add_col('users','emailVerified','boolean NOT NULL DEFAULT false');
CALL add_col('users','emailVerifyToken','varchar(128)');
CALL add_col('users','passwordResetToken','varchar(128)');
CALL add_col('users','passwordResetExpiresAt','timestamp NULL');
CALL add_col('users','ghlContactId','varchar(64)');
CALL add_col('users','hasSeenWalkthrough','boolean NOT NULL DEFAULT false');

SELECT 'Split 1/5 done' AS result;