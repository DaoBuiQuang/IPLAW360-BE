import { sequelize } from "../../config/db.js";
import { DonDangKy } from "../../models/donDangKyModel.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { DonCQSH_VN } from "../../models/VN_ChuyenQuyenSH/donCQSH_VNModel.js";
import { DonCQSH_GCN_VN } from "../../models/VN_ChuyenQuyenSH/donCQSH_GCN_VNModel.js";
import { DonDK_SPDV } from "../../models/donDK_SPDVMolel.js";
import { GCN_NH } from "../../models/GCN_NHModel.js";
import { NhanHieu } from "../../models/nhanHieuModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import { TaiLieu } from "../../models/taiLieuModel.js";
import { LichSuThamDinh } from "../../models/lichSuThamDinhModel.js";
import { createChildDonSafely } from "../NH_VN_SD/donSuaDoi_NH_VNController.js";
import { rollbackSpawnedChildDon, rollbackSpawnedChildGCN } from "../../utils/lineageHelper.js";
import crypto from "crypto";
import { Op } from "sequelize";

// Helper sinh mã đơn đăng ký mới
const generateMaDonDangKy = (maHoSo) => {
    const randomStr = crypto.randomBytes(3).toString("hex");
    return `${maHoSo || "CQ"}_${randomStr}`;
};

const parseDuLieuThayDoi = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

/**
 * Helper xử lý duyệt Chấp thuận Tờ khai Chuyển quyền sở hữu Đơn đăng ký (trangThaiDuyet = 1)
 */
