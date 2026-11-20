/**
 * Kiểm thử tích hợp: Đơn sửa đổi NH VN - vòng phản hồi Cục SHTT, quá hạn, sửa đổi nối tiếp, hoàn tác.
 * Chạy: node tests/test_don_sua_doi_feedback.js   (dùng DB trong .env, tự dọn dữ liệu test)
 */
import assert from "node:assert/strict";
import { sequelize } from "../src/config/db.js";
import {
    syncDatabase,
    DonDangKy,
    DonSuaDoi_NH_VN,
    LichSuPhanHoiSuaDoi_NH_VN,
    KhachHangCuoi,
    NhanHieu,
} from "../src/models/index.js";
import {
    addApplicationSDNHVN,
    updateApplicationSD_VN,
    getApplicationSD_VNDetail,
    deleteApplicationSD_VN,
    savePhanHoiSuaDoi,
    deletePhanHoiSuaDoi,
    autoRejectExpiredDonSuaDoi,
    todayVN,
} from "../src/controllers/NH_VN_SD/donSuaDoi_NH_VNController.js";

const call = async (handler, body = {}, params = {}) => {
    let out = { status: 200, body: null };
    const res = {
        status(c) { out.status = c; return this; },
        json(b) { out.body = b; return this; },
    };
    await handler({ body, params, query: {}, user: { maNhanSu: "TEST" } }, res);
    return out;
};
const addDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

const createdSD = [];
const createdDon = [];

