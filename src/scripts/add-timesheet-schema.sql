-- Run once against the existing MySQL database before starting the backend.
-- Existing employees receive the default hourly rate of 0.
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'NhanSu'
      AND COLUMN_NAME = 'hourlyRate'
);

SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE `NhanSu` ADD COLUMN `hourlyRate` DECIMAL(15, 2) NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