export const approveDonCQSH_VN = async (record, payload = {}, transaction) => {
    let donMoi = null;

    if (!record.maDonDangKy) {
        const donCu = await DonDangKy.findOne({
            where: { maDonDangKy: record.maDonDangKyGoc },
            transaction,
        });

        if (!donCu) {
            throw new Error(`Không tìm thấy đơn đăng ký gốc (${record.maDonDangKyGoc}).`);
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

        // 1. Đóng băng đơn cha: cập nhật donGoc = 1, giữ nguyên loaiDon và tiến trình của đơn cha
        await donCu.update(
            { donGoc: 1 },
            { transaction }
        );

        // 2. Sinh đơn mới kế thừa thông tin & tiến trình hiện tại của đơn cha
        const cloneDonData = donCu.get({ plain: true });
        delete cloneDonData.id;
        delete cloneDonData.createdAt;
        delete cloneDonData.updatedAt;

        const maHoSoTarget = payload.maHoSo || record.maHoSo || cloneDonData.maHoSo || cloneDonData.maHoSoVuViec;
        const maDonDangKyMoi = generateMaDonDangKy(maHoSoTarget);

        const childFields = {
            ...cloneDonData,
            maDonDangKy: maDonDangKyMoi,
            loaiDon: 4, // 4 = Đơn chuyển nhượng / Sau chuyển quyền
            donGoc: 0,
            idKhachHang: idKhachHangMoi,
            idDoiTac: payload.idDoiTac ?? changes.idDoiTac ?? cloneDonData.idDoiTac,
            clientsRef: payload.clientsRef ?? changes.clientsRef ?? cloneDonData.clientsRef,
            maNhanHieu: payload.maNhanHieu ?? changes.maNhanHieu ?? cloneDonData.maNhanHieu,
            daiDienSHTT: payload.daiDienSHTT ?? changes.daiDienSHTT ?? cloneDonData.daiDienSHTT,
            soDon: payload.soDonMoi || changes.soDonMoi || cloneDonData.soDon,
            maHoSo: maHoSoTarget,
            maHoSoVuViec: maHoSoTarget || cloneDonData.maHoSoVuViec,
        };

        donMoi = await createChildDonSafely(childFields, transaction);

        // 3. Copy danh sách SPDV sang đơn mới
        const dsSPDVOverride = payload.dsSPDV || changes.dsSPDV;
        if (Array.isArray(dsSPDVOverride) && dsSPDVOverride.length > 0) {
            const spdvRows = dsSPDVOverride.map((sp) => ({
                maDonDangKy: maDonDangKyMoi,
                maSPDV: typeof sp === "object" ? sp.maSPDV : sp,
                isAutoImport: false,
            }));
            await DonDK_SPDV.bulkCreate(spdvRows, { transaction });
        } else {
            const spdvCuList = await DonDK_SPDV.findAll({
                where: { maDonDangKy: record.maDonDangKyGoc },
                transaction,
            });
            if (spdvCuList.length > 0) {
                const spdvMoiList = spdvCuList.map((spdvCu) => ({
                    maDonDangKy: maDonDangKyMoi,
                    maSPDV: spdvCu.maSPDV,
                    isAutoImport: spdvCu.isAutoImport,
                }));
                await DonDK_SPDV.bulkCreate(spdvMoiList, { transaction });
            }
        }

        // 4. Copy Tài liệu sang đơn mới
        const taiLieuCu = await TaiLieu.findAll({
            where: { maDonDangKy: record.maDonDangKyGoc },
            transaction,
        });
        if (taiLieuCu.length > 0) {
            const taiLieuMoi = taiLieuCu.map((tl) => ({
                maDonDangKy: maDonDangKyMoi,
                tenTaiLieu: tl.tenTaiLieu,
                linkTaiLieu: tl.linkTaiLieu,
                trangThai: tl.trangThai,
            }));
            await TaiLieu.bulkCreate(taiLieuMoi, { transaction });
        }

        // 5. Copy Lịch sử thẩm định sang đơn mới
        const lichSuCu = await LichSuThamDinh.findAll({
            where: { maDonDangKy: record.maDonDangKyGoc },
            transaction,
        });
        if (lichSuCu.length > 0) {
            const lichSuMoi = lichSuCu.map((ls) => {
                const raw = ls.get({ plain: true });
                delete raw.id;
                delete raw.createdAt;
                delete raw.updatedAt;
                return {
                    ...raw,
                    maDonDangKy: maDonDangKyMoi,
                };
            });
            await LichSuThamDinh.bulkCreate(lichSuMoi, { transaction });
        }

        const ngayChapThuan =
            payload.ngayChapThuan ||
            payload.ngayGhiNhanChuyenQuyen ||
            payload.ngayGhiNhanCQ ||
            record.ngayChapThuan ||
            record.ngayGhiNhanCQ ||
            new Date();

        await record.update(
            {
                maDonDangKy: maDonDangKyMoi,
                idKhachHang: idKhachHangMoi,
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanCQ: payload.ngayGhiNhanChuyenQuyen || payload.ngayGhiNhanCQ || record.ngayGhiNhanCQ || ngayChapThuan,
                ngayTuChoi: null,
                lyDoTuChoi: null,
            },
            { transaction }
        );
    } else {
        const ngayChapThuan =
            payload.ngayChapThuan ||
            payload.ngayGhiNhanChuyenQuyen ||
            payload.ngayGhiNhanCQ ||
            record.ngayChapThuan ||
            record.ngayGhiNhanCQ ||
            new Date();

        await record.update(
            {
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanCQ: payload.ngayGhiNhanChuyenQuyen || payload.ngayGhiNhanCQ || record.ngayGhiNhanCQ || ngayChapThuan,
                ngayTuChoi: null,
                lyDoTuChoi: null,
            },
            { transaction }
        );
        donMoi = await DonDangKy.findOne({
            where: { maDonDangKy: record.maDonDangKy },
            transaction,
        });
    }

    return donMoi;
};

/**
 * =========================================================================
 * 1. TIẾP NHẬN CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ NHÃN HIỆU (VN)
 * Endpoint: POST /api/application_cq_nh_vn/add
 * =========================================================================
 */
export const addApplicationCQNHVN = async (req, res) => {
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
        } = req.body;

        const targetMaDonGoc = maDonDangKyCu || maDonDangKyGoc;
        const targetIdKhachHangMoi = maKhachHangMoi || idKhachHang;

        // ====== 1. VALIDATE INPUT ======
        if (!targetMaDonGoc || !targetIdKhachHangMoi) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: mã đơn đăng ký cũ (maDonDangKyCu) hoặc khách hàng mới (maKhachHangMoi).",
            });
        }

        // ====== 2. TÌM ĐƠN ĐĂNG KÝ CŨ ======
        const donCu = await DonDangKy.findOne({
            where: { maDonDangKy: targetMaDonGoc },
            transaction,
        });

        if (!donCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký gốc." });
        }

        // ====== 3. TÌM KHÁCH HÀNG NHẬN CHUYỂN NHƯỢNG ======
        const khachHangMoi = await KhachHangCuoi.findByPk(targetIdKhachHangMoi, { transaction });
        if (!khachHangMoi) {
            await transaction.rollback();
            return res.status(404).json({
                message: `Không tìm thấy khách hàng nhận chuyển quyền sở hữu với ID ${targetIdKhachHangMoi}!`,
            });
        }

        // ====== 4. TÍNH SỐ LẦN CHUYỂN QUYỀN ======
        const countCQ = await DonCQSH_VN.count({
            where: { maDonDangKyGoc: targetMaDonGoc },
            transaction,
        });
        const lanChuyenQuyen = req.body.lanChuyenQuyen || (countCQ + 1);

        const parsedDuLieuThayDoi = {
            ...parseDuLieuThayDoi(duLieuThayDoi),
            idKhachHang: khachHangMoi.id,
            maKhachHangMoi: khachHangMoi.id,
            tenKhachHangMoi: khachHangMoi.tenKhachHang,
        };

        const effectiveMaHoSo = maHoSo || donCu.maHoSo || donCu.maHoSoVuViec;

        // ====== 5. TẠO BẢN GHI TỜ KHAI DonCQSH_VN (Mặc định trangThaiDuyet = 0: chưa sinh đơn mới) ======
        const newCQ = await DonCQSH_VN.create(
            {
                maHoSo: effectiveMaHoSo,
                maDonDangKy: null,
                idKhachHang: khachHangMoi.id,
                maDonDangKyGoc: targetMaDonGoc,
                soDon: soDonChuyenQuyen || soDon || donCu.soDon,
                noiDung:
                    noiDung ||
                    ghiChu ||
                    `Chuyển quyền sở hữu đơn đăng ký ${donCu.soDon || targetMaDonGoc} sang khách hàng ${khachHangMoi.tenKhachHang}`,
                moTa: moTa || ghiChu || null,
                ngayYeuCau: ngayYeuCauChuyenQuyen || ngayYeuCau || new Date(),
                ngayGhiNhanCQ: ngayGhiNhanChuyenQuyen || ngayGhiNhanCQ || null,
                lanChuyenQuyen,
                trangThaiDuyet: Number(trangThaiDuyet) || 0,
                ngayChapThuan: Number(trangThaiDuyet) === 1 ? (ngayChapThuan || ngayGhiNhanChuyenQuyen || new Date()) : null,
                ngayTuChoi: Number(trangThaiDuyet) === 2 ? (ngayTuChoi || new Date()) : null,
                lyDoTuChoi: Number(trangThaiDuyet) === 2 ? (lyDoTuChoi || null) : null,
                duLieuThayDoi: parsedDuLieuThayDoi,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || null,
                isAutoImport: false,
            },
            { transaction }
        );

        let donMoi = null;
        if (Number(trangThaiDuyet) === 1) {
            donMoi = await approveDonCQSH_VN(newCQ, req.body, transaction);
        }

        await transaction.commit();

        return res.status(201).json({
            message:
                Number(trangThaiDuyet) === 1
                    ? "Tiếp nhận và chấp thuận chuyển quyền sở hữu đơn đăng ký nhãn hiệu thành công!"
                    : "Tiếp nhận tờ khai chuyển quyền sở hữu đơn đăng ký thành công (Trạng thái: Chưa chấp thuận)!",
            donMoi,
            donCQSH: newCQ,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi tiếp nhận chuyển quyền đơn đăng ký:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi tiếp nhận chuyển quyền sở hữu đơn đăng ký!",
            error: error.message,
        });
    }
};