async function main() {
    await sequelize.authenticate();
    await syncDatabase();

    const kh = await KhachHangCuoi.findOne();
    const nh = await NhanHieu.findOne();
    assert.ok(kh, "Cần ít nhất 1 khách hàng trong DB để test");

    const stamp = Date.now();
    const maGoc = `TSD_GOC_${stamp}`;
    await DonDangKy.create({
        maDonDangKy: maGoc, maHoSo: `TSD_HS_${stamp}`, maHoSoVuViec: `TSD_HS_${stamp}`, soDon: "VN-4-TEST-1",
        idKhachHang: kh.id, maNhanHieu: nh?.maNhanHieu ?? null, donGoc: 0, loaiDon: 1,
        trangThaiDon: "Thẩm định hình thức", trangThaiVuViec: "1",
    });
    createdDon.push(maGoc);

    try {
        // ---- Kịch bản 1: tạo SD lần 1 (chờ) + thông báo Cục lần 1 ----
        let r = await call(addApplicationSDNHVN, {
            maDonDangKyCu: maGoc, soDonSD: "SD-1", suaDoiTenChuDon: true, ndSuaDoiTenChuDon: "Công ty TEST",
            suaDoiNoiDungKhac: true, ndSuaDoiNoiDungKhac: "Nội dung khác", ngayGhiNhanSuaDoi: addDays(0),
            taiLieuSuaDoi: [{ tenTaiLieu: "Tờ khai mẫu 10" }],
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const sd1 = r.body.newSD;
        createdSD.push(sd1.id);
        assert.equal(sd1.lanSuaDoi, 1);
        assert.equal(sd1.ngayGhiNhanSuaDoi, null, "Đơn chờ không được lưu ngayGhiNhanSuaDoi");

        const han1 = addDays(10);
        r = await call(savePhanHoiSuaDoi, { idDonSuaDoi: sd1.id, soThongBao: "TB-1", ngayNhanThongBao: addDays(0), hanTraLoi: han1 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.phanHoi.lanThongBao, 1);
        let rec = await DonSuaDoi_NH_VN.findByPk(sd1.id);
        assert.equal(rec.hanTraLoi, han1);
        r = await call(getApplicationSD_VNDetail, { id: sd1.id });
        assert.equal(r.body.dangChoTraLoiCuc, true);
        console.log("✅ KB1: hanTraLoi đồng bộ, dangChoTraLoiCuc = true");

        // ---- Kịch bản 2: sửa nội dung + trả lời vòng 1 -> hanTraLoi NULL; thêm vòng 2 ----
        r = await call(updateApplicationSD_VN, { id: sd1.id, ndSuaDoiTenChuDon: "Công ty TEST 2", trangThaiDuyet: 0 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const ph1 = (await LichSuPhanHoiSuaDoi_NH_VN.findOne({ where: { idDonSuaDoi: sd1.id } })).id;
        r = await call(savePhanHoiSuaDoi, { idDonSuaDoi: sd1.id, id: ph1, ngayTraLoi: addDays(1), noiDungTraLoi: "Đã sửa" });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        rec = await DonSuaDoi_NH_VN.findByPk(sd1.id);
        assert.equal(rec.hanTraLoi, null);
        assert.equal(rec.ndSuaDoiTenChuDon, "Công ty TEST 2");
        r = await call(savePhanHoiSuaDoi, { idDonSuaDoi: sd1.id, ngayNhanThongBao: addDays(2), hanTraLoi: addDays(20) });
        assert.equal(r.body.phanHoi.lanThongBao, 2);
        console.log("✅ KB2: trả lời vòng 1 -> hanTraLoi NULL; vòng 2 -> lanThongBao = 2");

        // ---- Kịch bản 3: quá hạn -> tự động từ chối, mở lại, duyệt ----
        const ph2 = r.body.phanHoi.id;
        await LichSuPhanHoiSuaDoi_NH_VN.update({ hanTraLoi: addDays(-3), ngayNhanThongBao: addDays(-10) }, { where: { id: ph2 } });
        await DonSuaDoi_NH_VN.update({ hanTraLoi: addDays(-3), ngayGhiNhanSuaDoi: addDays(0) }, { where: { id: sd1.id } });
        const n = await autoRejectExpiredDonSuaDoi({ force: true });
        assert.ok(n >= 1);
        rec = await DonSuaDoi_NH_VN.findByPk(sd1.id);
        assert.equal(rec.trangThaiDuyet, 2);
        assert.equal(rec.tuDongTuChoi, true);
        assert.equal(rec.ngayGhiNhanSuaDoi, null);
        assert.equal(rec.ngayTuChoi, addDays(-3));
        const goc = await DonDangKy.findOne({ where: { maDonDangKy: maGoc } });
        assert.equal(Number(goc.donGoc), 0, "Đơn gốc không bị ảnh hưởng");
        assert.equal(await autoRejectExpiredDonSuaDoi({ force: true }) >= 0, true); // idempotent

        r = await call(savePhanHoiSuaDoi, { idDonSuaDoi: sd1.id, id: ph2, ngayTraLoi: addDays(-4), reopenIfAutoRejected: true });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        rec = await DonSuaDoi_NH_VN.findByPk(sd1.id);
        assert.equal(rec.trangThaiDuyet, 0);
        assert.equal(rec.tuDongTuChoi, false);
        assert.equal(rec.hanTraLoi, null);
        console.log("✅ KB3: quá hạn -> từ chối tự động; trả lời + mở lại về 0");

        // ---- Kịch bản 4: chấp thuận lần 1 -> SD lần 2 trên donMoi ----
        r = await call(updateApplicationSD_VN, { id: sd1.id, trangThaiDuyet: 1, ngayGhiNhanSuaDoi: addDays(0) });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const donMoi1 = r.body.donMoi.maDonDangKy;
        createdDon.push(donMoi1);
        r = await call(savePhanHoiSuaDoi, { idDonSuaDoi: sd1.id, ngayNhanThongBao: addDays(0), hanTraLoi: addDays(5) });
        assert.equal(r.status, 400, "Không thêm vòng mới khi đã chấp thuận");
        r = await call(updateApplicationSD_VN, { id: sd1.id, trangThaiDuyet: 1, ndSuaDoiTenChuDon: "Khác hẳn" });
        assert.equal(r.status, 400, "Không sửa nội dung cốt lõi khi đã chấp thuận");

        r = await call(addApplicationSDNHVN, { maDonDangKyCu: donMoi1, soDonSD: "SD-2", suaDoiDiaChi: true, ndSuaDoiDiaChi: "Địa chỉ mới" });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const sd2 = r.body.newSD;
        createdSD.push(sd2.id);
        assert.equal(sd2.lanSuaDoi, 2);
        r = await call(getApplicationSD_VNDetail, { id: sd2.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.donGocBanDau.maDonDangKy, maGoc);
        assert.equal(r.body.chuoiSuaDoi.length, 2);
        assert.equal(r.body.chuoiSuaDoi.filter((x) => x.isCurrent).length, 1);
        console.log("✅ KB4: lanSuaDoi = 2, donGocBanDau + chuoiSuaDoi đầy đủ");

        // ---- Kịch bản 5: hoàn tác / xóa ----
        r = await call(deleteApplicationSD_VN, { id: sd1.id });
        assert.equal(r.status, 500, "Không xóa SD1 khi SD2 còn tồn tại (đơn con có biến động cấp sau)");
        r = await call(deleteApplicationSD_VN, { id: sd2.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        r = await call(updateApplicationSD_VN, { id: sd1.id, trangThaiDuyet: 0 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await DonDangKy.findOne({ where: { maDonDangKy: donMoi1 } })), null, "đơn kế thừa bị hoàn tác");
        assert.equal(Number((await DonDangKy.findOne({ where: { maDonDangKy: maGoc } })).donGoc), 0);
        r = await call(deleteApplicationSD_VN, { id: sd1.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await LichSuPhanHoiSuaDoi_NH_VN.count({ where: { idDonSuaDoi: sd1.id } }), 0, "cascade xóa phản hồi");
        createdSD.length = 0;
        console.log("✅ KB5: hoàn tác/xóa an toàn, cascade LichSuPhanHoi");
    } finally {
        for (const id of createdSD) {
            await LichSuPhanHoiSuaDoi_NH_VN.destroy({ where: { idDonSuaDoi: id } }).catch(() => {});
            await DonSuaDoi_NH_VN.destroy({ where: { id } }).catch(() => {});
        }
        for (const ma of createdDon.reverse()) await DonDangKy.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
    }
}

main()
    .then(() => { console.log("🎉 Tất cả kịch bản đạt"); process.exit(0); })
    .catch((e) => { console.error("❌ Test thất bại:", e); process.exit(1); });
