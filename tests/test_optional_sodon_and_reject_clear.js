/**
 * Kiểm thử 4 kịch bản:
 * 1. Tạo Đơn sửa đổi (VN & KH) không tick mục nào -> HTTP 400 "Vui lòng chọn ít nhất một mục cần sửa đổi!" (kể cả khi update bỏ hết tất cả mục -> 400).
 * 2. Tạo Đơn sửa đổi (có tick >= 1 mục) & Đơn chuyển quyền (VN & KH) để trống soDonSD / soDonChuyenQuyen -> DB lưu soDon = NULL (không lấy donCu.soDon).
 * 3. /update với trangThaiDuyet = 1 kèm soDonSD = "SĐ4-2026-01999" / soDonChuyenQuyen = "CĐ4-2025-01345" -> tờ khai lưu số mới, đơn con vẫn giữ nguyên donCu.soDon.
 * 4. /update sang trangThaiDuyet = 2 (Từ chối) & autoRejectExpired* -> tờ khai soDon = NULL, /list trả soDonSD/soDonCQ = null nhưng soDonGoc giữ nguyên.
 * Chạy: node tests/test_optional_sodon_and_reject_clear.js
 */
import assert from "node:assert/strict";
import { sequelize } from "../src/config/db.js";
import {
    syncDatabase,
    DonDangKy,
    DonDK_SPDV,
    DonSuaDoi_NH_VN,
    DonCQSH_VN,
    DonDangKyNhanHieu_KH,
    DonDK_SPDV_KH,
    DonSuaDoi_NH_KH,
    DonCQSH_KH,
    KhachHangCuoi,
    NhanHieu,
} from "../src/models/index.js";
import {
    addApplicationSDNHVN,
    updateApplicationSD_VN,
    getAllApplicationSD_VN,
    autoRejectExpiredDonSuaDoi,
} from "../src/controllers/NH_VN_SD/donSuaDoi_NH_VNController.js";
import {
    addApplicationSDNHKH,
    updateApplicationSD_KH,
    getAllApplicationSD_KH,
    autoRejectExpiredDonSuaDoi_KH,
} from "../src/controllers/KH/donSuaDoi_NH_KHController.js";
import {
    addApplicationCQNHVN,
    updateApplicationCQ_VN,
    getAllApplicationCQ_VN,
    autoRejectExpiredDonCQSH_VN,
} from "../src/controllers/NH_CQSH/donCQSH_NHController.js";
import {
    addApplicationCQNHKH,
    updateApplicationCQ_KH,
    getAllApplicationCQ_KH,
    autoRejectExpiredDonCQSH_KH,
} from "../src/controllers/KH/donCQSH_NH_KHController.js";

const call = async (handler, body = {}, params = {}) => {
    let out = { status: 200, body: null };
    const res = {
        status(c) {
            out.status = c;
            return this;
        },
        json(b) {
            out.body = b;
            return this;
        },
    };
    await handler({ body, params, query: {}, user: { maNhanSu: "TEST_SDCQ", role: "admin" } }, res);
    return out;
};

const addDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

const cleanup = { sdVn: [], sdKh: [], cqVn: [], cqKh: [], donVn: [], donKh: [] };

