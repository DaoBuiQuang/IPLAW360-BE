import { Op } from "sequelize";
import { DoiTac } from "../models/doiTacModel.js";
import { QuocGia } from "../models/quocGiaModel.js";
import { sendGenericNotification } from "../utils/notificationHelper.js";
import { Sequelize } from "sequelize";
import { GCN_NH } from "../models/GCN_NHModel.js";
import { NhanHieu } from "../models/nhanHieuModel.js";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";
import { GCN_NH_KH } from "../models/GCN_NH_KHModel.js";
import { VuViec } from "../models/vuViecModel.js";
import { GiayUyQuyen } from "../models/GiayUyQuyenModel.js";
import { DonDangKy } from "../models/donDangKyModel.js";
import { DonDangKyNhanHieu_KH } from "../models/KH/donDangKyNhanHieu_KHModel.js";

// Helper for token-based case-insensitive multi-word search
const buildTokensSearchCondition = (value, fieldName) => {
    if (!value) return undefined;
    const tokens = String(value).trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return undefined;
    if (tokens.length === 1) return { [fieldName]: { [Op.like]: `%${tokens[0]}%` } };
    return {
        [Op.and]: tokens.map(tok => ({ [fieldName]: { [Op.like]: `%${tok}%` } }))
    };
};

const applySoBangSearch = (whereCondition, soBang) => {
    if (!soBang) return;
    const tokens = String(soBang).trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
        whereCondition[Op.or] = [
            { soBang: { [Op.like]: `%${tokens[0]}%` } },
            { soDon: { [Op.like]: `%${tokens[0]}%` } },
            { maHoSo: { [Op.like]: `%${tokens[0]}%` } },
        ];
    } else if (tokens.length > 1) {
        whereCondition[Op.and] = whereCondition[Op.and] || [];
        tokens.forEach(tok => {
            whereCondition[Op.and].push({
                [Op.or]: [
                    { soBang: { [Op.like]: `%${tok}%` } },
                    { soDon: { [Op.like]: `%${tok}%` } },
                    { maHoSo: { [Op.like]: `%${tok}%` } },
                ]
            });
        });
    }
};

// Helper resolve maHoSo if missing or equal to soBang
const resolveMaHoSoForGCNList = async (items, isCam = false) => {
    const needLookup = items.filter(g => (!g.maHoSo || g.maHoSo === g.soBang) && (g.maDonDangKy || g.soDon));
    const donMapByMaDon = new Map();
    const donMapBySoDon = new Map();

    if (needLookup.length > 0) {
        const maDonList = [...new Set(needLookup.map(g => g.maDonDangKy).filter(Boolean))];
        const soDonList = [...new Set(needLookup.map(g => g.soDon).filter(Boolean))];
        const orConditions = [];
        if (maDonList.length) orConditions.push({ maDonDangKy: { [Op.in]: maDonList } });
        if (soDonList.length) orConditions.push({ soDon: { [Op.in]: soDonList } });

        if (orConditions.length > 0) {
            const Model = isCam ? DonDangKyNhanHieu_KH : DonDangKy;
            const dons = await Model.findAll({
                where: { [Op.or]: orConditions },
                attributes: ["maDonDangKy", "soDon", "maHoSo", "maHoSoVuViec"],
                raw: true,
            }).catch(() => []);

            for (const d of dons) {
                const code = d.maHoSo || d.maHoSoVuViec;
                if (d.maDonDangKy && code) donMapByMaDon.set(d.maDonDangKy, code);
                if (d.soDon && code) donMapBySoDon.set(d.soDon, code);
            }
        }
    }

    return { donMapByMaDon, donMapBySoDon };
};

