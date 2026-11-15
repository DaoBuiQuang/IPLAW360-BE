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
import { NhanSu_VuViec } from "../models/nhanSu_VuViecModel.js";
import { DonSuaDoiGCN_NH_VN } from "../models/VN_SuaDoi_NH/donSuaDoiGCN_NH_VNModel.js";
import { DonGiaHan_NH_VN } from "../models/VN_GiaHan_NH/donGiaHanNH_VNModel.js";
import { DonCQSH_GCN_VN } from "../models/VN_ChuyenQuyenSH/donCQSH_GCN_VNModel.js";
import {
    getGCNLineageGraph,
    expandGCNFamilyIds,
    clusterGCNIdsByFamily,
    buildGCNLineageMetadataMap,
    getGCNPendingBienDongMap,
} from "../utils/lineageHelper.js";
import {
    resolveGCNDatesForSave,
    resolveNgayHetHanBangForRead,
    resolveHanGiaHanForRead,
} from "../utils/gcnDateHelper.js";

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
        const {
            soBang,
            searchText,
            soDon,
            maHoSo,
            loaiBang,
            pageIndex = 1,
            pageSize = 20,
            customerName,
            partnerName,
            brandName,
        } = req.body || {};
        const offset = (pageIndex - 1) * pageSize;

        const effectiveSearch = soBang || searchText || soDon || maHoSo;
        const whereCondition = {};
        applySoBangSearch(whereCondition, effectiveSearch);
        // KHÔNG lọc bỏ bangGoc = 1 để trả về cả bằng gốc đã đóng băng cho FE làm mờ theo phả hệ
        whereCondition.daXoa = { [Op.ne]: true };
        if (loaiBang) {
            whereCondition.loaiBang = Number(loaiBang);
        }

        const filterIncludes = [];
        if (brandName) {
            filterIncludes.push({
                model: NhanHieu,
                as: "NhanHieu",
                attributes: [],
                required: true,
                where: buildTokensSearchCondition(brandName, "tenNhanHieu"),
            });
        }
        if (customerName) {
            filterIncludes.push({
                model: KhachHangCuoi,
                as: "KhachHangCuoi",
                attributes: [],
                required: true,
                where: buildTokensSearchCondition(customerName, "tenKhachHang"),
            });
        }
        if (partnerName) {
            filterIncludes.push({
                model: DoiTac,
                as: "DoiTac",
                attributes: [],
                required: true,
                where: buildTokensSearchCondition(partnerName, "tenDoiTac"),
            });
        }

        const matchedRows = await GCN_NH.findAll({
            attributes: ["id", "bangGoc", "updatedAt", "createdAt"],
            where: whereCondition,
            include: filterIncludes,
            order: [
                [Sequelize.literal("CASE WHEN COALESCE(`GCN_NH`.`bangGoc`, 0) = 1 THEN 1 ELSE 0 END"), "ASC"],
                ["updatedAt", "DESC"],
                ["createdAt", "DESC"],
            ],
            subQuery: false,
            raw: true,
        });

        const matchedIds = [...new Set(matchedRows.map((r) => Number(r.id)).filter(Boolean))];
        if (!matchedIds.length) {
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

        const orderMetaMap = new Map();
        for (const r of matchedRows) {
            const idNum = Number(r.id);
            if (idNum && !orderMetaMap.has(idNum)) {
                orderMetaMap.set(idNum, {
                    bangGoc: r.bangGoc,
                    updatedAt: r.updatedAt,
                    createdAt: r.createdAt,
                });
            }
        }

        // Mở rộng & gom cụm theo Phả hệ (Bằng cha <-> Bằng con)
        const graph = await getGCNLineageGraph(GCN_NH);
        const isSearchingFamily = Boolean(effectiveSearch || customerName || partnerName || brandName);

        let targetIds = matchedIds;
        if (isSearchingFamily && !loaiBang) {
            const expandedSet = expandGCNFamilyIds(matchedIds, graph);
            const extraIds = [...expandedSet].filter((id) => !matchedIds.includes(id));
            if (extraIds.length > 0) {
                const extraRows = await GCN_NH.findAll({
                    attributes: ["id", "bangGoc", "updatedAt", "createdAt"],
                    where: { id: { [Op.in]: extraIds } },
                    raw: true,
                }).catch(() => []);
                for (const r of extraRows) {
                    const idNum = Number(r.id);
                    if (idNum && !orderMetaMap.has(idNum)) {
                        orderMetaMap.set(idNum, {
                            bangGoc: r.bangGoc,
                            updatedAt: r.updatedAt,
                            createdAt: r.createdAt,
                        });
                    }
                }
            }
            targetIds = [...matchedIds, ...extraIds];
        }

        const clusteredIds = clusterGCNIdsByFamily(targetIds, graph, orderMetaMap);
        const totalItems = clusteredIds.length;
        const pagedIds = clusteredIds.slice(offset, offset + Number(pageSize));

        if (!pagedIds.length) {
            return res.status(200).json({
                data: [],
                pagination: {
                    totalItems,
                    totalPages: Math.ceil(totalItems / pageSize),
                    pageIndex: Number(pageIndex),
                    pageSize: Number(pageSize),
                },
            });
        }

        const gcnUnordered = await GCN_NH.findAll({
            where: {
                id: { [Op.in]: pagedIds },
                daXoa: { [Op.ne]: true },
            },
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
                "clientsRef",
                "loaiBang",
                "bangGoc",
                "idGCN_NH_Goc",
                "trangThaiBang",
            ],
            include: [
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    required: false,
                    attributes: ["tenNhanHieu", "linkAnh"],
                },
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    required: false,
                    attributes: ["tenKhachHang", "maKhachHang"],
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    required: false,
                    attributes: ["tenDoiTac", "maDoiTac"],
                },
            ],
        });

        const gcnById = new Map(gcnUnordered.map((g) => [Number(g.id), g]));
        const GCN_NHs = pagedIds.map((id) => gcnById.get(Number(id))).filter(Boolean);

        const [
            { donMapByMaDon, donMapBySoDon },
            lineageMap,
            pendingMap,
        ] = await Promise.all([
            resolveMaHoSoForGCNList(GCN_NHs, false),
            buildGCNLineageMetadataMap(pagedIds, GCN_NH, graph),
            getGCNPendingBienDongMap(pagedIds),
        ]);

        const result = GCN_NHs.map((gcn_nh) => {
            let actualMaHoSo = gcn_nh.maHoSo;
            if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
                actualMaHoSo =
                    (gcn_nh.maDonDangKy && donMapByMaDon.get(gcn_nh.maDonDangKy)) ||
                    (gcn_nh.soDon && donMapBySoDon.get(gcn_nh.soDon)) ||
                    gcn_nh.maHoSo ||
                    "";
            }

            const meta = lineageMap.get(Number(gcn_nh.id)) || {};
            const bienDong = pendingMap.get(Number(gcn_nh.id)) || {
                dangSuaDoi: false,
                dangChuyenQuyen: false,
                trangThaiBienDong: null,
                dsBienDongChoDuyet: [],
            };

            return {
                id: gcn_nh.id,
                soBang: gcn_nh.soBang,
                soDon: gcn_nh.soDon,
                maHoSo: actualMaHoSo,
                maDonDangKy: gcn_nh.maDonDangKy,
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
                hanGiaHan: resolveHanGiaHanForRead(gcn_nh.hanGiaHan, gcn_nh.ngayNopDon),
                ngayHetHanBang: resolveNgayHetHanBangForRead(gcn_nh.ngayHetHanBang, gcn_nh.ngayNopDon),
                loaiBang: gcn_nh.loaiBang,
                bangGoc: gcn_nh.bangGoc ? 1 : 0,
                trangThaiBang: gcn_nh.trangThaiBang || null,
                idGCN_NH_Goc: meta.idGCN_NH_Goc || gcn_nh.idGCN_NH_Goc || null,
                soBangGoc: meta.soBangGoc || null,
                soDonGoc: meta.soDonGoc || null,
                ngayCapBangGoc: meta.ngayCapBangGoc || null,
                ngayNopDonGoc: meta.ngayNopDonGoc || null,
                loaiBienDongGoc: meta.loaiBienDongGoc || null,
                capDoGiaPha: meta.capDoGiaPha || 0,
                idGCN_GocBanDau: meta.idGCN_GocBanDau || gcn_nh.id,
                gcnCha: meta.gcnCha || null,
                dangSuaDoi: bienDong.dangSuaDoi,
                dangChuyenQuyen: bienDong.dangChuyenQuyen,
                trangThaiBienDong: bienDong.trangThaiBienDong,
                dsBienDongChoDuyet: bienDong.dsBienDongChoDuyet,
            };
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
        res.status(500).json({ message: error.message });
    }
};

