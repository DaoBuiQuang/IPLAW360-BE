-- =============================================================================
-- Migration: Nâng cấp Đơn Chuyển quyền sở hữu NH (VN & KH) theo Mẫu số 11
--            + Vòng phản hồi với Cục SHTT (VN & KH) + Tách đơn KH
-- Date     : 2026-11-20
-- DB       : MySQL 8.x / MariaDB 10.x
-- Chạy qua : npm run migrate
-- Lưu ý    : Mỗi ADD COLUMN tách riêng 1 câu ALTER TABLE để idempotent tối đa.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 Bảng DonCQSH_VN: nâng cấp tương đồng DonSuaDoi_NH_VN & Mẫu số 11
-- -----------------------------------------------------------------------------
ALTER TABLE `DonCQSH_VN` MODIFY COLUMN `maDonDangKy` VARCHAR(255) NULL;
ALTER TABLE `DonCQSH_VN` MODIFY COLUMN `idKhachHang` INT NULL;

ALTER TABLE `DonCQSH_VN` ADD COLUMN `maHoSo` VARCHAR(255) NULL;
ALTER TABLE `DonCQSH_VN` ADD COLUMN `loaiThayDoi` VARCHAR(50) NOT NULL DEFAULT 'CHUYEN_NHUONG' COMMENT 'CHUYEN_NHUONG: Chuyển nhượng đơn | THUA_KE_KE_THUA: Thừa kế, kế thừa hoặc QĐ cơ quan có thẩm quyền';
ALTER TABLE `DonCQSH_VN` ADD COLUMN `giayUyQuyenGoc` TINYINT(1) NULL COMMENT 'GUQ bản gốc (1) / bản sao (0)';
ALTER TABLE `DonCQSH_VN` ADD COLUMN `maUyQuyen` VARCHAR(255) NULL COMMENT 'Số đơn chứa GUQ gốc nếu dùng bản sao';
ALTER TABLE `DonCQSH_VN` ADD COLUMN `idGUQ` INT NULL COMMENT 'FK GiayUyQuyen(id)';
ALTER TABLE `DonCQSH_VN` ADD COLUMN `hanTraLoi` DATE NULL COMMENT 'Hạn trả lời Cục hiện hành của vòng thông báo mới nhất chưa trả lời';
ALTER TABLE `DonCQSH_VN` ADD COLUMN `tuDongTuChoi` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = hệ thống tự chuyển Từ chối do quá hạn trả lời';

ALTER TABLE `DonCQSH_VN`
    ADD CONSTRAINT `fk_cq_vn_guq` FOREIGN KEY (`idGUQ`) REFERENCES `GiayUyQuyen` (`id`) ON DELETE SET NULL;

-- Backfill maHoSo từ DonDangKyNhanHieu theo maDonDangKyGoc
UPDATE `DonCQSH_VN` cq
INNER JOIN `DonDangKyNhanHieu` d ON cq.`maDonDangKyGoc` = d.`maDonDangKy`
SET cq.`maHoSo` = COALESCE(NULLIF(TRIM(d.`maHoSo`), ''), NULLIF(TRIM(d.`maHoSoVuViec`), ''))
WHERE cq.`maHoSo` IS NULL;

-- Backfill dữ liệu lịch sử: tờ khai đã sinh đơn con nhưng trangThaiDuyet = 0 -> 1
UPDATE `DonCQSH_VN`
SET `trangThaiDuyet` = 1,
    `ngayChapThuan` = COALESCE(`ngayChapThuan`, `ngayGhiNhanCQ`, DATE(`createdAt`))
WHERE `maDonDangKy` IS NOT NULL AND TRIM(`maDonDangKy`) <> ''
  AND (`trangThaiDuyet` IS NULL OR `trangThaiDuyet` = 0);

-- Dọn toàn vẹn: đơn Chờ (0) / Từ chối (2) không còn sót ngày ghi nhận / ngày chấp thuận
UPDATE `DonCQSH_VN`
SET `ngayGhiNhanCQ` = NULL,
    `ngayChapThuan` = NULL
WHERE `trangThaiDuyet` IN (0, 2)
  AND (`ngayGhiNhanCQ` IS NOT NULL OR `ngayChapThuan` IS NOT NULL);

CREATE INDEX `idx_cq_vn_madondangky` ON `DonCQSH_VN` (`maDonDangKy`);
CREATE INDEX `idx_cq_vn_madondangkygoc` ON `DonCQSH_VN` (`maDonDangKyGoc`);
CREATE INDEX `idx_cq_vn_status_hantraloi` ON `DonCQSH_VN` (`trangThaiDuyet`, `hanTraLoi`);

