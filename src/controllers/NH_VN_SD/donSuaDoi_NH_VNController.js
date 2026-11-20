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
import { Op, literal, fn, col } from "sequelize";
import { rollbackSpawnedChildDon, getDonLineageGraph, expandDonFamilyIds } from "../../utils/lineageHelper.js";
import { LichSuPhanHoiSuaDoi_NH_VN } from "../../models/VN_SuaDoi_NH/lichSuPhanHoiSuaDoiNH_VNModel.js";
import { GiayUyQuyen } from "../../models/GiayUyQuyenModel.js";
import { QuocGia } from "../../models/quocGiaModel.js";
import { SanPham_DichVu } from "../../models/sanPham_DichVuModel.js";
import { NhanSu } from "../../models/nhanSuModel.js";

/* =========================================================================
 * HELPERS CHUNG: ngày VN, parse JSON, đồng bộ hanTraLoi, tự động từ chối quá hạn
 * ========================================================================= */

// Ngày hiện tại theo múi giờ VN (UTC+7) dạng YYYY-MM-DD
export const todayVN = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

const normalizeOptionalSoDon = (val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    const trimmed = String(val).trim();
    return trimmed === "" ? null : trimmed;
};

const parseJsonObject = (raw) => {
    if (!raw) return {};
    if (typeof raw === "string") {
        try {
            const p = JSON.parse(raw);
            return p && typeof p === "object" ? p : {};
        } catch {
            return {};
        }
    }
    return typeof raw === "object" ? raw : {};
};

// Chuẩn hóa danh sách tài liệu sửa đổi: [{ tenTaiLieu, linkTaiLieu, trangThai }]
const normalizeTaiLieuSuaDoi = (list) => {
    if (!Array.isArray(list)) return undefined;
    return list
        .map((it) => {
            if (typeof it === "string") return { tenTaiLieu: it, linkTaiLieu: null, trangThai: "Chưa nộp" };
            if (!it || typeof it !== "object") return null;
            const tenTaiLieu = it.tenTaiLieu ?? it.ten ?? it.name ?? null;
            if (!tenTaiLieu) return null;
            return {
                tenTaiLieu,
                linkTaiLieu: it.linkTaiLieu ?? it.link ?? null,
                trangThai: it.trangThai ?? (it.linkTaiLieu || it.link ? "Đã nộp" : "Chưa nộp"),
            };
        })
        .filter(Boolean);
};

/**
 * Đồng bộ DonSuaDoi_NH_VN.hanTraLoi theo vòng phản hồi mới nhất chưa trả lời.
 * - Đơn đang ở trạng thái 0 và có vòng chưa trả lời => hanTraLoi = hạn của vòng đó
 * - Ngược lại (đã trả lời hết, hoặc trạng thái 1/2) => NULL
 */
export const syncActiveHanTraLoi = async (idDonSuaDoi, transaction = null) => {
    const don = await DonSuaDoi_NH_VN.findByPk(idDonSuaDoi, {
        attributes: ["id", "trangThaiDuyet"],
        transaction,
    });
    if (!don) return null;

    let nextHan = null;
    if (Number(don.trangThaiDuyet) === 0) {
        const latestUnanswered = await LichSuPhanHoiSuaDoi_NH_VN.findOne({
            where: { idDonSuaDoi, ngayTraLoi: { [Op.is]: null } },
            attributes: ["id", "lanThongBao", "hanTraLoi"],
            order: [["lanThongBao", "DESC"], ["id", "DESC"]],
            transaction,
        });
        nextHan = latestUnanswered?.hanTraLoi || null;
    }
    await DonSuaDoi_NH_VN.update({ hanTraLoi: nextHan }, { where: { id: idDonSuaDoi }, transaction });
    return nextHan;
};

let lastAutoRejectAt = 0;
const AUTO_REJECT_THROTTLE_MS = 60 * 1000;

/**
 * Tự động chuyển Từ chối các đơn sửa đổi đang chờ (0) đã quá hạn trả lời Cục.
 * 1 câu UPDATE duy nhất, idempotent, tận dụng idx_sd_don_status_hantraloi.
 * @param {{force?: boolean, id?: number}} opts  force: bỏ throttle; id: chỉ kiểm tra 1 tờ khai (luôn chạy)
 * @returns {Promise<number>} số bản ghi bị chuyển trạng thái
 */
