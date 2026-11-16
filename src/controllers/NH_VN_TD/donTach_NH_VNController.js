import { sequelize } from "../../config/db.js";
import { DonDangKy } from "../../models/donDangKyModel.js";
import { DonDK_SPDV } from "../../models/donDK_SPDVMolel.js";
import crypto from "crypto";

import { DonTachNH_VN } from "../../models/VN_TachDon_NH/donTachNH_VNModel.js";
import { DonDangKyNhanHieu_KH } from "../../models/KH/donDangKyNhanHieu_KHModel.js";
import { DonDK_SPDV_KH } from "../../models/KH/donDK_SPDVModel_KHModel.js";
import { DoiTac, DonTachNH_KH, KhachHangCuoi, NhanHieu, TaiLieu } from "../../models/index.js";
import { Op, literal, Sequelize } from "sequelize";
import { TaiLieu_KH } from "../../models/KH/taiLieuKH_Model.js";
import { createChildDonSafely } from "../NH_VN_SD/donSuaDoi_NH_VNController.js";
import { getDonPendingBienDongMap } from "../../utils/lineageHelper.js";

// Helper for token-based substring search (case-insensitive)
const buildTokensSearch = (val, field) => {
    if (!val) return undefined;
    const tokens = String(val).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return undefined;
    if (tokens.length === 1) return { [field]: { [Op.like]: `%${tokens[0]}%` } };
    return {
        [Op.and]: tokens.map((tok) => ({ [field]: { [Op.like]: `%${tok}%` } })),
    };
};

// Helper for customer multi-field token search (tenKhachHang + maKhachHang)
const buildCustomerSearch = (val) => {
    if (!val) return undefined;
    const tokens = String(val).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return undefined;
    if (tokens.length === 1) {
        return {
            [Op.or]: [
                { tenKhachHang: { [Op.like]: `%${tokens[0]}%` } },
                { maKhachHang: { [Op.like]: `%${tokens[0]}%` } },
            ],
        };
    }
    return {
        [Op.and]: tokens.map((tok) => ({
            [Op.or]: [
                { tenKhachHang: { [Op.like]: `%${tok}%` } },
                { maKhachHang: { [Op.like]: `%${tok}%` } },
            ],
        })),
    };
};

// Helper for partner multi-field token search (tenDoiTac + maDoiTac)
const buildPartnerSearch = (val) => {
    if (!val) return undefined;
    const tokens = String(val).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return undefined;
    if (tokens.length === 1) {
        return {
            [Op.or]: [
                { tenDoiTac: { [Op.like]: `%${tokens[0]}%` } },
                { maDoiTac: { [Op.like]: `%${tokens[0]}%` } },
            ],
        };
    }
    return {
        [Op.and]: tokens.map((tok) => ({
            [Op.or]: [
                { tenDoiTac: { [Op.like]: `%${tok}%` } },
                { maDoiTac: { [Op.like]: `%${tok}%` } },
            ],
        })),
    };
};

const generateMaDonDangKy = (maHoSo) => {
    const randomStr = crypto.randomBytes(3).toString("hex"); // 6 ký tự hex
    return `${maHoSo || "TD"}_${randomStr}`;
};

const addOneMonth = (dateVal) => {
    const base = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(base.getTime())) {
        const fallback = new Date();
        fallback.setMonth(fallback.getMonth() + 1);
        return fallback.toISOString().split("T")[0];
    }
    const next = new Date(base);
    next.setMonth(next.getMonth() + 1);
    return next.toISOString().split("T")[0];
};

const buildResetSplitProgressFields = (item = {}, ngayNopDonMoi) => {
    const duKien1Thang = addOneMonth(ngayNopDonMoi);
    const ngayHoanThanhHoSoTaiLieu_DuKien = item.ngayHoanThanhHoSoTaiLieu_DuKien || duKien1Thang;
    const ngayKQThamDinhHinhThuc_DuKien = item.ngayKQThamDinhHinhThuc_DuKien || duKien1Thang;

    return {
        ngayNopDon: ngayNopDonMoi,
        ngayHoanThanhHoSoTaiLieu_DuKien,
        ngayHoanThanhHoSoTaiLieu: null,
        trangThaiHoanThienHoSoTaiLieu: "Chưa hoàn thành",
        ngayKQThamDinhHinhThuc_DuKien,
        ngayKQThamDinhHinhThuc_DK_SauKN: null,
        ngayKQThamDinhHinhThuc: null,
        ngayCongBoDonDuKien: null,
        ngayCongBoDon: null,
        ngayKQThamDinhND_DuKien: null,
        ngayKQThamDinhND_DK_SauKN: null,
        ngayKQThamDinhND: null,
        trangThaiTraLoiKQThamDinhND: null,
        ngayTraLoiKQThamDinhND_DuKien: null,
        ngayTraLoiKQThamDinhND: null,
        ngayThongBaoCapBang: null,
        trangThaiDYTBCapBang: null,
        hanNopYKien: null,
        ngayNopYKien: null,
        ngayNhanKQYKien: null,
        ketQuaYKien: null,
        hanNopPhiCapBang: null,
        ngayNopPhiCapBang: null,
        ngayNhanBang: null,
        ngayGuiBangChoKhachHang: null,
        soBang: null,
        quyetDinhSo: null,
        ngayCapBang: null,
        ngayHetHanBang: null,
        idGCN_NH: null,
        trangThaiDon: item.trangThaiDon || "Thẩm định hình thức",
        buocXuLy: item.buocXuLy || "Bước 1",
        trangThaiVuViec: item.trangThaiVuViec || "1",
        hanXuLy: item.hanXuLy || ngayKQThamDinhHinhThuc_DuKien,
        hanTraLoi: null,
    };
};