-- -----------------------------------------------------------------------------
-- 1.2 Bảng mới LichSuPhanHoiCQSH_NH_VN (1-N với DonCQSH_VN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LichSuPhanHoiCQSH_NH_VN` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `idDonCQSH` INT NOT NULL,
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
    CONSTRAINT `fk_ls_ph_cq_vn_don` FOREIGN KEY (`idDonCQSH`) REFERENCES `DonCQSH_VN` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX `idx_ls_ph_cq_vn_iddon` ON `LichSuPhanHoiCQSH_NH_VN` (`idDonCQSH`);
CREATE INDEX `idx_ls_ph_cq_vn_hantraloi` ON `LichSuPhanHoiCQSH_NH_VN` (`hanTraLoi`);

-- -----------------------------------------------------------------------------
-- 1.3 Bảng mới DonCQSH_KH (Chuyển quyền sở hữu Đơn đăng ký NH Campuchia)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `DonCQSH_KH` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `maHoSo` VARCHAR(255) NULL,
    `maDonDangKy` VARCHAR(255) NULL,
    `maDonDangKyGoc` VARCHAR(255) NOT NULL,
    `idKhachHang` INT NULL,
    `soDon` VARCHAR(255) NULL,
    `loaiThayDoi` VARCHAR(50) NOT NULL DEFAULT 'CHUYEN_NHUONG' COMMENT 'CHUYEN_NHUONG | THUA_KE_KE_THUA',
    `noiDung` TEXT NULL,
    `moTa` TEXT NULL,
    `ngayYeuCau` DATE NULL,
    `ngayGhiNhanCQ` DATE NULL,
    `lanChuyenQuyen` INT NULL DEFAULT 1,
    `trangThaiDuyet` INT NOT NULL DEFAULT 0 COMMENT '0: Chưa chấp thuận, 1: Được chấp thuận, 2: Từ chối',
    `ngayChapThuan` DATE NULL,
    `ngayTuChoi` DATE NULL,
    `lyDoTuChoi` TEXT NULL,
    `duLieuThayDoi` JSON NULL,
    `giayUyQuyenGoc` TINYINT(1) NULL,
    `maUyQuyen` VARCHAR(255) NULL,
    `idGUQ` INT NULL,
    `hanTraLoi` DATE NULL,
    `tuDongTuChoi` TINYINT(1) NOT NULL DEFAULT 0,
    `maNhanSuCapNhap` VARCHAR(255) NULL,
    `isAutoImport` TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL,
    `updatedAt` DATETIME NOT NULL,
    CONSTRAINT `fk_cq_kh_donmoi` FOREIGN KEY (`maDonDangKy`) REFERENCES `DonDangKyNhanHieu_KH` (`maDonDangKy`) ON DELETE SET NULL,
    CONSTRAINT `fk_cq_kh_dongoc` FOREIGN KEY (`maDonDangKyGoc`) REFERENCES `DonDangKyNhanHieu_KH` (`maDonDangKy`) ON DELETE RESTRICT,
    CONSTRAINT `fk_cq_kh_khachhang` FOREIGN KEY (`idKhachHang`) REFERENCES `KhachHangCuoi` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_cq_kh_guq` FOREIGN KEY (`idGUQ`) REFERENCES `GiayUyQuyen` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX `idx_cq_kh_madondangky` ON `DonCQSH_KH` (`maDonDangKy`);
CREATE INDEX `idx_cq_kh_madondangkygoc` ON `DonCQSH_KH` (`maDonDangKyGoc`);
CREATE INDEX `idx_cq_kh_status_hantraloi` ON `DonCQSH_KH` (`trangThaiDuyet`, `hanTraLoi`);

-- -----------------------------------------------------------------------------
-- 1.4 Bảng mới LichSuPhanHoiCQSH_NH_KH (1-N với DonCQSH_KH)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LichSuPhanHoiCQSH_NH_KH` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `idDonCQSH` INT NOT NULL,
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
    CONSTRAINT `fk_ls_ph_cq_kh_don` FOREIGN KEY (`idDonCQSH`) REFERENCES `DonCQSH_KH` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX `idx_ls_ph_cq_kh_iddon` ON `LichSuPhanHoiCQSH_NH_KH` (`idDonCQSH`);
CREATE INDEX `idx_ls_ph_cq_kh_hantraloi` ON `LichSuPhanHoiCQSH_NH_KH` (`hanTraLoi`);

-- =============================================================================
-- ROLLBACK (chạy thủ công theo thứ tự khi cần hoàn nguyên):
-- =============================================================================
-- DROP TABLE IF EXISTS `LichSuPhanHoiCQSH_NH_KH`;
-- DROP TABLE IF EXISTS `DonCQSH_KH`;
-- DROP TABLE IF EXISTS `LichSuPhanHoiCQSH_NH_VN`;
-- DROP INDEX `idx_cq_vn_status_hantraloi` ON `DonCQSH_VN`;
-- DROP INDEX `idx_cq_vn_madondangkygoc` ON `DonCQSH_VN`;
-- DROP INDEX `idx_cq_vn_madondangky` ON `DonCQSH_VN`;
-- ALTER TABLE `DonCQSH_VN` DROP FOREIGN KEY `fk_cq_vn_guq`;
-- ALTER TABLE `DonCQSH_VN`
--     DROP COLUMN `tuDongTuChoi`,
--     DROP COLUMN `hanTraLoi`,
--     DROP COLUMN `idGUQ`,
--     DROP COLUMN `maUyQuyen`,
--     DROP COLUMN `giayUyQuyenGoc`,
--     DROP COLUMN `loaiThayDoi`,
--     DROP COLUMN `maHoSo`;
