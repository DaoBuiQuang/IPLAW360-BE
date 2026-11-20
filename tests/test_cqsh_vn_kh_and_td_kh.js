/**
 * Kiểm thử tích hợp:
 * 1. CQSH VN (Mẫu số 11): add(0) -> detail -> phan-hoi/save -> autoRejectExpiredDonCQSH_VN -> reopen -> update(1) -> list -> fulldetail(danhSachDonChuyenQuyen) -> rollback(0) -> delete(cascade).
 * 2. CQSH KH (Campuchia): add(0) -> detail -> phan-hoi/save -> autoRejectExpiredDonCQSH_KH -> reopen -> update(1) -> list -> fulldetail KH (dsBienDongChoDuyet, dsDonCon, danhSachDonChuyenQuyen, donCha) -> getAllApplication_KH(DANG_CHUYEN_QUYEN) -> rollback(0) -> delete(cascade).
 * 3. Tách đơn KH: tachDonDangKy_KH nhiều lần từ 1 đơn gốc (có/không maHoSo) không lỗi trùng maHoSoVuViec + getAllApplicationTD_KH trả soDonGoc/ngayNopDonGoc/donCha + getApplicationTD_KHDetail.
 * Chạy: node tests/test_cqsh_vn_kh_and_td_kh.js
 */
import assert from "node:assert/strict";
import { sequelize } from "../src/config/db.js";
import {
    syncDatabase,
    DonDangKy,
    DonDK_SPDV,
    DonCQSH_VN,
    LichSuPhanHoiCQSH_NH_VN,
    DonDangKyNhanHieu_KH,
    DonDK_SPDV_KH,
    TaiLieu_KH,
    DonCQSH_KH,
    LichSuPhanHoiCQSH_NH_KH,
    DonTachNH_KH,
    KhachHangCuoi,
    NhanHieu,
    SanPham_DichVu,
} from "../src/models/index.js";
import {
    addApplicationCQNHVN,
    getAllApplicationCQ_VN,
    getApplicationCQ_VNDetail,
    updateApplicationCQ_VN,
    deleteApplicationCQ_VN,
    savePhanHoiCQSH_VN,
    deletePhanHoiCQSH_VN,
    autoRejectExpiredDonCQSH_VN,
} from "../src/controllers/NH_CQSH/donCQSH_NHController.js";
import {
    addApplicationCQNHKH,
    getAllApplicationCQ_KH,
    getApplicationCQ_KHDetail,
    updateApplicationCQ_KH,
    deleteApplicationCQ_KH,
    savePhanHoiCQSH_KH,
    deletePhanHoiCQSH_KH,
    autoRejectExpiredDonCQSH_KH,
} from "../src/controllers/KH/donCQSH_NH_KHController.js";
import { getFullApplicationDetail } from "../src/controllers/donDangKyController.js";
import {
    getAllApplication_KH,
    getFullApplicationDetail_KH,
} from "../src/controllers/KH/donDangKyNhanHieu_KHController.js";
import {
    tachDonDangKy_KH,
    getAllApplicationTD_KH,
    getApplicationTD_KHDetail,
} from "../src/controllers/NH_VN_TD/donTach_NH_VNController.js";

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
    await handler({ body, params, query: {}, user: { maNhanSu: "TEST_CQ", role: "admin" } }, res);
    return out;
};

const addDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

const cleanup = {
    cqVnIds: [],
    cqKhIds: [],
    tdKhIds: [],
    donVn: [],
    donKh: [],
};