async function main() {
    await sequelize.authenticate();
    await syncDatabase();

    const khList = await KhachHangCuoi.findAll({ limit: 2 });
    const nh = await NhanHieu.findOne();
    assert.ok(khList.length >= 2 && nh, "Cần ít nhất 2 KhachHangCuoi và 1 NhanHieu");
    const [kh1, kh2] = khList;
    const stamp = Date.now();

    const maVn1 = `TOPT_VN1_${stamp}`;
    const maVn2 = `TOPT_VN2_${stamp}`;
    const maKh1 = `TOPT_KH1_${stamp}`;
    const maKh2 = `TOPT_KH2_${stamp}`;
    const soDonGocVn1 = `4-2025-GOCVN1-${stamp}`;
    const soDonGocVn2 = `4-2025-GOCVN2-${stamp}`;
    const soDonGocKh1 = `KH-2025-GOCKH1-${stamp}`;
    const soDonGocKh2 = `KH-2025-GOCKH2-${stamp}`;

    try {
        for (const [ma, so] of [[maVn1, soDonGocVn1], [maVn2, soDonGocVn2]]) {
            await DonDangKy.create({
                maDonDangKy: ma, maHoSo: `HS_${ma}`, maHoSoVuViec: `HS_${ma}`, soDon: so,
                idKhachHang: kh1.id, maNhanHieu: nh.maNhanHieu, donGoc: 0, loaiDon: 1,
                trangThaiDon: "Thẩm định hình thức", trangThaiVuViec: "1",
            });
            cleanup.donVn.push(ma);
        }
        for (const [ma, so] of [[maKh1, soDonGocKh1], [maKh2, soDonGocKh2]]) {
            await DonDangKyNhanHieu_KH.create({
                maDonDangKy: ma, maHoSo: `HS_${ma}`, maHoSoVuViec: `HS_${ma}`, soDon: so,
                idKhachHang: kh1.id, maNhanHieu: nh.maNhanHieu, donGoc: 0, loaiDon: 1,
                trangThaiDon: "Thẩm định", trangThaiVuViec: "1",
            });
            cleanup.donKh.push(ma);
        }

        // ---- KB1: Không tick mục sửa đổi nào -> 400 (VN & KH) ----
        let r = await call(addApplicationSDNHVN, { maDonDangKyCu: maVn1, soDonSD: "" });
        assert.equal(r.status, 400);
        assert.equal(r.body.message, "Vui lòng chọn ít nhất một mục cần sửa đổi!");

        r = await call(addApplicationSDNHKH, { maDonDangKyCu: maKh1, soDonSD: "" });
        assert.equal(r.status, 400);
        assert.equal(r.body.message, "Vui lòng chọn ít nhất một mục cần sửa đổi!");
        console.log("✅ KB1: Tạo SD VN/KH không chọn mục nào -> 400 đúng thông báo");

        // ---- KB2: Tạo mới để trống soDonSD / soDonChuyenQuyen -> DB lưu NULL ----
        r = await call(addApplicationSDNHVN, { maDonDangKyCu: maVn1, soDonSD: "   ", suaDoiDaiDien: true, ndSuaDoiDaiDien: "DD VN" });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const sdVn = r.body.newSD;
        cleanup.sdVn.push(sdVn.id);
        assert.equal(sdVn.soDon, null, "SD VN để trống soDonSD phải lưu NULL");

        // Update bỏ chọn tất cả cờ -> 400
        r = await call(updateApplicationSD_VN, { id: sdVn.id, suaDoiDaiDien: false });
        assert.equal(r.status, 400);
        assert.equal(r.body.message, "Vui lòng chọn ít nhất một mục cần sửa đổi!");

        r = await call(addApplicationSDNHKH, { maDonDangKyCu: maKh1, soDonSD: "", suaDoiDiaChi: true, ndSuaDoiDiaChi: "DC KH" });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const sdKh = r.body.newSD;
        cleanup.sdKh.push(sdKh.id);
        assert.equal(sdKh.soDon, null, "SD KH để trống soDonSD phải lưu NULL");

        r = await call(updateApplicationSD_KH, { id: sdKh.id, suaDoiDiaChi: false });
        assert.equal(r.status, 400);
        assert.equal(r.body.message, "Vui lòng chọn ít nhất một mục cần sửa đổi!");

        r = await call(addApplicationCQNHVN, { maDonDangKyCu: maVn2, maKhachHangMoi: kh2.id, soDonChuyenQuyen: "" });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const cqVn = r.body.donCQSH;
        cleanup.cqVn.push(cqVn.id);
        assert.equal(cqVn.soDon, null, "CQ VN để trống soDonChuyenQuyen phải lưu NULL");

        r = await call(addApplicationCQNHKH, { maDonDangKyCu: maKh2, maKhachHangMoi: kh2.id });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const cqKh = r.body.donCQSH;
        cleanup.cqKh.push(cqKh.id);
        assert.equal(cqKh.soDon, null, "CQ KH để trống soDonChuyenQuyen phải lưu NULL");
        console.log("✅ KB2: Để trống soDonSD / soDonChuyenQuyen (VN & KH) -> lưu NULL, update bỏ hết mục -> 400");

        // ---- KB3: Duyệt trangThaiDuyet = 1 kèm số đơn ghi nhận mới -> đơn con giữ nguyên donCu.soDon ----
        r = await call(updateApplicationSD_VN, { id: sdVn.id, trangThaiDuyet: 1, soDonSD: "SĐ4-2026-01999" });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        cleanup.donVn.push(r.body.donMoi.maDonDangKy);
        assert.equal((await DonSuaDoi_NH_VN.findByPk(sdVn.id)).soDon, "SĐ4-2026-01999");
        assert.equal(r.body.donMoi.soDon, soDonGocVn1, "Đơn con SD VN phải giữ nguyên số đơn gốc");

        r = await call(updateApplicationSD_KH, { id: sdKh.id, trangThaiDuyet: 1, soDonSD: "SĐ-KH-2026-01999" });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        cleanup.donKh.push(r.body.donMoi.maDonDangKy);
        assert.equal((await DonSuaDoi_NH_KH.findByPk(sdKh.id)).soDon, "SĐ-KH-2026-01999");
        assert.equal(r.body.donMoi.soDon, soDonGocKh1, "Đơn con SD KH phải giữ nguyên số đơn gốc");

        r = await call(updateApplicationCQ_VN, { id: cqVn.id, trangThaiDuyet: 1, soDonChuyenQuyen: "CĐ4-2025-01345" });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        cleanup.donVn.push(r.body.donMoi.maDonDangKy);
        assert.equal((await DonCQSH_VN.findByPk(cqVn.id)).soDon, "CĐ4-2025-01345");
        assert.equal(r.body.donMoi.soDon, soDonGocVn2, "Đơn con CQ VN phải giữ nguyên số đơn gốc");

        r = await call(updateApplicationCQ_KH, { id: cqKh.id, trangThaiDuyet: 1, soDonChuyenQuyen: "CĐ-KH-2025-01345" });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        cleanup.donKh.push(r.body.donMoi.maDonDangKy);
        assert.equal((await DonCQSH_KH.findByPk(cqKh.id)).soDon, "CĐ-KH-2025-01345");
        assert.equal(r.body.donMoi.soDon, soDonGocKh2, "Đơn con CQ KH phải giữ nguyên số đơn gốc");
        console.log("✅ KB3: Duyệt (1) lưu đúng SĐ/CĐ trên tờ khai, đơn con kế thừa giữ nguyên số đơn gốc");

        // ---- KB4: Chuyển sang Từ chối (2) -> soDon = NULL, list trả soDonSD/soDonCQ = null & soDonGoc nguyên vẹn ----
        r = await call(updateApplicationSD_VN, { id: sdVn.id, trangThaiDuyet: 2 });
        assert.equal(r.status, 200);
        assert.equal((await DonSuaDoi_NH_VN.findByPk(sdVn.id)).soDon, null);
        r = await call(getAllApplicationSD_VN, { searchText: soDonGocVn1 });
        const rowSdVn = r.body.data.find((x) => x.id === sdVn.id);
        assert.equal(rowSdVn.soDonSD, null);
        assert.equal(rowSdVn.soDonGoc, soDonGocVn1);

        r = await call(updateApplicationSD_KH, { id: sdKh.id, trangThaiDuyet: 2 });
        assert.equal(r.status, 200);
        assert.equal((await DonSuaDoi_NH_KH.findByPk(sdKh.id)).soDon, null);
        r = await call(getAllApplicationSD_KH, { searchText: soDonGocKh1 });
        const rowSdKh = r.body.data.find((x) => x.id === sdKh.id);
        assert.equal(rowSdKh.soDonSD, null);
        assert.equal(rowSdKh.soDonGoc, soDonGocKh1);

        r = await call(updateApplicationCQ_VN, { id: cqVn.id, trangThaiDuyet: 2 });
        assert.equal(r.status, 200);
        assert.equal((await DonCQSH_VN.findByPk(cqVn.id)).soDon, null);
        r = await call(getAllApplicationCQ_VN, { searchText: soDonGocVn2 });
        const rowCqVn = r.body.data.find((x) => x.id === cqVn.id);
        assert.equal(rowCqVn.soDon, null);
        assert.equal(rowCqVn.soDonCQ, null);
        assert.equal(rowCqVn.soDonGoc, soDonGocVn2);

        r = await call(updateApplicationCQ_KH, { id: cqKh.id, trangThaiDuyet: 2 });
        assert.equal(r.status, 200);
        assert.equal((await DonCQSH_KH.findByPk(cqKh.id)).soDon, null);
        r = await call(getAllApplicationCQ_KH, { searchText: soDonGocKh2 });
        const rowCqKh = r.body.data.find((x) => x.id === cqKh.id);
        assert.equal(rowCqKh.soDon, null);
        assert.equal(rowCqKh.soDonCQ, null);
        assert.equal(rowCqKh.soDonGoc, soDonGocKh2);

        // Kiểm tra thêm autoRejectExpired* cũng xóa soDon = NULL trên cả 4 bảng
        await DonSuaDoi_NH_VN.update({ trangThaiDuyet: 0, soDon: "SD-AUTO", hanTraLoi: addDays(-1) }, { where: { id: sdVn.id } });
        await DonSuaDoi_NH_KH.update({ trangThaiDuyet: 0, soDon: "SD-KH-AUTO", hanTraLoi: addDays(-1) }, { where: { id: sdKh.id } });
        await DonCQSH_VN.update({ trangThaiDuyet: 0, soDon: "CQ-AUTO", hanTraLoi: addDays(-1) }, { where: { id: cqVn.id } });
        await DonCQSH_KH.update({ trangThaiDuyet: 0, soDon: "CQ-KH-AUTO", hanTraLoi: addDays(-1) }, { where: { id: cqKh.id } });

        await Promise.all([
            autoRejectExpiredDonSuaDoi({ force: true }),
            autoRejectExpiredDonSuaDoi_KH({ force: true }),
            autoRejectExpiredDonCQSH_VN({ force: true }),
            autoRejectExpiredDonCQSH_KH({ force: true }),
        ]);

        assert.equal((await DonSuaDoi_NH_VN.findByPk(sdVn.id)).soDon, null);
        assert.equal((await DonSuaDoi_NH_KH.findByPk(sdKh.id)).soDon, null);
        assert.equal((await DonCQSH_VN.findByPk(cqVn.id)).soDon, null);
        assert.equal((await DonCQSH_KH.findByPk(cqKh.id)).soDon, null);
        console.log("✅ KB4: Từ chối thủ công & tự động quá hạn đều xóa soDon = NULL trên cả 4 bảng, list trả null & giữ nguyên soDonGoc");
    } finally {
        for (const id of cleanup.sdVn) await DonSuaDoi_NH_VN.destroy({ where: { id } }).catch(() => {});
        for (const id of cleanup.sdKh) await DonSuaDoi_NH_KH.destroy({ where: { id } }).catch(() => {});
        for (const id of cleanup.cqVn) await DonCQSH_VN.destroy({ where: { id } }).catch(() => {});
        for (const id of cleanup.cqKh) await DonCQSH_KH.destroy({ where: { id } }).catch(() => {});
        for (const ma of cleanup.donVn.reverse()) {
            await DonDK_SPDV.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDangKy.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
        }
        for (const ma of cleanup.donKh.reverse()) {
            await DonDK_SPDV_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDangKyNhanHieu_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
        }
    }
}

main()
    .then(() => {
        console.log("🎉 Tất cả 4 kịch bản soDon optional & bắt buộc mục sửa đổi đều ĐẠT!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Kiểm thử thất bại:", err);
        process.exit(1);
    });
