/**
 * Kiểm thử tích hợp cho 4 kịch bản:
 * 1. Tạo Đơn tiếp nhận (không maHoSo, không idKhachHang) + hiển thị /list & /fulldetail + tạo đơn tiếp nhận thứ 2 không trùng maHoSoVuViec.
 * 2. Tạo GCN VN chỉ với { soBang, trangThaiBang } + hiển thị /list & /detail.
 * 3. Đăng nhập bằng Username và Email (kể cả lẫn hoa/thường) -> 200 OK cùng maNhanSu, role, tenNhanSu, email; kiểm tra JWT decode.
 * 4. /staff/basiclist, /staff/list (lọc theo email/tên), /staff/myteam và /team/list -> đầy đủ email, managerEmail, role, sdt.
 * Chạy: node tests/test_don_tiep_nhan_gcn_email_login.js
 */
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sequelize } from "../src/config/db.js";
import {
    syncDatabase,
    DonDangKy,
    DonDK_SPDV,
    NhanHieu,
    GCN_NH,
    NhanSu,
    Auth,
    NhomNhanSu,
    SanPham_DichVu,
} from "../src/models/index.js";
import {
    createApplication,
    updateApplication,
    getAllApplication,
    getApplicationById,
    getFullApplicationDetail,
} from "../src/controllers/donDangKyController.js";
import {
    addGCN_NH_VN,
    getGCN_NHs,
    getGCN_NHDetail,
} from "../src/controllers/gcn_nhController.js";
import { login, resetPassword } from "../src/controllers/authController.js";
import {
    createNhanSu,
    updateNhanSu,
    getNhanSuBasicList,
    getNhanSuList,
    getMyTeam,
} from "../src/controllers/nhanSuController.js";
import { listAllTeams } from "../src/controllers/nhomNhanSuController.js";

dotenv.config();

const call = async (handler, body = {}, params = {}, user = { maNhanSu: "TEST_ADMIN", role: "admin" }) => {
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
    await handler({ body, params, query: {}, user }, res);
    return out;
};

const cleanup = {
    maDonList: [],
    maNhanHieuList: [],
    gcnIds: [],
    nhomIds: [],
    authIds: [],
    maNhanSuList: [],
};

