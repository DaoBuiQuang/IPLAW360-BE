-- =============================================================================
-- Migration: Hỗ trợ Đơn tiếp nhận, GCN_NH nullable, và đăng nhập bằng Email
-- Date     : 2026-11-20
-- DB       : MySQL 8.x / MariaDB 10.x
-- Chạy qua : npm run migrate
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bảng DonDangKyNhanHieu: cho phép idKhachHang NULL, thêm cột laDonTiepNhan
-- -----------------------------------------------------------------------------
ALTER TABLE `DonDangKyNhanHieu`
    MODIFY COLUMN `idKhachHang` INT NULL;

ALTER TABLE `DonDangKyNhanHieu`
    ADD COLUMN `laDonTiepNhan` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Đơn tiếp nhận từ đại diện khác';

-- Chuẩn hóa dữ liệu cũ: chuyển maHoSoVuViec / maHoSo rỗng thành NULL
-- (tránh lỗi unique index khi nhiều đơn tiếp nhận không nhập mã hồ sơ)
UPDATE `DonDangKyNhanHieu`
SET `maHoSoVuViec` = NULL
WHERE `maHoSoVuViec` IS NOT NULL AND TRIM(`maHoSoVuViec`) = '';

UPDATE `DonDangKyNhanHieu`
SET `maHoSo` = NULL
WHERE `maHoSo` IS NOT NULL AND TRIM(`maHoSo`) = '';

-- -----------------------------------------------------------------------------
-- 2. Bảng gcn_nh (GCN Việt Nam): cho phép idKhachHang và maNhanHieu NULL
-- -----------------------------------------------------------------------------
ALTER TABLE `gcn_nh`
    MODIFY COLUMN `idKhachHang` INT NULL;

ALTER TABLE `gcn_nh`
    MODIFY COLUMN `maNhanHieu` INT NULL;

-- -----------------------------------------------------------------------------
-- 3. Bảng NhanSu: chuẩn hóa email rỗng -> NULL và thêm index tối ưu đăng nhập
-- -----------------------------------------------------------------------------
UPDATE `NhanSu`
SET `email` = NULL
WHERE `email` IS NOT NULL AND TRIM(`email`) = '';

CREATE INDEX `idx_nhansu_email` ON `NhanSu` (`email`);

-- =============================================================================
-- ROLLBACK (chạy thủ công theo thứ tự khi cần hoàn nguyên):
-- Lưu ý: Chỉ đổi lại NOT NULL khi đã chắc chắn không còn bản ghi NULL.
-- =============================================================================
-- DROP INDEX `idx_nhansu_email` ON `NhanSu`;
-- ALTER TABLE `gcn_nh` MODIFY COLUMN `maNhanHieu` INT NOT NULL;
-- ALTER TABLE `gcn_nh` MODIFY COLUMN `idKhachHang` INT NOT NULL;
-- ALTER TABLE `DonDangKyNhanHieu` DROP COLUMN `laDonTiepNhan`;
-- ALTER TABLE `DonDangKyNhanHieu` MODIFY COLUMN `idKhachHang` INT NOT NULL;
