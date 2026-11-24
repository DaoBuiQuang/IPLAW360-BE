-- MySQL 8 / MariaDB. Run in the intended application database, in ONE session.
-- Scope: VN trademark applications filed from 2026-04-01, not soft-deleted.
-- Only deadlines matching the old automatic formula are changed.
-- No changes to actual dates, filing dates, appeal periods, or extension length.
-- Existing giaHan behavior is retained: it adds 3 calendar months.
-- Deploy the matching frontend fix first so old software cannot overwrite this.
-- Back up the database before applying. Do not run while users edit these cases.
-- Default ending is ROLLBACK (preview). Replace it with COMMIT to persist.
-- These are temporary tables; no permanent backup table is created here.

DROP TEMPORARY TABLE IF EXISTS tmp_vn_outcome_application;
DROP TEMPORARY TABLE IF EXISTS tmp_vn_outcome_refusal;

START TRANSACTION;

CREATE TEMPORARY TABLE tmp_vn_outcome_application AS
SELECT
    d.maDonDangKy, d.soDon, d.ngayNopDon,
    d.ngayTraLoiKQThamDinhND_DuKien AS old_response,
    CASE WHEN d.ngayTraLoiKQThamDinhND_DuKien = DATE_ADD(d.ngayKQThamDinhND, INTERVAL 3 MONTH)
        THEN DATE_ADD(d.ngayKQThamDinhND, INTERVAL 2 MONTH)
        ELSE d.ngayTraLoiKQThamDinhND_DuKien END AS new_response,
    d.hanNopYKien AS old_opinion,
    CASE WHEN d.trangThaiDYTBCapBang = 0
              AND d.hanNopYKien = DATE_ADD(d.ngayThongBaoCapBang, INTERVAL 3 MONTH)
        THEN DATE_ADD(d.ngayThongBaoCapBang, INTERVAL 2 MONTH)
        ELSE d.hanNopYKien END AS new_opinion,
    d.hanNopPhiCapBang AS old_fee,
    CASE
        WHEN d.trangThaiDYTBCapBang = 1
             AND d.hanNopPhiCapBang = DATE_ADD(d.ngayThongBaoCapBang, INTERVAL 3 MONTH)
            THEN DATE_ADD(d.ngayThongBaoCapBang, INTERVAL 2 MONTH)
        WHEN d.trangThaiDYTBCapBang = 0 AND d.ketQuaYKien = 1
             AND d.hanNopPhiCapBang = DATE_ADD(d.ngayNhanKQYKien, INTERVAL 3 MONTH)
            THEN DATE_ADD(d.ngayNhanKQYKien, INTERVAL 2 MONTH)
        ELSE d.hanNopPhiCapBang
    END AS new_fee
FROM DonDangKyNhanHieu d
WHERE d.ngayNopDon >= '2026-04-01' AND d.daXoa = 0;

-- On this codebase, ticking giaHan can also add 3 months to hanTraLoi.
-- Handle the two recognized automatic forms; leave custom dates untouched.
CREATE TEMPORARY TABLE tmp_vn_outcome_refusal AS
SELECT h.id, h.maDonDangKy, h.lanThamDinh,
    h.hanTraLoi AS old_response,
    CASE
        WHEN COALESCE(h.giaHan, 0) = 1
             AND h.hanTraLoi = DATE_ADD(DATE_ADD(h.ngayNhanThongBaoTuChoiTD, INTERVAL 3 MONTH), INTERVAL 3 MONTH)
            THEN DATE_ADD(DATE_ADD(h.ngayNhanThongBaoTuChoiTD, INTERVAL 2 MONTH), INTERVAL 3 MONTH)
        ELSE DATE_ADD(h.ngayNhanThongBaoTuChoiTD, INTERVAL 2 MONTH)
    END AS new_response,
    h.hanTraLoiGiaHan AS old_extension,
    h.hanTraLoiGiaHan AS new_extension
FROM LichSuThamDinh h
JOIN DonDangKyNhanHieu d ON d.maDonDangKy = h.maDonDangKy
WHERE d.ngayNopDon >= '2026-04-01' AND d.daXoa = 0
    AND h.loaiThamDinh = 'NoiDung'
    AND (
        h.hanTraLoi = DATE_ADD(h.ngayNhanThongBaoTuChoiTD, INTERVAL 3 MONTH)
        OR (COALESCE(h.giaHan, 0) = 1
            AND h.hanTraLoi = DATE_ADD(DATE_ADD(h.ngayNhanThongBaoTuChoiTD, INTERVAL 3 MONTH), INTERVAL 3 MONTH))
    );

-- Move only extension deadlines that exactly match the existing +3 formula.
UPDATE tmp_vn_outcome_refusal
SET new_extension = DATE_ADD(new_response, INTERVAL 3 MONTH)
WHERE old_extension = DATE_ADD(old_response, INTERVAL 3 MONTH);

-- 1. Preview application deadlines (old -> new).
SELECT * FROM tmp_vn_outcome_application
WHERE NOT (old_response <=> new_response)
   OR NOT (old_opinion <=> new_opinion)
   OR NOT (old_fee <=> new_fee)
ORDER BY ngayNopDon, maDonDangKy;