export const tachDonDangKy_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { maHoSo, maDonDangKyCu, maDonDangKyGoc, listDonTach } = req.body;
        const targetMaDonGoc = maDonDangKyCu || maDonDangKyGoc;

        if (!targetMaDonGoc || !Array.isArray(listDonTach) || listDonTach.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu dữ liệu tách đơn." });
        }

        // Lấy đơn gốc (Đơn gốc giữ nguyên donGoc = 0)
        const donCu = await DonDangKy.findOne({
            where: { maDonDangKy: targetMaDonGoc },
            transaction,
        });

        if (!donCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn gốc." });
        }

        const effectiveMaHoSo = maHoSo || donCu.maHoSo || donCu.maHoSoVuViec;

        // Lấy toàn bộ SPDV của đơn gốc
        const spdvCu = await DonDK_SPDV.findAll({
            where: { maDonDangKy: targetMaDonGoc },
            transaction,
        });

        // Đếm số lần tách đơn hiện có của đơn gốc
        const existingSplitCount = await DonTachNH_VN.count({
            where: { maDonDangKyGoc: targetMaDonGoc },
            transaction,
        });

        const danhSachDonMoi = [];
        for (let i = 0; i < listDonTach.length; i++) {
            const item = listDonTach[i];
            const rawNhomSP = item.nhomSPDV || item.dsNhomSPDV || "";
            const nhomSP = String(rawNhomSP)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            // ====== 1) TẠO MÃ ĐƠN MỚI & NGÀY NỘP ĐƠN MỚI ======
            const maDonDangKyMoi = generateMaDonDangKy(effectiveMaHoSo);
            const ngayNopDonMoi =
                item.ngayNopDon ||
                item.ngayYeuCau ||
                req.body.ngayNopDon ||
                req.body.ngayYeuCau ||
                new Date().toISOString().split("T")[0];

            const basePlain = donCu.toJSON();
            delete basePlain.id;
            delete basePlain.createdAt;
            delete basePlain.updatedAt;

            const resetProgressFields = buildResetSplitProgressFields(item, ngayNopDonMoi);

            // ====== 2) TẠO DON DANG KY MỚI (loaiDon = 3, donGoc = 0, reset tiến trình thẩm định) ======
            const donMoi = await createChildDonSafely(
                {
                    ...basePlain,
                    ...resetProgressFields,
                    maDonDangKy: maDonDangKyMoi,
                    maHoSo: effectiveMaHoSo,
                    maHoSoVuViec: effectiveMaHoSo || basePlain.maHoSoVuViec,
                    loaiDon: 3, // 3 = Đơn tách
                    donGoc: 0,
                    soDon: item.soDon,
                },
                transaction
            );

            // ====== 3) TẠO BẢN GHI DonTachNH_VN ======
            await DonTachNH_VN.create(
                {
                    soDon: item.soDon,
                    maDonDangKy: maDonDangKyMoi,
                    maDonDangKyGoc: targetMaDonGoc,
                    dsNhomSPDV: rawNhomSP || null,
                    ndTachDon: item.ndTachDon || null,
                    moTa: item.moTa || null,
                    ngayYeuCau: item.ngayYeuCau || ngayNopDonMoi,
                    ngayGhiNhanTachDon: item.ngayGhiNhanTachDon || item.ngayGhiNhanSuaDoi || null,
                    lanTachDon: item.lanTachDon || existingSplitCount + i + 1,
                    maNhanSuCapNhap: req.user?.maNhanSu || item.maNhanSuCapNhap || null,
                },
                { transaction }
            );

            // ====== 4) COPY SPDV TƯƠNG ỨNG ======
            let spdvMoi = [];
            if (nhomSP.length > 0) {
                const matchedFromParent = spdvCu.filter((sp) => nhomSP.includes(String(sp.maSPDV).trim()));
                if (matchedFromParent.length > 0) {
                    spdvMoi = matchedFromParent.map((sp) => ({
                        maDonDangKy: maDonDangKyMoi,
                        maSPDV: sp.maSPDV,
                        isAutoImport: sp.isAutoImport,
                    }));
                } else {
                    spdvMoi = nhomSP.map((maSPDV) => ({
                        maDonDangKy: maDonDangKyMoi,
                        maSPDV,
                        isAutoImport: false,
                    }));
                }
            }

            if (spdvMoi.length > 0) {
                await DonDK_SPDV.bulkCreate(spdvMoi, { transaction });
            }

            danhSachDonMoi.push({
                ...donMoi.toJSON(),
                maDonDangKyGoc: targetMaDonGoc,
                soDonGoc: donCu.soDon,
                ngayNopDonGoc: donCu.ngayNopDon,
            });
        }

        await transaction.commit();
        return res.status(201).json({
            message: "Tách đơn thành công!",
            danhSachDonMoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi tách đơn:", error);
        res.status(500).json({ message: error.message });
    }
};