/**
 * =========================================================================
 * 2. LẤY DANH SÁCH ĐƠN CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ (VN)
 * Endpoint: POST /api/application_cq_nh_vn/list
 * =========================================================================
 */
export const getAllApplicationCQ_VN = async (req, res) => {
    try {
        const {
            searchText,
            soDon,
            maHoSo,
            maDonDangKyGoc,
            maDonDangKy,
            trangThaiDuyet,
            pageIndex = 1,
            pageSize = 20,
        } = req.body || {};

        const offset = (pageIndex - 1) * pageSize;
        const whereCondition = {};

        if (soDon) {
            whereCondition.soDon = { [Op.like]: `%${soDon}%` };
        }
        if (maHoSo) {
            whereCondition.maHoSo = { [Op.like]: `%${maHoSo}%` };
        }
        if (maDonDangKyGoc) {
            whereCondition.maDonDangKyGoc = maDonDangKyGoc;
        }
        if (maDonDangKy) {
            whereCondition.maDonDangKy = maDonDangKy;
        }
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null && trangThaiDuyet !== "") {
            whereCondition.trangThaiDuyet = Number(trangThaiDuyet);
        }
        if (searchText) {
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                { maHoSo: { [Op.like]: `%${searchText}%` } },
                { maDonDangKy: { [Op.like]: `%${searchText}%` } },
                { maDonDangKyGoc: { [Op.like]: `%${searchText}%` } },
                { noiDung: { [Op.like]: `%${searchText}%` } },
            ];
        }

        const { count, rows } = await DonCQSH_VN.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: DonDangKy,
                    as: "donMoi",
                    required: false,
                    attributes: ["maDonDangKy", "soDon", "maHoSo", "maHoSoVuViec", "trangThaiDon", "ngayNopDon", "loaiDon", "donGoc"],
                    include: [
                        { model: NhanHieu, as: "nhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "doitac", attributes: ["tenDoiTac", "maDoiTac"] },
                        { model: KhachHangCuoi, as: "khachHang", attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: DonDangKy,
                    as: "donGoc",
                    required: false,
                    attributes: ["maDonDangKy", "soDon", "maHoSo", "maHoSoVuViec", "idKhachHang", "trangThaiDon", "ngayNopDon", "loaiDon", "donGoc"],
                    include: [
                        { model: NhanHieu, as: "nhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "doitac", attributes: ["tenDoiTac", "maDoiTac"] },
                        { model: KhachHangCuoi, as: "khachHang", attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    required: false,
                    attributes: ["id", "tenKhachHang", "maKhachHang", "diaChi", "sdt"],
                },
            ],
            limit: parseInt(pageSize),
            offset: parseInt(offset),
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
        });

        return res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / pageSize),
            currentPage: parseInt(pageIndex),
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / pageSize),
                pageIndex: parseInt(pageIndex),
                pageSize: parseInt(pageSize),
            },
        });
    } catch (error) {
        console.error("❌ Lỗi lấy danh sách đơn CQSH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 3. LẤY CHI TIẾT ĐƠN CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ
 * Endpoint: POST /api/application_cq_nh_vn/detail
 * =========================================================================
 */
export const getApplicationCQ_VNDetail = async (req, res) => {
    try {
        const { id, maDonDangKy, maDonDangKyGoc } = req.body || {};
        const whereCondition = {};
        if (id) whereCondition.id = id;
        else if (maDonDangKy) {
            whereCondition[Op.or] = [
                { maDonDangKy },
                { maDonDangKyGoc: maDonDangKy },
            ];
        } else if (maDonDangKyGoc) {
            whereCondition.maDonDangKyGoc = maDonDangKyGoc;
        }

        if (!id && !maDonDangKy && !maDonDangKyGoc) {
            return res.status(400).json({ message: "Thiếu ID hoặc mã đơn đăng ký của hồ sơ chuyển quyền!" });
        }

        const donCQ = await DonCQSH_VN.findOne({
            where: whereCondition,
            include: [
                {
                    model: DonDangKy,
                    as: "donMoi",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "nhanHieu" },
                        { model: DoiTac, as: "doitac" },
                        { model: KhachHangCuoi, as: "khachHang" },
                    ],
                },
                {
                    model: DonDangKy,
                    as: "donGoc",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "nhanHieu" },
                        { model: DoiTac, as: "doitac" },
                        { model: KhachHangCuoi, as: "khachHang" },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    required: false,
                },
            ],
            order: [["id", "DESC"]],
        });

        if (!donCQ) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ chuyển quyền sở hữu!" });
        }

        return res.status(200).json(donCQ);
    } catch (error) {
        console.error("❌ Lỗi lấy chi tiết đơn CQSH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 3.1 CẬP NHẬT / DUYỆT TỜ KHAI CHUYỂN QUYỀN SỞ HỮU ĐƠN ĐĂNG KÝ
 * Endpoint: PUT/POST /api/application_cq_nh_vn/update
 * =========================================================================
 */
export const updateApplicationCQ_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            id,
            maDonDangKy,
            maDonDangKyGoc,
            maHoSo,
            maKhachHangMoi,
            idKhachHang,
            soDonChuyenQuyen,
            soDon,
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
            maNhanSuCapNhap,
        } = req.body || {};

        let record = null;
        if (id) {
            record = await DonCQSH_VN.findByPk(id, { transaction });
        } else if (maDonDangKy) {
            record = await DonCQSH_VN.findOne({
                where: {
                    [Op.or]: [
                        { maDonDangKy },
                        { maDonDangKyGoc: maDonDangKy },
                    ],
                },
                order: [["id", "DESC"]],
                transaction,
            });
        } else if (maDonDangKyGoc) {
            record = await DonCQSH_VN.findOne({
                where: { maDonDangKyGoc },
                order: [["id", "DESC"]],
                transaction,
            });
        }

        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai chuyển quyền sở hữu đơn đăng ký!" });
        }

        const updateData = {};
        if (maHoSo !== undefined) updateData.maHoSo = maHoSo;
        if (maKhachHangMoi !== undefined || idKhachHang !== undefined) {
            updateData.idKhachHang = maKhachHangMoi ?? idKhachHang;
        }
        if (soDonChuyenQuyen !== undefined || soDon !== undefined) {
            updateData.soDon = soDonChuyenQuyen ?? soDon;
        }
        if (ngayYeuCauChuyenQuyen !== undefined || ngayYeuCau !== undefined) {
            updateData.ngayYeuCau = ngayYeuCauChuyenQuyen ?? ngayYeuCau;
        }
        if (ngayGhiNhanChuyenQuyen !== undefined || ngayGhiNhanCQ !== undefined) {
            updateData.ngayGhiNhanCQ = ngayGhiNhanChuyenQuyen ?? ngayGhiNhanCQ;
        }
        if (noiDung !== undefined || ghiChu !== undefined) {
            updateData.noiDung = noiDung ?? ghiChu;
        }
        if (moTa !== undefined) updateData.moTa = moTa;
        if (lanChuyenQuyen !== undefined) updateData.lanChuyenQuyen = lanChuyenQuyen;
        if (duLieuThayDoi !== undefined) {
            updateData.duLieuThayDoi = {
                ...parseDuLieuThayDoi(record.duLieuThayDoi),
                ...parseDuLieuThayDoi(duLieuThayDoi),
            };
        }
        updateData.maNhanSuCapNhap = req.user?.maNhanSu || maNhanSuCapNhap || record.maNhanSuCapNhap;

        await record.update(updateData, { transaction });

        let donMoi = null;
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null) {
            const targetState = Number(trangThaiDuyet);
            if (targetState === 1) {
                donMoi = await approveDonCQSH_VN(record, req.body, transaction);
            } else if (targetState === 2) {
                await rollbackSpawnedChildDon(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 2,
                        maDonDangKy: null,
                        ngayChapThuan: null,
                        ngayTuChoi: ngayTuChoi || new Date(),
                        lyDoTuChoi: lyDoTuChoi ?? record.lyDoTuChoi ?? null,
                    },
                    { transaction }
                );
            } else if (targetState === 0) {
                await rollbackSpawnedChildDon(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 0,
                        maDonDangKy: null,
                        ngayChapThuan: null,
                        ngayTuChoi: null,
                        lyDoTuChoi: null,
                    },
                    { transaction }
                );
            }
        }

        await transaction.commit();
        return res.status(200).json({
            message: "Cập nhật tờ khai chuyển quyền sở hữu đơn đăng ký thành công!",
            data: record,
            donCQSH: record,
            donMoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi cập nhật tờ khai CQSH đơn đăng ký:", error);
        return res.status(500).json({ message: error.message });
    }
};

