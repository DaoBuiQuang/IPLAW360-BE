/**
 * Kiểm thử tích hợp phân hệ Campuchia (KH):
 * 1. Đơn tiếp nhận KH (laDonTiepNhan = true, maHoSo = null, idKhachHang = null) + đơn 2 không trùng maHoSoVuViec.
 * 2. Đơn sửa đổi NH KH trạng thái 0 (chưa đóng băng đơn gốc) + fulldetail trả dsBienDongChoDuyet + detail trả đủ trường.
 * 3. Vòng phản hồi Cục (LichSuPhanHoiSuaDoi_NH_KH): đồng bộ hanTraLoi, tự động từ chối quá hạn, mở lại (reopenIfAutoRejected), xóa vòng.
 * 4. Duyệt chấp thuận (0 -> 1): sinh đơn KH mới (loaiDon = 2), đóng băng đơn gốc (donGoc = 1), fulldetail trả dsDonCon;
 *    Sửa đổi nối tiếp lần 2 (lanSuaDoi = 2, chuoiSuaDoi = 2); updateApplication_KH không truyền donSuaDoi không ảnh hưởng DonSuaDoi_NH_KH;
 *    Rollback (1 -> 0) & Xóa cascade.
 * 5. /application_sd_nh_kh/list trả 200 kể cả khi rỗng (data: []).
 * Chạy: node tests/test_kh_don_tiep_nhan_and_don_sua_doi.js
 */
import assert from "node:assert/strict";
import { sequelize } from "../src/config/db.js";
import {
    syncDatabase,
    DonDangKyNhanHieu_KH,
    DonDK_SPDV_KH,
    TaiLieu_KH,
    DonSuaDoi_NH_KH,
    LichSuPhanHoiSuaDoi_NH_KH,
    NhanHieu,
    SanPham_DichVu,
} from "../src/models/index.js";
import {
    createApplication_KH,
    updateApplication_KH,
    getAllApplication_KH,
    getApplicationById_KH,
    getFullApplicationDetail_KH,
} from "../src/controllers/KH/donDangKyNhanHieu_KHController.js";
import {
    addApplicationSDNHKH,
    getAllApplicationSD_KH,
    getApplicationSD_KHDetail,
    updateApplicationSD_KH,
    deleteApplicationSD_KH,
    savePhanHoiSuaDoi_KH,
    deletePhanHoiSuaDoi_KH,
    autoRejectExpiredDonSuaDoi_KH,
} from "../src/controllers/KH/donSuaDoi_NH_KHController.js";

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
    await handler({ body, params, query: {}, user: { maNhanSu: "TEST_KH", role: "admin" } }, res);
    return out;
};

const addDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

const cleanup = {
    sdIds: [],
    maDonList: [],
    maNhanHieuList: [],
};