-- 2. Preview refusal/extension deadlines (old -> new).
SELECT * FROM tmp_vn_outcome_refusal ORDER BY maDonDangKy, lanThamDinh;

-- 3. Refusal rows with nonstandard/missing dates: review separately.
SELECT h.id, h.maDonDangKy, h.lanThamDinh,
       h.ngayNhanThongBaoTuChoiTD, h.giaHan, h.hanTraLoi, h.hanTraLoiGiaHan
FROM LichSuThamDinh h
JOIN DonDangKyNhanHieu d ON d.maDonDangKy = h.maDonDangKy
LEFT JOIN tmp_vn_outcome_refusal p ON p.id = h.id
WHERE d.ngayNopDon >= '2026-04-01' AND d.daXoa = 0
  AND h.loaiThamDinh = 'NoiDung'
  AND (
      (p.id IS NULL AND NOT (h.hanTraLoi <=> DATE_ADD(h.ngayNhanThongBaoTuChoiTD, INTERVAL 2 MONTH))
          AND NOT (COALESCE(h.giaHan, 0) = 1 AND h.hanTraLoi <=> DATE_ADD(DATE_ADD(h.ngayNhanThongBaoTuChoiTD, INTERVAL 2 MONTH), INTERVAL 3 MONTH)))
      OR (p.id IS NOT NULL AND p.old_extension IS NOT NULL AND p.old_extension <=> p.new_extension)
  );

-- 4. Sync the list's cached deadline only if it points to the changed source.
UPDATE DonDangKyNhanHieu d
JOIN tmp_vn_outcome_application p ON p.maDonDangKy = d.maDonDangKy
SET d.hanTraLoi = CASE
        WHEN p.old_fee IS NOT NULL AND d.hanTraLoi = p.old_fee THEN p.new_fee
        WHEN p.old_opinion IS NOT NULL AND d.hanTraLoi = p.old_opinion
             AND d.hanNopPhiCapBang IS NULL AND d.ngayNopYKien IS NULL THEN p.new_opinion
        ELSE d.hanTraLoi END,
    d.updatedAt = NOW()
WHERE d.trangThaiDon = 'Hoàn tất nhận bằng'
    AND (d.soBang IS NULL OR d.soBang = '') AND d.ngayNopPhiCapBang IS NULL
    AND (
        (p.old_fee IS NOT NULL AND d.hanTraLoi = p.old_fee AND NOT (p.old_fee <=> p.new_fee))
        OR (p.old_opinion IS NOT NULL AND d.hanTraLoi = p.old_opinion
            AND d.hanNopPhiCapBang IS NULL AND d.ngayNopYKien IS NULL
            AND NOT (p.old_opinion <=> p.new_opinion))
    );

-- Only the latest substantive examination round supplies the active deadline.
-- Use a derived table to avoid MySQL target-table update restrictions.
UPDATE DonDangKyNhanHieu d
JOIN tmp_vn_outcome_refusal p ON p.maDonDangKy = d.maDonDangKy
JOIN (
    SELECT maDonDangKy, MAX(lanThamDinh) AS latest_round
    FROM LichSuThamDinh WHERE loaiThamDinh = 'NoiDung'
    GROUP BY maDonDangKy
) latest ON latest.maDonDangKy = p.maDonDangKy AND latest.latest_round = p.lanThamDinh
SET d.hanTraLoi = CASE
        WHEN p.old_extension IS NOT NULL AND d.hanTraLoi = p.old_extension THEN p.new_extension
        ELSE p.new_response END,
    d.updatedAt = NOW()
WHERE d.trangThaiDon = 'Thẩm định nội dung'
    AND (d.soBang IS NULL OR d.soBang = '')
    AND (
        (p.old_extension IS NOT NULL AND d.hanTraLoi = p.old_extension AND NOT (p.old_extension <=> p.new_extension))
        OR (p.old_extension IS NULL AND d.hanTraLoi = p.old_response AND NOT (p.old_response <=> p.new_response))
    );

-- 5. Persist the three source fields on the application.
UPDATE DonDangKyNhanHieu d
JOIN tmp_vn_outcome_application p ON p.maDonDangKy = d.maDonDangKy
SET d.ngayTraLoiKQThamDinhND_DuKien = p.new_response,
    d.hanNopYKien = p.new_opinion,
    d.hanNopPhiCapBang = p.new_fee,
    d.updatedAt = NOW()
WHERE NOT (p.old_response <=> p.new_response)
   OR NOT (p.old_opinion <=> p.new_opinion)
   OR NOT (p.old_fee <=> p.new_fee);
SELECT ROW_COUNT() AS updated_applications;

-- 6. Persist substantive refusal deadlines, preserving custom extension dates.
UPDATE LichSuThamDinh h
JOIN tmp_vn_outcome_refusal p ON p.id = h.id
SET h.hanTraLoi = p.new_response,
    h.hanTraLoiGiaHan = p.new_extension,
    h.updatedAt = NOW();
SELECT ROW_COUNT() AS updated_refusal_rounds;

-- Preview run: nothing is persisted. To apply, replace ROLLBACK with COMMIT.
ROLLBACK;
-- COMMIT;

DROP TEMPORARY TABLE IF EXISTS tmp_vn_outcome_application;
DROP TEMPORARY TABLE IF EXISTS tmp_vn_outcome_refusal;
