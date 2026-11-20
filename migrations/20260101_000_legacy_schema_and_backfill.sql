-- =============================================================================
-- Migration: Tách toàn bộ DDL & Backfill dữ liệu cũ (legacy) ra khỏi index.js
-- Date     : 2026-01-01 (Baseline legacy — chạy trước các migration 20261120_*)
-- DB       : MySQL 8.x / MariaDB 10.x
-- Chạy qua : npm run migrate
-- Lưu ý    : Mỗi ADD COLUMN tách riêng 1 câu ALTER TABLE để runner bỏ qua lỗi
--            1060 (Duplicate column) theo từng cột mà không bỏ sót cột còn lại.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. DanhSachCongViec: cột isSystem + index + backfill bản ghi cũ
-- -----------------------------------------------------------------------------
ALTER TABLE `DanhSachCongViec` ADD COLUMN `isSystem` TINYINT(1) NOT NULL DEFAULT 0;

UPDATE `DanhSachCongViec` SET `isSystem` = 1 WHERE `maNhanSu` IS NULL;

UPDATE `DanhSachCongViec` d
LEFT JOIN `Auth` a ON d.`maNhanSu` = a.`maNhanSu`
SET d.`isSystem` = 1
WHERE LOWER(a.`Role`) IN ('admin', 'ceo') OR d.`maNhanSu` = 'admin';

UPDATE `DanhSachCongViec` SET `isSystem` = 0 WHERE `isSystem` IS NULL;

CREATE INDEX `idx_ds_cong_viec_is_system` ON `DanhSachCongViec` (`isSystem`);