export const autoRejectExpiredDonSuaDoi = async ({ force = false, id = null } = {}) => {
    const now = Date.now();
    if (!id && !force && now - lastAutoRejectAt < AUTO_REJECT_THROTTLE_MS) return 0;
    if (!id) lastAutoRejectAt = now;

    try {
        const tbl = DonSuaDoi_NH_VN.getTableName();
        const tblName = typeof tbl === "string" ? tbl : tbl.tableName;
        const [, meta] = await sequelize.query(
            `UPDATE \`${tblName}\`
             SET trangThaiDuyet = 2,
                 tuDongTuChoi = 1,
                 duocGhiNhanSuaDoi = 0,
                 soDon = NULL,
                 ngayChapThuan = NULL,
                 ngayGhiNhanSuaDoi = NULL,
                 ngayTuChoi = hanTraLoi,
                 lyDoTuChoi = COALESCE(NULLIF(TRIM(lyDoTuChoi), ''),
                     CONCAT('Tự động từ chối do quá hạn trả lời thông báo của Cục SHTT (Hạn: ', DATE_FORMAT(hanTraLoi, '%d/%m/%Y'), ')')),
                 updatedAt = NOW()
             WHERE trangThaiDuyet = 0
               AND hanTraLoi IS NOT NULL
               AND hanTraLoi < :today
               ${id ? "AND id = :id" : ""}`,
            { replacements: { today: todayVN(), id } }
        );
        return Number(meta?.affectedRows ?? meta?.rowCount ?? meta ?? 0) || 0;
    } catch (err) {
        console.error("❌ autoRejectExpiredDonSuaDoi:", err.message);
        return 0;
    }
};