export const getGCN_NHs = async (req, res) => {
    try {
        const { soBang, pageIndex = 1, pageSize = 20, customerName,
            partnerName,
            brandName, } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        const whereCondition = {};
        applySoBangSearch(whereCondition, soBang);
        whereCondition.bangGoc = { [Op.ne]: 1 };

        const totalItems = await GCN_NH.count({ where: whereCondition });

        const GCN_NHs = await GCN_NH.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "maDonDangKy",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "hanGiaHan",
                "ngayHetHanBang",
                "anhBang",
                "clientsRef"
            ],
            include: [
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                    required: !!brandName,
                    where: buildTokensSearchCondition(brandName, "tenNhanHieu"),
                },
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                    required: !!customerName,
                    where: buildTokensSearchCondition(customerName, "tenKhachHang"),
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac"],
                    required: !!partnerName,
                    where: buildTokensSearchCondition(partnerName, "tenDoiTac"),
                },
            ],
            limit: pageSize,
            offset: offset,
        });

        if (!GCN_NHs.length) {
            return res.status(404).json({ message: "Không có bằng nào phù hợp" });
        }

        const { donMapByMaDon, donMapBySoDon } = await resolveMaHoSoForGCNList(GCN_NHs, false);

        const result = GCN_NHs.map(gcn_nh => {
            let actualMaHoSo = gcn_nh.maHoSo;
            if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
                actualMaHoSo = (gcn_nh.maDonDangKy && donMapByMaDon.get(gcn_nh.maDonDangKy))
                    || (gcn_nh.soDon && donMapBySoDon.get(gcn_nh.soDon))
                    || gcn_nh.maHoSo
                    || "";
            }
            return {
                id: gcn_nh.id,
                soBang: gcn_nh.soBang,
                soDon: gcn_nh.soDon,
                maHoSo: actualMaHoSo,
                tenKhachHang: gcn_nh.KhachHangCuoi?.tenKhachHang || "",
                tenDoiTac: gcn_nh.DoiTac?.tenDoiTac || "",
                tenNhanHieu: gcn_nh.NhanHieu?.tenNhanHieu || "",
                linkAnh: gcn_nh.NhanHieu?.linkAnh || "",
                anhBang: gcn_nh.anhBang || null,
                linkScan: gcn_nh.anhBang || null,
                clientRef: gcn_nh.clientsRef || gcn_nh.clientRef || "",
                ngayNopDon: gcn_nh.ngayNopDon,
                ngayCapBang: gcn_nh.ngayCapBang,
                ghiChu: gcn_nh.ghiChu,
                dsNhomSPDV: gcn_nh.dsNhomSPDV,
                hanGiaHan: gcn_nh.hanGiaHan,
                ngayHetHanBang: gcn_nh.ngayHetHanBang
            };
        });

        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGCN_NHs_SD = async (req, res) => {
    try {
        const { soBang, pageIndex = 1, pageSize = 20, customerName, partnerName, brandName } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        const whereCondition = { loaiBang: 2 };
        applySoBangSearch(whereCondition, soBang);
        whereCondition.bangGoc = { [Op.ne]: 1 };

        const totalItems = await GCN_NH.count({ where: whereCondition });

        const GCN_NHs = await GCN_NH.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "maDonDangKy",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "hanGiaHan",
                "ngayHetHanBang",
                "anhBang",
                "clientsRef"
            ],
            include: [
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                    required: !!brandName,
                    where: buildTokensSearchCondition(brandName, "tenNhanHieu"),
                },
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                    required: !!customerName,
                    where: buildTokensSearchCondition(customerName, "tenKhachHang"),
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac"],
                    required: !!partnerName,
                    where: buildTokensSearchCondition(partnerName, "tenDoiTac"),
                },
            ],
            limit: pageSize,
            offset: offset,
        });

        if (!GCN_NHs.length) {
            return res.status(404).json({ message: "Không có bằng nào phù hợp" });
        }

        const { donMapByMaDon, donMapBySoDon } = await resolveMaHoSoForGCNList(GCN_NHs, false);

        const result = GCN_NHs.map(gcn_nh => {
            let actualMaHoSo = gcn_nh.maHoSo;
            if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
                actualMaHoSo = (gcn_nh.maDonDangKy && donMapByMaDon.get(gcn_nh.maDonDangKy))
                    || (gcn_nh.soDon && donMapBySoDon.get(gcn_nh.soDon))
                    || gcn_nh.maHoSo
                    || "";
            }
            return {
                id: gcn_nh.id,
                soBang: gcn_nh.soBang,
                soDon: gcn_nh.soDon,
                maHoSo: actualMaHoSo,
                tenKhachHang: gcn_nh.KhachHangCuoi?.tenKhachHang || "",
                tenDoiTac: gcn_nh.DoiTac?.tenDoiTac || "",
                tenNhanHieu: gcn_nh.NhanHieu?.tenNhanHieu || "",
                linkAnh: gcn_nh.NhanHieu?.linkAnh || "",
                anhBang: gcn_nh.anhBang || null,
                linkScan: gcn_nh.anhBang || null,
                clientRef: gcn_nh.clientsRef || gcn_nh.clientRef || "",
                ngayNopDon: gcn_nh.ngayNopDon,
                ngayCapBang: gcn_nh.ngayCapBang,
                ghiChu: gcn_nh.ghiChu,
                dsNhomSPDV: gcn_nh.dsNhomSPDV,
                hanGiaHan: gcn_nh.hanGiaHan,
                ngayHetHanBang: gcn_nh.ngayHetHanBang
            };
        });

        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGCN_NHsCAM = async (req, res) => {
    try {
        const { soBang, pageIndex = 1, pageSize = 20, customerName,
            partnerName,
            brandName, } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        const whereCondition = {}; // lọc theo quốc gia
        applySoBangSearch(whereCondition, soBang);
        whereCondition.bangGoc = { [Op.ne]: 1 };
        const totalItems = await GCN_NH_KH.count({ where: whereCondition });

        const GCN_NHs = await GCN_NH_KH.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "maDonDangKy",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "hanNopTuyenThe",
                "hanGiaHan",
                "ngayHetHanBang",
                "anhBang",
                "clientsRef"
            ],
            include: [
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                    required: !!brandName,
                    where: buildTokensSearchCondition(brandName, "tenNhanHieu"),
                },
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                    required: !!customerName,
                    where: buildTokensSearchCondition(customerName, "tenKhachHang"),
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac"],
                    required: !!partnerName,
                    where: buildTokensSearchCondition(partnerName, "tenDoiTac"),
                },
            ],
            limit: pageSize,
            offset: offset,
        });

        if (!GCN_NHs.length) {
            return res.status(404).json({ message: "Không có bằng nào phù hợp (Campuchia)" });
        }

        const { donMapByMaDon, donMapBySoDon } = await resolveMaHoSoForGCNList(GCN_NHs, true);

        const result = GCN_NHs.map(gcn_nh => {
            let actualMaHoSo = gcn_nh.maHoSo;
            if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
                actualMaHoSo = (gcn_nh.maDonDangKy && donMapByMaDon.get(gcn_nh.maDonDangKy))
                    || (gcn_nh.soDon && donMapBySoDon.get(gcn_nh.soDon))
                    || gcn_nh.maHoSo
                    || "";
            }
            return {
                id: gcn_nh.id,
                soBang: gcn_nh.soBang,
                soDon: gcn_nh.soDon,
                maHoSo: actualMaHoSo,
                tenKhachHang: gcn_nh.KhachHangCuoi?.tenKhachHang || "",
                tenDoiTac: gcn_nh.DoiTac?.tenDoiTac || "",
                tenNhanHieu: gcn_nh.NhanHieu?.tenNhanHieu || "",
                linkAnh: gcn_nh.NhanHieu?.linkAnh || "",
                anhBang: gcn_nh.anhBang || null,
                linkScan: gcn_nh.anhBang || null,
                clientRef: gcn_nh.clientsRef || gcn_nh.clientRef || "",
                ngayNopDon: gcn_nh.ngayNopDon,
                ngayCapBang: gcn_nh.ngayCapBang,
                ghiChu: gcn_nh.ghiChu,
                dsNhomSPDV: gcn_nh.dsNhomSPDV,
                hanNopTuyenThe: gcn_nh.hanNopTuyenThe,
                hanGiaHan: gcn_nh.hanGiaHan,
                ngayHetHanBang: gcn_nh.ngayHetHanBang
            };
        });

        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGCN_NHsCAM_SD = async (req, res) => {
    try {
        const { soBang, pageIndex = 1, pageSize = 20, customerName, partnerName, brandName } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        const whereCondition = { loaiBang: 2 }; // lọc theo quốc gia
        applySoBangSearch(whereCondition, soBang);
        whereCondition.bangGoc = { [Op.ne]: 1 };
        const totalItems = await GCN_NH_KH.count({ where: whereCondition });

        const GCN_NHs = await GCN_NH_KH.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "maDonDangKy",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "hanNopTuyenThe",
                "hanGiaHan",
                "ngayHetHanBang",
                "anhBang",
                "clientsRef"
            ],
            include: [
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                    required: !!brandName,
                    where: buildTokensSearchCondition(brandName, "tenNhanHieu"),
                },
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang"],
                    required: !!customerName,
                    where: buildTokensSearchCondition(customerName, "tenKhachHang"),
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac"],
                    required: !!partnerName,
                    where: buildTokensSearchCondition(partnerName, "tenDoiTac"),
                },
            ],
            limit: pageSize,
            offset: offset,
        });

        if (!GCN_NHs.length) {
            return res.status(404).json({ message: "Không có bằng nào phù hợp (Campuchia)" });
        }

        const { donMapByMaDon, donMapBySoDon } = await resolveMaHoSoForGCNList(GCN_NHs, true);

        const result = GCN_NHs.map(gcn_nh => {
            let actualMaHoSo = gcn_nh.maHoSo;
            if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
                actualMaHoSo = (gcn_nh.maDonDangKy && donMapByMaDon.get(gcn_nh.maDonDangKy))
                    || (gcn_nh.soDon && donMapBySoDon.get(gcn_nh.soDon))
                    || gcn_nh.maHoSo
                    || "";
            }
            return {
                id: gcn_nh.id,
                soBang: gcn_nh.soBang,
                soDon: gcn_nh.soDon,
                maHoSo: actualMaHoSo,
                tenKhachHang: gcn_nh.KhachHangCuoi?.tenKhachHang || "",
                tenDoiTac: gcn_nh.DoiTac?.tenDoiTac || "",
                tenNhanHieu: gcn_nh.NhanHieu?.tenNhanHieu || "",
                linkAnh: gcn_nh.NhanHieu?.linkAnh || "",
                anhBang: gcn_nh.anhBang || null,
                linkScan: gcn_nh.anhBang || null,
                clientRef: gcn_nh.clientsRef || gcn_nh.clientRef || "",
                ngayNopDon: gcn_nh.ngayNopDon,
                ngayCapBang: gcn_nh.ngayCapBang,
                ghiChu: gcn_nh.ghiChu,
                dsNhomSPDV: gcn_nh.dsNhomSPDV,
                hanNopTuyenThe: gcn_nh.hanNopTuyenThe,
                hanGiaHan: gcn_nh.hanGiaHan,
                ngayHetHanBang: gcn_nh.ngayHetHanBang
            };
        });

        res.status(200).json({
            data: result,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGCN_NHDetail = async (req, res) => {
    try {
        const { id } = req.body;

        const gcn_nh = await GCN_NH.findOne({
            where: { id },
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "maDonDangKy",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "chiTietNhomSPDV",
                "mauSacNH",
                "anhBang",
                "hanGiaHan",
                "idKhachHang",
                "idDoiTac",
                "maQuocGia",
                "quyetDinhSo",
                "maNhanHieu",
                "ngayHetHanBang",
                "clientsRef",
            ],
            include: [
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                },
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang", "diaChi"],
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac"],
                },
            ],
        });

        if (!gcn_nh) {
            return res.status(404).json({ message: "Không tìm thấy bằng này" });
        }

        let actualMaHoSo = gcn_nh.maHoSo;
        if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
            let don = null;
            if (gcn_nh.maDonDangKy) {
                don = await DonDangKy.findOne({
                    where: { maDonDangKy: gcn_nh.maDonDangKy },
                    attributes: ["maHoSo", "maHoSoVuViec"],
                });
            }
            if (!don && gcn_nh.soDon) {
                don = await DonDangKy.findOne({
                    where: { soDon: gcn_nh.soDon },
                    attributes: ["maHoSo", "maHoSoVuViec"],
                });
            }
            if (don && (don.maHoSo || don.maHoSoVuViec)) {
                actualMaHoSo = don.maHoSo || don.maHoSoVuViec;
                gcn_nh.update({ maHoSo: actualMaHoSo }).catch(console.error);
            }
        }

        // ✅ Lấy danh sách vụ việc theo maHoSo hoặc liên kết maDon / soDon
        const vuViecWhere = [];
        if (actualMaHoSo) {
            vuViecWhere.push({ maHoSo: actualMaHoSo });
        }
        if (gcn_nh.id) {
            vuViecWhere.push({ maDon: gcn_nh.id, tenBang: "GCN_NH_VN" });
        }
        if (gcn_nh.soDon) {
            vuViecWhere.push({ soDon: gcn_nh.soDon });
        }

        const vuViecs = vuViecWhere.length > 0 ? await VuViec.findAll({
            where: { [Op.or]: vuViecWhere },
            attributes: [
                "id",
                "maHoSo",
                "tenVuViec",
                "soDon",
                "idKhachHang",
                "ngayTaoVV",
                "deadline",
                "softDeadline",
                "soTien",
                "loaiTienTe",
                "xuatBill",
                "isMainCase",
                "maNguoiXuLy",
                "moTa",
                "trangThaiYCTT",
                "ghiChuTuChoi",
            ],
            order: [["createdAt", "DESC"]],
        }) : [];

        const uniqueVuViecs = Array.from(new Map(vuViecs.map(v => [v.id, v.toJSON()])).values());

        // ✅ Kết quả trả về gộp cả vụ việc
        const result = {
            id: gcn_nh.id,
            soBang: gcn_nh.soBang,
            soDon: gcn_nh.soDon,
            maHoSo: actualMaHoSo || gcn_nh.maHoSo || "",
            maDonDangKy: gcn_nh.maDonDangKy,
            tenKhachHang: gcn_nh.KhachHangCuoi?.tenKhachHang || "",
            diaChiKhachHang: gcn_nh.KhachHangCuoi?.diaChi || "",
            tenDoiTac: gcn_nh.DoiTac?.tenDoiTac || "",
            tenNhanHieu: gcn_nh.NhanHieu?.tenNhanHieu || "",
            linkAnh: gcn_nh.NhanHieu?.linkAnh || null,
            clientRef: gcn_nh.clientsRef || gcn_nh.clientRef || "",
            ngayNopDon: gcn_nh.ngayNopDon,
            ngayCapBang: gcn_nh.ngayCapBang,
            ghiChu: gcn_nh.ghiChu,
            dsNhomSPDV: gcn_nh.dsNhomSPDV,
            chiTietNhomSPDV: gcn_nh.chiTietNhomSPDV,
            mauSacNH: gcn_nh.mauSacNH,
            anhBang: gcn_nh.anhBang || null,
            linkScan: gcn_nh.anhBang || null,
            hanGiaHan: gcn_nh.hanGiaHan,
            idKhachHang: gcn_nh.idKhachHang,
            idDoiTac: gcn_nh.idDoiTac,
            maNhanHieu: gcn_nh.maNhanHieu,
            maQuocGia: gcn_nh.maQuocGia,
            quyetDinhSo: gcn_nh.quyetDinhSo,
            ngayHetHanBang: gcn_nh.ngayHetHanBang,
            vuViecs: uniqueVuViecs,
        };

        res.status(200).json(result);
    } catch (error) {
        console.error("Lỗi getGCN_NHDetail:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getGCN_NH_CAMDetail = async (req, res) => {
    try {
        const { id } = req.body;

        const gcn_nh = await GCN_NH_KH.findOne({
            where: { id },
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "maDonDangKy",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "chiTietNhomSPDV",
                "mauSacNH",
                "anhBang",
                "hanGiaHan",
                "hanNopTuyenThe",
                "idKhachHang",
                "idDoiTac",
                "maQuocGia",
                "quyetDinhSo",
                "maNhanHieu",
                "ngayHetHanBang",
                "clientsRef",
            ],
            include: [
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    attributes: ["tenNhanHieu", "linkAnh"],
                },
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang", "diaChi"],
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac"],
                },
            ],
        });

        if (!gcn_nh) {
            return res.status(404).json({ message: "Không tìm thấy bằng này" });
        }

        let actualMaHoSo = gcn_nh.maHoSo;
        if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
            let don = null;
            if (gcn_nh.maDonDangKy) {
                don = await DonDangKyNhanHieu_KH.findOne({
                    where: { maDonDangKy: gcn_nh.maDonDangKy },
                    attributes: ["maHoSo", "maHoSoVuViec"],
                });
            }
            if (!don && gcn_nh.soDon) {
                don = await DonDangKyNhanHieu_KH.findOne({
                    where: { soDon: gcn_nh.soDon },
                    attributes: ["maHoSo", "maHoSoVuViec"],
                });
            }
            if (don && (don.maHoSo || don.maHoSoVuViec)) {
                actualMaHoSo = don.maHoSo || don.maHoSoVuViec;
                gcn_nh.update({ maHoSo: actualMaHoSo }).catch(console.error);
            }
        }

        const vuViecWhere = [];
        if (actualMaHoSo) {
            vuViecWhere.push({ maHoSo: actualMaHoSo });
        }
        if (gcn_nh.id) {
            vuViecWhere.push({ maDon: gcn_nh.id, tenBang: "GCN_NH_KH" });
        }
        if (gcn_nh.soDon) {
            vuViecWhere.push({ soDon: gcn_nh.soDon });
        }

        const vuViecs = vuViecWhere.length > 0 ? await VuViec.findAll({
            where: { [Op.or]: vuViecWhere },
            attributes: [
                "id",
                "maHoSo",
                "tenVuViec",
                "soDon",
                "idKhachHang",
                "ngayTaoVV",
                "deadline",
                "softDeadline",
                "soTien",
                "loaiTienTe",
                "xuatBill",
                "isMainCase",
                "maNguoiXuLy",
                "moTa",
                "trangThaiYCTT",
                "ghiChuTuChoi",
            ],
            order: [["createdAt", "DESC"]],
        }) : [];

        const uniqueVuViecs = Array.from(new Map(vuViecs.map(v => [v.id, v.toJSON()])).values());

        // ✅ Kết quả trả về gộp cả vụ việc
        const result = {
            id: gcn_nh.id,
            soBang: gcn_nh.soBang,
            soDon: gcn_nh.soDon,
            maHoSo: actualMaHoSo || gcn_nh.maHoSo || "",
            maDonDangKy: gcn_nh.maDonDangKy,
            tenKhachHang: gcn_nh.KhachHangCuoi?.tenKhachHang || "",
            diaChiKhachHang: gcn_nh.KhachHangCuoi?.diaChi || "",
            tenDoiTac: gcn_nh.DoiTac?.tenDoiTac || "",
            tenNhanHieu: gcn_nh.NhanHieu?.tenNhanHieu || "",
            linkAnh: gcn_nh.NhanHieu?.linkAnh || null,
            clientRef: gcn_nh.clientsRef || gcn_nh.clientRef || "",
            ngayNopDon: gcn_nh.ngayNopDon,
            ngayCapBang: gcn_nh.ngayCapBang,
            ghiChu: gcn_nh.ghiChu,
            dsNhomSPDV: gcn_nh.dsNhomSPDV,
            chiTietNhomSPDV: gcn_nh.chiTietNhomSPDV,
            mauSacNH: gcn_nh.mauSacNH,
            anhBang: gcn_nh.anhBang || null,
            linkScan: gcn_nh.anhBang || null,
            hanGiaHan: gcn_nh.hanGiaHan,
            hanNopTuyenThe: gcn_nh.hanNopTuyenThe,
            idKhachHang: gcn_nh.idKhachHang,
            idDoiTac: gcn_nh.idDoiTac,
            maNhanHieu: gcn_nh.maNhanHieu,
            maQuocGia: gcn_nh.maQuocGia,
            quyetDinhSo: gcn_nh.quyetDinhSo,
            ngayHetHanBang: gcn_nh.ngayHetHanBang,
            vuViecs: uniqueVuViecs,
        };

        res.status(200).json(result);
    } catch (error) {
        console.error("Lỗi getGCN_NH_CAMDetail:", error);
        res.status(500).json({ message: error.message });
    }
};