async function main() {
    await sequelize.authenticate();
    await syncDatabase();

    const khList = await KhachHangCuoi.findAll({ limit: 2 });
    assert.ok(khList.length >= 2, "Cần ít nhất 2 KhachHangCuoi trong DB để test chuyển quyền");
    const [kh1, kh2] = khList;
    const nh = await NhanHieu.findOne();
    const spdvList = await SanPham_DichVu.findAll({ limit: 2 });
    assert.ok(nh && spdvList.length >= 1, "Cần ít nhất 1 NhanHieu và 1 SanPham_DichVu");

    const stamp = Date.now();

    try {
        // =========================================================================
        // 1. CQSH VN (Mẫu số 11 + Phản hồi + Quá hạn + Duyệt + Rollback + Delete)
        // =========================================================================
        const maDonVn = `TCQ_VN_${stamp}`;
        const hsVn = `HS_CQVN_${stamp}`;
        await DonDangKy.create({
            maDonDangKy: maDonVn,
            maHoSo: hsVn,
            maHoSoVuViec: hsVn,
            soDon: `4-VN-CQ-${stamp}`,
            idKhachHang: kh1.id,
            maNhanHieu: nh.maNhanHieu,
            donGoc: 0,
            loaiDon: 1,
            trangThaiDon: "Thẩm định hình thức",
            trangThaiVuViec: "1",
        });
        cleanup.donVn.push(maDonVn);

        let r = await call(addApplicationCQNHVN, {
            maDonDangKyCu: maDonVn,
            maKhachHangMoi: kh2.id,
            soDonChuyenQuyen: `CQ-VN-1-${stamp}`,
            loaiThayDoi: "THUA_KE_KE_THUA",
            ngayGhiNhanCQ: addDays(0),
            taiLieuCQ: [{ tenTaiLieu: "Hợp đồng chuyển nhượng" }],
            nguoiNopDonMoi: { loaiHinh: "TO_CHUC", email: "new@owner.vn" },
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const cqVn = r.body.donCQSH;
        cleanup.cqVnIds.push(cqVn.id);
        assert.equal(cqVn.trangThaiDuyet, 0);
        assert.equal(cqVn.maDonDangKy, null);
        assert.equal(cqVn.ngayGhiNhanCQ, null, "Đơn chờ không được lưu ngayGhiNhanCQ");
        assert.equal(cqVn.loaiThayDoi, "THUA_KE_KE_THUA");
        assert.equal(cqVn.maHoSo, hsVn);

        // Detail trả đủ Mẫu 11
        r = await call(getApplicationCQ_VNDetail, { id: cqVn.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.donGoc.maDonDangKy, maDonVn);
        assert.equal(r.body.khachHangMoi.id, kh2.id);
        assert.equal(r.body.taiLieuCQ.length, 1);
        assert.equal(r.body.lichSuChuyenQuyen.length, 1);

        // Phản hồi Cục -> đồng bộ hanTraLoi
        const hanVn = addDays(10);
        r = await call(savePhanHoiCQSH_VN, {
            idDonCQSH: cqVn.id,
            soThongBao: "TB-CQ-VN-1",
            ngayNhanThongBao: addDays(0),
            hanTraLoi: hanVn,
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.hanTraLoi, hanVn);
        const phVnId = r.body.data.id;

        // Quá hạn -> autoRejectExpiredDonCQSH_VN chuyển sang 2 + tuDongTuChoi = true
        await LichSuPhanHoiCQSH_NH_VN.update({ ngayNhanThongBao: addDays(-10), hanTraLoi: addDays(-2) }, { where: { id: phVnId } });
        await DonCQSH_VN.update({ hanTraLoi: addDays(-2) }, { where: { id: cqVn.id } });
        const rejVn = await autoRejectExpiredDonCQSH_VN({ force: true });
        assert.ok(rejVn >= 1);
        let recVn = await DonCQSH_VN.findByPk(cqVn.id);
        assert.equal(recVn.trangThaiDuyet, 2);
        assert.equal(Boolean(recVn.tuDongTuChoi), true);
        assert.equal(recVn.ngayGhiNhanCQ, null);

        // Trả lời + mở lại về 0
        r = await call(savePhanHoiCQSH_VN, {
            idDonCQSH: cqVn.id,
            id: phVnId,
            ngayTraLoi: addDays(-3),
            reopenIfAutoRejected: true,
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.hanTraLoi, null);

        // Duyệt sang 1 -> đóng băng đơn gốc, sinh đơn con loaiDon = 4, idKhachHang = kh2.id
        r = await call(updateApplicationCQ_VN, {
            id: cqVn.id,
            trangThaiDuyet: 1,
            soDonChuyenQuyen: `CQ-VN-1-${stamp}`,
            ngayGhiNhanCQ: addDays(0),
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const donMoiVn = r.body.donMoi;
        assert.ok(donMoiVn && donMoiVn.maDonDangKy);
        cleanup.donVn.push(donMoiVn.maDonDangKy);
        assert.equal(Number(donMoiVn.loaiDon), 4);
        assert.equal(Number(donMoiVn.idKhachHang), kh2.id);
        assert.equal(Number((await DonDangKy.findByPk(maDonVn)).donGoc), 1);

        // List trả cả phẳng lẫn nested
        r = await call(getAllApplicationCQ_VN, { searchText: `CQ-VN-1-${stamp}`, pageIndex: 1, pageSize: 10 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.data.length, 1);
        assert.equal(r.body.data[0].tenKhachHangCu, kh1.tenKhachHang);
        assert.equal(r.body.data[0].tenKhachHangMoi, kh2.tenKhachHang);
        assert.equal(r.body.data[0].soLanThongBao, 1);

        // fulldetail VN trả danhSachDonChuyenQuyen
        r = await call(getFullApplicationDetail, { maDonDangKy: maDonVn });
        assert.equal(r.status, 200);
        assert.ok(r.body.danhSachDonChuyenQuyen.some((x) => x.id === cqVn.id));

        // Hoàn tác 1 -> 0 và xóa
        r = await call(updateApplicationCQ_VN, { id: cqVn.id, trangThaiDuyet: 0 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await DonDangKy.findByPk(donMoiVn.maDonDangKy), null);
        assert.equal(Number((await DonDangKy.findByPk(maDonVn)).donGoc), 0);
        r = await call(deleteApplicationCQ_VN, { id: cqVn.id });
        assert.equal(r.status, 200);
        assert.equal(await LichSuPhanHoiCQSH_NH_VN.count({ where: { idDonCQSH: cqVn.id } }), 0);
        cleanup.cqVnIds.length = 0;
        console.log("✅ KB1 (CQSH VN): add(0) -> detail -> phan-hoi -> quá hạn -> reopen -> duyệt(1) -> list -> fulldetail -> rollback -> delete ĐẠT");

        // =========================================================================
        // 2. CQSH KH (Campuchia) + Phả hệ KH + Filter DANG_CHUYEN_QUYEN
        // =========================================================================
        const maDonKh = `TCQ_KH_${stamp}`;
        const hsKh = `HS_CQKH_${stamp}`;
        await DonDangKyNhanHieu_KH.create({
            maDonDangKy: maDonKh,
            maHoSo: hsKh,
            maHoSoVuViec: hsKh,
            soDon: `4-KH-CQ-${stamp}`,
            idKhachHang: kh1.id,
            maNhanHieu: nh.maNhanHieu,
            donGoc: 0,
            loaiDon: 1,
            trangThaiDon: "Thẩm định",
            trangThaiVuViec: "1",
        });
        cleanup.donKh.push(maDonKh);
        await DonDK_SPDV_KH.create({ maDonDangKy: maDonKh, maSPDV: spdvList[0].maSPDV });

        r = await call(addApplicationCQNHKH, {
            maDonDangKyCu: maDonKh,
            maKhachHangMoi: kh2.id,
            soDonChuyenQuyen: `CQ-KH-1-${stamp}`,
            loaiThayDoi: "CHUYEN_NHUONG",
            taiLieuCQ: [{ tenTaiLieu: "POA KH" }],
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const cqKh = r.body.donCQSH;
        cleanup.cqKhIds.push(cqKh.id);
        assert.equal(cqKh.trangThaiDuyet, 0);
        assert.equal(cqKh.ngayGhiNhanCQ, null);

        // Kiểm tra getAllApplication_KH filter DANG_CHUYEN_QUYEN + fulldetail KH trả dsBienDongChoDuyet
        r = await call(getAllApplication_KH, { loaiDon: "DANG_CHUYEN_QUYEN", searchText: `4-KH-CQ-${stamp}` });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(r.body.data.some((x) => x.maDonDangKy === maDonKh && x.dangChuyenQuyen === true));

        r = await call(getFullApplicationDetail_KH, { maDonDangKy: maDonKh });
        assert.equal(r.status, 200);
        assert.equal(r.body.dangChuyenQuyen, true);
        assert.ok(r.body.dsBienDongChoDuyet.some((x) => x.loaiBienDong === "CHUYEN_QUYEN" && x.id === cqKh.id));

        // Phản hồi Cục KH + quá hạn + reopen + duyệt 1 + fulldetail KH trả dsDonCon & đơn con có donCha
        r = await call(savePhanHoiCQSH_KH, {
            idDonCQSH: cqKh.id,
            ngayNhanThongBao: addDays(-10),
            hanTraLoi: addDays(-1),
        });
        assert.equal(r.status, 200);
        const phKhId = r.body.data.id;
        assert.ok((await autoRejectExpiredDonCQSH_KH({ force: true })) >= 1);
        assert.equal((await DonCQSH_KH.findByPk(cqKh.id)).trangThaiDuyet, 2);

        r = await call(savePhanHoiCQSH_KH, {
            idDonCQSH: cqKh.id,
            id: phKhId,
            ngayTraLoi: addDays(-2),
            reopenIfAutoRejected: true,
        });
        assert.equal(r.status, 200);
        assert.equal(r.body.reopened, true);

        r = await call(updateApplicationCQ_KH, { id: cqKh.id, trangThaiDuyet: 1, soDonChuyenQuyen: `CQ-KH-1-${stamp}`, ngayGhiNhanCQ: addDays(0) });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const donMoiKh = r.body.donMoi;
        assert.ok(donMoiKh && donMoiKh.maDonDangKy);
        cleanup.donKh.push(donMoiKh.maDonDangKy);
        assert.equal(Number(donMoiKh.loaiDon), 4);
        assert.equal(Number(donMoiKh.idKhachHang), kh2.id);

        r = await call(getFullApplicationDetail_KH, { maDonDangKy: maDonKh });
        assert.ok(r.body.dsDonCon.some((x) => x.maDonDangKy === donMoiKh.maDonDangKy));
        assert.ok(r.body.danhSachDonChuyenQuyen.some((x) => x.id === cqKh.id));

        r = await call(getFullApplicationDetail_KH, { maDonDangKy: donMoiKh.maDonDangKy });
        assert.equal(r.body.maDonDangKyGoc, maDonKh);
        assert.equal(r.body.donCha.maDonDangKy, maDonKh);

        // Detail KH & List KH
        r = await call(getApplicationCQ_KHDetail, { id: cqKh.id });
        assert.equal(r.status, 200);
        assert.equal(r.body.lichSuChuyenQuyen.length, 1);

        r = await call(getAllApplicationCQ_KH, { searchText: `CQ-KH-1-${stamp}` });
        assert.equal(r.status, 200);
        assert.equal(r.body.data.length, 1);
        assert.equal(r.body.data[0].tenKhachHangMoi, kh2.tenKhachHang);

        // Rollback 1 -> 0 & xóa
        r = await call(updateApplicationCQ_KH, { id: cqKh.id, trangThaiDuyet: 0 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(await DonDangKyNhanHieu_KH.findByPk(donMoiKh.maDonDangKy), null);
        assert.equal(Number((await DonDangKyNhanHieu_KH.findByPk(maDonKh)).donGoc), 0);
        r = await call(deleteApplicationCQ_KH, { id: cqKh.id });
        assert.equal(r.status, 200);
        assert.equal(await LichSuPhanHoiCQSH_NH_KH.count({ where: { idDonCQSH: cqKh.id } }), 0);
        cleanup.cqKhIds.length = 0;
        console.log("✅ KB2 (CQSH KH): add(0) -> list/fulldetail KH -> phan-hoi -> quá hạn -> reopen -> duyệt(1) -> donCha/dsDonCon -> rollback -> delete ĐẠT");

        // =========================================================================
        // 3. TÁCH ĐƠN KH (nhiều lần cùng maHoSoVuViec không lỗi duplicate + list + detail)
        // =========================================================================
        r = await call(tachDonDangKy_KH, {
            maDonDangKyCu: maDonKh,
            listDonTach: [
                { soDon: `TD-KH-1-${stamp}`, nhomSPDV: spdvList[0].maSPDV },
                { soDon: `TD-KH-2-${stamp}`, nhomSPDV: spdvList[0].maSPDV },
            ],
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(r.body.danhSachDonMoi.length, 2);
        const [td1, td2] = r.body.danhSachDonMoi;
        cleanup.donKh.push(td1.maDonDangKy, td2.maDonDangKy);

        const tdRows = await DonTachNH_KH.findAll({ where: { maDonDangKyGoc: maDonKh }, raw: true });
        tdRows.forEach((row) => cleanup.tdKhIds.push(row.id));

        r = await call(getAllApplicationTD_KH, { searchText: `TD-KH-1-${stamp}`, pageIndex: 1, pageSize: 10 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.data.length, 1);
        assert.equal(r.body.data[0].soDonGoc, `4-KH-CQ-${stamp}`);
        assert.equal(r.body.data[0].donCha.maDonDangKy, maDonKh);

        r = await call(getApplicationTD_KHDetail, { maDonDangKy: td1.maDonDangKy });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.soDonGoc, `4-KH-CQ-${stamp}`);
        assert.equal(r.body.donMoi.maDonDangKy, td1.maDonDangKy);
        assert.equal(r.body.donGoc.maDonDangKy, maDonKh);
        console.log("✅ KB3 (Tách đơn KH): tách 2 đơn cùng hồ sơ không lỗi unique + /list & /detail KH ĐẠT");
    } finally {
        for (const id of cleanup.cqVnIds) {
            await LichSuPhanHoiCQSH_NH_VN.destroy({ where: { idDonCQSH: id } }).catch(() => {});
            await DonCQSH_VN.destroy({ where: { id } }).catch(() => {});
        }
        for (const id of cleanup.cqKhIds) {
            await LichSuPhanHoiCQSH_NH_KH.destroy({ where: { idDonCQSH: id } }).catch(() => {});
            await DonCQSH_KH.destroy({ where: { id } }).catch(() => {});
        }
        for (const id of cleanup.tdKhIds) {
            await DonTachNH_KH.destroy({ where: { id } }).catch(() => {});
        }
        for (const ma of cleanup.donVn.reverse()) {
            await DonDK_SPDV.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDangKy.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
        }
        for (const ma of cleanup.donKh.reverse()) {
            await TaiLieu_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDK_SPDV_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDangKyNhanHieu_KH.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
        }
    }
}

main()
    .then(() => {
        console.log("🎉 Toàn bộ kiểm thử CQSH (VN & KH) và Tách đơn KH ĐẠT 100%!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Kiểm thử thất bại:", err);
        process.exit(1);
    });
