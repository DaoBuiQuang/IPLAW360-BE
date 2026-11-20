-- =============================================================================
-- Migration: Đồng bộ Campuchia (KH) theo Việt Nam (VN)
--            1. Đơn tiếp nhận (DonDangKyNhanHieu_KH)
--            2. GCN_NH_KH nullable (idKhachHang, maNhanHieu)
--            3. Đơn sửa đổi NH KH 3 trạng thái + GUQ + hạn trả lời (DonSuaDoi_NH_KH)
--            4. Bảng vòng phản hồi với Cục (LichSuPhanHoiSuaDoi_NH_KH)
-- Date     : 2026-11-20
-- DB       : MySQL 8.x / MariaDB 10.x
-- Chạy qua : npm run migrate
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 DonDangKyNhanHieu_KH: hỗ trợ Đơn tiếp nhận
-- -----------------------------------------------------------------------------
ALTER TABLE `DonDangKyNhanHieu_KH` MODIFY COLUMN `idKhachHang` INT NULL;
ALTER TABLE `DonDangKyNhanHieu_KH` MODIFY COLUMN `maHoSoVuViec` VARCHAR(255) NULL;

ALTER TABLE `DonDangKyNhanHieu_KH`
    ADD COLUMN `laDonTiepNhan` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Đơn tiếp nhận từ đại diện khác';

UPDATE `DonDangKyNhanHieu_KH`
SET `maHoSoVuViec` = NULL
WHERE `maHoSoVuViec` IS NOT NULL AND TRIM(`maHoSoVuViec`) = '';

UPDATE `DonDangKyNhanHieu_KH`
SET `maHoSo` = NULL
WHERE `maHoSo` IS NOT NULL AND TRIM(`maHoSo`) = '';

-- -----------------------------------------------------------------------------
-- 1.2 GCN_NH_KH: đảm bảo idKhachHang và maNhanHieu cho phép NULL
-- -----------------------------------------------------------------------------
ALTER TABLE `GCN_NH_KH` MODIFY COLUMN `idKhachHang` INT NULL;
ALTER TABLE `GCN_NH_KH` MODIFY COLUMN `maNhanHieu` INT NULL;

-- -----------------------------------------------------------------------------
-- 1.3 DonSuaDoi_NH_KH: đồng bộ 3 trạng thái, GUQ, nội dung khác & hạn trả lời
-- -----------------------------------------------------------------------------
ALTER TABLE `DonSuaDoi_NH_KH` MODIFY COLUMN `maDonDangKy` VARCHAR(255) NULL;

ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `trangThaiDuyet` INT NOT NULL DEFAULT 0 COMMENT '0: Chưa chấp thuận, 1: Được chấp thuận, 2: Từ chối';
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `ngayChapThuan` DATE NULL;
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `ngayTuChoi` DATE NULL;
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `lyDoTuChoi` TEXT NULL;
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `duLieuThayDoi` JSON NULL;
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `ndSuaDoiNoiDungKhac` TEXT NULL COMMENT 'Nội dung chi tiết khi tick suaDoiNoiDungKhac';
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `giayUyQuyenGoc` TINYINT(1) NULL COMMENT 'GUQ bản gốc (1) / bản sao (0) của tờ khai sửa đổi';
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `maUyQuyen` VARCHAR(255) NULL COMMENT 'Số đơn chứa GUQ gốc (nếu dùng bản sao)';
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `idGUQ` INT NULL COMMENT 'FK GiayUyQuyen(id)';
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `hanTraLoi` DATE NULL COMMENT 'Hạn trả lời Cục hiện hành của vòng thông báo mới nhất chưa trả lời';
ALTER TABLE `DonSuaDoi_NH_KH` ADD COLUMN `tuDongTuChoi` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = hệ thống tự chuyển Từ chối do quá hạn trả lời';

ALTER TABLE `DonSuaDoi_NH_KH`
    ADD CONSTRAINT `fk_sd_kh_guq` FOREIGN KEY (`idGUQ`) REFERENCES `GiayUyQuyen` (`id`) ON DELETE SET NULL;

-- Backfill dữ liệu lịch sử: tờ khai cũ đã sinh đơn mới / đã ghi nhận -> trạng thái 1 (Được chấp thuận)
UPDATE `DonSuaDoi_NH_KH`
SET `trangThaiDuyet` = 1,
    `duocGhiNhanSuaDoi` = 1,
    `ngayChapThuan` = COALESCE(`ngayChapThuan`, `ngayGhiNhanSuaDoi`, DATE(`createdAt`))
WHERE (`maDonDangKy` IS NOT NULL AND TRIM(`maDonDangKy`) <> '')
   OR `duocGhiNhanSuaDoi` = 1;