async function main() {
    await sequelize.authenticate();
    await syncDatabase();

    const stamp = Date.now();
    const spdv = await SanPham_DichVu.findOne();
    assert.ok(spdv, "Cần ít nhất 1 SanPham_DichVu trong DB để test");
    const sampleMaSPDV = spdv.maSPDV;

    try {
        // =========================================================================
        // KỊCH BẢN 1: Đơn tiếp nhận (không maHoSo, không idKhachHang) + tạo đơn 2
        // =========================================================================
        // 1a. Thiếu trường bắt buộc -> trả 400 rõ ràng
        let r = await call(createApplication, {
            laDonTiepNhan: true,
            soDon: "",
            trangThaiVuViec: "1",
            maSPDVList: [],
        });
        assert.equal(r.status, 400, "Đơn tiếp nhận thiếu trường bắt buộc phải trả 400");

        // 1b. Tạo đơn tiếp nhận 1 hợp lệ (không maHoSo, không idKhachHang)
        const soDon1 = `4-2026-TN1-${stamp}`;
        r = await call(createApplication, {
            laDonTiepNhan: true,
            soDon: soDon1,
            trangThaiVuViec: "1",
            maSPDVList: [sampleMaSPDV],
            nhanHieu: { tenNhanHieu: `NH Tiếp Nhận 1 ${stamp}` },
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const don1 = r.body.don;
        cleanup.maDonList.push(don1.maDonDangKy);
        cleanup.maNhanHieuList.push(don1.maNhanHieu);

        assert.equal(Boolean(don1.laDonTiepNhan), true);
        assert.equal(don1.maHoSo, null);
        assert.equal(don1.maHoSoVuViec, null);
        assert.equal(don1.idKhachHang, null);
        assert.ok(don1.maDonDangKy.startsWith("TN_"), `maDonDangKy phải bắt đầu bằng TN_, thực tế: ${don1.maDonDangKy}`);
        assert.ok(!don1.maDonDangKy.startsWith("_") && !don1.maDonDangKy.startsWith("null") && !don1.maDonDangKy.startsWith("undefined"));

        // 1c. Tạo đơn tiếp nhận 2 cũng không có maHoSo -> không lỗi duplicate maHoSoVuViec
        const soDon2 = `4-2026-TN2-${stamp}`;
        r = await call(createApplication, {
            laDonTiepNhan: true,
            soDon: soDon2,
            trangThaiVuViec: "1",
            maSPDVList: [sampleMaSPDV],
            nhanHieu: { tenNhanHieu: `NH Tiếp Nhận 2 ${stamp}` },
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const don2 = r.body.don;
        cleanup.maDonList.push(don2.maDonDangKy);
        cleanup.maNhanHieuList.push(don2.maNhanHieu);
        assert.equal(don2.maHoSoVuViec, null);
        assert.equal(don2.idKhachHang, null);

        // 1d. Kiểm tra hiển thị ở /list, /detail, /fulldetail và /update
        r = await call(getAllApplication, {
            soDon: soDon1,
            fields: ["maDonDangKy", "soDon", "tenKhachHang", "tenNhanHieu", "laDonTiepNhan"],
            pageIndex: 1,
            pageSize: 10,
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const foundInList = (r.body.data || []).find((x) => x.maDonDangKy === don1.maDonDangKy);
        assert.ok(foundInList, "Đơn tiếp nhận chưa có khách hàng phải hiển thị ở /application/list");
        assert.equal(foundInList.tenKhachHang, null);
        assert.equal(foundInList.laDonTiepNhan, true);

        r = await call(getApplicationById, { maDonDangKy: don1.maDonDangKy });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.vuViec, []);

        r = await call(getFullApplicationDetail, { maDonDangKy: don1.maDonDangKy });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.soDon, soDon1);
        assert.equal(r.body.khachHang, null);
        assert.equal(r.body.idKhachHang, null);

        r = await call(updateApplication, {
            maDonDangKy: don1.maDonDangKy,
            maHoSo: "",
            idKhachHang: "",
            ghiChu: "Cập nhật đơn tiếp nhận",
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        console.log("✅ KB1: Đơn tiếp nhận (2 đơn không maHoSo/idKhachHang) tạo, liệt kê, chi tiết & cập nhật thành công");

        // =========================================================================
        // KỊCH BẢN 2: GCN VN chỉ với { soBang, trangThaiBang }
        // =========================================================================
        const soBangTest = `4-VN-TEST-${stamp}`;
        r = await call(addGCN_NH_VN, {
            soBang: soBangTest,
            trangThaiBang: "Còn hiệu lực",
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const gcn = r.body.data;
        cleanup.gcnIds.push(gcn.id);
        assert.equal(gcn.soBang, soBangTest);
        assert.equal(gcn.trangThaiBang, "Còn hiệu lực");
        assert.equal(gcn.idKhachHang, null);
        assert.equal(gcn.maNhanHieu, null);

        r = await call(getGCN_NHs, { soBang: soBangTest, pageIndex: 1, pageSize: 10 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const foundGcn = (r.body.data || []).find((x) => x.id === gcn.id);
        assert.ok(foundGcn, "GCN VN không có KH/NH phải hiển thị ở danh sách GCN");
        assert.equal(foundGcn.tenKhachHang, "");
        assert.equal(foundGcn.tenNhanHieu, "");
        assert.equal(foundGcn.trangThaiBang, "Còn hiệu lực");

        r = await call(getGCN_NHDetail, { id: gcn.id });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.soBang, soBangTest);
        assert.equal(r.body.idKhachHang, null);
        assert.equal(r.body.maNhanHieu, null);
        console.log("✅ KB2: GCN VN chỉ với { soBang, trangThaiBang } tạo & đọc danh sách/chi tiết thành công");

        // =========================================================================
        // KỊCH BẢN 3: Đăng nhập bằng Username và Email (hoa/thường lẫn lộn)
        // =========================================================================
        const mgrCode = `NS_MGR_${stamp}`;
        const memCode = `NS_MEM_${stamp}`;
        const mgrEmail = `Mgr.${stamp}@TestMail.VN`;
        const memEmail = `Mem.${stamp}@TestMail.VN`;
        const memUsername = `user_${stamp}`;
        const memPassword = `Pass@${stamp}`;

        r = await call(createNhanSu, {
            maNhanSu: mgrCode,
            hoTen: `Trưởng Nhóm ${stamp}`,
            chucVu: "Manager",
            phongBan: "IP",
            sdt: "0901112222",
            email: `  ${mgrEmail}  `,
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        cleanup.maNhanSuList.push(mgrCode);
        assert.equal(r.body.nhanSu.email, mgrEmail.toLowerCase(), "Email phải được chuẩn hóa lowercase");

        r = await call(createNhanSu, {
            maNhanSu: memCode,
            hoTen: `Nhân Viên ${stamp}`,
            chucVu: "Chuyên viên",
            phongBan: "Nhãn hiệu",
            sdt: "0903334444",
            email: memEmail,
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        cleanup.maNhanSuList.push(memCode);

        // Chuẩn hóa email chuỗi rỗng -> NULL khi update
        const emptyEmailCode = `NS_EMPTY_${stamp}`;
        r = await call(createNhanSu, { maNhanSu: emptyEmailCode, hoTen: `NV Empty ${stamp}`, email: "   " });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        cleanup.maNhanSuList.push(emptyEmailCode);
        assert.equal(r.body.nhanSu.email, null);
        r = await call(updateNhanSu, { maNhanSu: emptyEmailCode, email: "" });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.nhanSu.email, null);

        const hashed = await bcrypt.hash(memPassword, 10);
        const memAuth = await Auth.create({
            maNhanSu: memCode,
            Username: memUsername,
            PasswordHash: hashed,
            Role: "trainee",
        });
        cleanup.authIds.push(memAuth.AuthID);

        // 3a. Đăng nhập bằng Username
        const loginByUser = await call(login, { username: memUsername, password: memPassword });
        assert.equal(loginByUser.status, 200, JSON.stringify(loginByUser.body));
        const decodedByUser = jwt.verify(loginByUser.body.token, process.env.JWT_SECRET);

        // 3b. Đăng nhập bằng Email (viết hoa/thường lẫn lộn + khoảng trắng)
        const loginByEmail = await call(login, { username: `  ${memEmail.toUpperCase()} `, password: memPassword });
        assert.equal(loginByEmail.status, 200, JSON.stringify(loginByEmail.body));
        const decodedByEmail = jwt.verify(loginByEmail.body.token, process.env.JWT_SECRET);

        assert.equal(decodedByUser.maNhanSu, memCode);
        assert.equal(decodedByEmail.maNhanSu, memCode);
        assert.equal(decodedByEmail.role, "trainee");
        assert.equal(decodedByEmail.tenNhanSu, `Nhân Viên ${stamp}`);
        assert.equal(decodedByEmail.email, memEmail.toLowerCase());
        assert.equal(decodedByEmail.username, memUsername);
        assert.equal(decodedByEmail.maNhanSu, decodedByUser.maNhanSu);
        assert.equal(decodedByEmail.role, decodedByUser.role);
        assert.equal(decodedByEmail.tenNhanSu, decodedByUser.tenNhanSu);
        assert.equal(decodedByEmail.email, decodedByUser.email);

        // 3c. Sai mật khẩu -> 401
        const badLogin = await call(login, { username: memEmail, password: "wrong-password" });
        assert.equal(badLogin.status, 401);

        // 3d. Reset mật khẩu bằng Email
        const newPass = `NewPass@${stamp}`;
        const resetRes = await call(resetPassword, { email: memEmail.toUpperCase(), newPassword: newPass });
        assert.equal(resetRes.status, 200, JSON.stringify(resetRes.body));
        const loginAfterReset = await call(login, { username: memEmail.toLowerCase(), password: newPass });
        assert.equal(loginAfterReset.status, 200, JSON.stringify(loginAfterReset.body));
        console.log("✅ KB3: Đăng nhập bằng Username & Email (case-insensitive) + resetPassword bằng Email thành công");

        // =========================================================================
        // KỊCH BẢN 4: /staff/basiclist, /staff/list, /staff/myteam & /team/list
        // =========================================================================
        const nhomRec = await NhomNhanSu.create({
            managerCode: mgrCode,
            maNhanSu: memCode,
            tenNhom: `Team Test ${stamp}`,
        });
        cleanup.nhomIds.push(nhomRec.id);

        // 4a. /staff/basiclist
        r = await call(getNhanSuBasicList, {});
        assert.equal(r.status, 200);
        const basicMem = r.body.find((x) => x.maNhanSu === memCode);
        assert.ok(basicMem, "Phải có nhân viên trong basiclist");
        assert.equal(basicMem.email, memEmail.toLowerCase());
        assert.equal(basicMem.chucVu, "Chuyên viên");
        assert.equal(basicMem.phongBan, "Nhãn hiệu");

        // 4b. /staff/list lọc theo email
        r = await call(getNhanSuList, { hoTen: memEmail.toLowerCase() });
        assert.equal(r.status, 200);
        assert.ok(r.body.some((x) => x.maNhanSu === memCode), "Lọc /staff/list theo email phải khớp");

        // 4c. /staff/myteam
        r = await call(getMyTeam, { managerCode: mgrCode });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.manager?.email, mgrEmail.toLowerCase());

        // 4d. /team/list (không filter và có searchText theo email thành viên)
        r = await call(listAllTeams, { searchText: memEmail.toLowerCase(), pageIndex: 1, pageSize: 20 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const team = (r.body.teams || []).find((t) => t.managerCode === mgrCode);
        assert.ok(team, "Tìm /team/list theo email thành viên phải ra đúng nhóm");
        assert.equal(team.managerEmail, mgrEmail.toLowerCase());
        const teamMem = team.members.find((m) => m.maNhanSu === memCode);
        assert.ok(teamMem, "Phải có thành viên trong nhóm");
        assert.equal(teamMem.email, memEmail.toLowerCase());
        assert.equal(teamMem.role, "trainee", "Phải trả đúng role thực từ bảng Auth thay vì cứng staff");
        assert.equal(teamMem.sdt, "0903334444");
        assert.equal(teamMem.phongBan, "Nhãn hiệu");
        console.log("✅ KB4: /staff/basiclist, /staff/list, /staff/myteam & /team/list trả đủ email, managerEmail, role, sdt");
    } finally {
        // Dọn sạch toàn bộ dữ liệu test
        for (const id of cleanup.nhomIds) await NhomNhanSu.destroy({ where: { id } }).catch(() => {});
        for (const id of cleanup.authIds) await Auth.destroy({ where: { AuthID: id } }).catch(() => {});
        for (const ma of cleanup.maNhanSuList) await NhanSu.destroy({ where: { maNhanSu: ma } }).catch(() => {});
        for (const id of cleanup.gcnIds) await GCN_NH.destroy({ where: { id } }).catch(() => {});
        for (const ma of cleanup.maDonList) {
            await DonDK_SPDV.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
            await DonDangKy.destroy({ where: { maDonDangKy: ma } }).catch(() => {});
        }
        for (const maNH of cleanup.maNhanHieuList) await NhanHieu.destroy({ where: { maNhanHieu: maNH } }).catch(() => {});
    }
}

main()
    .then(() => {
        console.log("🎉 Tất cả 4 kịch bản kiểm thử đều ĐẠT!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Kiểm thử thất bại:", err);
        process.exit(1);
    });
