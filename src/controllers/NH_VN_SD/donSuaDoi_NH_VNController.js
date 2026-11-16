import { sequelize } from "../../config/db.js";
import { DonDangKy } from "../../models/donDangKyModel.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { DonSuaDoi_NH_VN } from "../../models/VN_SuaDoi_NH/donSuaDoiNH_VNModel.js";
import { DonDK_SPDV } from "../../models/donDK_SPDVMolel.js";
import crypto from "crypto";
import { TaiLieu } from "../../models/taiLieuModel.js";
import { LichSuThamDinh } from "../../models/lichSuThamDinhModel.js";
import { NhanHieu } from "../../models/nhanHieuModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import { Op, literal } from "sequelize";
import { rollbackSpawnedChildDon } from "../../utils/lineageHelper.js";

const generateMaDonDangKy = (maHoSo) => {
    const prefix = maHoSo || "SD";
    const randomStr = crypto.randomBytes(3).toString("hex");
    return `${prefix}_${randomStr}`;
};

// Sinh mã khách hàng mới duy nhất từ mã cũ
export async function generateUniqueMaKhachHang(maCu, transaction = null) {
    const basePrefix = maCu ? String(maCu).split("-")[0] : "KH";
    let charCode = 65; // 'A'
    if (maCu && maCu.includes("-")) {
        const parts = String(maCu).split("-");
        const suffix = parts[parts.length - 1];
        if (/^[A-Z]$/.test(suffix)) {
            charCode = suffix.charCodeAt(0) + 1;
        }
    }

    for (let attempt = 0; attempt < 26; attempt++) {
        const candidate = `${basePrefix}-${String.fromCharCode(charCode + attempt)}`;
        const existed = await KhachHangCuoi.findOne({
            where: { maKhachHang: candidate },
            attributes: ["id"],
            transaction,
        });
        if (!existed) return candidate;
    }

    return `${basePrefix}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

// Helper tạo DonDangKy kế thừa an toàn (tránh lỗi unique maHoSoVuViec nếu DB có unique index)
export const createChildDonSafely = async (donPayload, transaction) => {
    try {
        return await DonDangKy.create(donPayload, { transaction });
    } catch (err) {
        if (err?.name === "SequelizeUniqueConstraintError") {
            return await DonDangKy.create(
                {
                    ...donPayload,
                    maHoSoVuViec: donPayload.maDonDangKy,
                },
                { transaction }
            );
        }
        throw err;
    }
};

/**
 * Helper duyệt Chấp thuận (trangThaiDuyet = 1) cho Tờ khai Sửa đổi Đơn đăng ký NH VN
 * - Đóng băng đơn gốc (donGoc = 1), giữ nguyên loaiDon của đơn gốc
 * - Sinh đơn mới kế thừa thông tin & tiến trình của đơn gốc (loaiDon = 2, donGoc = 0)
 * - Copy danh sách SPDV, Tài liệu, Lịch sử thẩm định sang đơn mới
 */
export const approveDonSuaDoi_NH_VN = async (record, payload = {}, transaction = null) => {
    const ngayChapThuan =
        payload.ngayChapThuan ||
        payload.ngayGhiNhanSuaDoi ||
        record.ngayChapThuan ||
        record.ngayGhiNhanSuaDoi ||
        new Date().toISOString().split("T")[0];

    // Nếu tờ khai đã sinh đơn mới trước đó thì chỉ cập nhật trạng thái/ngày duyệt
    if (record.maDonDangKy) {
        await record.update(
            {
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanSuaDoi: payload.ngayGhiNhanSuaDoi || ngayChapThuan,
                duocGhiNhanSuaDoi: true,
                ngayTuChoi: null,
                lyDoTuChoi: null,
            },
            { transaction }
        );
        const existingDonMoi = await DonDangKy.findOne({
            where: { maDonDangKy: record.maDonDangKy },
            transaction,
        });
        return { donMoi: existingDonMoi, record };
    }

    const donCu = await DonDangKy.findOne({
        where: { maDonDangKy: record.maDonDangKyGoc },
        transaction,
    });
    if (!donCu) {
        throw new Error("Không tìm thấy đơn đăng ký gốc để thực hiện chấp thuận sửa đổi.");
    }

    const savedChanges =
        typeof record.duLieuThayDoi === "string"
            ? (() => {
                  try {
                      return JSON.parse(record.duLieuThayDoi);
                  } catch {
                      return {};
                  }
              })()
            : record.duLieuThayDoi || {};

    const incomingChanges =
        typeof payload.duLieuThayDoi === "object" && payload.duLieuThayDoi !== null
            ? payload.duLieuThayDoi
            : {};

    const duLieu = { ...savedChanges, ...incomingChanges };

    const suaDoiTenChuDon = payload.suaDoiTenChuDon ?? record.suaDoiTenChuDon ?? duLieu.suaDoiTenChuDon;
    const ndSuaDoiTenChuDon = payload.ndSuaDoiTenChuDon ?? record.ndSuaDoiTenChuDon ?? duLieu.ndSuaDoiTenChuDon;
    const suaDoiDiaChi = payload.suaDoiDiaChi ?? record.suaDoiDiaChi ?? duLieu.suaDoiDiaChi;
    const ndSuaDoiDiaChi = payload.ndSuaDoiDiaChi ?? record.ndSuaDoiDiaChi ?? duLieu.ndSuaDoiDiaChi;
    const suaDoiDaiDien = payload.suaDoiDaiDien ?? record.suaDoiDaiDien ?? duLieu.suaDoiDaiDien;
    const ndSuaDoiDaiDien = payload.ndSuaDoiDaiDien ?? record.ndSuaDoiDaiDien ?? duLieu.ndSuaDoiDaiDien;
    const suaNhan = payload.suaNhan ?? record.suaNhan ?? duLieu.suaNhan;
    const ndSuaNhan = payload.ndSuaNhan ?? record.ndSuaNhan ?? duLieu.ndSuaNhan;

    // 1. Xác định khách hàng mới
    let idKhachHangMoi = donCu.idKhachHang;
    const explicitKhachHangId = payload.idKhachHangMoi || payload.idKhachHang || duLieu.idKhachHangMoi || duLieu.idKhachHang;
    if (explicitKhachHangId && Number(explicitKhachHangId) !== Number(donCu.idKhachHang)) {
        idKhachHangMoi = Number(explicitKhachHangId);
    } else if (suaDoiTenChuDon || suaDoiDiaChi) {
        const khachCu = await KhachHangCuoi.findByPk(donCu.idKhachHang, { transaction });
        if (khachCu) {
            const maKhachHangMoi = await generateUniqueMaKhachHang(khachCu.maKhachHang, transaction);
            const khachMoi = await KhachHangCuoi.create(
                {
                    tenKhachHang: suaDoiTenChuDon && ndSuaDoiTenChuDon ? ndSuaDoiTenChuDon : khachCu.tenKhachHang,
                    diaChi: suaDoiDiaChi && ndSuaDoiDiaChi ? ndSuaDoiDiaChi : khachCu.diaChi,
                    maKhachHang: maKhachHangMoi,
                    maKhachHangCu: khachCu.maKhachHang,
                    sdt: khachCu.sdt,
                    maQuocGia: khachCu.maQuocGia,
                    nguoiLienHe: khachCu.nguoiLienHe,
                    ghiChu: khachCu.ghiChu,
                    tenVietTatKH: khachCu.tenVietTatKH,
                    maDoiTac: khachCu.maDoiTac,
                    moTa: khachCu.moTa,
                    maNganhNghe: khachCu.maNganhNghe,
                    idNhomKhachHang: khachCu.idNhomKhachHang,
                },
                { transaction }
            );
            idKhachHangMoi = khachMoi.id;
        }
    }

    // 2. Xác định nhãn hiệu mới (nếu có sửa nhãn)
    let maNhanHieuMoi = payload.maNhanHieu || duLieu.maNhanHieu || donCu.maNhanHieu;
    const nhanHieuMoiObj = payload.nhanHieu || duLieu.nhanHieu;
    if (!payload.maNhanHieu && !duLieu.maNhanHieu && suaNhan && (nhanHieuMoiObj?.tenNhanHieu || nhanHieuMoiObj?.linkAnh)) {
        const nhCu = await NhanHieu.findByPk(donCu.maNhanHieu, { transaction });
        const createdNH = await NhanHieu.create(
            {
                tenNhanHieu: nhanHieuMoiObj?.tenNhanHieu || nhCu?.tenNhanHieu || ndSuaNhan || "Nhãn hiệu sửa đổi",
                linkAnh: nhanHieuMoiObj?.linkAnh || nhCu?.linkAnh || null,
            },
            { transaction }
        );
        maNhanHieuMoi = createdNH.maNhanHieu;
    }

    // 3. Đóng băng đơn cha: donGoc = 1, giữ nguyên loaiDon của đơn cha
    await donCu.update({ donGoc: 1 }, { transaction });

    // 4. Tạo đơn mới kế thừa thông tin & tiến trình của đơn cha
    const { id: _ignoreId, createdAt: _c, updatedAt: _u, ...donCuPlain } = donCu.get({ plain: true });
    const maHoSo = payload.maHoSo || duLieu.maHoSo || donCuPlain.maHoSo || donCuPlain.maHoSoVuViec;
    const maDonDangKyMoi = generateMaDonDangKy(maHoSo);

    const donMoiPayload = {
        ...donCuPlain,
        maDonDangKy: maDonDangKyMoi,
        loaiDon: 2, // 2 = Đã sửa đổi / Sau sửa đổi
        donGoc: 0,
        idKhachHang: idKhachHangMoi,
        maNhanHieu: maNhanHieuMoi,
        idDoiTac: payload.idDoiTac ?? duLieu.idDoiTac ?? donCuPlain.idDoiTac,
        idGUQ: payload.idGUQ ?? duLieu.idGUQ ?? donCuPlain.idGUQ,
        daiDienSHTT:
            suaDoiDaiDien && ndSuaDoiDaiDien
                ? ndSuaDoiDaiDien
                : payload.daiDienSHTT ?? duLieu.daiDienSHTT ?? donCuPlain.daiDienSHTT,
        maHoSo: maHoSo || donCuPlain.maHoSo,
        maHoSoVuViec: maHoSo || donCuPlain.maHoSoVuViec,
        soDon: payload.soDonMoi || duLieu.soDonMoi || donCuPlain.soDon,
    };

    const donMoi = await createChildDonSafely(donMoiPayload, transaction);

    // 5. Copy danh sách SPDV sang đơn mới (hoặc áp dụng danh sách SPDV sửa đổi nếu có)
    const maSPDVListMoi = payload.maSPDVList || duLieu.maSPDVList;
    if (Array.isArray(maSPDVListMoi) && maSPDVListMoi.length > 0) {
        const spdvRecords = maSPDVListMoi.map((maSPDV) => ({
            maDonDangKy: maDonDangKyMoi,
            maSPDV: typeof maSPDV === "object" ? maSPDV.maSPDV : maSPDV,
            isAutoImport: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        }));
        await DonDK_SPDV.bulkCreate(spdvRecords, { transaction });
    } else {
        const spdvCuList = await DonDK_SPDV.findAll({
            where: { maDonDangKy: donCu.maDonDangKy },
            transaction,
        });
        if (spdvCuList && spdvCuList.length > 0) {
            const spdvMoiList = spdvCuList.map((sp) => ({
                maDonDangKy: maDonDangKyMoi,
                maSPDV: sp.maSPDV,
                isAutoImport: sp.isAutoImport,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            await DonDK_SPDV.bulkCreate(spdvMoiList, { transaction });
        }
    }

    // 6. Copy Tài liệu sang đơn mới
    const taiLieuCuList = await TaiLieu.findAll({
        where: { maDonDangKy: donCu.maDonDangKy },
        transaction,
    });
    if (taiLieuCuList && taiLieuCuList.length > 0) {
        for (const tl of taiLieuCuList) {
            await TaiLieu.create(
                {
                    maDonDangKy: maDonDangKyMoi,
                    tenTaiLieu: tl.tenTaiLieu,
                    linkTaiLieu: tl.linkTaiLieu,
                    trangThai: tl.trangThai,
                },
                { transaction }
            );
        }
    }

    // 7. Copy Lịch sử thẩm định sang đơn mới
    const lichSuCuList = await LichSuThamDinh.findAll({
        where: { maDonDangKy: donCu.maDonDangKy },
        transaction,
    });
    if (lichSuCuList && lichSuCuList.length > 0) {
        for (const ls of lichSuCuList) {
            const { id: _lsId, createdAt: _lsC, updatedAt: _lsU, ...lsPlain } = ls.get({ plain: true });
            await LichSuThamDinh.create(
                {
                    ...lsPlain,
                    maDonDangKy: maDonDangKyMoi,
                },
                { transaction }
            );
        }
    }

    // 8. Cập nhật maDonDangKy mới và trạng thái duyệt vào bản ghi tờ khai
    await record.update(
        {
            maDonDangKy: donMoi.maDonDangKy,
            trangThaiDuyet: 1,
            ngayChapThuan,
            ngayGhiNhanSuaDoi: payload.ngayGhiNhanSuaDoi || ngayChapThuan,
            duocGhiNhanSuaDoi: true,
            ngayTuChoi: null,
            lyDoTuChoi: null,
            duLieuThayDoi: duLieu,
        },
        { transaction }
    );

    return { donMoi, record };
};

/**
 * =========================================================================
 * 1. TẠO MỚI TỜ KHAI SỬA ĐỔI ĐƠN ĐĂNG KÝ NHÃN HIỆU VN
 * Endpoint: POST /api/application_sd_nh_vn/add
 * Mặc định trangThaiDuyet = 0 (Chưa chấp thuận):
 * - KHÔNG nhân bản DonDangKy mới, KHÔNG đổi donGoc = 1 của đơn cũ
 * - Chỉ lưu tờ khai với maDonDangKy = null, trangThaiDuyet = 0 và duLieuThayDoi
 * =========================================================================
 */
export const addApplicationSDNHVN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            maHoSo,
            maDonDangKyCu,
            maDonDangKyGoc: reqMaDonGoc,
            soDonSD,
            soDon,
            ngayYeuCau,
            lanSuaDoi,
            ngayGhiNhanSuaDoi,
            duocGhiNhanSuaDoi,
            moTaSuaDoi,
            moTa,
            suaDoiDaiDien,
            ndSuaDoiDaiDien,
            suaDoiTenChuDon,
            ndSuaDoiTenChuDon,
            suaDoiDiaChi,
            ndSuaDoiDiaChi,
            suaNhan,
            ndSuaNhan,
            suaNhomSPDV,
            ndSuaNhomSPDV,
            suaDoiNoiDungKhac,
            trangThaiDuyet = 0,
            ngayChapThuan,
            ngayTuChoi,
            lyDoTuChoi,
            duLieuThayDoi,
            idKhachHangMoi,
            idKhachHang,
            idDoiTac,
            daiDienSHTT,
            maNhanHieu,
            nhanHieu,
            maSPDVList,
            maNhanSuCapNhap,
        } = req.body;

        const targetMaDonGoc = maDonDangKyCu || reqMaDonGoc || req.body.maDonDangKy;
        const targetSoDon = soDonSD || soDon || null;

        if (!targetMaDonGoc) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc: mã đơn đăng ký gốc (maDonDangKyCu / maDonDangKyGoc)." });
        }

        const donCu = await DonDangKy.findOne({
            where: { maDonDangKy: targetMaDonGoc },
            transaction,
        });
        if (!donCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký gốc." });
        }
        if (Number(donCu.donGoc) === 1) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Đơn đăng ký gốc này đã bị đóng băng (đã sửa đổi / chuyển nhượng), vui lòng lập tờ khai trên đơn kế thừa hiện hành.",
            });
        }
        if (donCu.trangThaiVuViec && donCu.trangThaiVuViec !== "1") {
            await transaction.rollback();
            return res.status(400).json({
                message: "Trạng thái đơn phải là đang giải quyết mới được lập đơn sửa đổi.",
            });
        }
        if (donCu.ngayThongBaoCapBang) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Đơn đăng ký này đã có ngày thông báo cấp bằng, không được phép lập đơn sửa đổi.",
            });
        }

        const countSD = await DonSuaDoi_NH_VN.count({
            where: { maDonDangKyGoc: targetMaDonGoc },
            transaction,
        });
        const actualLanSuaDoi = lanSuaDoi ?? countSD + 1;
        const actualMaHoSo = maHoSo || donCu.maHoSo || donCu.maHoSoVuViec;

        const mergedDuLieuThayDoi = {
            ...(typeof duLieuThayDoi === "object" && duLieuThayDoi !== null ? duLieuThayDoi : {}),
            maHoSo: actualMaHoSo,
            soDon: targetSoDon || donCu.soDon,
            idKhachHangMoi: idKhachHangMoi || idKhachHang || undefined,
            idDoiTac: idDoiTac ?? undefined,
            daiDienSHTT: daiDienSHTT ?? ndSuaDoiDaiDien ?? undefined,
            maNhanHieu: maNhanHieu ?? undefined,
            nhanHieu: nhanHieu ?? undefined,
            maSPDVList: maSPDVList ?? undefined,
            suaDoiDaiDien,
            ndSuaDoiDaiDien,
            suaDoiTenChuDon,
            ndSuaDoiTenChuDon,
            suaDoiDiaChi,
            ndSuaDoiDiaChi,
            suaNhan,
            ndSuaNhan,
            suaNhomSPDV,
            ndSuaNhomSPDV,
            suaDoiNoiDungKhac,
            moTa: moTaSuaDoi || moTa || null,
        };

        const parsedTrangThaiDuyet = Number(trangThaiDuyet) || 0;

        const newSD = await DonSuaDoi_NH_VN.create(
            {
                maDonDangKy: null,
                maDonDangKyGoc: targetMaDonGoc,
                soDon: targetSoDon || donCu.soDon,
                ngayYeuCau: ngayYeuCau || new Date().toISOString().split("T")[0],
                lanSuaDoi: actualLanSuaDoi,
                ngayGhiNhanSuaDoi: ngayGhiNhanSuaDoi || null,
                duocGhiNhanSuaDoi: Boolean(duocGhiNhanSuaDoi),
                moTa: moTaSuaDoi || moTa || null,
                suaDoiDaiDien: Boolean(suaDoiDaiDien),
                ndSuaDoiDaiDien: ndSuaDoiDaiDien || null,
                suaDoiTenChuDon: Boolean(suaDoiTenChuDon),
                ndSuaDoiTenChuDon: ndSuaDoiTenChuDon || null,
                suaDoiDiaChi: Boolean(suaDoiDiaChi),
                ndSuaDoiDiaChi: ndSuaDoiDiaChi || null,
                suaNhan: Boolean(suaNhan),
                ndSuaNhan: ndSuaNhan || null,
                suaNhomSPDV: Boolean(suaNhomSPDV),
                ndSuaNhomSPDV: ndSuaNhomSPDV || null,
                suaDoiNoiDungKhac: Boolean(suaDoiNoiDungKhac),
                trangThaiDuyet: parsedTrangThaiDuyet === 2 ? 2 : 0,
                ngayChapThuan: null,
                ngayTuChoi: parsedTrangThaiDuyet === 2 ? ngayTuChoi || new Date().toISOString().split("T")[0] : null,
                lyDoTuChoi: parsedTrangThaiDuyet === 2 ? lyDoTuChoi || null : null,
                duLieuThayDoi: mergedDuLieuThayDoi,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || null,
            },
            { transaction }
        );

        let donMoi = null;
        if (parsedTrangThaiDuyet === 1) {
            const approved = await approveDonSuaDoi_NH_VN(newSD, req.body, transaction);
            donMoi = approved.donMoi;
        }

        await transaction.commit();

        return res.status(201).json({
            message:
                parsedTrangThaiDuyet === 1
                    ? "Thêm và chấp thuận tờ khai sửa đổi đơn thành công!"
                    : "Tiếp nhận tờ khai sửa đổi đơn thành công (Trạng thái: Chưa chấp thuận)!",
            donMoi,
            newSD,
            data: newSD,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi thêm đơn sửa đổi:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 2. CẬP NHẬT / DUYỆT TỜ KHAI SỬA ĐỔI ĐƠN ĐĂNG KÝ NHÃN HIỆU VN
 * Endpoint: PUT/POST /api/application_sd_nh_vn/update (hoặc /edit)
 * Hỗ trợ cập nhật trangThaiDuyet: 0 (Chờ duyệt), 1 (Được chấp thuận), 2 (Từ chối)
 * =========================================================================
 */
export const updateApplicationSD_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            id,
            idDonSuaDoi,
            maDonDangKy,
            maDonDangKyGoc,
            soDonSD,
            soDon,
            ngayYeuCau,
            lanSuaDoi,
            ngayGhiNhanSuaDoi,
            duocGhiNhanSuaDoi,
            moTaSuaDoi,
            moTa,
            suaDoiDaiDien,
            ndSuaDoiDaiDien,
            suaDoiTenChuDon,
            ndSuaDoiTenChuDon,
            suaDoiDiaChi,
            ndSuaDoiDiaChi,
            suaNhan,
            ndSuaNhan,
            suaNhomSPDV,
            ndSuaNhomSPDV,
            suaDoiNoiDungKhac,
            trangThaiDuyet,
            ngayChapThuan,
            ngayTuChoi,
            lyDoTuChoi,
            duLieuThayDoi,
            maNhanSuCapNhap,
        } = req.body;

        const targetId = id || idDonSuaDoi;
        let record = null;
        if (targetId) {
            record = await DonSuaDoi_NH_VN.findByPk(targetId, { transaction });
        } else if (maDonDangKy) {
            record = await DonSuaDoi_NH_VN.findOne({ where: { maDonDangKy }, transaction });
        } else if (maDonDangKyGoc) {
            record = await DonSuaDoi_NH_VN.findOne({
                where: { maDonDangKyGoc },
                order: [["createdAt", "DESC"]],
                transaction,
            });
        }

        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi đơn đăng ký nhãn hiệu!" });
        }

        const existingDuLieu =
            typeof record.duLieuThayDoi === "string"
                ? (() => {
                      try {
                          return JSON.parse(record.duLieuThayDoi);
                      } catch {
                          return {};
                      }
                  })()
                : record.duLieuThayDoi || {};

        const updatedDuLieu =
            duLieuThayDoi !== undefined
                ? { ...existingDuLieu, ...(typeof duLieuThayDoi === "object" ? duLieuThayDoi : {}) }
                : existingDuLieu;

        await record.update(
            {
                soDon: soDonSD ?? soDon ?? record.soDon,
                ngayYeuCau: ngayYeuCau ?? record.ngayYeuCau,
                lanSuaDoi: lanSuaDoi ?? record.lanSuaDoi,
                ngayGhiNhanSuaDoi: ngayGhiNhanSuaDoi ?? record.ngayGhiNhanSuaDoi,
                duocGhiNhanSuaDoi: duocGhiNhanSuaDoi ?? record.duocGhiNhanSuaDoi,
                moTa: moTaSuaDoi ?? moTa ?? record.moTa,
                suaDoiDaiDien: suaDoiDaiDien ?? record.suaDoiDaiDien,
                ndSuaDoiDaiDien: ndSuaDoiDaiDien ?? record.ndSuaDoiDaiDien,
                suaDoiTenChuDon: suaDoiTenChuDon ?? record.suaDoiTenChuDon,
                ndSuaDoiTenChuDon: ndSuaDoiTenChuDon ?? record.ndSuaDoiTenChuDon,
                suaDoiDiaChi: suaDoiDiaChi ?? record.suaDoiDiaChi,
                ndSuaDoiDiaChi: ndSuaDoiDiaChi ?? record.ndSuaDoiDiaChi,
                suaNhan: suaNhan ?? record.suaNhan,
                ndSuaNhan: ndSuaNhan ?? record.ndSuaNhan,
                suaNhomSPDV: suaNhomSPDV ?? record.suaNhomSPDV,
                ndSuaNhomSPDV: ndSuaNhomSPDV ?? record.ndSuaNhomSPDV,
                suaDoiNoiDungKhac: suaDoiNoiDungKhac ?? record.suaDoiNoiDungKhac,
                duLieuThayDoi: updatedDuLieu,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || record.maNhanSuCapNhap,
            },
            { transaction }
        );

        let donMoi = null;
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null) {
            const nextStatus = Number(trangThaiDuyet);
            if (nextStatus === 1) {
                const approved = await approveDonSuaDoi_NH_VN(record, req.body, transaction);
                donMoi = approved.donMoi;
            } else if (nextStatus === 2) {
                await rollbackSpawnedChildDon(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 2,
                        maDonDangKy: null,
                        ngayChapThuan: null,
                        ngayTuChoi: ngayTuChoi || record.ngayTuChoi || new Date().toISOString().split("T")[0],
                        lyDoTuChoi: lyDoTuChoi !== undefined ? lyDoTuChoi : record.lyDoTuChoi,
                        duocGhiNhanSuaDoi: false,
                    },
                    { transaction }
                );
            } else if (nextStatus === 0) {
                await rollbackSpawnedChildDon(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 0,
                        maDonDangKy: null,
                        ngayChapThuan: null,
                        ngayTuChoi: null,
                        lyDoTuChoi: null,
                        duocGhiNhanSuaDoi: false,
                    },
                    { transaction }
                );
            }
        }

        await transaction.commit();

        return res.status(200).json({
            message: "Cập nhật tờ khai sửa đổi đơn đăng ký nhãn hiệu thành công!",
            data: record,
            donSuaDoi: record,
            donMoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi cập nhật đơn sửa đổi:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 3. CHI TIẾT TỜ KHAI SỬA ĐỔI ĐƠN ĐĂNG KÝ NHÃN HIỆU VN
 * Endpoint: POST /api/application_sd_nh_vn/detail (hoặc GET .../detail/:id)
 * =========================================================================
 */
export const getApplicationSD_VNDetail = async (req, res) => {
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonSuaDoi;
        const { maDonDangKy, maDonDangKyGoc } = req.body || {};

        const whereCondition = {};
        if (id) whereCondition.id = id;
        else if (maDonDangKy) whereCondition.maDonDangKy = maDonDangKy;
        else if (maDonDangKyGoc) whereCondition.maDonDangKyGoc = maDonDangKyGoc;
        else {
            return res.status(400).json({ message: "Thiếu id hoặc maDonDangKy / maDonDangKyGoc!" });
        }

        const record = await DonSuaDoi_NH_VN.findOne({
            where: whereCondition,
            include: [
                {
                    model: DonDangKy,
                    as: "donMoi",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "nhanHieu" },
                        { model: KhachHangCuoi, as: "khachHang" },
                        { model: DoiTac, as: "doitac" },
                        { model: DonDK_SPDV, attributes: ["maSPDV"] },
                    ],
                },
                {
                    model: DonDangKy,
                    as: "donGoc",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "nhanHieu" },
                        { model: KhachHangCuoi, as: "khachHang" },
                        { model: DoiTac, as: "doitac" },
                        { model: DonDK_SPDV, attributes: ["maSPDV"] },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi đơn đăng ký nhãn hiệu!" });
        }

        const plain = record.toJSON();
        plain.soDonSD = plain.soDon;
        plain.soDonGoc = plain.donGoc?.soDon || null;
        plain.ngayNopDonGoc = plain.donGoc?.ngayNopDon || null;

        return res.status(200).json(plain);
    } catch (error) {
        console.error("❌ Lỗi lấy chi tiết đơn sửa đổi:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 4. DANH SÁCH TỜ KHAI SỬA ĐỔI ĐƠN ĐĂNG KÝ NHÃN HIỆU VN
 * Endpoint: POST /api/application_sd_nh_vn/list
 * =========================================================================
 */
export const getAllApplicationSD_VN = async (req, res) => {
    try {
        const {
            maSPDVList,
            trangThaiDon,
            trangThaiDuyet,
            searchText,
            soDon,
            maHoSo,
            fields = [],
            filterCondition = {},
            customerName,
            partnerName,
            brandName,
            pageIndex = 1,
            pageSize = 20,
        } = req.body || {};

        const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
        const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
        const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

        if (!fields.includes("maDonDangKy")) fields.push("maDonDangKy");
        if (!fields.includes("donGoc")) fields.push("donGoc");

        const offset = (pageIndex - 1) * pageSize;
        const whereCondition = {};

        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null && trangThaiDuyet !== "") {
            whereCondition.trangThaiDuyet = Number(trangThaiDuyet);
        }
        if (soDon) {
            whereCondition.soDon = { [Op.like]: `%${String(soDon).trim()}%` };
        }

        const allRecords = await DonSuaDoi_NH_VN.findAll({
            where: whereCondition,
            include: [
                {
                    model: DonDangKy,
                    as: "donMoi",
                    required: false,
                    include: [
                        { model: DonDK_SPDV, attributes: ["maSPDV"] },
                        { model: TaiLieu, where: { trangThai: "Chưa nộp" }, required: false, as: "taiLieuChuaNop", attributes: ["tenTaiLieu"] },
                        { model: NhanHieu, as: "nhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: KhachHangCuoi, as: "khachHang", attributes: ["tenKhachHang", "maKhachHang"] },
                        { model: DoiTac, as: "doitac", attributes: ["tenDoiTac", "maDoiTac"] },
                    ],
                },
                {
                    model: DonDangKy,
                    as: "donGoc",
                    required: false,
                    include: [
                        { model: DonDK_SPDV, attributes: ["maSPDV"] },
                        { model: TaiLieu, where: { trangThai: "Chưa nộp" }, required: false, as: "taiLieuChuaNop", attributes: ["tenTaiLieu"] },
                        { model: NhanHieu, as: "nhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: KhachHangCuoi, as: "khachHang", attributes: ["tenKhachHang", "maKhachHang"] },
                        { model: DoiTac, as: "doitac", attributes: ["tenDoiTac", "maDoiTac"] },
                    ],
                },
            ],
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
        });

        const matchTokens = (textVal, query) => {
            if (!query) return true;
            const hay = String(textVal || "").toLowerCase();
            const hayNorm = hay.replace(/-/g, "");
            const tokens = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
            return tokens.every((tok) => hay.includes(tok) || hayNorm.includes(tok.replace(/-/g, "")));
        };

        const filtered = allRecords.filter((rec) => {
            const activeApp = rec.donMoi || rec.donGoc;
            const rootApp = rec.donGoc || rec.donMoi;
            if (!activeApp && !rootApp) return false;

            if (trangThaiDon && activeApp?.trangThaiDon !== trangThaiDon) return false;
            if (maHoSo) {
                const hs = `${activeApp?.maHoSo || ""} ${activeApp?.maHoSoVuViec || ""} ${rootApp?.maHoSo || ""}`;
                if (!matchTokens(hs, maHoSo)) return false;
            }
            if (Array.isArray(maSPDVList) && maSPDVList.length > 0) {
                const spList = (activeApp?.DonDK_SPDVs || []).map((s) => s.maSPDV);
                if (!maSPDVList.some((m) => spList.includes(m))) return false;
            }
            if (effectiveBrandName) {
                const bName = `${activeApp?.nhanHieu?.tenNhanHieu || ""} ${rootApp?.nhanHieu?.tenNhanHieu || ""}`;
                if (!matchTokens(bName, effectiveBrandName)) return false;
            }
            if (effectiveCustomerName) {
                const cName = `${activeApp?.khachHang?.tenKhachHang || ""} ${activeApp?.khachHang?.maKhachHang || ""} ${rootApp?.khachHang?.tenKhachHang || ""} ${rec.ndSuaDoiTenChuDon || ""}`;
                if (!matchTokens(cName, effectiveCustomerName)) return false;
            }
            if (effectivePartnerName) {
                const pName = `${activeApp?.doitac?.tenDoiTac || ""} ${activeApp?.doitac?.maDoiTac || ""} ${rootApp?.doitac?.tenDoiTac || ""}`;
                if (!matchTokens(pName, effectivePartnerName)) return false;
            }
            if (searchText) {
                const combined = [
                    rec.soDon,
                    rec.maDonDangKy,
                    rec.maDonDangKyGoc,
                    activeApp?.soDon,
                    activeApp?.maHoSo,
                    activeApp?.maHoSoVuViec,
                    activeApp?.clientsRef,
                    activeApp?.nhanHieu?.tenNhanHieu,
                    rootApp?.soDon,
                    rootApp?.maHoSoVuViec,
                ].join(" ");
                if (!matchTokens(combined, searchText)) return false;
            }
            return true;
        });

        const totalItems = filtered.length;
        const pagedRecords = filtered.slice(offset, offset + Number(pageSize));

        const result = pagedRecords.map((rec) => {
            const app = rec.donMoi || rec.donGoc || {};
            const donGocObj = rec.donGoc || null;

            const fieldMap = {
                maDonDangKy: () => rec.maDonDangKy || app.maDonDangKy,
                loaiDon: () => app.loaiDon,
                maHoSoVuViec: () => app.maHoSoVuViec || app.maHoSo,
                soDon: () => app.soDon || rec.soDon,
                tenNhanHieu: () => app.nhanHieu?.tenNhanHieu || null,
                tenKhachHang: () => app.khachHang?.tenKhachHang || null,
                tenDoiTac: () => app.doitac?.tenDoiTac || null,
                tinhTrangDon: () => app.trangThaiDon,
                trangThaiVuViec: () => app.trangThaiVuViec,
                ngayNopDon: () => app.ngayNopDon,
                ngayHoanThanhHoSoTaiLieu: () => app.ngayHoanThanhHoSoTaiLieu,
                ngayKQThamDinhHinhThuc: () => app.ngayKQThamDinhHinhThuc,
                ngayCongBoDon: () => app.ngayCongBoDon,
                ngayKQThamDinhND: () => app.ngayKQThamDinhND,
                ngayTraLoiKQThamDinhND: () => app.ngayTraLoiKQThamDinhND,
                ngayThongBaoCapBang: () => app.ngayThongBaoCapBang,
                hanNopPhiCapBang: () => app.hanNopPhiCapBang,
                ngayNopPhiCapBang: () => app.ngayNopPhiCapBang,
                ngayNhanBang: () => app.ngayNhanBang,
                soBang: () => app.soBang,
                ngayCapBang: () => app.ngayCapBang,
                ngayHetHanBang: () => app.ngayHetHanBang,
                ngayGuiBangChoKhachHang: () => app.ngayGuiBangChoKhachHang,
                trangThaiHoanThienHoSoTaiLieu: () => {
                    if (app.ngayHoanThanhHoSoTaiLieu) return "Hoàn thành";
                    return app.trangThaiHoanThienHoSoTaiLieu || "Chưa hoàn thành";
                },
                ngayHoanThanhHoSoTaiLieu_DuKien: () => app.ngayHoanThanhHoSoTaiLieu_DuKien,
                taiLieuChuaNop: () => app.taiLieuChuaNop?.map((tl) => ({ tenTaiLieu: tl.tenTaiLieu })) || [],
                dsSPDV: () => app.DonDK_SPDVs?.map((sp) => ({ maSPDV: sp.maSPDV })) || [],
                hanXuLy: () => app.hanXuLy,
                hanTraLoi: () => app.hanTraLoi,
                linkAnh: () => app.nhanHieu?.linkAnh || null,
                donGoc: () => app.donGoc ?? 0,
                soDonSD: () => rec.soDon || null,
                ngayYeuCau: () => rec.ngayYeuCau || null,
                lanSuaDoi: () => rec.lanSuaDoi ?? null,
                ngayGhiNhanSuaDoi: () => rec.ngayGhiNhanSuaDoi || null,
                duocGhiNhanSuaDoi: () => rec.duocGhiNhanSuaDoi ?? null,
                moTaSuaDoi: () => rec.moTa || null,
                moTa: () => rec.moTa || null,
                suaDoiDaiDien: () => rec.suaDoiDaiDien ?? null,
                ndSuaDoiDaiDien: () => rec.ndSuaDoiDaiDien || null,
                suaDoiTenChuDon: () => rec.suaDoiTenChuDon ?? null,
                ndSuaDoiTenChuDon: () => rec.ndSuaDoiTenChuDon || null,
                suaDoiDiaChi: () => rec.suaDoiDiaChi ?? null,
                ndSuaDoiDiaChi: () => rec.ndSuaDoiDiaChi || null,
                suaNhan: () => rec.suaNhan ?? null,
                ndSuaNhan: () => rec.ndSuaNhan || null,
                suaNhomSPDV: () => rec.suaNhomSPDV ?? null,
                ndSuaNhomSPDV: () => rec.ndSuaNhomSPDV || null,
            };

            const row = {
                id: rec.id,
                idDonSuaDoi: rec.id,
                maDonDangKy: rec.maDonDangKy,
                maDonDangKyGoc: rec.maDonDangKyGoc,
                soDonGoc: donGocObj?.soDon || null,
                ngayNopDonGoc: donGocObj?.ngayNopDon || null,
                soDonSD: rec.soDon,
                ngayYeuCau: rec.ngayYeuCau,
                lanSuaDoi: rec.lanSuaDoi,
                ngayGhiNhanSuaDoi: rec.ngayGhiNhanSuaDoi,
                duocGhiNhanSuaDoi: rec.duocGhiNhanSuaDoi,
                moTa: rec.moTa,
                trangThaiDuyet: rec.trangThaiDuyet,
                ngayChapThuan: rec.ngayChapThuan,
                ngayTuChoi: rec.ngayTuChoi,
                lyDoTuChoi: rec.lyDoTuChoi,
                duLieuThayDoi: rec.duLieuThayDoi,
                donMoi: rec.donMoi || null,
                donCha: donGocObj
                    ? {
                          maDonDangKy: donGocObj.maDonDangKy,
                          soDon: donGocObj.soDon,
                          ngayNopDon: donGocObj.ngayNopDon,
                      }
                    : null,
            };

            fields.forEach((field) => {
                if (fieldMap[field]) row[field] = fieldMap[field]();
            });

            return row;
        });

        return res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize),
            },
        });
    } catch (error) {
        console.error("Lỗi getAllApplicationSD_VN:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 5. XÓA TỜ KHAI SỬA ĐỔI ĐƠN ĐĂNG KÝ NHÃN HIỆU VN
 * Endpoint: POST /api/application_sd_nh_vn/delete (hoặc DELETE .../delete/:id)
 * =========================================================================
 */
export const deleteApplicationSD_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonSuaDoi;
        if (!id) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu ID tờ khai sửa đổi cần xóa!" });
        }

        const record = await DonSuaDoi_NH_VN.findByPk(id, { transaction });
        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi!" });
        }

        await rollbackSpawnedChildDon(record, transaction);
        await record.destroy({ transaction });
        await transaction.commit();

        return res.status(200).json({
            message: "Đã xóa tờ khai sửa đổi đơn đăng ký thành công!",
            data: { id },
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        return res.status(500).json({ message: error.message });
    }
};
