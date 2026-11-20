-- =============================================================================
-- Migration: Đơn sửa đổi NH VN - Chi tiết (Mẫu 10) + Vòng phản hồi với Cục SHTT
-- Date     : 2026-11-20
-- DB       : MySQL 8.x / MariaDB 10.x
-- Lưu ý    : syncDatabase() trong src/models/index.js cũng tự bảo đảm các cột/index
--            này (idempotent). File này dùng cho môi trường deploy thủ công.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 Bổ sung cột cho DonSuaDoi_NH_VN
-- -----------------------------------------------------------------------------
ALTER TABLE `DonSuaDoi_NH_VN`
    ADD COLUMN `ndSuaDoiNoiDungKhac` TEXT NULL COMMENT 'Nội dung chi tiết khi tick suaDoiNoiDungKhac',
    ADD COLUMN `giayUyQuyenGoc` TINYINT(1) NULL COMMENT 'GUQ bản gốc (1) / bản sao (0) của tờ khai sửa đổi',
    ADD COLUMN `maUyQuyen` VARCHAR(255) NULL COMMENT 'Số đơn chứa GUQ gốc (nếu dùng bản sao)',
    ADD COLUMN `idGUQ` INT NULL COMMENT 'FK GiayUyQuyen(id)',
    ADD COLUMN `hanTraLoi` DATE NULL COMMENT 'Hạn trả lời Cục hiện hành của vòng thông báo mới nhất chưa trả lời',
    ADD COLUMN `tuDongTuChoi` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = hệ thống tự chuyển Từ chối do quá hạn trả lời';

ALTER TABLE `DonSuaDoi_NH_VN`
    ADD CONSTRAINT `fk_sd_don_guq` FOREIGN KEY (`idGUQ`) REFERENCES `GiayUyQuyen` (`id`) ON DELETE SET NULL;

CREATE INDEX `idx_sd_don_madondangky` ON `DonSuaDoi_NH_VN` (`maDonDangKy`);
CREATE INDEX `idx_sd_don_status_hantraloi` ON `DonSuaDoi_NH_VN` (`trangThaiDuyet`, `hanTraLoi`);

-- Dọn dữ liệu cũ: đơn Chờ (0) / Từ chối (2) không được còn ngày ghi nhận / chấp thuận
UPDATE `DonSuaDoi_NH_VN`
SET `ngayGhiNhanSuaDoi` = NULL, `ngayChapThuan` = NULL
WHERE `trangThaiDuyet` IN (0, 2)
  AND (`ngayGhiNhanSuaDoi` IS NOT NULL OR `ngayChapThuan` IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 1.2 Bảng mới LichSuPhanHoiSuaDoi_NH_VN (1-N với DonSuaDoi_NH_VN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `LichSuPhanHoiSuaDoi_NH_VN` (
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
    CONSTRAINT `fk_ls_ph_sd_don` FOREIGN KEY (`idDonSuaDoi`) REFERENCES `DonSuaDoi_NH_VN` (`id`) ON DELETE CASCADE,
    INDEX `idx_ls_ph_sd_iddonsuadoi` (`idDonSuaDoi`),
    INDEX `idx_ls_ph_sd_hantraloi` (`hanTraLoi`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Index tạo riêng (phòng trường hợp bảng đã được sequelize.sync() tạo trước, không có index)
CREATE INDEX `idx_ls_ph_sd_iddonsuadoi` ON `LichSuPhanHoiSuaDoi_NH_VN` (`idDonSuaDoi`);
CREATE INDEX `idx_ls_ph_sd_hantraloi` ON `LichSuPhanHoiSuaDoi_NH_VN` (`hanTraLoi`);

-- Đồng bộ hanTraLoi ban đầu cho các đơn đang chờ (nếu đã có vòng phản hồi)
UPDATE `DonSuaDoi_NH_VN` d
JOIN (
    SELECT p.idDonSuaDoi, p.hanTraLoi
    FROM `LichSuPhanHoiSuaDoi_NH_VN` p
    JOIN (
        SELECT idDonSuaDoi, MAX(lanThongBao) AS maxLan
        FROM `LichSuPhanHoiSuaDoi_NH_VN`
        WHERE ngayTraLoi IS NULL
        GROUP BY idDonSuaDoi
    ) m ON m.idDonSuaDoi = p.idDonSuaDoi AND m.maxLan = p.lanThongBao
) x ON x.idDonSuaDoi = d.id
SET d.hanTraLoi = x.hanTraLoi
WHERE d.trangThaiDuyet = 0;

-- =============================================================================
-- ROLLBACK (chạy thủ công theo thứ tự):
-- =============================================================================
-- DROP TABLE IF EXISTS `LichSuPhanHoiSuaDoi_NH_VN`;
-- DROP INDEX `idx_sd_don_status_hantraloi` ON `DonSuaDoi_NH_VN`;
-- DROP INDEX `idx_sd_don_madondangky` ON `DonSuaDoi_NH_VN`;
-- ALTER TABLE `DonSuaDoi_NH_VN` DROP FOREIGN KEY `fk_sd_don_guq`;
-- ALTER TABLE `DonSuaDoi_NH_VN`
--     DROP COLUMN `tuDongTuChoi`,
--     DROP COLUMN `hanTraLoi`,
--     DROP COLUMN `idGUQ`,
--     DROP COLUMN `maUyQuyen`,
--     DROP COLUMN `giayUyQuyenGoc`,
--     DROP COLUMN `ndSuaDoiNoiDungKhac`;
-- (Việc dọn ngayGhiNhanSuaDoi / ngayChapThuan của đơn 0/2 không thể hoàn nguyên.)
