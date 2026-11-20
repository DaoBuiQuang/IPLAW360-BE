// controllers/KH/donCQSH_NH_KHController.js
import { sequelize } from "../../config/db.js";
import { Op, literal, fn, col } from "sequelize";
import crypto from "crypto";
import { DonDangKyNhanHieu_KH } from "../../models/KH/donDangKyNhanHieu_KHModel.js";
import { DonCQSH_KH } from "../../models/KH_ChuyenQuyenSH/donCQSH_KHModel.js";
import { LichSuPhanHoiCQSH_NH_KH } from "../../models/KH_ChuyenQuyenSH/lichSuPhanHoiCQSH_NH_KHModel.js";
import { DonDK_SPDV_KH } from "../../models/KH/donDK_SPDVModel_KHModel.js";
import { TaiLieu_KH } from "../../models/KH/taiLieuKH_Model.js";
import { LichSuThamDinh_KH } from "../../models/KH/lichSuThamDinh_KHModel.js";
import { LichSuGiaHan_KH } from "../../models/KH/lichSuGiaHan_KH.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { NhanHieu } from "../../models/nhanHieuModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import { GiayUyQuyen } from "../../models/GiayUyQuyenModel.js";
import { QuocGia } from "../../models/quocGiaModel.js";
import { SanPham_DichVu } from "../../models/sanPham_DichVuModel.js";
import { NhanSu } from "../../models/nhanSuModel.js";
import {
    todayVN,
    createChildDonKHSafely,
    getDonKHLineageGraph,
    expandDonKHFamilyIds,
    rollbackSpawnedChildDonKH,
} from "./donSuaDoi_NH_KHController.js";

const VALID_LOAI_THAY_DOI = new Set(["CHUYEN_NHUONG", "THUA_KE_KE_THUA"]);

const normalizeLoaiThayDoi = (v) => {
    const s = String(v || "").trim().toUpperCase();
    return VALID_LOAI_THAY_DOI.has(s) ? s : "CHUYEN_NHUONG";
};

const normalizeOptionalSoDon = (val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    const trimmed = String(val).trim();
    return trimmed === "" ? null : trimmed;
};

const parseDuLieuThayDoi = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