export const tachDonDangKy_KH = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { maHoSo, maDonDangKyCu, maDonDangKyGoc, listDonTach } = req.body;
        const targetMaDonGoc = maDonDangKyCu || maDonDangKyGoc;

        if (!targetMaDonGoc || !Array.isArray(listDonTach) || listDonTach.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu dữ liệu tách đơn." });
        }

        // Lấy đơn gốc (Đơn gốc giữ nguyên donGoc = 0)
        const donCu = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy: targetMaDonGoc },
            transaction,
        });

        if (!donCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn gốc." });
        }

        const effectiveMaHoSo = maHoSo || donCu.maHoSo || donCu.maHoSoVuViec;

        // Lấy toàn bộ SPDV của đơn gốc
        const spdvCu = await DonDK_SPDV_KH.findAll({
            where: { maDonDangKy: targetMaDonGoc },
            transaction,
        });

        const existingSplitCount = await DonTachNH_KH.count({
            where: { maDonDangKyGoc: targetMaDonGoc },
            transaction,
        });

        const danhSachDonMoi = [];
        for (let i = 0; i < listDonTach.length; i++) {
            const item = listDonTach[i];
            const rawNhomSP = item.nhomSPDV || item.dsNhomSPDV || "";
            const nhomSP = String(rawNhomSP)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            // ====== 1) TẠO MÃ ĐƠN MỚI & NGÀY NỘP ĐƠN MỚI ======
            const maDonDangKyMoi = generateMaDonDangKy(effectiveMaHoSo);
            const ngayNopDonMoi =
                item.ngayNopDon ||
                item.ngayYeuCau ||
                req.body.ngayNopDon ||
                req.body.ngayYeuCau ||
                new Date().toISOString().split("T")[0];

            const basePlain = donCu.toJSON();
            delete basePlain.id;
            delete basePlain.createdAt;
            delete basePlain.updatedAt;

            const resetProgressFields = buildResetSplitProgressFields(item, ngayNopDonMoi);

            // ====== 2) TẠO DON DANG KY MỚI ======
            const donMoi = await DonDangKyNhanHieu_KH.create(
                {
                    ...basePlain,
                    ...resetProgressFields,
                    maDonDangKy: maDonDangKyMoi,
                    maHoSo: effectiveMaHoSo,
                    maHoSoVuViec: effectiveMaHoSo || basePlain.maHoSoVuViec,
                    loaiDon: 3, // 3 = tách đơn
                    donGoc: 0,
                    soDon: item.soDon,
                },
                { transaction }
            );

            // ====== 3) TẠO BẢN GHI DonTachNH_KH ======
            await DonTachNH_KH.create(
                {
                    soDon: item.soDon,
                    maDonDangKy: maDonDangKyMoi,
                    maDonDangKyGoc: targetMaDonGoc,
                    dsNhomSPDV: rawNhomSP || null,
                    ndTachDon: item.ndTachDon || null,
                    moTa: item.moTa || null,
                    ngayYeuCau: item.ngayYeuCau || ngayNopDonMoi,
                    ngayGhiNhanTachDon: item.ngayGhiNhanTachDon || item.ngayGhiNhanSuaDoi || null,
                    lanTachDon: item.lanTachDon || existingSplitCount + i + 1,
                    maNhanSuCapNhap: req.user?.maNhanSu || item.maNhanSuCapNhap || null,
                },
                { transaction }
            );

            // ====== 4) COPY SPDV TƯƠNG ỨNG ======
            let spdvMoi = [];
            if (nhomSP.length > 0) {
                const matchedFromParent = spdvCu.filter((sp) => nhomSP.includes(String(sp.maSPDV).trim()));
                if (matchedFromParent.length > 0) {
                    spdvMoi = matchedFromParent.map((sp) => ({
                        maDonDangKy: maDonDangKyMoi,
                        maSPDV: sp.maSPDV,
                        isAutoImport: sp.isAutoImport,
                    }));
                } else {
                    spdvMoi = nhomSP.map((maSPDV) => ({
                        maDonDangKy: maDonDangKyMoi,
                        maSPDV,
                        isAutoImport: false,
                    }));
                }
            }

            if (spdvMoi.length > 0) {
                await DonDK_SPDV_KH.bulkCreate(spdvMoi, { transaction });
            }

            danhSachDonMoi.push({
                ...donMoi.toJSON(),
                maDonDangKyGoc: targetMaDonGoc,
                soDonGoc: donCu.soDon,
                ngayNopDonGoc: donCu.ngayNopDon,
            });
        }

        await transaction.commit();
        return res.status(201).json({
            message: "Tách đơn thành công!",
            danhSachDonMoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi tách đơn KH:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllApplicationTD_VN = async (req, res) => {
    try {
        const {
            maSPDVList,
            trangThaiDon,
            searchText,
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

        // luôn đảm bảo có các field tối thiểu
        if (!fields.includes("maDonDangKy")) fields.push("maDonDangKy");
        if (!fields.includes("donGoc")) fields.push("donGoc");
        if (!fields.includes("loaiDon")) fields.push("loaiDon");
        if (!fields.includes("maDonDangKyGoc")) fields.push("maDonDangKyGoc");
        if (!fields.includes("soDonGoc")) fields.push("soDonGoc");
        if (!fields.includes("ngayNopDonGoc")) fields.push("ngayNopDonGoc");

        const offset = (pageIndex - 1) * pageSize;
        const {
            selectedField,
            fromDate,
            toDate,
            hanXuLyFilter,
            hanTraLoiFilter,
            sortByHanXuLy,
            sortByHanTraLoi,
        } = filterCondition;

        const whereCondition = { loaiDon: 3 };

        // ====== Lọc cơ bản ======
        if (trangThaiDon) whereCondition.trangThaiDon = trangThaiDon;

        // ====== Tìm kiếm (soDon, maHoSoVuViec, clientsRef, tenNhanHieu) ======
        if (searchText) {
            const raw = String(searchText).trim();
            const tokens = raw.split(/\s+/).filter(Boolean);
            const normalizedSearch = raw.replace(/-/g, "");

            if (tokens.length <= 1) {
                whereCondition[Op.or] = [
                    { "$DonDangKy.soDon$": { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { "$DonDangKy.maHoSoVuViec$": { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { "$DonDangKy.clientsRef$": { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { "$nhanHieu.tenNhanHieu$": { [Op.like]: `%${raw}%` } },
                    { "$donTach.maDonDangKyGoc$": { [Op.like]: `%${raw}%` } },
                    { "$donTach->donGoc.soDon$": { [Op.like]: `%${raw}%` } },
                ];
            } else {
                whereCondition[Op.and] = whereCondition[Op.and] || [];
                tokens.forEach((tok) => {
                    const normTok = tok.replace(/-/g, "");
                    whereCondition[Op.and].push({
                        [Op.or]: [
                            { "$DonDangKy.soDon$": { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normTok}%'`),
                            { "$DonDangKy.maHoSoVuViec$": { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normTok}%'`),
                            { "$DonDangKy.clientsRef$": { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normTok}%'`),
                            { "$nhanHieu.tenNhanHieu$": { [Op.like]: `%${tok}%` } },
                            { "$donTach.maDonDangKyGoc$": { [Op.like]: `%${tok}%` } },
                            { "$donTach->donGoc.soDon$": { [Op.like]: `%${tok}%` } },
                        ],
                    });
                });
            }
        }

        // ====== Lọc theo ngày (selectedField) ======
        if (selectedField && fromDate && toDate) {
            whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
        }

        // ====== Lọc theo hạn trả lời ======
        if (hanTraLoiFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null,
                to = null;

            switch (hanTraLoiFilter) {
                case "<3":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 3);
                    break;
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) whereCondition.hanTraLoi = { [Op.between]: [from, to] };
            else if (to) whereCondition.hanTraLoi = { [Op.lt]: to };
        }

        // ====== Lọc theo hạn xử lý ======
        if (hanXuLyFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null,
                to = null;

            switch (hanXuLyFilter) {
                case "<3":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 3);
                    break;
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) whereCondition.hanXuLy = { [Op.between]: [from, to] };
            else if (to) whereCondition.hanXuLy = { [Op.lt]: to };
        }

        // ====== Bổ sung field liên quan tài liệu chưa nộp ======
        if (fields.includes("trangThaiHoanThienHoSoTaiLieu")) {
            if (!fields.includes("taiLieuChuaNop")) fields.push("taiLieuChuaNop");
            if (!fields.includes("ngayHoanThanhHoSoTaiLieu_DuKien"))
                fields.push("ngayHoanThanhHoSoTaiLieu_DuKien");
        }

        if (!fields.includes("hanXuLy")) fields.push("hanXuLy");

        // ====== ORDER ======
        const order = [];
        if (sortByHanTraLoi) {
            order.push([Sequelize.literal("hanTraLoi IS NULL"), "ASC"]);
            order.push(["hanTraLoi", "ASC"]);
        }
        if (sortByHanXuLy) {
            order.push([Sequelize.literal("hanXuLy IS NULL"), "ASC"]);
            order.push(["hanXuLy", "ASC"]);
        }
        if (!sortByHanTraLoi && !sortByHanXuLy) {
            order.push([
                Sequelize.literal("CASE WHEN COALESCE(`DonDangKy`.`donGoc`, 0) = 1 THEN 1 ELSE 0 END"),
                "ASC",
            ]);
            order.push(["updatedAt", "DESC"], ["createdAt", "DESC"]);
        }

        // ====== Query chính ======
        const { count: totalItems, rows: applications } = await DonDangKy.findAndCountAll({
            where: whereCondition,
            distinct: true,
            col: "maDonDangKy",
            include: [
                {
                    model: DonDK_SPDV,
                    where:
                        maSPDVList && maSPDVList.length > 0
                            ? { maSPDV: { [Op.in]: maSPDVList } }
                            : undefined,
                    required: maSPDVList && maSPDVList.length > 0,
                    attributes: ["maSPDV"],
                },
                {
                    model: TaiLieu,
                    where: { trangThai: "Chưa nộp" },
                    required: false,
                    as: "taiLieuChuaNop",
                    attributes: ["tenTaiLieu"],
                },
                {
                    model: NhanHieu,
                    as: "nhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                    required: !!effectiveBrandName,
                    where: buildTokensSearch(effectiveBrandName, "tenNhanHieu"),
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHang",
                    attributes: ["tenKhachHang", "maKhachHang"],
                    required: !!effectiveCustomerName,
                    where: buildCustomerSearch(effectiveCustomerName),
                },
                {
                    model: DoiTac,
                    as: "doitac",
                    attributes: ["tenDoiTac", "maDoiTac"],
                    required: !!effectivePartnerName,
                    where: buildPartnerSearch(effectivePartnerName),
                },
                // ====== include thêm thông tin ĐƠN TÁCH + ĐƠN GỐC ======
                {
                    model: DonTachNH_VN,
                    as: "donTach",
                    required: false,
                    attributes: [
                        "id",
                        "soDon",
                        "maDonDangKy",
                        "maDonDangKyGoc",
                        "dsNhomSPDV",
                        "ngayYeuCau",
                        "lanTachDon",
                        "ngayGhiNhanTachDon",
                        "ndTachDon",
                        "moTa",
                    ],
                    include: [
                        {
                            model: DonDangKy,
                            as: "donGoc",
                            required: false,
                            attributes: ["maDonDangKy", "soDon", "ngayNopDon", "maHoSo", "maHoSoVuViec", "trangThaiDon", "loaiDon", "donGoc"],
                        },
                    ],
                },
            ],
            subQuery: false,
            limit: pageSize,
            offset,
            order,
        });

        if (!applications.length) {
            return res.status(200).json({
                data: [],
                pagination: {
                    totalItems: 0,
                    totalPages: 0,
                    pageIndex: Number(pageIndex),
                    pageSize: Number(pageSize),
                },
            });
        }

        const maDonList = applications.map((a) => a.maDonDangKy);
        const pendingMap = await getDonPendingBienDongMap(maDonList);

        // ====== Map kết quả ======
        const fieldMap = {
            maDonDangKy: (app) => app.maDonDangKy,
            loaiDon: (app) => app.loaiDon,
            maHoSoVuViec: (app) => app.maHoSoVuViec,
            soDon: (app) => app.soDon,
            tenNhanHieu: (app) => app.nhanHieu?.tenNhanHieu || null,
            tenKhachHang: (app) => app.khachHang?.tenKhachHang || null,
            tenDoiTac: (app) => app.doitac?.tenDoiTac || null,
            tinhTrangDon: (app) => app.trangThaiDon,
            trangThaiVuViec: (app) => app.trangThaiVuViec,
            ngayNopDon: (app) => app.ngayNopDon,
            ngayHoanThanhHoSoTaiLieu: (app) => app.ngayHoanThanhHoSoTaiLieu,
            ngayKQThamDinhHinhThuc: (app) => app.ngayKQThamDinhHinhThuc,
            ngayCongBoDon: (app) => app.ngayCongBoDon,
            ngayKQThamDinhND: (app) => app.ngayKQThamDinhND,
            ngayTraLoiKQThamDinhND: (app) => app.ngayTraLoiKQThamDinhND,
            ngayThongBaoCapBang: (app) => app.ngayThongBaoCapBang,
            hanNopPhiCapBang: (app) => app.hanNopPhiCapBang,
            ngayNopPhiCapBang: (app) => app.ngayNopPhiCapBang,
            ngayNhanBang: (app) => app.ngayNhanBang,
            soBang: (app) => app.soBang,
            ngayCapBang: (app) => app.ngayCapBang,
            ngayHetHanBang: (app) => app.ngayHetHanBang,
            ngayGuiBangChoKhachHang: (app) => app.ngayGuiBangChoKhachHang,
            trangThaiHoanThienHoSoTaiLieu: (app) => {
                if (app.ngayHoanThanhHoSoTaiLieu) return "Hoàn thành";
                return app.trangThaiHoanThienHoSoTaiLieu || "Chưa hoàn thành";
            },
            ngayHoanThanhHoSoTaiLieu_DuKien: (app) => app.ngayHoanThanhHoSoTaiLieu_DuKien,
            taiLieuChuaNop: (app) =>
                app.taiLieuChuaNop?.map((tl) => ({ tenTaiLieu: tl.tenTaiLieu })) || [],
            dsSPDV: (app) => app.DonDK_SPDVs?.map((sp) => ({ maSPDV: sp.maSPDV })) || [],
            hanXuLy: (app) => app.hanXuLy,
            hanTraLoi: (app) => app.hanTraLoi,
            linkAnh: (app) => app.nhanHieu?.linkAnh || null,
            donGoc: (app) => app.donGoc,

            // ====== Các field lấy từ DonTachNH_VN (donTach) & Đơn gốc ======
            maDonDangKyGoc: (app) => app.donTach?.maDonDangKyGoc || null,
            soDonGoc: (app) => app.donTach?.donGoc?.soDon || null,
            ngayNopDonGoc: (app) => app.donTach?.donGoc?.ngayNopDon || null,
            dsNhomSPDV: (app) => app.donTach?.dsNhomSPDV || null,
            ngayYeuCau: (app) => app.donTach?.ngayYeuCau || null,
            lanTachDon: (app) => app.donTach?.lanTachDon || null,
            lanSuaDoi: (app) => app.donTach?.lanTachDon || null,
            ngayGhiNhanTachDon: (app) => app.donTach?.ngayGhiNhanTachDon || null,
            ngayGhiNhanSuaDoi: (app) => app.donTach?.ngayGhiNhanTachDon || null,
            ndTachDon: (app) => app.donTach?.ndTachDon || null,
            moTa: (app) => app.donTach?.moTa || null,
        };

        const result = applications.map((app) => {
            const row = {};
            fields.forEach((field) => {
                if (fieldMap[field]) row[field] = fieldMap[field](app);
            });
            row.maDonDangKyGoc = app.donTach?.maDonDangKyGoc || null;
            row.soDonGoc = app.donTach?.donGoc?.soDon || null;
            row.ngayNopDonGoc = app.donTach?.donGoc?.ngayNopDon || null;
            row.dsNhomSPDV = app.donTach?.dsNhomSPDV || null;
            row.donCha = app.donTach?.donGoc || null;

            const bienDong = pendingMap.get(app.maDonDangKy) || {
                dangSuaDoi: false,
                dangChuyenQuyen: false,
                trangThaiBienDong: null,
                dsBienDongChoDuyet: [],
            };
            row.dangSuaDoi = bienDong.dangSuaDoi;
            row.dangChuyenQuyen = bienDong.dangChuyenQuyen;
            row.trangThaiBienDong = bienDong.trangThaiBienDong;
            row.dsBienDongChoDuyet = bienDong.dsBienDongChoDuyet;
            return row;
        });

        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize),
            },
        });
    } catch (error) {
        console.error("Lỗi getAllApplicationTD_VN:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllApplicationTD_KH = async (req, res) => {
    try {
        const {
            maSPDVList,
            maNhanHieu,
            trangThaiDon,
            searchText,
            fields = [],
            filterCondition = {},
            customerName,
            partnerName,
            brandName,
            pageIndex = 1,
            pageSize = 20,
        } = req.body || {};

        if (!fields.includes("maDonDangKy")) fields.push("maDonDangKy");
        if (!fields.includes("donGoc")) fields.push("donGoc");
        if (!fields.includes("loaiDon")) fields.push("loaiDon");
        if (!fields.includes("maDonDangKyGoc")) fields.push("maDonDangKyGoc");
        if (!fields.includes("soDonGoc")) fields.push("soDonGoc");
        if (!fields.includes("ngayNopDonGoc")) fields.push("ngayNopDonGoc");

        const offset = (pageIndex - 1) * pageSize;
        const {
            selectedField,
            fromDate,
            toDate,
            hanXuLyFilter,
            hanTraLoiFilter,
            sortByHanXuLy,
            sortByHanTraLoi,
        } = filterCondition;

        const whereCondition = { loaiDon: 3 };

        if (maNhanHieu) whereCondition.maNhanHieu = maNhanHieu;
        if (trangThaiDon) whereCondition.trangThaiDon = trangThaiDon;

        // Tìm kiếm
        if (searchText) {
            const cleanText = searchText.replace(/-/g, "");
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(soDon, '-', '') LIKE '%${cleanText}%'`),
                { maHoSo: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(maHoSo, '-', '') LIKE '%${cleanText}%'`),
            ];
        }

        // Lọc theo trường ngày
        if (selectedField && fromDate && toDate) {
            whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
        }

        const excludeClosedCondition = { trangThaiVuViec: { [Op.ne]: "5" } };

        // Lọc hạn trả lời
        if (hanTraLoiFilter) {
            Object.assign(whereCondition, excludeClosedCondition);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null,
                to = null;

            switch (hanTraLoiFilter) {
                case "<3":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 3);
                    break;
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) whereCondition.hanTraLoi = { [Op.between]: [from, to] };
            else if (to) whereCondition.hanTraLoi = { [Op.lt]: to };
        }

        // Lọc hạn xử lý
        if (hanXuLyFilter) {
            Object.assign(whereCondition, excludeClosedCondition);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null,
                to = null;

            switch (hanXuLyFilter) {
                case "<3":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 3);
                    break;
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) whereCondition.hanXuLy = { [Op.between]: [from, to] };
            else if (to) whereCondition.hanXuLy = { [Op.lt]: to };
        }

        // Sắp xếp
        const order = [];
        if (sortByHanTraLoi) {
            order.push([
                Sequelize.literal("CASE WHEN `DonDangKyNhanHieu_KH`.`trangThaiVuViec` = '5' THEN 1 ELSE 0 END"),
                "ASC",
            ]);
            order.push([Sequelize.col("DonDangKyNhanHieu_KH.hanTraLoi"), "ASC"]);
        }
        if (sortByHanXuLy) {
            order.push([
                Sequelize.literal("CASE WHEN `DonDangKyNhanHieu_KH`.`trangThaiVuViec` = '5' THEN 1 ELSE 0 END"),
                "ASC",
            ]);
            order.push([Sequelize.col("DonDangKyNhanHieu_KH.hanXuLy"), "ASC"]);
        }

        // Bổ sung field cần thiết
        if (fields.includes("trangThaiHoanThienHoSoTaiLieu")) {
            if (!fields.includes("taiLieuChuaNop")) fields.push("taiLieuChuaNop");
            if (!fields.includes("ngayHoanThanhHoSoTaiLieu_DuKien"))
                fields.push("ngayHoanThanhHoSoTaiLieu_DuKien");
        }
        if (!fields.includes("hanXuLy")) fields.push("hanXuLy");

        const totalItems = await DonDangKyNhanHieu_KH.count({ where: whereCondition });

        const applications = await DonDangKyNhanHieu_KH.findAll({
            where: whereCondition,
            include: [
                {
                    model: DonDK_SPDV_KH,
                    as: "DonDK_SPDV_KH",
                    where:
                        maSPDVList && maSPDVList.length > 0
                            ? { maSPDV: { [Op.in]: maSPDVList } }
                            : undefined,
                    required: maSPDVList && maSPDVList.length > 0,
                    attributes: ["maSPDV"],
                },
                {
                    model: TaiLieu_KH,
                    where: { trangThai: "Chưa nộp" },
                    required: false,
                    as: "taiLieuChuaNop_KH",
                    attributes: ["tenTaiLieu"],
                },
                {
                    model: NhanHieu,
                    as: "nhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                    required: !!brandName,
                    where: brandName
                        ? { tenNhanHieu: { [Op.like]: `%${brandName}%` } }
                        : undefined,
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHang",
                    attributes: ["tenKhachHang"],
                    required: !!customerName,
                    where: customerName
                        ? { tenKhachHang: { [Op.like]: `%${customerName}%` } }
                        : undefined,
                },
                {
                    model: DoiTac,
                    as: "doitac",
                    attributes: ["tenDoiTac"],
                    required: !!partnerName,
                    where: partnerName
                        ? { tenDoiTac: { [Op.like]: `%${partnerName}%` } }
                        : undefined,
                },
                // include thêm thông tin ĐƠN TÁCH KH + ĐƠN GỐC KH
                {
                    model: DonTachNH_KH,
                    as: "donTach_KH",
                    required: false,
                    attributes: [
                        "id",
                        "soDon",
                        "maDonDangKy",
                        "maDonDangKyGoc",
                        "dsNhomSPDV",
                        "ngayYeuCau",
                        "lanTachDon",
                        "ngayGhiNhanTachDon",
                        "ndTachDon",
                        "moTa",
                    ],
                    include: [
                        {
                            model: DonDangKyNhanHieu_KH,
                            as: "donGoc_KH",
                            required: false,
                            attributes: ["maDonDangKy", "soDon", "ngayNopDon", "maHoSo", "maHoSoVuViec", "trangThaiDon"],
                        },
                    ],
                },
            ],
            limit: pageSize,
            offset,
            order: order && order.length > 0
                ? order
                : [
                    [Sequelize.literal("CASE WHEN COALESCE(`DonDangKyNhanHieu_KH`.`donGoc`, 0) = 1 THEN 1 ELSE 0 END"), "ASC"],
                    ["updatedAt", "DESC"],
                    ["createdAt", "DESC"],
                ],
        });

        if (!applications.length) {
            return res.status(200).json({
                data: [],
                pagination: {
                    totalItems: 0,
                    totalPages: 0,
                    pageIndex: Number(pageIndex),
                    pageSize: Number(pageSize),
                },
            });
        }

        const fieldMap = {
            maDonDangKy: (app) => app.maDonDangKy,
            loaiDon: (app) => app.loaiDon,
            maHoSoVuViec: (app) => app.maHoSoVuViec,
            soDon: (app) => app.soDon,
            tenNhanHieu: (app) => app.nhanHieu?.tenNhanHieu || null,
            tenKhachHang: (app) => app.khachHang?.tenKhachHang || null,
            tenDoiTac: (app) => app.doitac?.tenDoiTac || null,
            trangThaiDon: (app) => app.trangThaiDon,
            ngayNopDon: (app) => app.ngayNopDon,
            ngayHoanThanhHoSoTaiLieu: (app) => app.ngayHoanThanhHoSoTaiLieu,
            ngayKQThamDinhHinhThuc: (app) => app.ngayKQThamDinhHinhThuc,
            ngayCongBoDon: (app) => app.ngayCongBoDon,
            ngayKQThamDinhND: (app) => app.ngayKQThamDinhND,
            ngayTraLoiKQThamDinhND: (app) => app.ngayTraLoiKQThamDinhND,
            ngayThongBaoCapBang: (app) => app.ngayThongBaoCapBang,
            hanNopPhiCapBang: (app) => app.hanNopPhiCapBang,
            ngayNopPhiCapBang: (app) => app.ngayNopPhiCapBang,
            ngayNhanBang: (app) => app.ngayNhanBang,
            soBang: (app) => app.soBang,
            ngayCapBang: (app) => app.ngayCapBang,
            ngayHetHanBang: (app) => app.ngayHetHanBang,
            ngayGuiBangChoKhachHang: (app) => app.ngayGuiBangChoKhachHang,
            trangThaiHoanThienHoSoTaiLieu: (app) => {
                if (app.ngayHoanThanhHoSoTaiLieu) return "Hoàn thành";
                return app.trangThaiHoanThienHoSoTaiLieu || "Chưa hoàn thành";
            },
            ngayHoanThanhHoSoTaiLieu_DuKien: (app) => app.ngayHoanThanhHoSoTaiLieu_DuKien,
            taiLieuChuaNop: (app) =>
                app.taiLieuChuaNop_KH?.map((tl) => ({ tenTaiLieu: tl.tenTaiLieu })) || [],
            dsSPDV: (app) =>
                app.DonDK_SPDV_KH?.map((sp) => ({ maSPDV: sp.maSPDV })) || [],
            hanXuLy: (app) => (app.trangThaiVuViec === "5" ? null : app.hanXuLy),
            hanTraLoi: (app) => (app.trangThaiVuViec === "5" ? null : app.hanTraLoi),
            trangThaiVuViec: (app) => app.trangThaiVuViec,
            linkAnh: (app) => app.nhanHieu?.linkAnh || null,
            donGoc: (app) => app.donGoc,

            // Các field lấy từ DonTachNH_KH (donTach_KH) & Đơn gốc
            maDonDangKyGoc: (app) => app.donTach_KH?.maDonDangKyGoc || null,
            soDonGoc: (app) => app.donTach_KH?.donGoc_KH?.soDon || null,
            ngayNopDonGoc: (app) => app.donTach_KH?.donGoc_KH?.ngayNopDon || null,
            dsNhomSPDV: (app) => app.donTach_KH?.dsNhomSPDV || null,
            ngayYeuCau: (app) => app.donTach_KH?.ngayYeuCau || null,
            lanTachDon: (app) => app.donTach_KH?.lanTachDon || null,
            lanSuaDoi: (app) => app.donTach_KH?.lanTachDon || null,
            ngayGhiNhanTachDon: (app) => app.donTach_KH?.ngayGhiNhanTachDon || null,
            ngayGhiNhanSuaDoi: (app) => app.donTach_KH?.ngayGhiNhanTachDon || null,
            ndTachDon: (app) => app.donTach_KH?.ndTachDon || null,
            moTa: (app) => app.donTach_KH?.moTa || null,
        };

        const result = applications.map((app) => {
            const row = {};
            fields.forEach((field) => {
                if (fieldMap[field]) {
                    row[field] = fieldMap[field](app);
                }
            });
            row.maDonDangKyGoc = app.donTach_KH?.maDonDangKyGoc || null;
            row.soDonGoc = app.donTach_KH?.donGoc_KH?.soDon || null;
            row.ngayNopDonGoc = app.donTach_KH?.donGoc_KH?.ngayNopDon || null;
            row.dsNhomSPDV = app.donTach_KH?.dsNhomSPDV || null;
            return row;
        });

        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize),
            },
        });
    } catch (error) {
        console.error("Lỗi getAllApplicationTD_KH:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getApplicationTD_VNDetail = async (req, res) => {
    try {
        const { id, maDonDangKy, maDonDangKyGoc } = req.body || {};
        const whereCondition = {};
        if (id) whereCondition.id = id;
        else if (maDonDangKy) {
            whereCondition[Op.or] = [{ maDonDangKy }, { maDonDangKyGoc: maDonDangKy }];
        } else if (maDonDangKyGoc) {
            whereCondition.maDonDangKyGoc = maDonDangKyGoc;
        } else {
            return res.status(400).json({ message: "Thiếu ID hoặc mã đơn đăng ký của hồ sơ tách đơn!" });
        }

        const record = await DonTachNH_VN.findOne({
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
                        { model: DonDK_SPDV },
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
                        { model: DonDK_SPDV },
                    ],
                },
            ],
            order: [["id", "DESC"]],
        });

        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ tách đơn!" });
        }

        return res.status(200).json({
            ...record.toJSON(),
            soDonGoc: record.donGoc?.soDon || null,
            ngayNopDonGoc: record.donGoc?.ngayNopDon || null,
        });
    } catch (error) {
        console.error("❌ Lỗi lấy chi tiết đơn tách:", error);
        return res.status(500).json({ message: error.message });
    }
};