async function main() {
    await sequelize.authenticate();
    await syncDatabase();

    const spdv = await SanPham_DichVu.findOne();
    assert.ok(spdv, "Cần ít nhất 1 SanPham_DichVu trong DB");
    const sampleSPDV = spdv.maSPDV;
    const stamp = Date.now();

    try {
        // =========================================================================
        // 1. ĐƠN TIẾP NHẬN CAMPUCHIA (KH)
        // =========================================================================
        let r = await call(createApplication_KH, {
            laDonTiepNhan: true,
            soDon: "",
            trangThaiVuViec: "1",
            maSPDVList: [],
        });
        assert.equal(r.status, 400, "Đơn tiếp nhận KH thiếu trường bắt buộc phải trả 400");

        const soDon1 = `KH-TN1-${stamp}`;
        r = await call(createApplication_KH, {
            laDonTiepNhan: true,
            soDon: soDon1,
            trangThaiVuViec: "1",
            maSPDVList: [sampleSPDV],
            nhanHieu: { tenNhanHieu: `NH KH TN1 ${stamp}` },
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const don1 = r.body.don;
        cleanup.maDonList.push(don1.maDonDangKy);
        cleanup.maNhanHieuList.push(don1.maNhanHieu);

        assert.equal(Boolean(don1.laDonTiepNhan), true);
        assert.equal(don1.maHoSo, null);
        assert.equal(don1.maHoSoVuViec, null);
        assert.equal(don1.idKhachHang, null);
        assert.ok(don1.maDonDangKy.startsWith("TN_KH_"), `maDonDangKy KH phải bắt đầu bằng TN_KH_, thực tế: ${don1.maDonDangKy}`);

        // Tạo tiếp Đơn tiếp nhận KH thứ 2 không maHoSo -> không lỗi duplicate maHoSoVuViec
        const soDon2 = `KH-TN2-${stamp}`;
        r = await call(createApplication_KH, {
            laDonTiepNhan: true,
            soDon: soDon2,
            trangThaiVuViec: "1",
            maSPDVList: [sampleSPDV],
            nhanHieu: { tenNhanHieu: `NH KH TN2 ${stamp}` },
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const don2 = r.body.don;
        cleanup.maDonList.push(don2.maDonDangKy);
        cleanup.maNhanHieuList.push(don2.maNhanHieu);

        // Kiểm tra hiển thị ở /application_kh/list, /detail, /fulldetail
        r = await call(getAllApplication_KH, {
            searchText: soDon1,
            fields: ["maDonDangKy", "soDon", "tenKhachHang", "tenNhanHieu", "laDonTiepNhan"],
            pageIndex: 1,
            pageSize: 10,
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const inList = (r.body.data || []).find((x) => x.maDonDangKy === don1.maDonDangKy);
        assert.ok(inList, "Đơn tiếp nhận KH chưa có khách hàng phải hiển thị ở /application_kh/list");
        assert.equal(inList.laDonTiepNhan, true);

        r = await call(getApplicationById_KH, { maDonDangKy: don1.maDonDangKy });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.vuViec, []);
        console.log("✅ KH-KB1: Đơn tiếp nhận KH (2 đơn không maHoSo/idKhachHang) tạo & đọc danh sách/chi tiết thành công");

        // =========================================================================
        // 2. TẠO ĐƠN SỬA ĐỔI KH TRẠNG THÁI 0 + DETAIL + FULLDETAIL
        // =========================================================================
        r = await call(addApplicationSDNHKH, {
            maDonDangKyCu: don1.maDonDangKy,
            soDonSD: `KH-SD1-${stamp}`,
            suaDoiDaiDien: true,
            ndSuaDoiDaiDien: "Đại diện KH mới",
            suaDoiNoiDungKhac: true,
            ndSuaDoiNoiDungKhac: "Nội dung khác KH",
            ngayGhiNhanSuaDoi: addDays(0),
            taiLieuSuaDoi: [{ tenTaiLieu: "Tờ khai sửa đổi KH" }],
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const sd1 = r.body.newSD;
        cleanup.sdIds.push(sd1.id);
        assert.equal(sd1.trangThaiDuyet, 0);
        assert.equal(sd1.maDonDangKy, null);
        assert.equal(sd1.ngayGhiNhanSuaDoi, null);
        assert.equal(sd1.lanSuaDoi, 1);

        // Đơn gốc KH chưa bị đóng băng
        const don1Check = await DonDangKyNhanHieu_KH.findByPk(don1.maDonDangKy);
        assert.equal(Number(don1Check.donGoc), 0);

        // updateApplication_KH không truyền donSuaDoi -> không làm thay đổi DonSuaDoi_NH_KH
        r = await call(updateApplication_KH, {
            maDonDangKy: don1.maDonDangKy,
            ghiChu: "Sửa ghi chú đơn KH",
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const sd1AfterEdit = await DonSuaDoi_NH_KH.findByPk(sd1.id);
        assert.equal(sd1AfterEdit.ndSuaDoiDaiDien, "Đại diện KH mới");

        // fulldetail của đơn gốc KH phải trả dsBienDongChoDuyet
        r = await call(getFullApplicationDetail_KH, { maDonDangKy: don1.maDonDangKy });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.laDonTiepNhan, true);
        assert.equal(r.body.dsBienDongChoDuyet.length, 1);
        assert.equal(r.body.dsBienDongChoDuyet[0].id, sd1.id);
        assert.equal(r.body.dsBienDongChoDuyet[0].loaiBienDong, "SUA_DOI");
        console.log("✅ KH-KB2: Tạo SD KH trạng thái 0 không đóng băng đơn gốc + fulldetail trả dsBienDongChoDuyet");

        // =========================================================================
        // 3. VÒNG PHẢN HỒI CỤC + QUÁ HẠN TỰ ĐỘNG TỪ CHỐI + MỞ LẠI
        // =========================================================================
        const han1 = addDays(15);
        r = await call(savePhanHoiSuaDoi_KH, {
            idDonSuaDoi: sd1.id,
            soThongBao: "TB-KH-01",
            ngayNhanThongBao: addDays(0),
            hanTraLoi: han1,
            noiDungThongBao: "Thiếu bản dịch",
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.phanHoi.lanThongBao, 1);
        assert.equal(r.body.hanTraLoi, han1);
        const ph1Id = r.body.phanHoi.id;

        r = await call(getApplicationSD_KHDetail, { id: sd1.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.dangChoTraLoiCuc, true);
        assert.equal(r.body.hanTraLoi, han1);
        assert.equal(r.body.taiLieuSuaDoi.length, 1);
        assert.equal(r.body.donGocBanDau.maDonDangKy, don1.maDonDangKy);

        // Giả lập quá hạn -> autoRejectExpiredDonSuaDoi_KH chuyển trạng thái 2, tuDongTuChoi = true
        await LichSuPhanHoiSuaDoi_NH_KH.update({ ngayNhanThongBao: addDays(-15), hanTraLoi: addDays(-2) }, { where: { id: ph1Id } });
        await DonSuaDoi_NH_KH.update({ hanTraLoi: addDays(-2) }, { where: { id: sd1.id } });
        const rejectedCount = await autoRejectExpiredDonSuaDoi_KH({ force: true });
        assert.ok(rejectedCount >= 1);

        let rec = await DonSuaDoi_NH_KH.findByPk(sd1.id);
        assert.equal(rec.trangThaiDuyet, 2);
        assert.equal(Boolean(rec.tuDongTuChoi), true);
        assert.equal(rec.ngayGhiNhanSuaDoi, null);

        // Nhập ngayTraLoi + reopenIfAutoRejected = true -> mở lại về 0, hanTraLoi = null
        r = await call(savePhanHoiSuaDoi_KH, {
            idDonSuaDoi: sd1.id,
            id: ph1Id,
            ngayTraLoi: addDays(-3),
            noiDungTraLoi: "Đã nộp bổ sung",
            reopenIfAutoRejected: true,
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.reopened, true);
        rec = await DonSuaDoi_NH_KH.findByPk(sd1.id);
        assert.equal(rec.trangThaiDuyet, 0);
        assert.equal(Boolean(rec.tuDongTuChoi), false);
        assert.equal(rec.hanTraLoi, null);

        // Thêm vòng 2 rồi xóa vòng 2
        r = await call(savePhanHoiSuaDoi_KH, {
            idDonSuaDoi: sd1.id,
            ngayNhanThongBao: addDays(0),
            hanTraLoi: addDays(10),
        });
        assert.equal(r.body.phanHoi.lanThongBao, 2);
        const ph2Id = r.body.phanHoi.id;
        r = await call(deletePhanHoiSuaDoi_KH, { id: ph2Id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.hanTraLoi, null);
        console.log("✅ KH-KB3: Vòng phản hồi Cục, tự động từ chối quá hạn, mở lại & xóa vòng thành công");

        // =========================================================================
        // 4. DUYỆT CHẤP THUẬN (0 -> 1), SỬA ĐỔI NỐI TIẾP LẦN 2, LIST & ROLLBACK
        // =========================================================================
        r = await call(updateApplicationSD_KH, {
            id: sd1.id,
            trangThaiDuyet: 1,
            ngayGhiNhanSuaDoi: addDays(0),
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const donMoi1 = r.body.donMoi;
        assert.ok(donMoi1 && donMoi1.maDonDangKy, "Duyệt chấp thuận phải sinh đơn KH mới");
        cleanup.maDonList.push(donMoi1.maDonDangKy);
        assert.equal(Number(donMoi1.loaiDon), 2);
        assert.equal(Number(donMoi1.donGoc), 0);
        assert.equal(donMoi1.daiDienSHTT, "Đại diện KH mới");

        // Đơn gốc bị đóng băng & fulldetail trả dsDonCon
        assert.equal(Number((await DonDangKyNhanHieu_KH.findByPk(don1.maDonDangKy)).donGoc), 1);
        r = await call(getFullApplicationDetail_KH, { maDonDangKy: don1.maDonDangKy });
        assert.equal(r.body.dsDonCon.length, 1);
        assert.equal(r.body.dsDonCon[0].maDonDangKy, donMoi1.maDonDangKy);

        // Tạo Đơn sửa đổi KH lần 2 trên donMoi1
        r = await call(addApplicationSDNHKH, {
            maDonDangKyCu: donMoi1.maDonDangKy,
            soDonSD: `KH-SD2-${stamp}`,
            suaDoiDiaChi: true,
            ndSuaDoiDiaChi: "Phnom Penh",
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const sd2 = r.body.newSD;
        cleanup.sdIds.push(sd2.id);
        assert.equal(sd2.lanSuaDoi, 2);

        r = await call(getApplicationSD_KHDetail, { id: sd2.id });
        assert.equal(r.body.donGocBanDau.maDonDangKy, don1.maDonDangKy);
        assert.equal(r.body.chuoiSuaDoi.length, 2);

        // Kiểm tra /application_sd_nh_kh/list có dữ liệu và khi rỗng đều trả 200
        r = await call(getAllApplicationSD_KH, { searchText: `KH-SD2-${stamp}`, pageIndex: 1, pageSize: 10 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.data.length, 1);
        assert.equal(r.body.data[0].id, sd2.id);

        r = await call(getAllApplicationSD_KH, { searchText: `KHONG_TON_TAI_${stamp}`, pageIndex: 1, pageSize: 10 });
        assert.equal(r.status, 200, "Danh sách rỗng phải trả HTTP 200 với data: []");
        assert.deepEqual(r.body.data, []);

        // Chặn xóa SD1 khi SD2 còn tồn tại
        r = await call(deleteApplicationSD_KH, { id: sd1.id });
        assert.equal(r.status, 500, "Không được xóa SD1 khi đơn con còn tờ khai SD2");

        // Xóa SD2 -> Rollback SD1 về 0 -> Xóa SD1 -> kiểm tra cascade
        r = await call(deleteApplicationSD_KH, { id: sd2.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        r = await call(updateApplicationSD_KH, { id: sd1.id, trangThaiDuyet: 0 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await DonDangKyNhanHieu_KH.findByPk(donMoi1.maDonDangKy), null, "Đơn KH con phải bị xóa khi rollback");
        assert.equal(Number((await DonDangKyNhanHieu_KH.findByPk(don1.maDonDangKy)).donGoc), 0, "Đơn gốc phải mở băng");
        r = await call(deleteApplicationSD_KH, { id: sd1.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await LichSuPhanHoiSuaDoi_NH_KH.count({ where: { idDonSuaDoi: sd1.id } }), 0, "Cascade xóa lịch sử phản hồi KH");
        cleanup.sdIds.length = 0;
        console.log("✅ KH-KB4: Duyệt 0->1, sửa đổi nối tiếp lần 2, list 200 (có/rỗng), rollback & xóa cascade thành công");
    } finally {
        for (const id of cleanup.sdIds) {
            await LichSuPhanHoiSuaDoi_NH_KH.destroy({ where: { idDonSuaDoi: id } }).catch(() => {});
            await DonSuaDoi_NH_KH.destroy({ where: { id } }).catch(() => {});
        }
        for (const ma of cleanup.maDonList.reverse()) {
            await TaiLieu_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDK_SPDV_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDangKyNhanHieu_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
        }
        for (const maNH of cleanup.maNhanHieuList) {
            await NhanHieu.destroy({ where: { maNhanHieu: maNH } }).catch(() => {});
        }
    }
}

main()
    .then(() => {
        console.log("🎉 Tất cả kịch bản đồng bộ Campuchia (KH) đều ĐẠT!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Kiểm thử KH thất bại:", err);
        process.exit(1);
    });