-- Dọn toàn vẹn: đơn Chờ (0) / Từ chối (2) không còn sót ngày ghi nhận / ngày chấp thuận
UPDATE `DonSuaDoi_NH_KH`
SET `ngayGhiNhanSuaDoi` = NULL,
    `ngayChapThuan` = NULL
WHERE `trangThaiDuyet` IN (0, 2)
  AND (`ngayGhiNhanSuaDoi` IS NOT NULL OR `ngayChapThuan` IS NOT NULL);

CREATE INDEX `idx_sd_kh_madondangky` ON `DonSuaDoi_NH_KH` (`maDonDangKy`);
CREATE INDEX `idx_sd_kh_madondangkygoc` ON `DonSuaDoi_NH_KH` (`maDonDangKyGoc`);
CREATE INDEX `idx_sd_kh_status_hantraloi` ON `DonSuaDoi_NH_KH` (`trangThaiDuyet`, `hanTraLoi`);

-- -----------------------------------------------------------------------------
-- 1.4 Bảng mới LichSuPhanHoiSuaDoi_NH_KH (1-N với DonSuaDoi_NH_KH)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LichSuPhanHoiSuaDoi_NH_KH` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `idDonSuaDoi` INT NOT NULL,
    `lanThongBao` INT NOT NULL DEFAULT 1,
    `soThongBao` VARCHAR(255) NULL,
    `ngayNhanThongBao` DATE NOT NULL,
    `hanTraLoi` DATE NOT NULL,
    `noiDungThongBao` TEXT NULL,
    `tenFileThongBao` VARCHAR(255) NULL,
    `linkFileThongBao` LONGTEXT NULL,
    `ngayTraLoi` DATE NULL,
    `noiDungTraLoi` TEXT NULL,
    `tenFileTraLoi` VARCHAR(255) NULL,
    `linkFileTraLoi` LONGTEXT NULL,
    `maNhanSuCapNhap` VARCHAR(255) NULL,
    `createdAt` DATETIME NOT NULL,
    `updatedAt` DATETIME NOT NULL,
    CONSTRAINT `fk_ls_ph_sd_kh_don` FOREIGN KEY (`idDonSuaDoi`) REFERENCES `DonSuaDoi_NH_KH` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX `idx_ls_ph_sd_kh_iddonsuadoi` ON `LichSuPhanHoiSuaDoi_NH_KH` (`idDonSuaDoi`);
CREATE INDEX `idx_ls_ph_sd_kh_hantraloi` ON `LichSuPhanHoiSuaDoi_NH_KH` (`hanTraLoi`);

-- =============================================================================
-- ROLLBACK (chạy thủ công theo thứ tự khi cần hoàn nguyên):
-- Lưu ý: Chỉ đổi lại NOT NULL khi đã chắc chắn không còn bản ghi NULL.
-- =============================================================================
-- DROP TABLE IF EXISTS `LichSuPhanHoiSuaDoi_NH_KH`;
-- DROP INDEX `idx_sd_kh_status_hantraloi` ON `DonSuaDoi_NH_KH`;
-- DROP INDEX `idx_sd_kh_madondangkygoc` ON `DonSuaDoi_NH_KH`;
-- DROP INDEX `idx_sd_kh_madondangky` ON `DonSuaDoi_NH_KH`;
-- ALTER TABLE `DonSuaDoi_NH_KH` DROP FOREIGN KEY `fk_sd_kh_guq`;
-- ALTER TABLE `DonSuaDoi_NH_KH`
--     DROP COLUMN `tuDongTuChoi`,
--     DROP COLUMN `hanTraLoi`,
--     DROP COLUMN `idGUQ`,
--     DROP COLUMN `maUyQuyen`,
--     DROP COLUMN `giayUyQuyenGoc`,
--     DROP COLUMN `ndSuaDoiNoiDungKhac`,
--     DROP COLUMN `duLieuThayDoi`,
--     DROP COLUMN `lyDoTuChoi`,
--     DROP COLUMN `ngayTuChoi`,
--     DROP COLUMN `ngayChapThuan`,
--     DROP COLUMN `trangThaiDuyet`;
-- ALTER TABLE `DonSuaDoi_NH_KH` MODIFY COLUMN `maDonDangKy` VARCHAR(255) NOT NULL;
-- ALTER TABLE `DonDangKyNhanHieu_KH` DROP COLUMN `laDonTiepNhan`;
-- ALTER TABLE `DonDangKyNhanHieu_KH` MODIFY COLUMN `maHoSoVuViec` VARCHAR(255) NOT NULL;
-- ALTER TABLE `DonDangKyNhanHieu_KH` MODIFY COLUMN `idKhachHang` INT NOT NULL;