-- -----------------------------------------------------------------------------
-- 2. TimeSheets: cột contributionPercentage + backfill NULL -> 0.00
-- -----------------------------------------------------------------------------
ALTER TABLE `TimeSheets` ADD COLUMN `contributionPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

UPDATE `TimeSheets` SET `contributionPercentage` = 0.00 WHERE `contributionPercentage` IS NULL;

-- -----------------------------------------------------------------------------
-- 3. gcn_nh: cột phả hệ (loaiBang, bangGoc, idGCN_NH_Goc) + index
-- -----------------------------------------------------------------------------
ALTER TABLE `gcn_nh` ADD COLUMN `loaiBang` INT NULL DEFAULT 1;
ALTER TABLE `gcn_nh` ADD COLUMN `bangGoc` TINYINT(1) NULL DEFAULT 0;
ALTER TABLE `gcn_nh` ADD COLUMN `idGCN_NH_Goc` INT NULL DEFAULT NULL;

CREATE INDEX `idx_gcn_nh_idgcngoc` ON `gcn_nh` (`idGCN_NH_Goc`);

-- -----------------------------------------------------------------------------
-- 4. 4 bảng Tờ khai Sửa đổi & Chuyển nhượng: nullable + 5 cột duyệt + index
-- -----------------------------------------------------------------------------
ALTER TABLE `DonSuaDoi_NH_VN` MODIFY COLUMN `maDonDangKy` VARCHAR(255) NULL;
ALTER TABLE `DonCQSH_VN` MODIFY COLUMN `maDonDangKy` VARCHAR(255) NULL;
ALTER TABLE `DonCQSH_VN` MODIFY COLUMN `idKhachHang` INT NULL;
ALTER TABLE `DonSuaDoiGCN_NH_VN` MODIFY COLUMN `idGCN_NH` INT NULL;
ALTER TABLE `DonCQSH_GCN_VN` MODIFY COLUMN `idGCN_NH` INT NULL;
ALTER TABLE `DonCQSH_GCN_VN` MODIFY COLUMN `idKhachHang` INT NULL;

-- DonSuaDoi_NH_VN
ALTER TABLE `DonSuaDoi_NH_VN` ADD COLUMN `trangThaiDuyet` INT NOT NULL DEFAULT 0;
ALTER TABLE `DonSuaDoi_NH_VN` ADD COLUMN `ngayChapThuan` DATE NULL DEFAULT NULL;
ALTER TABLE `DonSuaDoi_NH_VN` ADD COLUMN `ngayTuChoi` DATE NULL DEFAULT NULL;
ALTER TABLE `DonSuaDoi_NH_VN` ADD COLUMN `lyDoTuChoi` TEXT NULL;
ALTER TABLE `DonSuaDoi_NH_VN` ADD COLUMN `duLieuThayDoi` JSON NULL;

-- DonCQSH_VN
ALTER TABLE `DonCQSH_VN` ADD COLUMN `trangThaiDuyet` INT NOT NULL DEFAULT 0;
ALTER TABLE `DonCQSH_VN` ADD COLUMN `ngayChapThuan` DATE NULL DEFAULT NULL;
ALTER TABLE `DonCQSH_VN` ADD COLUMN `ngayTuChoi` DATE NULL DEFAULT NULL;
ALTER TABLE `DonCQSH_VN` ADD COLUMN `lyDoTuChoi` TEXT NULL;
ALTER TABLE `DonCQSH_VN` ADD COLUMN `duLieuThayDoi` JSON NULL;

-- DonSuaDoiGCN_NH_VN
ALTER TABLE `DonSuaDoiGCN_NH_VN` ADD COLUMN `trangThaiDuyet` INT NOT NULL DEFAULT 0;
ALTER TABLE `DonSuaDoiGCN_NH_VN` ADD COLUMN `ngayChapThuan` DATE NULL DEFAULT NULL;
ALTER TABLE `DonSuaDoiGCN_NH_VN` ADD COLUMN `ngayTuChoi` DATE NULL DEFAULT NULL;
ALTER TABLE `DonSuaDoiGCN_NH_VN` ADD COLUMN `lyDoTuChoi` TEXT NULL;
ALTER TABLE `DonSuaDoiGCN_NH_VN` ADD COLUMN `duLieuThayDoi` JSON NULL;

-- DonCQSH_GCN_VN
ALTER TABLE `DonCQSH_GCN_VN` ADD COLUMN `trangThaiDuyet` INT NOT NULL DEFAULT 0;
ALTER TABLE `DonCQSH_GCN_VN` ADD COLUMN `ngayChapThuan` DATE NULL DEFAULT NULL;
ALTER TABLE `DonCQSH_GCN_VN` ADD COLUMN `ngayTuChoi` DATE NULL DEFAULT NULL;
ALTER TABLE `DonCQSH_GCN_VN` ADD COLUMN `lyDoTuChoi` TEXT NULL;
ALTER TABLE `DonCQSH_GCN_VN` ADD COLUMN `duLieuThayDoi` JSON NULL;

-- Backfill trạng thái đã duyệt cho tờ khai cũ đã sinh đơn/bằng con
UPDATE `DonSuaDoi_NH_VN`
SET `trangThaiDuyet` = 1
WHERE `maDonDangKy` IS NOT NULL AND TRIM(`maDonDangKy`) <> '' AND (`trangThaiDuyet` IS NULL OR `trangThaiDuyet` = 0);

UPDATE `DonCQSH_VN`
SET `trangThaiDuyet` = 1
WHERE `maDonDangKy` IS NOT NULL AND TRIM(`maDonDangKy`) <> '' AND (`trangThaiDuyet` IS NULL OR `trangThaiDuyet` = 0);

UPDATE `DonSuaDoiGCN_NH_VN`
SET `trangThaiDuyet` = 1
WHERE `idGCN_NH` IS NOT NULL AND (`trangThaiDuyet` IS NULL OR `trangThaiDuyet` = 0);

UPDATE `DonCQSH_GCN_VN`
SET `trangThaiDuyet` = 1
WHERE `idGCN_NH` IS NOT NULL AND (`trangThaiDuyet` IS NULL OR `trangThaiDuyet` = 0);

-- Chỉnh loaiDon = 4 cho đơn chuyển quyền đang gán nhầm loaiDon = 3
UPDATE `DonDangKyNhanHieu` d
INNER JOIN `DonCQSH_VN` cq ON d.`maDonDangKy` = cq.`maDonDangKy`
SET d.`loaiDon` = 4
WHERE d.`loaiDon` = 3;

-- Index hiệu năng cho truy vấn phả hệ
CREATE INDEX `idx_sd_don_madongoc` ON `DonSuaDoi_NH_VN` (`maDonDangKyGoc`);
CREATE INDEX `idx_sd_don_trangthaiduyet` ON `DonSuaDoi_NH_VN` (`trangThaiDuyet`);
CREATE INDEX `idx_cq_don_trangthaiduyet` ON `DonCQSH_VN` (`trangThaiDuyet`);
CREATE INDEX `idx_sd_gcn_trangthaiduyet` ON `DonSuaDoiGCN_NH_VN` (`trangThaiDuyet`);
CREATE INDEX `idx_cq_gcn_trangthaiduyet` ON `DonCQSH_GCN_VN` (`trangThaiDuyet`);

-- -----------------------------------------------------------------------------
-- 5. Backfill ngày hết hạn (+10 năm) & hạn gia hạn (+9.5 năm) cho GCN VN & KH
-- -----------------------------------------------------------------------------
UPDATE `gcn_nh`
SET `ngayHetHanBang` = DATE_ADD(`ngayNopDon`, INTERVAL 10 YEAR)
WHERE `ngayHetHanBang` IS NULL AND `ngayNopDon` IS NOT NULL;

UPDATE `gcn_nh`
SET `hanGiaHan` = DATE_ADD(DATE_ADD(`ngayNopDon`, INTERVAL 9 YEAR), INTERVAL 6 MONTH)
WHERE `hanGiaHan` IS NULL AND `ngayNopDon` IS NOT NULL;

UPDATE `GCN_NH_KH`
SET `ngayHetHanBang` = DATE_ADD(`ngayNopDon`, INTERVAL 10 YEAR)
WHERE `ngayHetHanBang` IS NULL AND `ngayNopDon` IS NOT NULL;

UPDATE `GCN_NH_KH`
SET `hanGiaHan` = DATE_ADD(DATE_ADD(`ngayNopDon`, INTERVAL 9 YEAR), INTERVAL 6 MONTH)
WHERE `hanGiaHan` IS NULL AND `ngayNopDon` IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. GCN_NH_KH & Affidavit: nullable + các trường tuyên thệ
-- -----------------------------------------------------------------------------
ALTER TABLE `GCN_NH_KH` MODIFY COLUMN `idKhachHang` INT NULL;
ALTER TABLE `GCN_NH_KH` MODIFY COLUMN `maNhanHieu` INT NULL;
ALTER TABLE `GCN_NH_KH` ADD COLUMN `ngayNopYCTuyenThe` DATE NULL;
ALTER TABLE `GCN_NH_KH` ADD COLUMN `loaiTuyenThe` VARCHAR(255) NULL;
ALTER TABLE `GCN_NH_KH` ADD COLUMN `ngayGhiNhanTuyenThe` DATE NULL;

ALTER TABLE `Affidavit` ADD COLUMN `loaiTuyenThe` VARCHAR(255) NULL;

-- -----------------------------------------------------------------------------
-- 7. DonDangKyNhanHieu_KH: backfill loaiDon (2: sửa đổi, 3: tách, 1: mới)
-- -----------------------------------------------------------------------------
UPDATE `DonDangKyNhanHieu_KH` d
INNER JOIN `DonSuaDoi_NH_KH` sd ON d.`maDonDangKy` = sd.`maDonDangKy`
SET d.`loaiDon` = 2
WHERE d.`loaiDon` IS NULL OR d.`loaiDon` = 0;

UPDATE `DonDangKyNhanHieu_KH` d
INNER JOIN `DonTachNH_KH` td ON d.`maDonDangKy` = td.`maDonDangKy`
SET d.`loaiDon` = 3
WHERE d.`loaiDon` IS NULL OR d.`loaiDon` = 0;

UPDATE `DonDangKyNhanHieu_KH` d
LEFT JOIN `DonSuaDoi_NH_KH` sd ON d.`maDonDangKy` = sd.`maDonDangKy`
LEFT JOIN `DonTachNH_KH` td ON d.`maDonDangKy` = td.`maDonDangKy`
SET d.`loaiDon` = 1
WHERE (d.`loaiDon` IS NULL OR d.`loaiDon` = 0)
  AND sd.`maDonDangKy` IS NULL
  AND td.`maDonDangKy` IS NULL;

-- =============================================================================
-- ROLLBACK:
-- Đây là baseline migration hợp nhất toàn bộ schema & backfill cũ đã tồn tại
-- trong ứng dụng (trước đây nằm trong src/models/index.js).
-- Không khuyến nghị DROP các cột/index nền tảng này trên DB đang vận hành;
-- khi cần hoàn nguyên môi trường, hãy restore từ bản backup DB trước khi chạy.
-- =============================================================================