export const addGCN_NH_VN = async (req, res) => {
    const transaction = await GCN_NH.sequelize.transaction(); // ✅ Khởi tạo transaction đúng cách
    try {
        const {
            soBang,
            soDon,
            idKhachHang,
            idDoiTac,
            maHoSo,
            ghiChu,
            dsNhomSPDV,
            ngayNopDon,
            ngayCapBang,
            ngayHetHanBang,
            chiTietNhomSPDV,
            mauSacNH,
            maNhanHieu,
            tenNhanHieu,
            hanGiaHanBang,
            hanNopTuyenThe,
            anhBangBase64, // Ảnh từ FE
            vuViecs,
            maNhanSuCapNhap,
            idGUQ
        } = req.body;

        // ✅ Kiểm tra đầu vào bắt buộc
        if (!soBang || !maNhanHieu) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: số bằng hoặc mã nhãn hiệu!",
            });
        }

        // ✅ Kiểm tra trùng số bằng
        const existed = await GCN_NH.findOne({ where: { soBang } });
        if (existed) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Số bằng "${soBang}" đã tồn tại trong hệ thống!`,
            });
        }

        // ✅ Kiểm tra hoặc tạo mới nhãn hiệu
        let nhanHieu = await NhanHieu.findOne({ where: { maNhanHieu } });
        if (!nhanHieu) {
            nhanHieu = await NhanHieu.create(
                {
                    maNhanHieu,
                    tenNhanHieu: tenNhanHieu || null,
                },
                { transaction }
            );
        }
        if (idGUQ) {
            const guq = await GiayUyQuyen.findByPk(idGUQ, { transaction });

            if (guq) {
                const isEmptySoDonGoc =
                    guq.soDonGoc === null ||
                    guq.soDonGoc === undefined ||
                    (typeof guq.soDonGoc === "string" && guq.soDonGoc.trim() === "");

                if (isEmptySoDonGoc && soDon) {
                    await guq.update(
                        { soDonGoc: soDon },
                        { transaction }
                    );
                }
            }
        }
        // ✅ Tạo bản ghi GCN_NH
        const newGCN = await GCN_NH.create(
            {
                soBang,
                soDon,
                maHoSo,
                ghiChu,
                dsNhomSPDV,
                ngayNopDon: ngayNopDon || null,
                ngayCapBang: ngayCapBang || null,
                ngayHetHanBang: ngayHetHanBang || null,
                chiTietNhomSPDV,
                hanGiaHanBang: hanGiaHanBang || null,
                hanNopTuyenThe: hanNopTuyenThe || null,
                maQuocGia: "VN", // quốc gia cố định
                idKhachHang: idKhachHang || null,
                idDoiTac: idDoiTac || null,
                maNhanHieu: nhanHieu.maNhanHieu,
                anhBangBase64: anhBangBase64 || null,
                mauSacNH: mauSacNH || null,
                idGUQ: idGUQ || null,
            },
            { transaction }
        );

        // ✅ Tạo các vụ việc nếu có
        if (Array.isArray(vuViecs) && vuViecs.length > 0) {
            for (const vuViec of vuViecs) {
                let ngayXuatBill = null;
                let maNguoiXuatBill = null;
                if (vuViec.xuatBill === true) {
                    ngayXuatBill = new Date();
                    maNguoiXuatBill = maNhanSuCapNhap;
                }

                await VuViec.create(
                    {
                        tenVuViec: vuViec.tenVuViec,
                        moTa: vuViec.moTa,
                        trangThai: vuViec.trangThai,
                        maHoSo,
                        maDon: newGCN.id,
                        soDon: soDon,
                        idKhachHang: idKhachHang,
                        maQuocGiaVuViec: "VN",
                        ngayTaoVV: new Date(),
                        maNguoiXuLy: vuViec.maNguoiXuLy,
                        tenBang: "GCN_NH_VN",
                        deadline: vuViec.deadline,
                        softDeadline: vuViec.softDeadline,
                        xuatBill: vuViec.xuatBill,
                        ngayXuatBill,
                        maNguoiXuatBill,
                        soTien: vuViec.soTien,
                        loaiTienTe: vuViec.loaiTienTe,
                        isMainCase: vuViec.isMainCase,
                    },
                    { transaction }
                );
            }
        }

        // ✅ Commit nếu không có lỗi
        await transaction.commit();

        return res.status(201).json({
            message: "Thêm văn bằng (GCN_NH) thành công!",
            data: newGCN,
        });
    } catch (error) {
        // ❌ Rollback khi có lỗi
        await transaction.rollback();
        console.error("❌ Lỗi khi thêm văn bằng:", error);
        res.status(500).json({
            message: "Đã xảy ra lỗi khi thêm văn bằng mới!",
            error: error.message,
        });
    }
};


export const addGCN_NH_Cam = async (req, res) => {
    const transaction = await GCN_NH_KH.sequelize.transaction();
    try {
        const {
            soBang,
            soDon,
            idKhachHang,
            idDoiTac,
            maHoSo,
            ghiChu,
            dsNhomSPDV,
            ngayNopDon,
            ngayCapBang,
            ngayHetHanBang,
            chiTietNhomSPDV,
            mauSacNH,
            maNhanHieu,
            tenNhanHieu,
            hanGiaHanBang,
            hanNopTuyenThe,
            anhBangBase64, // ảnh được gửi từ FE dạng base64
            vuViecs,
            maNhanSuCapNhap,
            idGUQ
        } = req.body;

        // ✅ 1. Kiểm tra dữ liệu đầu vào
        if (!soBang || !maNhanHieu) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: số bằng hoặc mã nhãn hiệu!",
            });
        }

        // ✅ 2. Kiểm tra trùng số bằng
        const existed = await GCN_NH_KH.findOne({ where: { soBang } });
        if (existed) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Số bằng "${soBang}" đã tồn tại trong hệ thống!`,
            });
        }

        // ✅ 3. Kiểm tra hoặc tạo mới nhãn hiệu
        let nhanHieu = await NhanHieu.findOne({ where: { maNhanHieu } });
        if (!nhanHieu) {
            nhanHieu = await NhanHieu.create(
                {
                    maNhanHieu,
                    tenNhanHieu: tenNhanHieu || null,
                },
                { transaction }
            );
        }

        // ✅ 4. Tạo mới văn bằng (GCN_NH_KH)
        const newGCN = await GCN_NH_KH.create(
            {
                soBang,
                soDon,
                maHoSo,
                ghiChu,
                dsNhomSPDV,
                ngayNopDon: ngayNopDon || null,
                ngayCapBang: ngayCapBang || null,
                ngayHetHanBang: ngayHetHanBang || null,
                chiTietNhomSPDV,
                hanGiaHanBang: hanGiaHanBang || null,
                hanNopTuyenThe: hanNopTuyenThe || null,
                maQuocGia: "KH", // ✅ Cố định cho Campuchia
                idKhachHang: idKhachHang || null,
                idDoiTac: idDoiTac || null,
                maNhanHieu: nhanHieu.maNhanHieu,
                anhBangBase64: anhBangBase64 || null,
                mauSacNH: mauSacNH || null,
                idGUQ: idGUQ || null,
            },
            { transaction }
        );
        if (idGUQ) {
            const guq = await GiayUyQuyen.findByPk(idGUQ, { transaction });

            if (guq) {
                const isEmptySoDonGoc =
                    guq.soDonGoc === null ||
                    guq.soDonGoc === undefined ||
                    (typeof guq.soDonGoc === "string" && guq.soDonGoc.trim() === "");

                if (isEmptySoDonGoc && soDon) {
                    await guq.update(
                        { soDonGoc: soDon },
                        { transaction }
                    );
                }
            }
        }
        // ✅ 5. Nếu có danh sách vụ việc thì tạo mới
        if (Array.isArray(vuViecs) && vuViecs.length > 0) {
            for (const vuViec of vuViecs) {
                let ngayXuatBill = null;
                let maNguoiXuatBill = null;

                if (vuViec.xuatBill === true) {
                    ngayXuatBill = new Date();
                    maNguoiXuatBill = maNhanSuCapNhap;
                }

                await VuViec.create(
                    {
                        tenVuViec: vuViec.tenVuViec,
                        moTa: vuViec.moTa,
                        trangThai: vuViec.trangThai,
                        maHoSo: maHoSo,
                        maDon: newGCN.id,
                        soDon: soDon,
                        idKhachHang: idKhachHang,
                        idDoiTac: idDoiTac,
                        maQuocGiaVuViec: "KH",
                        ngayTaoVV: new Date(),
                        maNguoiXuLy: vuViec.maNguoiXuLy,
                        tenBang: "GCN_NH_KH",
                        deadline: vuViec.deadline,
                        softDeadline: vuViec.softDeadline,
                        xuatBill: vuViec.xuatBill,
                        ngayXuatBill: ngayXuatBill,
                        maNguoiXuatBill: maNguoiXuatBill,
                        soTien: vuViec.soTien,
                        loaiTienTe: vuViec.loaiTienTe,
                        isMainCase: vuViec.isMainCase,
                    },
                    { transaction }
                );
            }
        }

        // ✅ 6. Commit transaction
        await transaction.commit();

        return res.status(201).json({
            message: "Thêm văn bằng (GCN_NH_Cam) và vụ việc thành công!",
            data: newGCN,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi khi thêm văn bằng Campuchia:", error);
        res.status(500).json({
            message: "Đã xảy ra lỗi khi thêm văn bằng mới!",
            error: error.message,
        });
    }
};