export const deleteApplicationCQ_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonCQSH;
        if (!id) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu ID tờ khai chuyển quyền sở hữu!" });
        }

        const record = await DonCQSH_VN.findByPk(id, { transaction });
        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai chuyển quyền sở hữu!" });
        }

        await rollbackSpawnedChildDon(record, transaction);
        await record.destroy({ transaction });
        await transaction.commit();
        return res.status(200).json({ message: "Đã xóa tờ khai chuyển quyền sở hữu thành công!", data: { id } });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi xóa tờ khai CQSH:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Helper xử lý duyệt Chấp thuận Tờ khai Chuyển quyền sở hữu GCN (trangThaiDuyet = 1)
 */
export const approveDonCQSH_GCN_VN = async (record, payload = {}, transaction) => {
    let gcnMoi = null;

    if (!record.idGCN_NH) {
        const gcnCu = await GCN_NH.findByPk(record.idGCN_NH_Goc, { transaction });
        if (!gcnCu) {
            throw new Error(`Không tìm thấy Giấy chứng nhận nhãn hiệu gốc (ID: ${record.idGCN_NH_Goc})!`);
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
            gcnCu.idKhachHang;

        // 1. Đóng băng bằng cha: cập nhật bangGoc = 1, giữ nguyên loaiBang của bằng cha
        await gcnCu.update(
            { bangGoc: 1 },
            { transaction }
        );

        // 2. Sinh bằng mới kế thừa từ bằng cha
        const cloneData = gcnCu.get({ plain: true });
        delete cloneData.id;
        delete cloneData.createdAt;
        delete cloneData.updatedAt;

        const ngayChapThuan =
            payload.ngayChapThuan ||
            payload.ngayGhiNhanChuyenQuyen ||
            payload.ngayGhiNhanCQ ||
            record.ngayChapThuan ||
            record.ngayGhiNhanCQ ||
            new Date();

        gcnMoi = await GCN_NH.create(
            {
                ...cloneData,
                soBang: payload.soBang || changes.soBang || cloneData.soBang,
                maHoSo: payload.maHoSo || changes.maHoSo || cloneData.maHoSo,
                loaiBang: 3, // 3 = Đã chuyển quyền / Sau chuyển nhượng
                idKhachHang: idKhachHangMoi,
                idDoiTac: payload.idDoiTac ?? changes.idDoiTac ?? cloneData.idDoiTac,
                maNhanHieu: payload.maNhanHieu ?? changes.maNhanHieu ?? cloneData.maNhanHieu,
                dsNhomSPDV: payload.dsNhomSPDV ?? changes.dsNhomSPDV ?? cloneData.dsNhomSPDV,
                ghiChu: payload.ghiChu || changes.ghiChu || record.noiDung || cloneData.ghiChu,
                bangGoc: 0, // Bằng mới đang hoạt động
                idGCN_NH_Goc: gcnCu.id,
            },
            { transaction }
        );

        await record.update(
            {
                idGCN_NH: gcnMoi.id,
                idKhachHang: idKhachHangMoi,
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanCQ: payload.ngayGhiNhanChuyenQuyen || payload.ngayGhiNhanCQ || record.ngayGhiNhanCQ || ngayChapThuan,
                ngayTuChoi: null,
                lyDoTuChoi: null,
            },
            { transaction }
        );
    } else {
        const ngayChapThuan =
            payload.ngayChapThuan ||
            payload.ngayGhiNhanChuyenQuyen ||
            payload.ngayGhiNhanCQ ||
            record.ngayChapThuan ||
            record.ngayGhiNhanCQ ||
            new Date();

        await record.update(
            {
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanCQ: payload.ngayGhiNhanChuyenQuyen || payload.ngayGhiNhanCQ || record.ngayGhiNhanCQ || ngayChapThuan,
                ngayTuChoi: null,
                lyDoTuChoi: null,
            },
            { transaction }
        );

        gcnMoi = await GCN_NH.findByPk(record.idGCN_NH, { transaction });
    }

    return gcnMoi;
};

/**
 * =========================================================================
 * 4. TIẾP NHẬN CHUYỂN QUYỀN SỞ HỮU GIẤY CHỨNG NHẬN NHÃN HIỆU (GCN_CQ_NH_VN)
 * Endpoint: POST /api/gcn_cq_nh_vn/add
 * =========================================================================
 */
export const addGCN_CQ_NHVN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            maHoSo,
            idGCN_NH_Cu,
            idGCN_NH_Goc,
            soBang,
            maKhachHangMoi,
            idKhachHang,
            soDonChuyenQuyen,
            soDon,
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
        } = req.body;

        const targetIdGcnGoc = idGCN_NH_Cu || idGCN_NH_Goc;
        const targetIdKhachHangMoi = maKhachHangMoi || idKhachHang;

        // ====== 1. VALIDATE INPUT ======
        if (!targetIdGcnGoc || !targetIdKhachHangMoi) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: ID Giấy chứng nhận cũ (idGCN_NH_Cu) hoặc khách hàng mới (maKhachHangMoi).",
            });
        }

        // ====== 2. TÌM GIẤY CHỨNG NHẬN GỐC ======
        const gcnCu = await GCN_NH.findByPk(targetIdGcnGoc, { transaction });
        if (!gcnCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy Giấy chứng nhận nhãn hiệu gốc!" });
        }

        // ====== 3. TÌM KHÁCH HÀNG MỚI ======
        const khachHangMoi = await KhachHangCuoi.findByPk(targetIdKhachHangMoi, { transaction });
        if (!khachHangMoi) {
            await transaction.rollback();
            return res.status(404).json({
                message: `Không tìm thấy khách hàng nhận chuyển quyền sở hữu với ID ${targetIdKhachHangMoi}!`,
            });
        }

        // ====== 4. TÍNH SỐ LẦN CHUYỂN QUYỀN GCN ======
        const countCQ = await DonCQSH_GCN_VN.count({
            where: { idGCN_NH_Goc: targetIdGcnGoc },
            transaction,
        });
        const lanChuyenQuyen = req.body.lanChuyenQuyen || (countCQ + 1);

        const parsedDuLieuThayDoi = {
            ...parseDuLieuThayDoi(duLieuThayDoi),
            idKhachHang: khachHangMoi.id,
            maKhachHangMoi: khachHangMoi.id,
            tenKhachHangMoi: khachHangMoi.tenKhachHang,
            soBang: soBang || gcnCu.soBang,
            maHoSo: maHoSo || gcnCu.maHoSo,
        };

        // ====== 5. TẠO BẢN GHI TỜ KHAI DonCQSH_GCN_VN (Mặc định trangThaiDuyet = 0: chưa sinh GCN mới) ======
        const newCQGCN = await DonCQSH_GCN_VN.create(
            {
                idGCN_NH: null,
                idGCN_NH_Goc: targetIdGcnGoc,
                idKhachHang: khachHangMoi.id,
                soDon: soDonChuyenQuyen || soDon || gcnCu.soDon || null,
                noiDung:
                    noiDung ||
                    ghiChu ||
                    `Chuyển quyền sở hữu giấy chứng nhận số ${gcnCu.soBang} sang khách hàng ${khachHangMoi.tenKhachHang}`,
                moTa: moTa || ghiChu || null,
                ngayYeuCau: ngayYeuCauChuyenQuyen || ngayYeuCau || new Date(),
                ngayGhiNhanCQ: ngayGhiNhanChuyenQuyen || ngayGhiNhanCQ || null,
                lanChuyenQuyen,
                trangThaiDuyet: Number(trangThaiDuyet) || 0,
                ngayChapThuan: Number(trangThaiDuyet) === 1 ? (ngayChapThuan || ngayGhiNhanChuyenQuyen || new Date()) : null,
                ngayTuChoi: Number(trangThaiDuyet) === 2 ? (ngayTuChoi || new Date()) : null,
                lyDoTuChoi: Number(trangThaiDuyet) === 2 ? (lyDoTuChoi || null) : null,
                duLieuThayDoi: parsedDuLieuThayDoi,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || null,
                isAutoImport: false,
            },
            { transaction }
        );

        let gcnMoi = null;
        if (Number(trangThaiDuyet) === 1) {
            gcnMoi = await approveDonCQSH_GCN_VN(newCQGCN, req.body, transaction);
        }

        await transaction.commit();

        return res.status(201).json({
            message:
                Number(trangThaiDuyet) === 1
                    ? "Tiếp nhận và chấp thuận chuyển quyền sở hữu giấy chứng nhận thành công!"
                    : "Tiếp nhận tờ khai chuyển quyền sở hữu giấy chứng nhận thành công (Trạng thái: Chưa chấp thuận)!",
            gcnMoi,
            donCQSH: newCQGCN,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi chi tiết khi tiếp nhận chuyển quyền Giấy chứng nhận:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi tiếp nhận chuyển quyền sở hữu giấy chứng nhận!",
            error: error.message,
        });
    }
};