const normalizeTaiLieuCQ = (list) => {
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

const generateMaDonDangKyCQKH = (prefix) => {
    const safePrefix = prefix && String(prefix).trim() !== "" ? String(prefix).trim() : "CQ_KH";
    const randomStr = crypto.randomBytes(3).toString("hex");
    return `${safePrefix}_${randomStr}`;
};

/**
 * Đồng bộ DonCQSH_KH.hanTraLoi theo vòng thông báo mới nhất chưa trả lời.
 */
export const syncActiveHanTraLoiCQSH_KH = async (idDonCQSH, transaction = null) => {
    const don = await DonCQSH_KH.findByPk(idDonCQSH, {
        attributes: ["id", "trangThaiDuyet"],
        transaction,
    });
    if (!don) return null;

    let nextHan = null;
    if (Number(don.trangThaiDuyet) === 0) {
        const latestUnanswered = await LichSuPhanHoiCQSH_NH_KH.findOne({
            where: { idDonCQSH, ngayTraLoi: { [Op.is]: null } },
            attributes: ["id", "lanThongBao", "hanTraLoi"],
            order: [["lanThongBao", "DESC"], ["id", "DESC"]],
            transaction,
        });
        nextHan = latestUnanswered?.hanTraLoi || null;
    }
    await DonCQSH_KH.update({ hanTraLoi: nextHan }, { where: { id: idDonCQSH }, transaction });
    return nextHan;
};

let lastAutoRejectCQKHAt = 0;
const AUTO_REJECT_CQ_KH_THROTTLE_MS = 60 * 1000;

/**
 * Tự động chuyển Từ chối các đơn chuyển quyền KH đang chờ (0) đã quá hạn trả lời Cục.
 */
export const autoRejectExpiredDonCQSH_KH = async ({ force = false, id = null } = {}) => {
    const now = Date.now();
    if (!id && !force && now - lastAutoRejectCQKHAt < AUTO_REJECT_CQ_KH_THROTTLE_MS) return 0;
    if (!id) lastAutoRejectCQKHAt = now;

    try {
        const tbl = DonCQSH_KH.getTableName();
        const tblName = typeof tbl === "string" ? tbl : tbl.tableName;
        const [, meta] = await sequelize.query(
            `UPDATE \`${tblName}\`
             SET trangThaiDuyet = 2,
                 tuDongTuChoi = 1,
                 soDon = NULL,
                 ngayChapThuan = NULL,
                 ngayGhiNhanCQ = NULL,
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
        console.error("❌ autoRejectExpiredDonCQSH_KH:", err.message);
        return 0;
    }
};

/**
 * Helper duyệt Chấp thuận Tờ khai Chuyển quyền sở hữu Đơn đăng ký KH (trangThaiDuyet = 1)
 */
export const approveDonCQSH_KH = async (record, payload = {}, transaction) => {
    let donMoi = null;
    const ngayChapThuan =
        payload.ngayChapThuan ||
        payload.ngayGhiNhanChuyenQuyen ||
        payload.ngayGhiNhanCQ ||
        record.ngayChapThuan ||
        record.ngayGhiNhanCQ ||
        todayVN();

    if (!record.maDonDangKy) {
        const donCu = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy: record.maDonDangKyGoc },
            transaction,
        });
        if (!donCu) {
            throw new Error(`Không tìm thấy đơn đăng ký KH gốc (${record.maDonDangKyGoc}).`);
        }

        const changes = {
            ...parseDuLieuThayDoi(record.duLieuThayDoi),
            ...parseDuLieuThayDoi(payload.duLieuThayDoi),
        };

        const idKhachHangMoi =
            payload.maKhachHangMoi ??
            payload.idKhachHang ??
            changes.idKhachHang ??
            changes.maKhachHangMoi ??
            record.idKhachHang ??
            donCu.idKhachHang;

        // 1. Đóng băng đơn cha: donGoc = 1
        await donCu.update({ donGoc: 1 }, { transaction });

        // 2. Sinh đơn con kế thừa (loaiDon = 4, donGoc = 0)
        const cloneDonData = donCu.get({ plain: true });
        delete cloneDonData.id;
        delete cloneDonData.createdAt;
        delete cloneDonData.updatedAt;

        const maHoSoTarget =
            payload.maHoSo || record.maHoSo || cloneDonData.maHoSo || cloneDonData.maHoSoVuViec || null;
        const prefix =
            maHoSoTarget ||
            (cloneDonData.soDon ? `CQ_KH_${String(cloneDonData.soDon).replace(/[^a-zA-Z0-9]/g, "")}` : "CQ_KH");
        const maDonDangKyMoi = generateMaDonDangKyCQKH(prefix);

        const childFields = {
            ...cloneDonData,
            maDonDangKy: maDonDangKyMoi,
            loaiDon: 4, // 4 = Sau chuyển quyền sở hữu
            donGoc: 0,
            idKhachHang: idKhachHangMoi,
            idDoiTac: payload.idDoiTac ?? changes.idDoiTac ?? cloneDonData.idDoiTac,
            clientsRef: payload.clientsRef ?? changes.clientsRef ?? cloneDonData.clientsRef,
            maNhanHieu: payload.maNhanHieu ?? changes.maNhanHieu ?? cloneDonData.maNhanHieu,
            daiDienSHTT: payload.daiDienSHTT ?? changes.daiDienSHTT ?? cloneDonData.daiDienSHTT,
            idGUQ: payload.idGUQ ?? record.idGUQ ?? changes.idGUQ ?? cloneDonData.idGUQ,
            maUyQuyen: payload.maUyQuyen ?? record.maUyQuyen ?? changes.maUyQuyen ?? cloneDonData.maUyQuyen,
            soDon: payload.soDonMoi || changes.soDonMoi || cloneDonData.soDon,
            maHoSo: maHoSoTarget,
            maHoSoVuViec: maHoSoTarget,
        };

        donMoi = await createChildDonKHSafely(childFields, transaction);

        // 3. Copy DonDK_SPDV_KH
        const dsSPDVOverride = payload.dsSPDV || changes.dsSPDV;
        if (Array.isArray(dsSPDVOverride) && dsSPDVOverride.length > 0) {
            await DonDK_SPDV_KH.bulkCreate(
                dsSPDVOverride.map((sp) => ({
                    maDonDangKy: maDonDangKyMoi,
                    maSPDV: typeof sp === "object" ? sp.maSPDV : sp,
                    isAutoImport: false,
                })),
                { transaction }
            );
        } else {
            const spdvCuList = await DonDK_SPDV_KH.findAll({
                where: { maDonDangKy: record.maDonDangKyGoc },
                transaction,
            });
            if (spdvCuList.length > 0) {
                await DonDK_SPDV_KH.bulkCreate(
                    spdvCuList.map((sp) => ({
                        maDonDangKy: maDonDangKyMoi,
                        maSPDV: sp.maSPDV,
                        isAutoImport: sp.isAutoImport,
                    })),
                    { transaction }
                );
            }
        }

        // 4. Copy TaiLieu_KH + bổ sung taiLieuCQ (không xóa tài liệu cũ)
        const taiLieuCu = await TaiLieu_KH.findAll({
            where: { maDonDangKy: record.maDonDangKyGoc },
            transaction,
        });
        for (const tl of taiLieuCu) {
            await TaiLieu_KH.create(
                {
                    maDonDangKy: maDonDangKyMoi,
                    tenTaiLieu: tl.tenTaiLieu,
                    linkTaiLieu: tl.linkTaiLieu,
                    trangThai: tl.trangThai,
                },
                { transaction }
            );
        }
        const taiLieuCQList =
            normalizeTaiLieuCQ(payload.taiLieuCQ ?? payload.taiLieuList) ??
            normalizeTaiLieuCQ(changes.taiLieuCQ) ??
            [];
        for (const tl of taiLieuCQList) {
            await TaiLieu_KH.create(
                {
                    maDonDangKy: maDonDangKyMoi,
                    tenTaiLieu: tl.tenTaiLieu,
                    linkTaiLieu: tl.linkTaiLieu,
                    trangThai: tl.trangThai,
                },
                { transaction }
            );
        }

        // 5. Copy LichSuThamDinh_KH + LichSuGiaHan_KH
        const lichSuCu = await LichSuThamDinh_KH.findAll({
            where: { maDonDangKy: record.maDonDangKyGoc },
            include: [{ model: LichSuGiaHan_KH, as: "giaHanList", required: false }],
            transaction,
        });
        for (const ls of lichSuCu) {
            const { id: _id, createdAt: _c, updatedAt: _u, giaHanList, ...lsPlain } = ls.get({ plain: true });
            const createdTD = await LichSuThamDinh_KH.create(
                { ...lsPlain, maDonDangKy: maDonDangKyMoi },
                { transaction }
            );
            if (Array.isArray(giaHanList) && giaHanList.length > 0) {
                for (const gh of giaHanList) {
                    const { id: _gid, createdAt: _gc, updatedAt: _gu, ...ghPlain } = gh;
                    await LichSuGiaHan_KH.create(
                        { ...ghPlain, idLichSuThamDinh: createdTD.id, maDonDangKy: maDonDangKyMoi },
                        { transaction }
                    );
                }
            }
        }

        await record.update(
            {
                maDonDangKy: maDonDangKyMoi,
                idKhachHang: idKhachHangMoi,
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanCQ: payload.ngayGhiNhanChuyenQuyen || payload.ngayGhiNhanCQ || ngayChapThuan,
                ngayTuChoi: null,
                lyDoTuChoi: null,
                hanTraLoi: null,
                tuDongTuChoi: false,
            },
            { transaction }
        );
    } else {
        await record.update(
            {
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanCQ: payload.ngayGhiNhanChuyenQuyen || payload.ngayGhiNhanCQ || ngayChapThuan,
                ngayTuChoi: null,
                lyDoTuChoi: null,
                hanTraLoi: null,
                tuDongTuChoi: false,
            },
            { transaction }
        );
        donMoi = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy: record.maDonDangKy },
            transaction,
        });
    }

    return donMoi;
};

/**
 * =========================================================================
 * 1. TIẾP NHẬN CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ NHÃN HIỆU KH
 * Endpoint: POST /api/application_cq_nh_kh/add
 * =========================================================================
 */
export const addApplicationCQNHKH = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            maHoSo,
            maDonDangKyCu,
            maDonDangKyGoc,
            maKhachHangMoi,
            idKhachHang,
            soDonChuyenQuyen,
            soDon,
            loaiThayDoi,
            giayUyQuyenGoc,
            maUyQuyen,
            idGUQ,
            ngayYeuCauChuyenQuyen,
            ngayYeuCau,
            ngayGhiNhanChuyenQuyen,
            ngayGhiNhanCQ,
            ghiChu,
            noiDung,
            moTa,
            maNhanSuCapNhap,
            trangThaiDuyet = 0,
            ngayChapThuan,
            ngayTuChoi,
            lyDoTuChoi,
            duLieuThayDoi,
            nguoiNopDonMoi,
            nguoiNopDonThuHai,
            daiDienSHTT,
            taiLieuCQ,
            taiLieuList,
        } = req.body || {};

        const targetMaDonGoc = maDonDangKyCu || maDonDangKyGoc;
        const targetIdKhachHangMoi = maKhachHangMoi || idKhachHang;

        if (!targetMaDonGoc || !targetIdKhachHangMoi) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: mã đơn đăng ký cũ (maDonDangKyCu) hoặc khách hàng mới (maKhachHangMoi).",
            });
        }

        const donCu = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy: targetMaDonGoc },
            transaction,
        });
        if (!donCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký KH gốc." });
        }
        if (Number(donCu.donGoc) === 1) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Đơn đăng ký KH gốc này đã bị đóng băng, vui lòng lập tờ khai trên đơn kế thừa hiện hành.",
            });
        }

        const khachHangMoi = await KhachHangCuoi.findByPk(targetIdKhachHangMoi, { transaction });
        if (!khachHangMoi) {
            await transaction.rollback();
            return res.status(404).json({
                message: `Không tìm thấy khách hàng nhận chuyển quyền sở hữu với ID ${targetIdKhachHangMoi}!`,
            });
        }

        // Tính lanChuyenQuyen trên toàn bộ phả hệ đơn KH
        const graph = await getDonKHLineageGraph();
        const family = expandDonKHFamilyIds([targetMaDonGoc], graph);
        const [maxLan, countCQ] = await Promise.all([
            DonCQSH_KH.max("lanChuyenQuyen", { where: { maDonDangKyGoc: { [Op.in]: family } }, transaction }),
            DonCQSH_KH.count({ where: { maDonDangKyGoc: { [Op.in]: family } }, transaction }),
        ]);
        const computedLan = Math.max(Number(maxLan) || 0, countCQ) + 1;
        const lanChuyenQuyen =
            req.body.lanChuyenQuyen !== undefined && req.body.lanChuyenQuyen !== null && String(req.body.lanChuyenQuyen).trim() !== ""
                ? Number(req.body.lanChuyenQuyen)
                : computedLan;

        const baseChanges = parseDuLieuThayDoi(duLieuThayDoi);
        const normTaiLieu = normalizeTaiLieuCQ(taiLieuCQ ?? taiLieuList ?? baseChanges.taiLieuCQ);
        const mergedDuLieu = {
            ...baseChanges,
            idKhachHang: khachHangMoi.id,
            maKhachHangMoi: khachHangMoi.id,
            tenKhachHangMoi: khachHangMoi.tenKhachHang,
            ...(nguoiNopDonMoi !== undefined ? { nguoiNopDonMoi } : {}),
            ...(nguoiNopDonThuHai !== undefined ? { nguoiNopDonThuHai } : {}),
            ...(daiDienSHTT !== undefined ? { daiDienSHTT } : {}),
            ...(normTaiLieu !== undefined ? { taiLieuCQ: normTaiLieu } : {}),
        };

        const effectiveMaHoSo = maHoSo || donCu.maHoSo || donCu.maHoSoVuViec || null;
        const parsedState = Number(trangThaiDuyet) || 0;
        const rawIncomingSoDon = soDonChuyenQuyen !== undefined ? soDonChuyenQuyen : soDon;
        const targetSoDon = parsedState === 2 ? null : (normalizeOptionalSoDon(rawIncomingSoDon) ?? null);
        const todayStr = todayVN();

        const newCQ = await DonCQSH_KH.create(
            {
                maHoSo: effectiveMaHoSo,
                maDonDangKy: null,
                idKhachHang: khachHangMoi.id,
                maDonDangKyGoc: targetMaDonGoc,
                soDon: targetSoDon,
                loaiThayDoi: normalizeLoaiThayDoi(loaiThayDoi),
                noiDung:
                    noiDung ||
                    ghiChu ||
                    `Chuyển quyền sở hữu đơn đăng ký KH ${donCu.soDon || targetMaDonGoc} sang khách hàng ${khachHangMoi.tenKhachHang}`,
                moTa: moTa || ghiChu || null,
                ngayYeuCau: ngayYeuCauChuyenQuyen || ngayYeuCau || todayStr,
                // Bắt buộc NULL khi chưa duyệt (0) hoặc từ chối (2)
                ngayGhiNhanCQ: parsedState === 1 ? (ngayGhiNhanChuyenQuyen || ngayGhiNhanCQ || null) : null,
                lanChuyenQuyen,
                trangThaiDuyet: parsedState === 2 ? 2 : 0,
                ngayChapThuan: null,
                ngayTuChoi: parsedState === 2 ? (ngayTuChoi || todayStr) : null,
                lyDoTuChoi: parsedState === 2 ? (lyDoTuChoi || null) : null,
                duLieuThayDoi: mergedDuLieu,
                giayUyQuyenGoc: giayUyQuyenGoc === undefined || giayUyQuyenGoc === null ? null : Boolean(giayUyQuyenGoc),
                maUyQuyen: maUyQuyen || null,
                idGUQ: idGUQ ? Number(idGUQ) : null,
                hanTraLoi: null,
                tuDongTuChoi: false,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || null,
                isAutoImport: false,
            },
            { transaction }
        );

        let donMoi = null;
        if (parsedState === 1) {
            donMoi = await approveDonCQSH_KH(newCQ, req.body, transaction);
        }

        await transaction.commit();

        return res.status(201).json({
            message:
                parsedState === 1
                    ? "Tiếp nhận và chấp thuận chuyển quyền sở hữu đơn đăng ký nhãn hiệu KH thành công!"
                    : "Tiếp nhận tờ khai chuyển quyền sở hữu đơn đăng ký KH thành công (Trạng thái: Chưa chấp thuận)!",
            donMoi,
            donCQSH: newCQ,
            data: newCQ,
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("❌ Lỗi tiếp nhận chuyển quyền đơn KH:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi tiếp nhận chuyển quyền sở hữu đơn đăng ký KH!",
            error: error.message,
        });
    }
};

/**
 * =========================================================================
 * 2. LẤY DANH SÁCH ĐƠN CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ KH
 * Endpoint: POST /api/application_cq_nh_kh/list
 * =========================================================================
 */
export const getAllApplicationCQ_KH = async (req, res) => {
    try {
        await autoRejectExpiredDonCQSH_KH();

        const {
            searchText,
            soDon,
            maHoSo,
            maDonDangKyGoc,
            maDonDangKy,
            customerName,
            partnerName,
            brandName,
            trangThaiDuyet,
            loaiThayDoi,
            filterCondition = {},
            pageIndex = 1,
            pageSize = 20,
        } = req.body || {};

        const hanTraLoiFilter = req.body?.hanTraLoiFilter ?? filterCondition?.hanTraLoiFilter;
        const sortByHanTraLoi = req.body?.sortByHanTraLoi ?? filterCondition?.sortByHanTraLoi;
        const selectedField = req.body?.selectedField ?? filterCondition?.selectedField;
        const fromDate = req.body?.fromDate ?? filterCondition?.fromDate;
        const toDate = req.body?.toDate ?? filterCondition?.toDate;

        const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
        const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
        const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

        const whereCondition = {};
        if (soDon) whereCondition.soDon = { [Op.like]: `%${String(soDon).trim()}%` };
        if (maHoSo) whereCondition.maHoSo = { [Op.like]: `%${String(maHoSo).trim()}%` };
        if (maDonDangKyGoc) whereCondition.maDonDangKyGoc = maDonDangKyGoc;
        if (maDonDangKy) whereCondition.maDonDangKy = maDonDangKy;
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null && trangThaiDuyet !== "") {
            whereCondition.trangThaiDuyet = Number(trangThaiDuyet);
        }
        if (loaiThayDoi) whereCondition.loaiThayDoi = String(loaiThayDoi).trim().toUpperCase();

        if (hanTraLoiFilter) {
            const today = todayVN();
            const addDays = (n) => new Date(new Date(`${today}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
            if (["<3", "<7", "<15", "<30"].includes(hanTraLoiFilter)) {
                whereCondition.hanTraLoi = { [Op.between]: [today, addDays(Number(hanTraLoiFilter.slice(1)))] };
            } else if (hanTraLoiFilter === "overdue") {
                whereCondition.hanTraLoi = { [Op.lt]: today };
            }
        }

        if (selectedField && ["ngayYeuCau", "ngayGhiNhanCQ", "hanTraLoi"].includes(selectedField) && fromDate && toDate) {
            whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
        }

        const listOrder = [];
        if (sortByHanTraLoi) {
            listOrder.push([literal("`DonCQSH_KH`.`hanTraLoi` IS NULL"), "ASC"]);
            listOrder.push(["hanTraLoi", String(sortByHanTraLoi).toLowerCase() === "desc" ? "DESC" : "ASC"]);
        }
        listOrder.push(["updatedAt", "DESC"], ["createdAt", "DESC"]);

        const allRows = await DonCQSH_KH.findAll({
            where: whereCondition,
            include: [
                {
                    model: DonDangKyNhanHieu_KH,
                    as: "donMoi",
                    required: false,
                    attributes: ["maDonDangKy", "soDon", "maHoSo", "maHoSoVuViec", "trangThaiDon", "ngayNopDon", "loaiDon", "donGoc"],
                    include: [
                        { model: NhanHieu, as: "nhanHieu", required: false, attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "doitac", required: false, attributes: ["tenDoiTac", "maDoiTac"] },
                        { model: KhachHangCuoi, as: "khachHang", required: false, attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: DonDangKyNhanHieu_KH,
                    as: "donGoc",
                    required: false,
                    attributes: ["maDonDangKy", "soDon", "maHoSo", "maHoSoVuViec", "idKhachHang", "trangThaiDon", "ngayNopDon", "loaiDon", "donGoc"],
                    include: [
                        { model: NhanHieu, as: "nhanHieu", required: false, attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "doitac", required: false, attributes: ["tenDoiTac", "maDoiTac"] },
                        { model: KhachHangCuoi, as: "khachHang", required: false, attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    required: false,
                    attributes: ["id", "tenKhachHang", "maKhachHang", "diaChi", "sdt"],
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

        const filtered = allRows.filter((row) => {
            if (effectiveCustomerName) {
                const hay = [
                    row.khachHangMoi?.tenKhachHang,
                    row.khachHangMoi?.maKhachHang,
                    row.donGoc?.khachHang?.tenKhachHang,
                    row.donGoc?.khachHang?.maKhachHang,
                ].join(" ");
                if (!matchTokens(hay, effectiveCustomerName)) return false;
            }
            if (effectivePartnerName) {
                const hay = [row.donGoc?.doitac?.tenDoiTac, row.donGoc?.doitac?.maDoiTac].join(" ");
                if (!matchTokens(hay, effectivePartnerName)) return false;
            }
            if (effectiveBrandName) {
                const hay = [row.donGoc?.nhanHieu?.tenNhanHieu, row.donMoi?.nhanHieu?.tenNhanHieu].join(" ");
                if (!matchTokens(hay, effectiveBrandName)) return false;
            }
            if (searchText) {
                const hay = [
                    row.soDon,
                    row.maHoSo,
                    row.maDonDangKy,
                    row.maDonDangKyGoc,
                    row.noiDung,
                    row.moTa,
                    row.donGoc?.soDon,
                    row.donGoc?.maHoSoVuViec,
                    row.donGoc?.nhanHieu?.tenNhanHieu,
                    row.khachHangMoi?.tenKhachHang,
                ].join(" ");
                if (!matchTokens(hay, searchText)) return false;
            }
            return true;
        });

        const totalItems = filtered.length;
        const page = Math.max(parseInt(pageIndex, 10) || 1, 1);
        const size = Math.max(parseInt(pageSize, 10) || 20, 1);
        const offset = (page - 1) * size;
        const paged = filtered.slice(offset, offset + size);

        // 1 query GROUP BY đếm số vòng phản hồi (tránh N+1)
        const pagedIds = paged.map((r) => r.id);
        const phanHoiStats = pagedIds.length
            ? await LichSuPhanHoiCQSH_NH_KH.findAll({
                  attributes: [
                      "idDonCQSH",
                      [fn("COUNT", col("id")), "soLan"],
                      [fn("SUM", literal("CASE WHEN ngayTraLoi IS NULL THEN 1 ELSE 0 END")), "chuaTraLoi"],
                  ],
                  where: { idDonCQSH: { [Op.in]: pagedIds } },
                  group: ["idDonCQSH"],
                  raw: true,
              })
            : [];
        const phanHoiMap = new Map(phanHoiStats.map((s) => [s.idDonCQSH, s]));

        const data = paged.map((row) => {
            const plain = row.toJSON();
            const isApproved = Number(plain.trangThaiDuyet) === 1;
            const isRejected = Number(plain.trangThaiDuyet) === 2;
            const effectiveSoDonCQ = isRejected ? null : (normalizeOptionalSoDon(plain.soDon) ?? null);
            const stat = phanHoiMap.get(plain.id);
            const activeApp = plain.donMoi || plain.donGoc || {};

            return {
                id: plain.id,
                idDonCQ: plain.id,
                soDon: effectiveSoDonCQ,
                soDonCQ: effectiveSoDonCQ,
                soDonGoc: plain.donGoc?.soDon || null,
                maDonDangKy: plain.maDonDangKy,
                maDonDangKyGoc: plain.maDonDangKyGoc,
                maHoSo: plain.maHoSo || plain.donGoc?.maHoSo || plain.donGoc?.maHoSoVuViec || null,
                maHoSoVuViec: plain.donGoc?.maHoSoVuViec || plain.maHoSo || null,
                loaiThayDoi: plain.loaiThayDoi || "CHUYEN_NHUONG",
                trangThaiDuyet: plain.trangThaiDuyet,
                tuDongTuChoi: Boolean(plain.tuDongTuChoi),
                ngayYeuCau: plain.ngayYeuCau,
                ngayGhiNhanCQ: isApproved ? plain.ngayGhiNhanCQ : null,
                ngayChapThuan: isApproved ? plain.ngayChapThuan : null,
                ngayTuChoi: plain.ngayTuChoi,
                lyDoTuChoi: plain.lyDoTuChoi,
                hanTraLoi: plain.hanTraLoi || null,
                lanChuyenQuyen: plain.lanChuyenQuyen,
                soLanThongBao: Number(stat?.soLan) || 0,
                dangChoTraLoiCuc: (Number(stat?.chuaTraLoi) || 0) > 0,
                tenKhachHangCu: plain.donGoc?.khachHang?.tenKhachHang || null,
                maKhachHangCu: plain.donGoc?.khachHang?.maKhachHang || null,
                tenKhachHangMoi: plain.khachHangMoi?.tenKhachHang || null,
                maKhachHangMoi: plain.khachHangMoi?.maKhachHang || null,
                tenDoiTac: plain.donGoc?.doitac?.tenDoiTac || null,
                tenNhanHieu: activeApp.nhanHieu?.tenNhanHieu || plain.donGoc?.nhanHieu?.tenNhanHieu || null,
                linkAnh: activeApp.nhanHieu?.linkAnh || plain.donGoc?.nhanHieu?.linkAnh || null,
                moTa: plain.moTa,
                noiDung: plain.noiDung,
                donGoc: plain.donGoc || null,
                donMoi: plain.donMoi || null,
                khachHangMoi: plain.khachHangMoi || null,
            };
        });

        return res.status(200).json({
            totalItems,
            totalPages: Math.ceil(totalItems / size),
            currentPage: page,
            data,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / size),
                pageIndex: page,
                pageSize: size,
            },
        });
    } catch (error) {
        console.error("❌ Lỗi lấy danh sách đơn CQSH KH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 3. CHI TIẾT ĐƠN CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ KH
 * Endpoint: POST /api/application_cq_nh_kh/detail | GET .../detail/:id
 * =========================================================================
 */
export const getApplicationCQ_KHDetail = async (req, res) => {
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonCQSH;
        const { maDonDangKy, maDonDangKyGoc } = req.body || {};

        const whereCondition = {};
        if (id) whereCondition.id = id;
        else if (maDonDangKy) {
            whereCondition[Op.or] = [{ maDonDangKy }, { maDonDangKyGoc: maDonDangKy }];
        } else if (maDonDangKyGoc) {
            whereCondition.maDonDangKyGoc = maDonDangKyGoc;
        } else {
            return res.status(400).json({ message: "Thiếu ID hoặc mã đơn đăng ký của hồ sơ chuyển quyền KH!" });
        }

        if (id) await autoRejectExpiredDonCQSH_KH({ id: Number(id) });
        await autoRejectExpiredDonCQSH_KH();

        const donCQ = await DonCQSH_KH.findOne({
            where: whereCondition,
            include: [
                {
                    model: DonDangKyNhanHieu_KH,
                    as: "donMoi",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "nhanHieu", required: false },
                        { model: DoiTac, as: "doitac", required: false },
                        { model: KhachHangCuoi, as: "khachHang", required: false },
                        { model: DonDK_SPDV_KH, as: "DonDK_SPDV_KH", required: false, attributes: ["maSPDV"] },
                    ],
                },
                {
                    model: DonDangKyNhanHieu_KH,
                    as: "donGoc",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "nhanHieu", required: false },
                        { model: DoiTac, as: "doitac", required: false },
                        {
                            model: KhachHangCuoi,
                            as: "khachHang",
                            required: false,
                            include: [{ model: QuocGia, as: "quocGia", required: false, attributes: ["maQuocGia", "tenQuocGia"] }],
                        },
                        {
                            model: DonDK_SPDV_KH,
                            as: "DonDK_SPDV_KH",
                            required: false,
                            attributes: ["maSPDV"],
                            include: [{ model: SanPham_DichVu, as: "SanPham_DichVu", required: false, attributes: ["maSPDV", "tenSPDV"] }],
                        },
                        { model: GiayUyQuyen, as: "GiayUyQuyen", required: false },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    required: false,
                    include: [{ model: QuocGia, as: "quocGia", required: false, attributes: ["maQuocGia", "tenQuocGia"] }],
                },
                {
                    model: GiayUyQuyen,
                    as: "giayUyQuyen",
                    required: false,
                },
                {
                    model: LichSuPhanHoiCQSH_NH_KH,
                    as: "phanHoiList",
                    required: false,
                },
            ],
            order: [
                ["id", "DESC"],
                [{ model: LichSuPhanHoiCQSH_NH_KH, as: "phanHoiList" }, "lanThongBao", "ASC"],
                [{ model: LichSuPhanHoiCQSH_NH_KH, as: "phanHoiList" }, "id", "ASC"],
            ],
        });

        if (!donCQ) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ chuyển quyền sở hữu KH!" });
        }

        const plain = donCQ.toJSON();
        const isApproved = Number(plain.trangThaiDuyet) === 1;

        // Đồng bộ khóa DonDK_SPDVs song song DonDK_SPDV_KH để FE dùng chung component VN/KH
        if (plain.donGoc && Array.isArray(plain.donGoc.DonDK_SPDV_KH)) {
            plain.donGoc.DonDK_SPDVs = plain.donGoc.DonDK_SPDV_KH;
        }
        if (plain.donMoi && Array.isArray(plain.donMoi.DonDK_SPDV_KH)) {
            plain.donMoi.DonDK_SPDVs = plain.donMoi.DonDK_SPDV_KH;
        }

        // Lịch sử chuyển quyền trong cùng phả hệ KH (tránh select LONGTEXT)
        const graph = await getDonKHLineageGraph();
        const family = expandDonKHFamilyIds([plain.maDonDangKyGoc, plain.maDonDangKy].filter(Boolean), graph);
        const chainRows = await DonCQSH_KH.findAll({
            where: { maDonDangKyGoc: { [Op.in]: family.length ? family : [plain.maDonDangKyGoc] } },
            attributes: [
                "id", "soDon", "loaiThayDoi", "lanChuyenQuyen", "ngayYeuCau", "ngayGhiNhanCQ",
                "trangThaiDuyet", "ngayChapThuan", "ngayTuChoi", "hanTraLoi", "tuDongTuChoi",
                "maDonDangKy", "maDonDangKyGoc", "idKhachHang", "createdAt",
            ],
            include: [
                {
                    model: DonDangKyNhanHieu_KH,
                    as: "donGoc",
                    required: false,
                    attributes: ["maDonDangKy", "soDon", "idKhachHang"],
                    include: [{ model: KhachHangCuoi, as: "khachHang", required: false, attributes: ["tenKhachHang", "maKhachHang"] }],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    required: false,
                    attributes: ["id", "tenKhachHang", "maKhachHang"],
                },
            ],
            order: [["lanChuyenQuyen", "ASC"], ["id", "ASC"]],
        });

        plain.lichSuChuyenQuyen = chainRows.map((item) => {
            const p = item.toJSON();
            const ok = Number(p.trangThaiDuyet) === 1;
            return {
                id: p.id,
                soDon: p.soDon,
                loaiThayDoi: p.loaiThayDoi,
                lanChuyenQuyen: p.lanChuyenQuyen,
                ngayYeuCau: p.ngayYeuCau,
                ngayGhiNhanCQ: ok ? p.ngayGhiNhanCQ : null,
                ngayChapThuan: ok ? p.ngayChapThuan : null,
                ngayTuChoi: p.ngayTuChoi,
                hanTraLoi: p.hanTraLoi,
                tuDongTuChoi: Boolean(p.tuDongTuChoi),
                trangThaiDuyet: p.trangThaiDuyet,
                maDonDangKy: p.maDonDangKy,
                maDonDangKyGoc: p.maDonDangKyGoc,
                tenKhachHangCu: p.donGoc?.khachHang?.tenKhachHang || null,
                tenKhachHangMoi: p.khachHangMoi?.tenKhachHang || null,
                isCurrent: p.id === plain.id,
            };
        });

        let nhanSuCapNhap = null;
        if (plain.maNhanSuCapNhap) {
            nhanSuCapNhap = await NhanSu.findOne({
                where: { maNhanSu: plain.maNhanSuCapNhap },
                attributes: ["maNhanSu", "hoTen"],
                raw: true,
            }).catch(() => null);
        }

        const duLieu = parseDuLieuThayDoi(plain.duLieuThayDoi);
        const isRejected = Number(plain.trangThaiDuyet) === 2;
        plain.soDon = isRejected ? null : (normalizeOptionalSoDon(plain.soDon) ?? null);
        plain.ngayGhiNhanCQ = isApproved ? plain.ngayGhiNhanCQ : null;
        plain.ngayChapThuan = isApproved ? plain.ngayChapThuan : null;
        plain.soDonCQ = plain.soDon;
        plain.soDonGoc = plain.donGoc?.soDon || null;
        plain.ngayNopDonGoc = plain.donGoc?.ngayNopDon || null;
        plain.taiLieuCQ = Array.isArray(duLieu.taiLieuCQ) ? duLieu.taiLieuCQ : [];
        plain.dangChoTraLoiCuc = (plain.phanHoiList || []).some((p) => !p.ngayTraLoi);
        plain.nhanSuCapNhap = nhanSuCapNhap;
        plain.tenNhanSuCapNhap = nhanSuCapNhap?.hoTen || null;

        return res.status(200).json(plain);
    } catch (error) {
        console.error("❌ Lỗi lấy chi tiết đơn CQSH KH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 4. CẬP NHẬT / DUYỆT TỜ KHAI CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ KH
 * Endpoint: PUT/POST /api/application_cq_nh_kh/update (/edit, /approve)
 * =========================================================================
 */
export const updateApplicationCQ_KH = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            id,
            idDonCQSH,
            maDonDangKy,
            maDonDangKyGoc,
            maHoSo,
            maKhachHangMoi,
            idKhachHang,
            soDonChuyenQuyen,
            soDon,
            loaiThayDoi,
            giayUyQuyenGoc,
            maUyQuyen,
            idGUQ,
            ngayYeuCauChuyenQuyen,
            ngayYeuCau,
            ngayGhiNhanChuyenQuyen,
            ngayGhiNhanCQ,
            ghiChu,
            noiDung,
            moTa,
            lanChuyenQuyen,
            trangThaiDuyet,
            ngayChapThuan,
            ngayTuChoi,
            lyDoTuChoi,
            duLieuThayDoi,
            nguoiNopDonMoi,
            nguoiNopDonThuHai,
            daiDienSHTT,
            taiLieuCQ,
            taiLieuList,
            maNhanSuCapNhap,
        } = req.body || {};

        const targetId = id || idDonCQSH;
        let record = null;
        if (targetId) {
            record = await DonCQSH_KH.findByPk(targetId, { transaction });
        } else if (maDonDangKy) {
            record = await DonCQSH_KH.findOne({
                where: { [Op.or]: [{ maDonDangKy }, { maDonDangKyGoc: maDonDangKy }] },
                order: [["id", "DESC"]],
                transaction,
            });
        } else if (maDonDangKyGoc) {
            record = await DonCQSH_KH.findOne({
                where: { maDonDangKyGoc },
                order: [["id", "DESC"]],
                transaction,
            });
        }

        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai chuyển quyền sở hữu đơn đăng ký KH!" });
        }

        const currentState = Number(record.trangThaiDuyet);
        const hasNextState = trangThaiDuyet !== undefined && trangThaiDuyet !== null && trangThaiDuyet !== "";
        const targetState = hasNextState ? Number(trangThaiDuyet) : currentState;
        if (![0, 1, 2].includes(targetState)) {
            await transaction.rollback();
            return res.status(400).json({ message: "trangThaiDuyet không hợp lệ (0, 1 hoặc 2)." });
        }

        const updateData = {};
        if (maHoSo !== undefined) updateData.maHoSo = maHoSo || null;
        if (maKhachHangMoi !== undefined || idKhachHang !== undefined) {
            updateData.idKhachHang = maKhachHangMoi ?? idKhachHang ?? null;
        }
        const rawIncomingSoDon = soDonChuyenQuyen !== undefined ? soDonChuyenQuyen : soDon;
        const incomingSoDon = normalizeOptionalSoDon(rawIncomingSoDon);
        if (incomingSoDon !== undefined) {
            updateData.soDon = targetState === 2 ? null : incomingSoDon;
        } else if (targetState === 2) {
            updateData.soDon = null;
        }
        if (loaiThayDoi !== undefined) updateData.loaiThayDoi = normalizeLoaiThayDoi(loaiThayDoi);
        if (giayUyQuyenGoc !== undefined) {
            updateData.giayUyQuyenGoc = giayUyQuyenGoc === null ? null : Boolean(giayUyQuyenGoc);
        }
        if (maUyQuyen !== undefined) updateData.maUyQuyen = maUyQuyen || null;
        if (idGUQ !== undefined) updateData.idGUQ = idGUQ ? Number(idGUQ) : null;
        if (ngayYeuCauChuyenQuyen !== undefined || ngayYeuCau !== undefined) {
            updateData.ngayYeuCau = ngayYeuCauChuyenQuyen ?? ngayYeuCau;
        }
        if (ngayGhiNhanChuyenQuyen !== undefined || ngayGhiNhanCQ !== undefined) {
            updateData.ngayGhiNhanCQ = targetState === 1 ? (ngayGhiNhanChuyenQuyen ?? ngayGhiNhanCQ) : null;
        }
        if (noiDung !== undefined || ghiChu !== undefined) updateData.noiDung = noiDung ?? ghiChu;
        if (moTa !== undefined) updateData.moTa = moTa;
        if (lanChuyenQuyen !== undefined) updateData.lanChuyenQuyen = lanChuyenQuyen;

        const existingDuLieu = parseDuLieuThayDoi(record.duLieuThayDoi);
        const incomingDuLieu = duLieuThayDoi !== undefined ? parseDuLieuThayDoi(duLieuThayDoi) : {};
        const normTaiLieu = normalizeTaiLieuCQ(taiLieuCQ ?? taiLieuList ?? incomingDuLieu.taiLieuCQ);
        if (
            duLieuThayDoi !== undefined ||
            nguoiNopDonMoi !== undefined ||
            nguoiNopDonThuHai !== undefined ||
            daiDienSHTT !== undefined ||
            normTaiLieu !== undefined
        ) {
            updateData.duLieuThayDoi = {
                ...existingDuLieu,
                ...incomingDuLieu,
                ...(nguoiNopDonMoi !== undefined ? { nguoiNopDonMoi } : {}),
                ...(nguoiNopDonThuHai !== undefined ? { nguoiNopDonThuHai } : {}),
                ...(daiDienSHTT !== undefined ? { daiDienSHTT } : {}),
                ...(normTaiLieu !== undefined ? { taiLieuCQ: normTaiLieu } : {}),
            };
        }
        updateData.maNhanSuCapNhap = req.user?.maNhanSu || maNhanSuCapNhap || record.maNhanSuCapNhap;

        await record.update(updateData, { transaction });

        let donMoi = null;
        if (targetState === 1) {
            donMoi = await approveDonCQSH_KH(record, req.body, transaction);
            await record.update({ hanTraLoi: null, tuDongTuChoi: false }, { transaction });
        } else if (targetState === 2) {
            await rollbackSpawnedChildDonKH(record, transaction);
            await record.update(
                {
                    trangThaiDuyet: 2,
                    maDonDangKy: null,
                    soDon: null,
                    ngayChapThuan: null,
                    ngayGhiNhanCQ: null,
                    ngayTuChoi: ngayTuChoi || record.ngayTuChoi || todayVN(),
                    lyDoTuChoi: lyDoTuChoi !== undefined ? lyDoTuChoi : record.lyDoTuChoi,
                    hanTraLoi: null,
                    tuDongTuChoi: currentState === 2 && req.body.tuDongTuChoi !== false ? Boolean(record.tuDongTuChoi) : false,
                },
                { transaction }
            );
        } else {
            await rollbackSpawnedChildDonKH(record, transaction);
            await record.update(
                {
                    trangThaiDuyet: 0,
                    maDonDangKy: null,
                    ngayChapThuan: null,
                    ngayGhiNhanCQ: null,
                    ngayTuChoi: null,
                    lyDoTuChoi: null,
                    tuDongTuChoi: false,
                },
                { transaction }
            );
            await syncActiveHanTraLoiCQSH_KH(record.id, transaction);
            await record.reload({ transaction });
        }

        await transaction.commit();
        return res.status(200).json({
            message: "Cập nhật tờ khai chuyển quyền sở hữu đơn đăng ký KH thành công!",
            data: record,
            donCQSH: record,
            donMoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("❌ Lỗi cập nhật tờ khai CQSH đơn KH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 5. XÓA TỜ KHAI CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ KH
 * Endpoint: POST /api/application_cq_nh_kh/delete | DELETE .../delete/:id
 * =========================================================================
 */
export const deleteApplicationCQ_KH = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonCQSH;
        if (!id) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu ID tờ khai chuyển quyền sở hữu KH!" });
        }

        const record = await DonCQSH_KH.findByPk(id, { transaction });
        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai chuyển quyền sở hữu KH!" });
        }

        await rollbackSpawnedChildDonKH(record, transaction);
        await record.destroy({ transaction });
        await transaction.commit();

        return res.status(200).json({
            message: "Đã xóa tờ khai chuyển quyền sở hữu KH thành công!",
            data: { id },
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("❌ Lỗi xóa tờ khai CQSH KH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 6. VÒNG PHẢN HỒI VỚI CỤC SHTT (CQSH KH)
 * POST /api/application_cq_nh_kh/phan-hoi/save
 * =========================================================================
 */
export const savePhanHoiCQSH_KH = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const body = req.body || {};
        const idDonCQSH = body.idDonCQSH ?? body.donCQSHId;
        const phanHoiId = body.id ?? body.phanHoiId ?? null;

        if (!idDonCQSH) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu idDonCQSH." });
        }

        const don = await DonCQSH_KH.findByPk(idDonCQSH, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!don) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai chuyển quyền sở hữu KH." });
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
            if (Number(don.trangThaiDuyet) !== 0) {
                await transaction.rollback();
                return res.status(400).json({ message: "Chỉ được thêm vòng thông báo mới khi tờ khai đang ở trạng thái Chưa chấp thuận." });
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
            const maxLan = (await LichSuPhanHoiCQSH_NH_KH.max("lanThongBao", { where: { idDonCQSH }, transaction })) || 0;
            phanHoi = await LichSuPhanHoiCQSH_NH_KH.create(
                { ...data, idDonCQSH, lanThongBao: maxLan + 1, maNhanSuCapNhap },
                { transaction }
            );
        } else {
            phanHoi = await LichSuPhanHoiCQSH_NH_KH.findOne({ where: { id: phanHoiId, idDonCQSH }, transaction });
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

        let reopened = false;
        if (body.reopenIfAutoRejected === true && Number(don.trangThaiDuyet) === 2 && don.tuDongTuChoi) {
            await don.update(
                { trangThaiDuyet: 0, tuDongTuChoi: false, ngayTuChoi: null, lyDoTuChoi: null },
                { transaction }
            );
            reopened = true;
        }

        const hanTraLoi = await syncActiveHanTraLoiCQSH_KH(idDonCQSH, transaction);
        await don.reload({ transaction });
        await transaction.commit();

        return res.status(200).json({
            message: reopened ? "Đã lưu vòng phản hồi và mở lại tờ khai." : "Lưu vòng phản hồi thành công.",
            data: phanHoi,
            phanHoi,
            hanTraLoi,
            reopened,
            donCQSH: {
                id: don.id,
                trangThaiDuyet: don.trangThaiDuyet,
                tuDongTuChoi: don.tuDongTuChoi,
                hanTraLoi: don.hanTraLoi,
            },
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("❌ Lỗi lưu vòng phản hồi CQSH KH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/application_cq_nh_kh/phan-hoi/delete | DELETE .../phan-hoi/:phanHoiId
 */
export const deletePhanHoiCQSH_KH = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const phanHoiId = req.params?.phanHoiId || req.body?.id || req.body?.phanHoiId;
        if (!phanHoiId) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu id vòng phản hồi cần xóa." });
        }

        const phanHoi = await LichSuPhanHoiCQSH_NH_KH.findByPk(phanHoiId, { transaction });
        if (!phanHoi) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy vòng phản hồi." });
        }

        const idDonCQSH = phanHoi.idDonCQSH;
        const don = await DonCQSH_KH.findByPk(idDonCQSH, { transaction, lock: transaction.LOCK.UPDATE });
        if (!don) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai chuyển quyền sở hữu KH." });
        }
        if (Number(don.trangThaiDuyet) === 1) {
            await transaction.rollback();
            return res.status(400).json({ message: "Tờ khai đã được chấp thuận, không thể xóa vòng phản hồi." });
        }

        await phanHoi.destroy({ transaction });

        const remaining = await LichSuPhanHoiCQSH_NH_KH.findAll({
            where: { idDonCQSH },
            attributes: ["id", "lanThongBao"],
            order: [["lanThongBao", "ASC"], ["id", "ASC"]],
            transaction,
        });
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].lanThongBao !== i + 1) {
                await remaining[i].update({ lanThongBao: i + 1 }, { transaction });
            }
        }

        const hanTraLoi = await syncActiveHanTraLoiCQSH_KH(idDonCQSH, transaction);
        await transaction.commit();

        return res.status(200).json({
            message: "Đã xóa vòng phản hồi.",
            data: { id: Number(phanHoiId), idDonCQSH },
            hanTraLoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) await transaction.rollback();
        console.error("❌ Lỗi xóa vòng phản hồi CQSH KH:", error);
        return res.status(500).json({ message: error.message });
    }
};