export const editGCN_NH_CAM = async (req, res) => {
    const t = await GCN_NH_KH.sequelize.transaction();
    try {
        const {
            id,
            soBang,
            soDon,
            maHoSo,
            ngayNopDon,
            ngayCapBang,
            ghiChu,
            dsNhomSPDV,
            chiTietNhomSPDV,
            mauSacNH,
            linkAnh,
            hanGiaHan,
            hanNopTuyenThe,
            idKhachHang,
            idDoiTac,
            maNhanHieu,
            maQuocGia,
            quyetDinhSo,
            ngayHetHanBang,
            vuViecs, // ✅ Danh sách vụ việc gửi từ FE
            maNhanSuCapNhap,
            idGUQ
        } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Thiếu ID văn bằng cần chỉnh sửa" });
        }

        const record = await GCN_NH_KH.findByPk(id);
        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy văn bằng cần chỉnh sửa" });
        }

        // ✅ Cập nhật thông tin văn bằng
        await record.update(
            {
                soBang,
                soDon,
                maHoSo,
                ngayNopDon,
                ngayCapBang,
                ghiChu,
                dsNhomSPDV,
                chiTietNhomSPDV,
                mauSacNH,
                anhBang: linkAnh,
                hanGiaHan,
                hanNopTuyenThe,
                idKhachHang,
                idDoiTac,
                maNhanHieu,
                maQuocGia,
                quyetDinhSo,
                ngayHetHanBang,
                idGUQ
            },
            { transaction: t }
        );

        // ==================== Đồng bộ vụ việc ====================
        if (Array.isArray(vuViecs)) {
            const vuViecsHienTai = await VuViec.findAll({
                where: { maHoSo },
                transaction: t,
            });

            const idVuViecsTruyenLen = vuViecs.filter(v => v.id).map(v => v.id);

            // Xóa vụ việc không còn trong danh sách FE
            for (const vuViecCu of vuViecsHienTai) {
                if (!idVuViecsTruyenLen.includes(vuViecCu.id)) {
                    await vuViecCu.destroy({ transaction: t });
                }
            }

            // Thêm mới hoặc cập nhật vụ việc
            for (const vuViec of vuViecs) {
                let ngayXuatBill = null;
                let maNguoiXuatBill = null;
                if (vuViec.xuatBill === true) {
                    ngayXuatBill = new Date();
                    maNguoiXuatBill = maNhanSuCapNhap;
                }

                if (vuViec.id) {
                    // Cập nhật vụ việc cũ
                    await VuViec.update(
                        {
                            tenVuViec: vuViec.tenVuViec,
                            moTa: vuViec.moTa,
                            trangThai: vuViec.trangThai,
                            maHoSo,
                            maDon: id,
                            soDon,
                            idKhachHang,
                            idDoiTac,
                            maQuocGiaVuViec: "KH",
                            ngayTaoVV: new Date(),
                            maNguoiXuLy: vuViec.maNguoiXuLy,
                            clientsRef: record.clientsRef,
                            tenBang: "GCN_NH_CAM",
                            deadline: vuViec.deadline,
                            softDeadline: vuViec.softDeadline,
                            xuatBill: vuViec.xuatBill,
                            ngayXuatBill,
                            maNguoiXuatBill,
                            soTien: vuViec.soTien,
                            loaiTienTe: vuViec.loaiTienTe,
                            isMainCase: vuViec.isMainCase,
                        },
                        { where: { id: vuViec.id }, transaction: t }
                    );
                } else {
                    // Thêm mới vụ việc
                    await VuViec.create(
                        {
                            tenVuViec: vuViec.tenVuViec,
                            moTa: vuViec.moTa,
                            trangThai: vuViec.trangThai,
                            maHoSo,
                            maDon: id,
                            soDon,
                            idKhachHang,
                            idDoiTac,
                            maQuocGiaVuViec: "KH",
                            ngayTaoVV: new Date(),
                            maNguoiXuLy: vuViec.maNguoiXuLy,
                            clientsRef: record.clientsRef,
                            tenBang: "GCN_NH_CAM",
                            deadline: vuViec.deadline,
                            softDeadline: vuViec.softDeadline,
                            xuatBill: vuViec.xuatBill,
                            ngayXuatBill,
                            maNguoiXuatBill,
                            soTien: vuViec.soTien,
                            loaiTienTe: vuViec.loaiTienTe,
                            isMainCase: vuViec.isMainCase,
                        },
                        { transaction: t }
                    );
                }
            }
        }
        if (idGUQ) {
            const guq = await GiayUyQuyen.findByPk(idGUQ, { transaction: t });

            if (guq) {
                const isEmptySoDonGoc =
                    guq.soDonGoc === null ||
                    guq.soDonGoc === undefined ||
                    (typeof guq.soDonGoc === "string" && guq.soDonGoc.trim() === "");

                if (isEmptySoDonGoc && soDon) {
                    await guq.update(
                        { soDonGoc: soDon },
                        { transaction: t }
                    );
                }
            }
        }
        await t.commit();

        // ✅ Lấy lại dữ liệu sau khi update
        const updatedRecord = await GCN_NH_KH.findOne({
            where: { id },
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "chiTietNhomSPDV",
                "mauSacNH",
                "anhBang",
                "hanGiaHan",
                "hanNopTuyenThe",
                "idKhachHang",
                "idDoiTac",
                "maQuocGia",
                "quyetDinhSo",
                "maNhanHieu",
                "ngayHetHanBang",
            ],
            include: [
                { model: NhanHieu, as: "NhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["tenKhachHang", "diaChi"] },
                { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
            ],
        });

        return res.status(200).json({
            message: "Cập nhật văn bằng thành công",
            data: updatedRecord,
        });
    } catch (error) {
        await t.rollback();
        console.error("❌ Lỗi khi chỉnh sửa GCN_NH_CAM:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};



export const editGCN_NH_VN = async (req, res) => {
    const t = await GCN_NH.sequelize.transaction();
    try {
        const {
            id,
            soBang,
            soDon,
            maHoSo,
            ngayNopDon,
            ngayCapBang,
            ghiChu,
            dsNhomSPDV,
            chiTietNhomSPDV,
            mauSacNH,
            linkAnh,
            hanGiaHan,
            idKhachHang,
            idDoiTac,
            maNhanHieu,
            maQuocGia,
            quyetDinhSo,
            ngayHetHanBang,
            vuViecs,
            idGUQ,
            maNhanSuCapNhap, // nếu có truyền từ frontend
        } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Thiếu ID văn bằng cần chỉnh sửa" });
        }

        // ✅ Tìm bản ghi chính
        const record = await GCN_NH.findByPk(id);
        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy văn bằng cần chỉnh sửa" });
        }

        // ✅ Cập nhật thông tin văn bằng
        await record.update(
            {
                soBang,
                soDon,
                maHoSo,
                ngayNopDon,
                ngayCapBang,
                ghiChu,
                dsNhomSPDV,
                chiTietNhomSPDV,
                mauSacNH,
                anhBang: linkAnh,
                hanGiaHan,
                idKhachHang,
                idDoiTac,
                maNhanHieu,
                maQuocGia,
                quyetDinhSo,
                ngayHetHanBang,
                idGUQ,
            },
            { transaction: t }
        );

        // ==================== Đồng bộ danh sách Vụ Việc ====================
        if (Array.isArray(vuViecs)) {
            const vuViecsHienTai = await VuViec.findAll({
                where: { maHoSo },
                transaction: t,
            });

            const idVuViecsTruyenLen = vuViecs.filter(vv => vv.id).map(vv => vv.id);

            // Xóa những vụ việc không còn trong danh sách mới
            for (const vuViecCu of vuViecsHienTai) {
                if (!idVuViecsTruyenLen.includes(vuViecCu.id)) {
                    await vuViecCu.destroy({ transaction: t });
                }
            }

            // Thêm mới hoặc cập nhật vụ việc
            for (const vuViec of vuViecs) {
                let ngayXuatBill = null;
                let maNguoiXuatBill = null;

                if (vuViec.xuatBill === true) {
                    ngayXuatBill = new Date();
                    maNguoiXuatBill = maNhanSuCapNhap || null;
                }

                const vuViecData = {
                    tenVuViec: vuViec.tenVuViec,
                    moTa: vuViec.moTa,
                    trangThaiYCTT: vuViec.trangThaiYCTT, // tùy cột của bạn
                    maHoSo: record.maHoSo,
                    maDon: id,
                    soDon: record.soDon,
                    idKhachHang: record.idKhachHang,
                    idDoiTac: record.idDoiTac,
                    maQuocGiaVuViec: "VN",
                    maNguoiXuLy: vuViec.maNguoiXuLy,
                    clientsRef: record.clientRef || null,
                    tenBang: "GCN_NH_VN",
                    deadline: vuViec.deadline,
                    softDeadline: vuViec.softDeadline,
                    xuatBill: vuViec.xuatBill,
                    ngayXuatBill,
                    maNguoiXuatBill,
                    soTien: vuViec.soTien,
                    loaiTienTe: vuViec.loaiTienTe,
                    isMainCase: vuViec.isMainCase,
                };

                if (vuViec.id) {
                    // ✅ Cập nhật vụ việc có sẵn
                    await VuViec.update(vuViecData, {
                        where: { id: vuViec.id },
                        transaction: t,
                    });
                } else {
                    // ✅ Tạo mới vụ việc
                    await VuViec.create(
                        {
                            ...vuViecData,
                            ngayTaoVV: new Date(),
                        },
                        { transaction: t }
                    );
                }
            }
        }
        if (idGUQ) {
            const guq = await GiayUyQuyen.findByPk(idGUQ, { transaction: t });

            if (guq) {
                const isEmptySoDonGoc =
                    guq.soDonGoc === null ||
                    guq.soDonGoc === undefined ||
                    (typeof guq.soDonGoc === "string" && guq.soDonGoc.trim() === "");

                if (isEmptySoDonGoc && soDon) {
                    await guq.update(
                        { soDonGoc: soDon },
                        { transaction: t }
                    );
                }
            }
        }
        await t.commit();

        // ✅ Lấy lại dữ liệu chi tiết sau khi update
        const updatedRecord = await GCN_NH.findOne({
            where: { id },
            attributes: [
                "id",
                "soBang",
                "soDon",
                "maHoSo",
                "ngayNopDon",
                "ngayCapBang",
                "ghiChu",
                "dsNhomSPDV",
                "chiTietNhomSPDV",
                "mauSacNH",
                "anhBang",
                "hanGiaHan",
                "idKhachHang",
                "idDoiTac",
                "maQuocGia",
                "quyetDinhSo",
                "maNhanHieu",
                "ngayHetHanBang",
            ],
            include: [
                { model: NhanHieu, as: "NhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["tenKhachHang", "diaChi"] },
                { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
            ],
        });

        return res.status(200).json({
            message: "Cập nhật văn bằng và vụ việc thành công",
            data: updatedRecord,
        });
    } catch (error) {
        await t.rollback();
        console.error("❌ Lỗi khi chỉnh sửa GCN_NH_VN:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};