export const getGCN_NHs_SD = async (req, res) => {
    try {
        const { soBang, searchText, pageIndex = 1, pageSize = 20, customerName, partnerName, brandName } = req.body || {};
        const offset = (pageIndex - 1) * pageSize;

        const whereCondition = { loaiBang: 2, daXoa: { [Op.ne]: true } };
        applySoBangSearch(whereCondition, soBang || searchText);

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
                "clientsRef",
                "loaiBang",
                "bangGoc",
                "idGCN_NH_Goc",
                "trangThaiBang",
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
            order: [
                [Sequelize.literal("CASE WHEN COALESCE(`GCN_NH`.`bangGoc`, 0) = 1 THEN 1 ELSE 0 END"), "ASC"],
                ["updatedAt", "DESC"],
                ["createdAt", "DESC"],
            ],
        });

        if (!GCN_NHs.length) {
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

        const ids = GCN_NHs.map((g) => Number(g.id));
        const graph = await getGCNLineageGraph(GCN_NH);
        const [
            { donMapByMaDon, donMapBySoDon },
            lineageMap,
            pendingMap,
        ] = await Promise.all([
            resolveMaHoSoForGCNList(GCN_NHs, false),
            buildGCNLineageMetadataMap(ids, GCN_NH, graph),
            getGCNPendingBienDongMap(ids),
        ]);

        const result = GCN_NHs.map((gcn_nh) => {
            let actualMaHoSo = gcn_nh.maHoSo;
            if (!actualMaHoSo || actualMaHoSo === gcn_nh.soBang) {
                actualMaHoSo =
                    (gcn_nh.maDonDangKy && donMapByMaDon.get(gcn_nh.maDonDangKy)) ||
                    (gcn_nh.soDon && donMapBySoDon.get(gcn_nh.soDon)) ||
                    gcn_nh.maHoSo ||
                    "";
            }
            const meta = lineageMap.get(Number(gcn_nh.id)) || {};
            const bienDong = pendingMap.get(Number(gcn_nh.id)) || {
                dangSuaDoi: false,
                dangChuyenQuyen: false,
                trangThaiBienDong: null,
                dsBienDongChoDuyet: [],
            };

            return {
                id: gcn_nh.id,
                soBang: gcn_nh.soBang,
                soDon: gcn_nh.soDon,
                maHoSo: actualMaHoSo,
                maDonDangKy: gcn_nh.maDonDangKy,
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
                hanGiaHan: resolveHanGiaHanForRead(gcn_nh.hanGiaHan, gcn_nh.ngayNopDon),
                ngayHetHanBang: resolveNgayHetHanBangForRead(gcn_nh.ngayHetHanBang, gcn_nh.ngayNopDon),
                loaiBang: gcn_nh.loaiBang,
                bangGoc: gcn_nh.bangGoc ? 1 : 0,
                idGCN_NH_Goc: meta.idGCN_NH_Goc || gcn_nh.idGCN_NH_Goc || null,
                soBangGoc: meta.soBangGoc || null,
                soDonGoc: meta.soDonGoc || null,
                ngayCapBangGoc: meta.ngayCapBangGoc || null,
                ngayNopDonGoc: meta.ngayNopDonGoc || null,
                gcnCha: meta.gcnCha || null,
                dangSuaDoi: bienDong.dangSuaDoi,
                dangChuyenQuyen: bienDong.dangChuyenQuyen,
                trangThaiBienDong: bienDong.trangThaiBienDong,
                dsBienDongChoDuyet: bienDong.dsBienDongChoDuyet,
            };
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
            order: [
                [Sequelize.literal("CASE WHEN COALESCE(`GCN_NH_KH`.`bangGoc`, 0) = 1 THEN 1 ELSE 0 END"), "ASC"],
                ["updatedAt", "DESC"],
                ["createdAt", "DESC"],
            ],
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
                hanGiaHan: resolveHanGiaHanForRead(gcn_nh.hanGiaHan, gcn_nh.ngayNopDon),
                ngayHetHanBang: resolveNgayHetHanBangForRead(gcn_nh.ngayHetHanBang, gcn_nh.ngayNopDon)
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
            order: [
                [Sequelize.literal("CASE WHEN COALESCE(`GCN_NH_KH`.`bangGoc`, 0) = 1 THEN 1 ELSE 0 END"), "ASC"],
                ["updatedAt", "DESC"],
                ["createdAt", "DESC"],
            ],
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
                hanGiaHan: resolveHanGiaHanForRead(gcn_nh.hanGiaHan, gcn_nh.ngayNopDon),
                ngayHetHanBang: resolveNgayHetHanBangForRead(gcn_nh.ngayHetHanBang, gcn_nh.ngayNopDon)
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
                "loaiBang",
                "bangGoc",
                "idGCN_NH_Goc",
                "trangThaiBang",
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

        // ====== Lấy thông tin phả hệ & trạng thái biến động của GCN ======
        const graph = await getGCNLineageGraph(GCN_NH);
        const [
            lineageMap,
            pendingMap,
            dsToKhaiSuaDoiGCN,
            dsToKhaiChuyenQuyenGCN,
        ] = await Promise.all([
            buildGCNLineageMetadataMap([Number(gcn_nh.id)], GCN_NH, graph),
            getGCNPendingBienDongMap([Number(gcn_nh.id)]),
            DonSuaDoiGCN_NH_VN.findAll({
                where: {
                    [Op.or]: [
                        { idGCN_NH_Goc: gcn_nh.id },
                        { idGCN_NH: gcn_nh.id },
                    ],
                },
                order: [["id", "DESC"]],
            }),
            DonCQSH_GCN_VN.findAll({
                where: {
                    [Op.or]: [
                        { idGCN_NH_Goc: gcn_nh.id },
                        { idGCN_NH: gcn_nh.id },
                    ],
                },
                include: [
                    {
                        model: KhachHangCuoi,
                        as: "khachHangMoi",
                        required: false,
                        attributes: ["id", "tenKhachHang", "maKhachHang", "diaChi", "sdt"],
                    },
                ],
                order: [["id", "DESC"]],
            }),
        ]);

        const meta = lineageMap.get(Number(gcn_nh.id)) || {};
        const bienDong = pendingMap.get(Number(gcn_nh.id)) || {
            dangSuaDoi: false,
            dangChuyenQuyen: false,
            trangThaiBienDong: null,
            dsBienDongChoDuyet: [],
        };

        const donSuaDoiGCN = dsToKhaiSuaDoiGCN.length > 0 ? dsToKhaiSuaDoiGCN[0].toJSON() : null;
        const donCQSH_GCN = dsToKhaiChuyenQuyenGCN.length > 0 ? dsToKhaiChuyenQuyenGCN[0].toJSON() : null;

        // ✅ Kết quả trả về gộp cả vụ việc & phả hệ
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
            hanGiaHan: resolveHanGiaHanForRead(gcn_nh.hanGiaHan, gcn_nh.ngayNopDon),
            idKhachHang: gcn_nh.idKhachHang,
            idDoiTac: gcn_nh.idDoiTac,
            maNhanHieu: gcn_nh.maNhanHieu,
            maQuocGia: gcn_nh.maQuocGia,
            quyetDinhSo: gcn_nh.quyetDinhSo,
            ngayHetHanBang: resolveNgayHetHanBangForRead(gcn_nh.ngayHetHanBang, gcn_nh.ngayNopDon),
            loaiBang: gcn_nh.loaiBang,
            bangGoc: gcn_nh.bangGoc ? 1 : 0,
            trangThaiBang: gcn_nh.trangThaiBang || null,
            idGCN_NH_Goc: meta.idGCN_NH_Goc || gcn_nh.idGCN_NH_Goc || null,
            soBangGoc: meta.soBangGoc || null,
            soDonGoc: meta.soDonGoc || null,
            ngayCapBangGoc: meta.ngayCapBangGoc || null,
            ngayNopDonGoc: meta.ngayNopDonGoc || null,
            loaiBienDongGoc: meta.loaiBienDongGoc || null,
            capDoGiaPha: meta.capDoGiaPha || 0,
            idGCN_GocBanDau: meta.idGCN_GocBanDau || gcn_nh.id,
            gcnCha: meta.gcnCha || null,
            dangSuaDoi: bienDong.dangSuaDoi,
            dangChuyenQuyen: bienDong.dangChuyenQuyen,
            trangThaiBienDong: bienDong.trangThaiBienDong,
            dsBienDongChoDuyet: bienDong.dsBienDongChoDuyet,
            donSuaDoiGCN,
            donCQSH_GCN,
            dsToKhaiSuaDoiGCN: dsToKhaiSuaDoiGCN.map((d) => d.toJSON()),
            dsToKhaiChuyenQuyenGCN: dsToKhaiChuyenQuyenGCN.map((d) => d.toJSON()),
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
                "loaiBang",
                "bangGoc",
                "trangThaiBang",
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
            hanGiaHan: resolveHanGiaHanForRead(gcn_nh.hanGiaHan, gcn_nh.ngayNopDon),
            hanNopTuyenThe: gcn_nh.hanNopTuyenThe,
            idKhachHang: gcn_nh.idKhachHang,
            idDoiTac: gcn_nh.idDoiTac,
            maNhanHieu: gcn_nh.maNhanHieu,
            maQuocGia: gcn_nh.maQuocGia,
            quyetDinhSo: gcn_nh.quyetDinhSo,
            ngayHetHanBang: resolveNgayHetHanBangForRead(gcn_nh.ngayHetHanBang, gcn_nh.ngayNopDon),
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
            hanGiaHan,
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
        const resolvedDates = resolveGCNDatesForSave({
            ngayNopDon,
            ngayHetHanBang,
            hanGiaHan: hanGiaHan ?? hanGiaHanBang,
        });

        const newGCN = await GCN_NH.create(
            {
                soBang,
                soDon,
                maHoSo,
                ghiChu,
                dsNhomSPDV,
                ngayNopDon: ngayNopDon || null,
                ngayCapBang: ngayCapBang || null,
                ngayHetHanBang: resolvedDates.ngayHetHanBang,
                chiTietNhomSPDV,
                hanGiaHan: resolvedDates.hanGiaHan,
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
            hanGiaHan,
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
        const resolvedDatesCam = resolveGCNDatesForSave({
            ngayNopDon,
            ngayHetHanBang,
            hanGiaHan: hanGiaHan ?? hanGiaHanBang,
        });

        const newGCN = await GCN_NH_KH.create(
            {
                soBang,
                soDon,
                maHoSo,
                ghiChu,
                dsNhomSPDV,
                ngayNopDon: ngayNopDon || null,
                ngayCapBang: ngayCapBang || null,
                ngayHetHanBang: resolvedDatesCam.ngayHetHanBang,
                chiTietNhomSPDV,
                hanGiaHan: resolvedDatesCam.hanGiaHan,
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
        const resolvedDatesCamEdit = resolveGCNDatesForSave({
            ngayNopDon: ngayNopDon !== undefined ? ngayNopDon : record.ngayNopDon,
            ngayHetHanBang: ngayHetHanBang !== undefined ? ngayHetHanBang : record.ngayHetHanBang,
            hanGiaHan: hanGiaHan !== undefined ? hanGiaHan : record.hanGiaHan,
        });

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
                hanGiaHan: resolvedDatesCamEdit.hanGiaHan,
                hanNopTuyenThe,
                idKhachHang,
                idDoiTac,
                maNhanHieu,
                maQuocGia,
                quyetDinhSo,
                ngayHetHanBang: resolvedDatesCamEdit.ngayHetHanBang,
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
            await t.rollback();
            return res.status(404).json({ message: "Không tìm thấy văn bằng cần chỉnh sửa" });
        }

        // Chặn cập nhật nếu Giấy chứng nhận gốc đã bị đóng băng (bangGoc == 1)
        if (Number(record.bangGoc) === 1 || record.bangGoc === true) {
            await t.rollback();
            return res.status(400).json({
                message: "Giấy chứng nhận gốc này đã bị đóng băng (do đã sửa đổi / chuyển nhượng được chấp thuận), không thể chỉnh sửa!",
            });
        }

        // ✅ Cập nhật thông tin văn bằng
        const resolvedDatesVNEdit = resolveGCNDatesForSave({
            ngayNopDon: ngayNopDon !== undefined ? ngayNopDon : record.ngayNopDon,
            ngayHetHanBang: ngayHetHanBang !== undefined ? ngayHetHanBang : record.ngayHetHanBang,
            hanGiaHan: hanGiaHan !== undefined ? hanGiaHan : record.hanGiaHan,
        });

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
                hanGiaHan: resolvedDatesVNEdit.hanGiaHan,
                idKhachHang,
                idDoiTac,
                maNhanHieu,
                maQuocGia,
                quyetDinhSo,
                ngayHetHanBang: resolvedDatesVNEdit.ngayHetHanBang,
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

export const getGCNOptions = async (req, res) => {
    try {
        const { searchText = "", limit = 20 } = req.body;
        const maxLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const search = String(searchText).trim();
        const tokens = search ? search.split(/\s+/).filter(Boolean) : [];

        const queryGCNModel = async (Model) => {
            const where = { bangGoc: { [Op.ne]: 1 } };
            if (tokens.length > 0) {
                where[Op.and] = tokens.map(tok => {
                    const normTok = tok.replace(/-/g, "");
                    return {
                        [Op.or]: [
                            { soBang: { [Op.like]: `%${tok}%` } },
                            Sequelize.literal(`REPLACE(soBang, '-', '') LIKE '%${normTok}%'`),
                            { soDon: { [Op.like]: `%${tok}%` } },
                            Sequelize.literal(`REPLACE(soDon, '-', '') LIKE '%${normTok}%'`),
                            { maHoSo: { [Op.like]: `%${tok}%` } },
                            Sequelize.literal(`REPLACE(maHoSo, '-', '') LIKE '%${normTok}%'`),
                            Sequelize.literal(`\`NhanHieu\`.\`tenNhanHieu\` LIKE '%${tok}%'`),
                        ]
                    };
                });
            }

            return await Model.findAll({
                where,
                attributes: ["soBang", "maHoSo", "soDon"],
                include: [
                    {
                        model: NhanHieu,
                        as: "NhanHieu",
                        attributes: ["tenNhanHieu"],
                        required: false,
                    }
                ],
                limit: maxLimit * 2,
                order: [["updatedAt", "DESC"]],
                raw: false,
            }).catch(err => {
                console.error("Lỗi getGCNOptions query:", err?.message);
                return [];
            });
        };

        const [vnGCNs, khGCNs] = await Promise.all([
            queryGCNModel(GCN_NH),
            queryGCNModel(GCN_NH_KH),
        ]);

        const combined = [...vnGCNs, ...khGCNs];
        const seen = new Set();
        const data = [];

        for (const item of combined) {
            const soBang = item.soBang || "";
            const maHoSoVuViec = item.maHoSo || item.soDon || "";
            const tenNhanHieu = item.NhanHieu?.tenNhanHieu || "";

            const key = `${soBang}__${maHoSoVuViec}__${tenNhanHieu}`;
            if (!seen.has(key)) {
                seen.add(key);
                data.push({
                    soBang,
                    maHoSoVuViec,
                    tenNhanHieu,
                });
            }
            if (data.length >= maxLimit) break;
        }

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Xóa Giấy chứng nhận nhãn hiệu Việt Nam (GCN_NH_VN)
 * Hỗ trợ cả DELETE /api/gcn_nh_vn/delete/:id và POST /api/gcn_nh_vn/delete
 */
export const deleteGCN_NH_VN = async (req, res) => {
    const id = req.params.id || req.body.id;
    const { maNhanSuCapNhap } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Thiếu ID Giấy chứng nhận cần xóa!" });
    }

    const transaction = await GCN_NH.sequelize.transaction();
    try {
        const gcn = await GCN_NH.findByPk(id, { transaction });
        if (!gcn) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy Giấy chứng nhận nhãn hiệu!" });
        }

        const soBang = gcn.soBang;
        const tenGCN = `GCN số ${soBang || id}`;

        // 1. Tìm các vụ việc liên quan đến GCN này
        const vuViecs = await VuViec.findAll({
            where: {
                [Op.or]: [
                    { maDon: gcn.id, tenBang: "GCN_NH_VN" },
                    ...(gcn.maHoSo ? [{ maHoSo: gcn.maHoSo, tenBang: "GCN_NH_VN" }] : [])
                ]
            },
            transaction
        });

        if (vuViecs && vuViecs.length > 0) {
            const vuViecIds = vuViecs.map(v => v.id);
            // Xóa phân công nhân sự vụ việc
            await NhanSu_VuViec.destroy({
                where: { idVuViec: { [Op.in]: vuViecIds } },
                transaction
            }).catch(() => {});

            // Xóa vụ việc liên quan
            await VuViec.destroy({
                where: { id: { [Op.in]: vuViecIds } },
                transaction
            });
        }

        // 2. Xóa các đơn sửa đổi / gia hạn / chuyển quyền liên kết trực tiếp nếu có
        await DonSuaDoiGCN_NH_VN.destroy({
            where: { [Op.or]: [{ idGCN_NH: id }, { idGCN_NH_Goc: id }] },
            transaction
        }).catch(() => {});

        await DonGiaHan_NH_VN.destroy({
            where: { idGCN_NH: id },
            transaction
        }).catch(() => {});

        await DonCQSH_GCN_VN.destroy({
            where: { [Op.or]: [{ idGCN_NH: id }, { idGCN_NH_Goc: id }] },
            transaction
        }).catch(() => {});

        // 3. Thực hiện xóa GCN (xóa cứng, nếu có lỗi ràng buộc khóa ngoại thì fallback sang soft delete daXoa = true)
        try {
            await gcn.destroy({ transaction });
        } catch (destroyError) {
            await gcn.update({ daXoa: true }, { transaction });
        }

        await transaction.commit();

        // Gửi thông báo nếu có mã nhân sự
        if (maNhanSuCapNhap) {
            sendGenericNotification({
                maNhanSuCapNhap,
                title: "Xóa Giấy chứng nhận nhãn hiệu",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã xóa Giấy chứng nhận nhãn hiệu '${tenGCN}'`,
                data: { idGCN: id, soBang },
            }).catch(() => {});
        }

        return res.status(200).json({
            message: "Xóa Giấy chứng nhận nhãn hiệu thành công!",
            data: { id, soBang }
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi xóa GCN_NH_VN:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi xóa Giấy chứng nhận nhãn hiệu!",
            error: error.message
        });
    }
};