// Tập maDonDangKy thuộc cùng phả hệ (sửa đổi / tách / chuyển quyền) của các mã đơn đầu vào
const resolveFamily = async (seedMaDonList, transaction = null) => {
    const graph = await getDonLineageGraph();
    const family = expandDonFamilyIds(seedMaDonList.filter(Boolean), graph);
    return { graph, family };
};

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
                hanTraLoi: null,
                tuDongTuChoi: false,
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
        idGUQ: payload.idGUQ ?? record.idGUQ ?? duLieu.idGUQ ?? donCuPlain.idGUQ,
        giayUyQuyenGoc: payload.giayUyQuyenGoc ?? record.giayUyQuyenGoc ?? duLieu.giayUyQuyenGoc ?? donCuPlain.giayUyQuyenGoc,
        maUyQuyen: payload.maUyQuyen ?? record.maUyQuyen ?? duLieu.maUyQuyen ?? donCuPlain.maUyQuyen,
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

    // 6b. Bổ sung tài liệu sửa đổi (taiLieuSuaDoi) vào TaiLieu của đơn mới (không xóa tài liệu cũ)
    const taiLieuSuaDoiList =
        normalizeTaiLieuSuaDoi(payload.taiLieuSuaDoi ?? payload.taiLieuList) ??
        normalizeTaiLieuSuaDoi(duLieu.taiLieuSuaDoi) ??
        [];
    for (const tl of taiLieuSuaDoiList) {
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
            hanTraLoi: null,
            tuDongTuChoi: false,
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
            ndSuaDoiNoiDungKhac,
            taiLieuList,
            taiLieuSuaDoi,
            giayUyQuyenGoc,
            maUyQuyen,
            idGUQ,
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
        const rawIncomingSoDon = soDonSD !== undefined ? soDonSD : soDon;
        const parsedTrangThaiDuyet = Number(trangThaiDuyet) || 0;
        const targetSoDon = parsedTrangThaiDuyet === 2 ? null : (normalizeOptionalSoDon(rawIncomingSoDon) ?? null);

        if (!targetMaDonGoc) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc: mã đơn đăng ký gốc (maDonDangKyCu / maDonDangKyGoc)." });
        }

        const hasAnyAmendment = Boolean(
            suaDoiDaiDien || suaDoiTenChuDon || suaDoiDiaChi || suaNhan || suaNhomSPDV || suaDoiNoiDungKhac
        );
        if (!hasAnyAmendment) {
            await transaction.rollback();
            return res.status(400).json({ message: "Vui lòng chọn ít nhất một mục cần sửa đổi!" });
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

        // Sửa đổi nối tiếp: đếm toàn bộ tờ khai sửa đổi trong cùng phả hệ (không chỉ theo đơn gốc trực tiếp)
        const { family: familyMaDon } = await resolveFamily([targetMaDonGoc]);
        const maxLanInFamily = await DonSuaDoi_NH_VN.max("lanSuaDoi", {
            where: { maDonDangKyGoc: { [Op.in]: familyMaDon } },
            transaction,
        });
        const countInFamily = await DonSuaDoi_NH_VN.count({
            where: { maDonDangKyGoc: { [Op.in]: familyMaDon } },
            transaction,
        });
        const computedLan = Math.max(Number(maxLanInFamily) || 0, countInFamily) + 1;
        const actualLanSuaDoi = lanSuaDoi ?? computedLan;
        const actualMaHoSo = maHoSo || donCu.maHoSo || donCu.maHoSoVuViec;

        const taiLieuSuaDoiNorm = normalizeTaiLieuSuaDoi(taiLieuSuaDoi ?? taiLieuList);

        const mergedDuLieuThayDoi = {
            ...(typeof duLieuThayDoi === "object" && duLieuThayDoi !== null ? duLieuThayDoi : {}),
            maHoSo: actualMaHoSo,
            soDon: targetSoDon,
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
            ndSuaDoiNoiDungKhac,
            taiLieuSuaDoi: taiLieuSuaDoiNorm,
            giayUyQuyenGoc,
            maUyQuyen,
            idGUQ: idGUQ ?? undefined,
            moTa: moTaSuaDoi || moTa || null,
        };

        const todayStr = new Date().toISOString().split("T")[0];

        const newSD = await DonSuaDoi_NH_VN.create(
            {
                maDonDangKy: null,
                maDonDangKyGoc: targetMaDonGoc,
                soDon: targetSoDon,
                ngayYeuCau: ngayYeuCau || todayStr,
                lanSuaDoi: actualLanSuaDoi,
                // Chỉ ghi nhận ngày sửa đổi khi được chấp thuận (approve sẽ set lại)
                ngayGhiNhanSuaDoi: parsedTrangThaiDuyet === 1 ? ngayGhiNhanSuaDoi || null : null,
                duocGhiNhanSuaDoi: parsedTrangThaiDuyet === 1 ? Boolean(duocGhiNhanSuaDoi) : false,
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
                ndSuaDoiNoiDungKhac: ndSuaDoiNoiDungKhac || null,
                giayUyQuyenGoc: giayUyQuyenGoc === undefined || giayUyQuyenGoc === null ? null : Boolean(giayUyQuyenGoc),
                maUyQuyen: maUyQuyen || null,
                idGUQ: idGUQ || null,
                hanTraLoi: null,
                tuDongTuChoi: false,
                trangThaiDuyet: parsedTrangThaiDuyet === 2 ? 2 : 0,
                ngayChapThuan: null,
                ngayTuChoi: parsedTrangThaiDuyet === 2 ? ngayTuChoi || todayStr : null,
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
            ndSuaDoiNoiDungKhac,
            giayUyQuyenGoc,
            maUyQuyen,
            idGUQ,
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

        const currentStatus = Number(record.trangThaiDuyet);
        const hasNextStatus = trangThaiDuyet !== undefined && trangThaiDuyet !== null && trangThaiDuyet !== "";
        const nextStatus = hasNextStatus ? Number(trangThaiDuyet) : currentStatus;
        if (![0, 1, 2].includes(nextStatus)) {
            await transaction.rollback();
            return res.status(400).json({ message: "trangThaiDuyet không hợp lệ (0, 1 hoặc 2)." });
        }
        const staysApproved = currentStatus === 1 && nextStatus === 1;

        // Kiểm tra ít nhất 1 mục sửa đổi nếu request có cập nhật các cờ sửa đổi
        const hasAnyFlagInBody = [
            suaDoiDaiDien,
            suaDoiTenChuDon,
            suaDoiDiaChi,
            suaNhan,
            suaNhomSPDV,
            suaDoiNoiDungKhac,
        ].some((v) => v !== undefined);
        if (hasAnyFlagInBody) {
            const mergedHasAny = Boolean(
                (suaDoiDaiDien ?? record.suaDoiDaiDien) ||
                (suaDoiTenChuDon ?? record.suaDoiTenChuDon) ||
                (suaDoiDiaChi ?? record.suaDoiDiaChi) ||
                (suaNhan ?? record.suaNhan) ||
                (suaNhomSPDV ?? record.suaNhomSPDV) ||
                (suaDoiNoiDungKhac ?? record.suaDoiNoiDungKhac)
            );
            if (!mergedHasAny) {
                await transaction.rollback();
                return res.status(400).json({ message: "Vui lòng chọn ít nhất một mục cần sửa đổi!" });
            }
        }

        const existingDuLieu = parseJsonObject(record.duLieuThayDoi);
        const taiLieuSuaDoiNorm = normalizeTaiLieuSuaDoi(req.body.taiLieuSuaDoi ?? req.body.taiLieuList);

        // ===== Khi đã chấp thuận và giữ nguyên trạng thái 1: chỉ cho sửa trường hành chính =====
        if (staysApproved) {
            const normText = (v) => (v === undefined || v === null ? "" : String(v).trim());
            const normBool = (v) => Boolean(v);
            const coreChecks = [
                ["suaDoiDaiDien", suaDoiDaiDien, normBool],
                ["ndSuaDoiDaiDien", ndSuaDoiDaiDien, normText],
                ["suaDoiTenChuDon", suaDoiTenChuDon, normBool],
                ["ndSuaDoiTenChuDon", ndSuaDoiTenChuDon, normText],
                ["suaDoiDiaChi", suaDoiDiaChi, normBool],
                ["ndSuaDoiDiaChi", ndSuaDoiDiaChi, normText],
                ["suaNhan", suaNhan, normBool],
                ["ndSuaNhan", ndSuaNhan, normText],
                ["suaNhomSPDV", suaNhomSPDV, normBool],
                ["ndSuaNhomSPDV", ndSuaNhomSPDV, normText],
                ["suaDoiNoiDungKhac", suaDoiNoiDungKhac, normBool],
                ["ndSuaDoiNoiDungKhac", ndSuaDoiNoiDungKhac, normText],
                ["giayUyQuyenGoc", giayUyQuyenGoc, (v) => (v === null || v === undefined ? "" : String(Boolean(v)))],
                ["maUyQuyen", maUyQuyen, normText],
                ["idGUQ", idGUQ, (v) => (v === null || v === undefined || v === "" ? "" : String(v))],
            ];
            const changed = coreChecks.filter(([key, incoming, norm]) => incoming !== undefined && norm(incoming) !== norm(record[key]));
            if (changed.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    message:
                        "Tờ khai đã được chấp thuận, không thể sửa nội dung sửa đổi cốt lõi (" +
                        changed.map(([k]) => k).join(", ") +
                        "). Vui lòng chuyển trạng thái về 'Chưa chấp thuận' trước khi chỉnh sửa.",
                });
            }
        }

        // ===== Gộp duLieuThayDoi =====
        let updatedDuLieu = existingDuLieu;
        if (staysApproved) {
            if (taiLieuSuaDoiNorm !== undefined) updatedDuLieu = { ...existingDuLieu, taiLieuSuaDoi: taiLieuSuaDoiNorm };
        } else {
            const extra = {};
            for (const k of ["idKhachHangMoi", "idKhachHang", "idDoiTac", "maNhanHieu", "nhanHieu", "maSPDVList", "daiDienSHTT"]) {
                if (req.body[k] !== undefined) extra[k] = req.body[k];
            }
            updatedDuLieu = {
                ...existingDuLieu,
                ...(duLieuThayDoi !== undefined && typeof duLieuThayDoi === "object" && duLieuThayDoi !== null ? duLieuThayDoi : {}),
                ...extra,
                ...(taiLieuSuaDoiNorm !== undefined ? { taiLieuSuaDoi: taiLieuSuaDoiNorm } : {}),
            };
        }

        const rawIncomingSoDon = soDonSD !== undefined ? soDonSD : soDon;
        const incomingSoDon = normalizeOptionalSoDon(rawIncomingSoDon);
        const resolvedSoDon = nextStatus === 2 ? null : (incomingSoDon !== undefined ? incomingSoDon : record.soDon);

        const adminFields = {
            soDon: resolvedSoDon,
            ngayYeuCau: ngayYeuCau ?? record.ngayYeuCau,
            moTa: moTaSuaDoi ?? moTa ?? record.moTa,
            duLieuThayDoi: updatedDuLieu,
            maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || record.maNhanSuCapNhap,
        };
        const coreFields = staysApproved
            ? {}
            : {
                  lanSuaDoi: lanSuaDoi ?? record.lanSuaDoi,
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
                  ndSuaDoiNoiDungKhac: ndSuaDoiNoiDungKhac ?? record.ndSuaDoiNoiDungKhac,
                  giayUyQuyenGoc: giayUyQuyenGoc ?? record.giayUyQuyenGoc,
                  maUyQuyen: maUyQuyen ?? record.maUyQuyen,
                  idGUQ: idGUQ === undefined ? record.idGUQ : idGUQ || null,
                  // Đơn chờ / từ chối không lưu ngày ghi nhận sửa đổi (nextStatus === 1 sẽ set lại khi duyệt)
                  ngayGhiNhanSuaDoi: nextStatus === 1 ? ngayGhiNhanSuaDoi ?? record.ngayGhiNhanSuaDoi : null,
                  duocGhiNhanSuaDoi: nextStatus === 1 ? duocGhiNhanSuaDoi ?? record.duocGhiNhanSuaDoi : false,
              };
        if (staysApproved) {
            adminFields.ngayGhiNhanSuaDoi = ngayGhiNhanSuaDoi ?? record.ngayGhiNhanSuaDoi;
        }

        await record.update({ ...adminFields, ...coreFields }, { transaction });

        let donMoi = null;
        if (nextStatus === 1) {
            const approved = await approveDonSuaDoi_NH_VN(record, req.body, transaction);
            donMoi = approved.donMoi;
            await record.update({ hanTraLoi: null, tuDongTuChoi: false }, { transaction });
        } else if (nextStatus === 2) {
            await rollbackSpawnedChildDon(record, transaction);
            await record.update(
                {
                    trangThaiDuyet: 2,
                    maDonDangKy: null,
                    soDon: null,
                    ngayChapThuan: null,
                    ngayGhiNhanSuaDoi: null,
                    ngayTuChoi: ngayTuChoi || record.ngayTuChoi || new Date().toISOString().split("T")[0],
                    lyDoTuChoi: lyDoTuChoi !== undefined ? lyDoTuChoi : record.lyDoTuChoi,
                    duocGhiNhanSuaDoi: false,
                    hanTraLoi: null,
                    // Giữ cờ tự động từ chối nếu chỉ sửa thông tin khi đơn đã ở trạng thái 2
                    tuDongTuChoi: currentStatus === 2 && req.body.tuDongTuChoi !== false ? Boolean(record.tuDongTuChoi) : false,
                },
                { transaction }
            );
        } else {
            // nextStatus === 0 (giữ nguyên chờ duyệt hoặc mở lại)
            await rollbackSpawnedChildDon(record, transaction);
            await record.update(
                {
                    trangThaiDuyet: 0,
                    maDonDangKy: null,
                    ngayChapThuan: null,
                    ngayGhiNhanSuaDoi: null,
                    ngayTuChoi: null,
                    lyDoTuChoi: null,
                    duocGhiNhanSuaDoi: false,
                    tuDongTuChoi: false,
                },
                { transaction }
            );
            await syncActiveHanTraLoi(record.id, transaction);
            await record.reload({ transaction });
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
        const id = req.params?.id || req.body?.id || req.body?.idDonSuaDoi || req.query?.id;
        const { maDonDangKy, maDonDangKyGoc } = req.body || {};

        const whereCondition = {};
        if (id) whereCondition.id = id;
        else if (maDonDangKy) whereCondition.maDonDangKy = maDonDangKy;
        else if (maDonDangKyGoc) whereCondition.maDonDangKyGoc = maDonDangKyGoc;
        else {
            return res.status(400).json({ message: "Thiếu id hoặc maDonDangKy / maDonDangKyGoc!" });
        }

        // Kiểm tra quá hạn nhẹ cho đúng bản ghi này (+ quét toàn cục có throttle)
        if (id) await autoRejectExpiredDonSuaDoi({ id: Number(id) });
        await autoRejectExpiredDonSuaDoi();

        const donInclude = () => [
            { model: NhanHieu, as: "nhanHieu", attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh", "moTa"] },
            {
                model: KhachHangCuoi,
                as: "khachHang",
                include: [{ model: QuocGia, as: "quocGia", attributes: ["maQuocGia", "tenQuocGia"] }],
            },
            {
                model: DoiTac,
                as: "doitac",
                attributes: ["id", "maDoiTac", "tenDoiTac", "maQuocGia", "diaChi", "sdt", "email"],
            },
            {
                model: GiayUyQuyen,
                as: "GiayUyQuyen",
                required: false,
                attributes: ["id", "soGUQ", "soDonGoc", "ngayUyQuyen", "ngayHetHan", "loaiGUQ"],
            },
            {
                model: DonDK_SPDV,
                attributes: ["maSPDV"],
                required: false,
                include: [{ model: SanPham_DichVu, as: "SanPham_DichVu", attributes: ["maSPDV", "tenSPDV"] }],
            },
        ];

        const record = await DonSuaDoi_NH_VN.findOne({
            where: whereCondition,
            include: [
                { model: DonDangKy, as: "donMoi", required: false, include: donInclude() },
                { model: DonDangKy, as: "donGoc", required: false, include: donInclude() },
                { model: LichSuPhanHoiSuaDoi_NH_VN, as: "lichSuPhanHoi", required: false },
                {
                    model: GiayUyQuyen,
                    as: "giayUyQuyen",
                    required: false,
                },
            ],
            order: [
                ["createdAt", "DESC"],
                [{ model: LichSuPhanHoiSuaDoi_NH_VN, as: "lichSuPhanHoi" }, "lanThongBao", "ASC"],
                [{ model: LichSuPhanHoiSuaDoi_NH_VN, as: "lichSuPhanHoi" }, "id", "ASC"],
            ],
        });

        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi đơn đăng ký nhãn hiệu!" });
        }

        const plain = record.toJSON();
        const isApproved = Number(plain.trangThaiDuyet) === 1;

        // Nhân sự cập nhật
        let nhanSuCapNhap = null;
        if (plain.maNhanSuCapNhap) {
            nhanSuCapNhap = await NhanSu.findOne({
                where: { maNhanSu: plain.maNhanSuCapNhap },
                attributes: ["maNhanSu", "hoTen"],
                raw: true,
            }).catch(() => null);
        }

        // Phả hệ sửa đổi nối tiếp (không select cột LONGTEXT / JSON)
        const seedList = [plain.maDonDangKyGoc, plain.maDonDangKy].filter(Boolean);
        const { graph, family } = await resolveFamily(seedList);
        const { rootMaDon } = graph.getRootAndDepth(plain.maDonDangKyGoc);
        const [donGocBanDau, chainRows] = await Promise.all([
            DonDangKy.findOne({
                where: { maDonDangKy: rootMaDon },
                attributes: ["maDonDangKy", "soDon", "ngayNopDon", "loaiDon", "maHoSo", "maHoSoVuViec"],
                raw: true,
            }),
            DonSuaDoi_NH_VN.findAll({
                where: { maDonDangKyGoc: { [Op.in]: family.length ? family : [plain.maDonDangKyGoc] } },
                attributes: [
                    "id", "soDon", "lanSuaDoi", "ngayYeuCau", "ngayGhiNhanSuaDoi", "trangThaiDuyet",
                    "maDonDangKy", "maDonDangKyGoc", "ngayChapThuan", "ngayTuChoi", "hanTraLoi",
                    "tuDongTuChoi", "createdAt",
                ],
                order: [["lanSuaDoi", "ASC"], ["createdAt", "ASC"], ["id", "ASC"]],
                raw: true,
            }),
        ]);

        const chuoiSuaDoi = chainRows.map((item) => ({
            ...item,
            ngayGhiNhanSuaDoi: Number(item.trangThaiDuyet) === 1 ? item.ngayGhiNhanSuaDoi : null,
            isCurrent: item.id === plain.id,
        }));

        const duLieu = parseJsonObject(plain.duLieuThayDoi);
        const dsPhanHoi = plain.lichSuPhanHoi || [];

        const isRejected = Number(plain.trangThaiDuyet) === 2;
        plain.soDon = isRejected ? null : (normalizeOptionalSoDon(plain.soDon) ?? null);
        plain.ngayGhiNhanSuaDoi = isApproved ? plain.ngayGhiNhanSuaDoi : null;
        plain.soDonSD = plain.soDon;
        plain.soDonGoc = plain.donGoc?.soDon || null;
        plain.ngayNopDonGoc = plain.donGoc?.ngayNopDon || null;
        plain.donGocBanDau = donGocBanDau || null;
        plain.loaiDonGoc = donGocBanDau?.loaiDon ?? null;
        plain.chuoiSuaDoi = chuoiSuaDoi;
        plain.capDoSuaDoi = plain.lanSuaDoi ?? chuoiSuaDoi.findIndex((x) => x.isCurrent) + 1;
        plain.dangChoTraLoiCuc = dsPhanHoi.some((p) => !p.ngayTraLoi);
        plain.taiLieuSuaDoi = Array.isArray(duLieu.taiLieuSuaDoi) ? duLieu.taiLieuSuaDoi : [];
        plain.giayUyQuyenSuaDoi = {
            giayUyQuyenGoc: plain.giayUyQuyenGoc ?? null,
            maUyQuyen: plain.maUyQuyen || null,
            idGUQ: plain.idGUQ ?? null,
            giayUyQuyen: plain.giayUyQuyen || null,
        };
        plain.nhanSuCapNhap = nhanSuCapNhap;
        plain.tenNhanSuCapNhap = nhanSuCapNhap?.hoTen || null;

        return res.status(200).json(plain);
    } catch (error) {
        console.error("❌ Lỗi lấy chi tiết đơn sửa đổi:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * VÒNG PHẢN HỒI VỚI CỤC SHTT
 * POST /api/application_sd_nh_vn/phan-hoi/save
 * =========================================================================
 */
export const savePhanHoiSuaDoi = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const body = req.body || {};
        const idDonSuaDoi = body.idDonSuaDoi ?? body.donSuaDoiId;
        const phanHoiId = body.id ?? body.phanHoiId ?? null;

        if (!idDonSuaDoi) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu idDonSuaDoi." });
        }

        const don = await DonSuaDoi_NH_VN.findByPk(idDonSuaDoi, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!don) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi." });
        }

        const FIELDS = [
            "soThongBao", "ngayNhanThongBao", "hanTraLoi", "noiDungThongBao", "tenFileThongBao", "linkFileThongBao",
            "ngayTraLoi", "noiDungTraLoi", "tenFileTraLoi", "linkFileTraLoi",
        ];
        const pickFields = () => {
            const out = {};
            for (const k of FIELDS) {
                if (body[k] !== undefined) out[k] = body[k] === "" ? null : body[k];
            }
            return out;
        };
        const maNhanSuCapNhap = req.user?.maNhanSu || body.maNhanSuCapNhap || null;

        let phanHoi;
        if (!phanHoiId) {
            if (Number(don.trangThaiDuyet) === 1) {
                await transaction.rollback();
                return res.status(400).json({ message: "Tờ khai đã được chấp thuận, không thể thêm vòng thông báo mới." });
            }
            const data = pickFields();
            if (!data.ngayNhanThongBao || !data.hanTraLoi) {
                await transaction.rollback();
                return res.status(400).json({ message: "Thiếu ngayNhanThongBao hoặc hanTraLoi của thông báo Cục." });
            }
            if (String(data.hanTraLoi) < String(data.ngayNhanThongBao)) {
                await transaction.rollback();
                return res.status(400).json({ message: "Hạn trả lời không được nhỏ hơn ngày nhận thông báo." });
            }
            const maxLan = (await LichSuPhanHoiSuaDoi_NH_VN.max("lanThongBao", { where: { idDonSuaDoi }, transaction })) || 0;
            phanHoi = await LichSuPhanHoiSuaDoi_NH_VN.create(
                { ...data, idDonSuaDoi, lanThongBao: maxLan + 1, maNhanSuCapNhap },
                { transaction }
            );
        } else {
            phanHoi = await LichSuPhanHoiSuaDoi_NH_VN.findOne({ where: { id: phanHoiId, idDonSuaDoi }, transaction });
            if (!phanHoi) {
                await transaction.rollback();
                return res.status(404).json({ message: "Không tìm thấy vòng phản hồi." });
            }
            const data = pickFields();
            const nhan = data.ngayNhanThongBao ?? phanHoi.ngayNhanThongBao;
            const han = data.hanTraLoi ?? phanHoi.hanTraLoi;
            if (!han || !nhan || String(han) < String(nhan)) {
                await transaction.rollback();
                return res.status(400).json({ message: "Hạn trả lời không hợp lệ (thiếu hoặc nhỏ hơn ngày nhận thông báo)." });
            }
            await phanHoi.update({ ...data, maNhanSuCapNhap: maNhanSuCapNhap || phanHoi.maNhanSuCapNhap }, { transaction });
        }

        // Mở lại đơn bị hệ thống tự động từ chối
        let reopened = false;
        if (body.reopenIfAutoRejected === true && Number(don.trangThaiDuyet) === 2 && don.tuDongTuChoi) {
            await don.update(
                { trangThaiDuyet: 0, tuDongTuChoi: false, ngayTuChoi: null, lyDoTuChoi: null },
                { transaction }
            );
            reopened = true;
        }

        const hanTraLoi = await syncActiveHanTraLoi(idDonSuaDoi, transaction);
        await don.reload({ transaction });
        await transaction.commit();

        const warning =
            hanTraLoi && String(hanTraLoi) < todayVN()
                ? "Hạn trả lời của vòng chưa trả lời đã quá hạn, hệ thống sẽ tự động chuyển Từ chối nếu không nhập ngày trả lời."
                : null;

        return res.status(200).json({
            message: reopened ? "Đã lưu vòng phản hồi và mở lại tờ khai." : "Lưu vòng phản hồi thành công.",
            phanHoi,
            hanTraLoi,
            reopened,
            warning,
            donSuaDoi: {
                id: don.id,
                trangThaiDuyet: don.trangThaiDuyet,
                tuDongTuChoi: don.tuDongTuChoi,
                hanTraLoi: don.hanTraLoi,
            },
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("❌ Lỗi lưu vòng phản hồi sửa đổi:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/application_sd_nh_vn/phan-hoi/delete  |  DELETE /api/application_sd_nh_vn/phan-hoi/:phanHoiId
 */
export const deletePhanHoiSuaDoi = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const phanHoiId = req.params?.phanHoiId || req.body?.id || req.body?.phanHoiId;
        if (!phanHoiId) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu id vòng phản hồi cần xóa." });
        }

        const phanHoi = await LichSuPhanHoiSuaDoi_NH_VN.findByPk(phanHoiId, { transaction });
        if (!phanHoi) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy vòng phản hồi." });
        }
        const idDonSuaDoi = phanHoi.idDonSuaDoi;
        const don = await DonSuaDoi_NH_VN.findByPk(idDonSuaDoi, { transaction, lock: transaction.LOCK.UPDATE });
        if (!don) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi." });
        }
        if (Number(don.trangThaiDuyet) === 1) {
            await transaction.rollback();
            return res.status(400).json({ message: "Tờ khai đã được chấp thuận, không thể xóa vòng phản hồi." });
        }

        await phanHoi.destroy({ transaction });

        // Đánh lại thứ tự lanThongBao liên tục 1..n
        const remaining = await LichSuPhanHoiSuaDoi_NH_VN.findAll({
            where: { idDonSuaDoi },
            attributes: ["id", "lanThongBao"],
            order: [["lanThongBao", "ASC"], ["id", "ASC"]],
            transaction,
        });
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].lanThongBao !== i + 1) {
                await remaining[i].update({ lanThongBao: i + 1 }, { transaction });
            }
        }

        const hanTraLoi = await syncActiveHanTraLoi(idDonSuaDoi, transaction);
        await transaction.commit();

        return res.status(200).json({
            message: "Đã xóa vòng phản hồi.",
            data: { id: Number(phanHoiId), idDonSuaDoi },
            hanTraLoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("❌ Lỗi xóa vòng phản hồi sửa đổi:", error);
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
        // Quét tự động từ chối đơn quá hạn (đã throttle 60s)
        await autoRejectExpiredDonSuaDoi();

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
        const hanTraLoiFilter = filterCondition?.hanTraLoiFilter ?? req.body?.hanTraLoiFilter;
        const sortByHanTraLoi = filterCondition?.sortByHanTraLoi ?? req.body?.sortByHanTraLoi;

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

        // Lọc hạn trả lời dựa trên DonSuaDoi_NH_VN.hanTraLoi (index kép trangThaiDuyet + hanTraLoi)
        if (hanTraLoiFilter) {
            const today = todayVN();
            const addDays = (n) => new Date(new Date(`${today}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
            if (["<7", "<15", "<30"].includes(hanTraLoiFilter)) {
                whereCondition.hanTraLoi = { [Op.between]: [today, addDays(Number(hanTraLoiFilter.slice(1)))] };
            } else if (hanTraLoiFilter === "overdue") {
                whereCondition.hanTraLoi = { [Op.lt]: today };
            }
        }
        const listOrder = [];
        if (sortByHanTraLoi) {
            listOrder.push([literal("`DonSuaDoi_NH_VN`.`hanTraLoi` IS NULL"), "ASC"]);
            listOrder.push(["hanTraLoi", String(sortByHanTraLoi).toLowerCase() === "desc" ? "DESC" : "ASC"]);
        }
        listOrder.push(["updatedAt", "DESC"], ["createdAt", "DESC"]);

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
            order: listOrder,
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

        // Tổng hợp vòng phản hồi (1 truy vấn GROUP BY) + loại đơn gốc ban đầu (1 truy vấn Op.in) - tránh N+1
        const pagedIds = pagedRecords.map((r) => r.id);
        const phanHoiStats = pagedIds.length
            ? await LichSuPhanHoiSuaDoi_NH_VN.findAll({
                  attributes: [
                      "idDonSuaDoi",
                      [fn("COUNT", col("id")), "soLan"],
                      [fn("SUM", literal("CASE WHEN ngayTraLoi IS NULL THEN 1 ELSE 0 END")), "chuaTraLoi"],
                  ],
                  where: { idDonSuaDoi: { [Op.in]: pagedIds } },
                  group: ["idDonSuaDoi"],
                  raw: true,
              })
            : [];
        const phanHoiStatMap = new Map(phanHoiStats.map((s) => [s.idDonSuaDoi, s]));

        const loaiDonGocMap = new Map();
        if (pagedRecords.length) {
            const graph = await getDonLineageGraph();
            const rootOf = new Map();
            for (const r of pagedRecords) {
                rootOf.set(r.id, graph.getRootAndDepth(r.maDonDangKyGoc).rootMaDon);
            }
            const rootDons = await DonDangKy.findAll({
                where: { maDonDangKy: { [Op.in]: [...new Set(rootOf.values())] } },
                attributes: ["maDonDangKy", "loaiDon"],
                raw: true,
            });
            const loaiByMa = new Map(rootDons.map((d) => [d.maDonDangKy, d.loaiDon]));
            for (const [recId, rootMa] of rootOf) loaiDonGocMap.set(recId, loaiByMa.get(rootMa) ?? null);
        }

        const result = pagedRecords.map((rec) => {
            const app = rec.donMoi || rec.donGoc || {};
            const donGocObj = rec.donGoc || null;
            const isApproved = Number(rec.trangThaiDuyet) === 1;
            const isRejected = Number(rec.trangThaiDuyet) === 2;
            const effectiveSoDonSD = isRejected ? null : (normalizeOptionalSoDon(rec.soDon) ?? null);
            const phanHoiStat = phanHoiStatMap.get(rec.id);

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
                hanTraLoi: () => rec.hanTraLoi || null,
                linkAnh: () => app.nhanHieu?.linkAnh || null,
                donGoc: () => app.donGoc ?? 0,
                soDonSD: () => effectiveSoDonSD,
                ngayYeuCau: () => rec.ngayYeuCau || null,
                lanSuaDoi: () => rec.lanSuaDoi ?? null,
                ngayGhiNhanSuaDoi: () => (isApproved ? rec.ngayGhiNhanSuaDoi || null : null),
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
                suaDoiNoiDungKhac: () => rec.suaDoiNoiDungKhac ?? null,
                ndSuaDoiNoiDungKhac: () => rec.ndSuaDoiNoiDungKhac || null,
            };

            const row = {
                id: rec.id,
                idDonSuaDoi: rec.id,
                maDonDangKy: rec.maDonDangKy,
                maDonDangKyGoc: rec.maDonDangKyGoc,
                soDonGoc: donGocObj?.soDon || null,
                ngayNopDonGoc: donGocObj?.ngayNopDon || null,
                soDonSD: effectiveSoDonSD,
                ngayYeuCau: rec.ngayYeuCau,
                lanSuaDoi: rec.lanSuaDoi,
                ngayGhiNhanSuaDoi: isApproved ? rec.ngayGhiNhanSuaDoi : null,
                duocGhiNhanSuaDoi: rec.duocGhiNhanSuaDoi,
                moTa: rec.moTa,
                trangThaiDuyet: rec.trangThaiDuyet,
                ngayChapThuan: rec.ngayChapThuan,
                ngayTuChoi: rec.ngayTuChoi,
                lyDoTuChoi: rec.lyDoTuChoi,
                hanTraLoi: rec.hanTraLoi || null,
                tuDongTuChoi: Boolean(rec.tuDongTuChoi),
                soLanThongBaoCuc: Number(phanHoiStat?.soLan) || 0,
                dangChoTraLoiCuc: (Number(phanHoiStat?.chuaTraLoi) || 0) > 0,
                loaiDonGoc: loaiDonGocMap.get(rec.id) ?? null,
                suaDoiDaiDien: Boolean(rec.suaDoiDaiDien),
                suaDoiTenChuDon: Boolean(rec.suaDoiTenChuDon),
                suaDoiDiaChi: Boolean(rec.suaDoiDiaChi),
                suaNhan: Boolean(rec.suaNhan),
                suaNhomSPDV: Boolean(rec.suaNhomSPDV),
                suaDoiNoiDungKhac: Boolean(rec.suaDoiNoiDungKhac),
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