/**
 * =========================================================================
 * 5. LẤY DANH SÁCH HỒ SƠ CHUYỂN QUYỀN GCN
 * Endpoint: POST /api/gcn_cq_nh_vn/list
 * =========================================================================
 */
export const getAllGCN_CQ_VN = async (req, res) => {
    try {
        const {
            soBang,
            soDon,
            idGCN_NH_Goc,
            idGCN_NH,
            trangThaiDuyet,
            searchText,
            pageIndex = 1,
            pageSize = 20,
        } = req.body || {};

        const offset = (pageIndex - 1) * pageSize;
        const whereCondition = {};

        if (soDon) {
            whereCondition.soDon = { [Op.like]: `%${soDon}%` };
        }
        if (idGCN_NH_Goc) {
            whereCondition.idGCN_NH_Goc = idGCN_NH_Goc;
        }
        if (idGCN_NH) {
            whereCondition.idGCN_NH = idGCN_NH;
        }
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null && trangThaiDuyet !== "") {
            whereCondition.trangThaiDuyet = Number(trangThaiDuyet);
        }
        if (searchText) {
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                { noiDung: { [Op.like]: `%${searchText}%` } },
                { "$gcnGoc.soBang$": { [Op.like]: `%${searchText}%` } },
                { "$gcnMoi.soBang$": { [Op.like]: `%${searchText}%` } },
            ];
        }
        if (soBang) {
            whereCondition[Op.and] = whereCondition[Op.and] || [];
            whereCondition[Op.and].push({
                [Op.or]: [
                    { "$gcnGoc.soBang$": { [Op.like]: `%${soBang}%` } },
                    { "$gcnMoi.soBang$": { [Op.like]: `%${soBang}%` } },
                ],
            });
        }

        const { count, rows } = await DonCQSH_GCN_VN.findAndCountAll({
            where: whereCondition,
            subQuery: false,
            distinct: true,
            include: [
                {
                    model: GCN_NH,
                    as: "gcnMoi",
                    required: false,
                    attributes: ["id", "soBang", "soDon", "maHoSo", "ngayCapBang", "ngayHetHanBang", "loaiBang", "bangGoc", "idGCN_NH_Goc"],
                    include: [
                        { model: NhanHieu, as: "NhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac", "maDoiTac"] },
                        { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: GCN_NH,
                    as: "gcnGoc",
                    required: false,
                    attributes: ["id", "soBang", "soDon", "maHoSo", "idKhachHang", "ngayCapBang", "ngayHetHanBang", "loaiBang", "bangGoc"],
                    include: [
                        { model: NhanHieu, as: "NhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac", "maDoiTac"] },
                        { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    required: false,
                    attributes: ["id", "tenKhachHang", "maKhachHang", "diaChi", "sdt"],
                },
            ],
            limit: parseInt(pageSize),
            offset: parseInt(offset),
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
        });

        return res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / pageSize),
            currentPage: parseInt(pageIndex),
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / pageSize),
                pageIndex: parseInt(pageIndex),
                pageSize: parseInt(pageSize),
            },
        });
    } catch (error) {
        console.error("❌ Lỗi lấy danh sách hồ sơ CQSH GCN:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 6. LẤY CHI TIẾT HỒ SƠ CHUYỂN QUYỀN GCN
 * Endpoint: POST /api/gcn_cq_nh_vn/detail
 * =========================================================================
 */
export const getGCN_CQ_VNDetail = async (req, res) => {
    try {
        const { id, idGCN_NH, idGCN_NH_Goc } = req.body || {};
        const whereCondition = {};
        if (id) whereCondition.id = id;
        else if (idGCN_NH) {
            whereCondition[Op.or] = [
                { idGCN_NH },
                { idGCN_NH_Goc: idGCN_NH },
            ];
        } else if (idGCN_NH_Goc) {
            whereCondition.idGCN_NH_Goc = idGCN_NH_Goc;
        }

        if (!id && !idGCN_NH && !idGCN_NH_Goc) {
            return res.status(400).json({ message: "Thiếu ID hoặc ID Giấy chứng nhận của hồ sơ chuyển quyền!" });
        }

        const cqGCN = await DonCQSH_GCN_VN.findOne({
            where: whereCondition,
            include: [
                {
                    model: GCN_NH,
                    as: "gcnMoi",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "NhanHieu" },
                        { model: DoiTac, as: "DoiTac" },
                        { model: KhachHangCuoi, as: "KhachHangCuoi" },
                    ],
                },
                {
                    model: GCN_NH,
                    as: "gcnGoc",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "NhanHieu" },
                        { model: DoiTac, as: "DoiTac" },
                        { model: KhachHangCuoi, as: "KhachHangCuoi" },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    required: false,
                },
            ],
            order: [["id", "DESC"]],
        });

        if (!cqGCN) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ chuyển quyền Giấy chứng nhận!" });
        }

        return res.status(200).json(cqGCN);
    } catch (error) {
        console.error("❌ Lỗi lấy chi tiết hồ sơ CQSH GCN:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 6.1 CẬP NHẬT / DUYỆT HỒ SƠ CHUYỂN QUYỀN GCN
 * Endpoint: PUT/POST /api/gcn_cq_nh_vn/update
 * =========================================================================
 */
export const updateGCN_CQ_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            id,
            idGCN_NH,
            idGCN_NH_Goc,
            maKhachHangMoi,
            idKhachHang,
            soDonChuyenQuyen,
            soDon,
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
            maNhanSuCapNhap,
        } = req.body || {};

        let record = null;
        if (id) {
            record = await DonCQSH_GCN_VN.findByPk(id, { transaction });
        } else if (idGCN_NH) {
            record = await DonCQSH_GCN_VN.findOne({
                where: {
                    [Op.or]: [
                        { idGCN_NH },
                        { idGCN_NH_Goc: idGCN_NH },
                    ],
                },
                order: [["id", "DESC"]],
                transaction,
            });
        } else if (idGCN_NH_Goc) {
            record = await DonCQSH_GCN_VN.findOne({
                where: { idGCN_NH_Goc },
                order: [["id", "DESC"]],
                transaction,
            });
        }

        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy hồ sơ chuyển quyền Giấy chứng nhận!" });
        }

        const updateData = {};
        if (maKhachHangMoi !== undefined || idKhachHang !== undefined) {
            updateData.idKhachHang = maKhachHangMoi ?? idKhachHang;
        }
        if (soDonChuyenQuyen !== undefined || soDon !== undefined) {
            updateData.soDon = soDonChuyenQuyen ?? soDon;
        }
        if (ngayYeuCauChuyenQuyen !== undefined || ngayYeuCau !== undefined) {
            updateData.ngayYeuCau = ngayYeuCauChuyenQuyen ?? ngayYeuCau;
        }
        if (ngayGhiNhanChuyenQuyen !== undefined || ngayGhiNhanCQ !== undefined) {
            updateData.ngayGhiNhanCQ = ngayGhiNhanChuyenQuyen ?? ngayGhiNhanCQ;
        }
        if (noiDung !== undefined || ghiChu !== undefined) {
            updateData.noiDung = noiDung ?? ghiChu;
        }
        if (moTa !== undefined) updateData.moTa = moTa;
        if (lanChuyenQuyen !== undefined) updateData.lanChuyenQuyen = lanChuyenQuyen;
        if (duLieuThayDoi !== undefined) {
            updateData.duLieuThayDoi = {
                ...parseDuLieuThayDoi(record.duLieuThayDoi),
                ...parseDuLieuThayDoi(duLieuThayDoi),
            };
        }
        updateData.maNhanSuCapNhap = req.user?.maNhanSu || maNhanSuCapNhap || record.maNhanSuCapNhap;

        await record.update(updateData, { transaction });

        let gcnMoi = null;
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null) {
            const targetState = Number(trangThaiDuyet);
            if (targetState === 1) {
                gcnMoi = await approveDonCQSH_GCN_VN(record, req.body, transaction);
            } else if (targetState === 2) {
                await rollbackSpawnedChildGCN(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 2,
                        idGCN_NH: null,
                        ngayChapThuan: null,
                        ngayTuChoi: ngayTuChoi || new Date(),
                        lyDoTuChoi: lyDoTuChoi ?? record.lyDoTuChoi ?? null,
                    },
                    { transaction }
                );
            } else if (targetState === 0) {
                await rollbackSpawnedChildGCN(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 0,
                        idGCN_NH: null,
                        ngayChapThuan: null,
                        ngayTuChoi: null,
                        lyDoTuChoi: null,
                    },
                    { transaction }
                );
            }
        }

        await transaction.commit();
        return res.status(200).json({
            message: "Cập nhật tờ khai chuyển quyền sở hữu Giấy chứng nhận thành công!",
            data: record,
            donCQSH: record,
            gcnMoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi cập nhật hồ sơ CQSH GCN:", error);
        return res.status(500).json({ message: error.message });
    }
};

export const deleteGCN_CQ_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonCQSHGCN;
        if (!id) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu ID tờ khai chuyển quyền GCN!" });
        }

        const record = await DonCQSH_GCN_VN.findByPk(id, { transaction });
        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai chuyển quyền GCN!" });
        }

        await rollbackSpawnedChildGCN(record, transaction);
        await record.destroy({ transaction });
        await transaction.commit();
        return res.status(200).json({ message: "Đã xóa tờ khai chuyển quyền GCN thành công!", data: { id } });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi xóa tờ khai CQSH GCN:", error);
        return res.status(500).json({ message: error.message });
    }
};
