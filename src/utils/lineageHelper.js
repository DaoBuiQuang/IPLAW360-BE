import { Op } from "sequelize";
import { DonDangKy } from "../models/donDangKyModel.js";
import { GCN_NH } from "../models/GCN_NHModel.js";
import { DonSuaDoi_NH_VN } from "../models/VN_SuaDoi_NH/donSuaDoiNH_VNModel.js";
import { DonTachNH_VN } from "../models/VN_TachDon_NH/donTachNH_VNModel.js";
import { DonCQSH_VN } from "../models/VN_ChuyenQuyenSH/donCQSH_VNModel.js";
import { DonSuaDoiGCN_NH_VN } from "../models/VN_SuaDoi_NH/donSuaDoiGCN_NH_VNModel.js";
import { DonCQSH_GCN_VN } from "../models/VN_ChuyenQuyenSH/donCQSH_GCN_VNModel.js";
import { DonDK_SPDV } from "../models/donDK_SPDVMolel.js";
import { TaiLieu } from "../models/taiLieuModel.js";
import { LichSuThamDinh } from "../models/lichSuThamDinhModel.js";
import { VuViec } from "../models/vuViecModel.js";

/**
 * ============================================================================
 * 1. PHẢ HỆ & BIẾN ĐỘNG ĐƠN ĐĂNG KÝ NHÃN HIỆU VN (DonDangKy)
 * ============================================================================
 */

export const getDonLineageGraph = async () => {
    const [sdRows, tdRows, cqRows] = await Promise.all([
        DonSuaDoi_NH_VN.findAll({
            where: {
                maDonDangKy: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
                maDonDangKyGoc: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
            },
            attributes: ["id", "maDonDangKy", "maDonDangKyGoc", "soDon", "ngayYeuCau", "createdAt"],
            raw: true,
        }).catch(() => []),
        DonTachNH_VN.findAll({
            where: {
                maDonDangKy: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
                maDonDangKyGoc: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
            },
            attributes: ["id", "maDonDangKy", "maDonDangKyGoc", "soDon", "ngayYeuCau", "createdAt"],
            raw: true,
        }).catch(() => []),
        DonCQSH_VN.findAll({
            where: {
                maDonDangKy: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
                maDonDangKyGoc: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
            },
            attributes: ["id", "maDonDangKy", "maDonDangKyGoc", "soDon", "ngayYeuCau", "createdAt"],
            raw: true,
        }).catch(() => []),
    ]);

    const parentOf = new Map();
    const childrenOf = new Map();

    const addEdge = (parentMaDon, childMaDon, loaiBienDong, row) => {
        if (!parentMaDon || !childMaDon || parentMaDon === childMaDon) return;
        const edgeInfo = {
            parentMaDon,
            childMaDon,
            loaiBienDong,
            id: row.id,
            soDonBienDong: row.soDon || null,
            ngayYeuCau: row.ngayYeuCau || null,
            createdAt: row.createdAt || null,
        };
        if (!parentOf.has(childMaDon)) {
            parentOf.set(childMaDon, edgeInfo);
        }
        if (!childrenOf.has(parentMaDon)) {
            childrenOf.set(parentMaDon, []);
        }
        const list = childrenOf.get(parentMaDon);
        if (!list.some((x) => x.childMaDon === childMaDon)) {
            list.push(edgeInfo);
        }
    };

    for (const r of sdRows) addEdge(r.maDonDangKyGoc, r.maDonDangKy, "SUA_DOI", r);
    for (const r of tdRows) addEdge(r.maDonDangKyGoc, r.maDonDangKy, "TACH_DON", r);
    for (const r of cqRows) addEdge(r.maDonDangKyGoc, r.maDonDangKy, "CHUYEN_QUYEN", r);

    // Sort children chronologically
    for (const [, list] of childrenOf.entries()) {
        list.sort((a, b) => {
            const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tA - tB || (a.id || 0) - (b.id || 0);
        });
    }

    const getRootAndDepth = (maDon) => {
        let curr = maDon;
        let depth = 0;
        const visited = new Set([curr]);
        while (parentOf.has(curr)) {
            const p = parentOf.get(curr).parentMaDon;
            if (!p || visited.has(p)) break;
            visited.add(p);
            curr = p;
            depth++;
        }
        return { rootMaDon: curr, depth };
    };

    return { parentOf, childrenOf, getRootAndDepth };
};

export const expandDonFamilyIds = (seedMaDonList, graph) => {
    const { parentOf, childrenOf } = graph;
    const expanded = new Set();
    const queue = [];

    for (const id of seedMaDonList || []) {
        if (id && !expanded.has(id)) {
            expanded.add(id);
            queue.push(id);
        }
    }

    while (queue.length > 0) {
        const curr = queue.shift();
        // Đi lên đơn cha
        if (parentOf.has(curr)) {
            const p = parentOf.get(curr).parentMaDon;
            if (p && !expanded.has(p)) {
                expanded.add(p);
                queue.push(p);
            }
        }
        // Đi xuống các đơn con
        if (childrenOf.has(curr)) {
            for (const edge of childrenOf.get(curr)) {
                if (edge.childMaDon && !expanded.has(edge.childMaDon)) {
                    expanded.add(edge.childMaDon);
                    queue.push(edge.childMaDon);
                }
            }
        }
    }

    return Array.from(expanded);
};

export const clusterDonIdsByFamily = (orderedMaDonList, graph, metaMap = null) => {
    if (!Array.isArray(orderedMaDonList) || orderedMaDonList.length === 0) return [];
    const { getRootAndDepth } = graph;
    const orderIndexMap = new Map();
    orderedMaDonList.forEach((id, idx) => {
        if (!orderIndexMap.has(id)) orderIndexMap.set(id, idx);
    });

    // Nhóm theo rootMaDon theo thứ tự xuất hiện đầu tiên trong danh sách
    const familyOrder = [];
    const familyMembersMap = new Map();

    for (const maDon of orderedMaDonList) {
        const { rootMaDon } = getRootAndDepth(maDon);
        if (!familyMembersMap.has(rootMaDon)) {
            familyMembersMap.set(rootMaDon, new Set());
            familyOrder.push(rootMaDon);
        }
        familyMembersMap.get(rootMaDon).add(maDon);
    }

    const compareMembers = (a, b) => {
        if (metaMap) {
            const metaA = metaMap.get(a);
            const metaB = metaMap.get(b);
            const frozenA = Number(metaA?.donGoc) === 1 ? 1 : 0;
            const frozenB = Number(metaB?.donGoc) === 1 ? 1 : 0;
            if (frozenA !== frozenB) return frozenA - frozenB;

            const updA = metaA?.updatedAt ? new Date(metaA.updatedAt).getTime() : 0;
            const updB = metaB?.updatedAt ? new Date(metaB.updatedAt).getTime() : 0;
            if (updA !== updB) return updB - updA;

            const crtA = metaA?.createdAt ? new Date(metaA.createdAt).getTime() : 0;
            const crtB = metaB?.createdAt ? new Date(metaB.createdAt).getTime() : 0;
            if (crtA !== crtB) return crtB - crtA;
        }
        return (orderIndexMap.get(a) ?? 0) - (orderIndexMap.get(b) ?? 0);
    };

    const result = [];
    for (const rootMaDon of familyOrder) {
        const members = Array.from(familyMembersMap.get(rootMaDon));
        members.sort(compareMembers);
        result.push(...members);
    }

    return result;
};

export const buildDonLineageMetadataMap = async (maDonList, graphOrModel = null, maybeGraph = null) => {
    const metadataMap = new Map();
    if (!Array.isArray(maDonList) || maDonList.length === 0) return metadataMap;

    const resolvedGraph =
        maybeGraph && maybeGraph.parentOf
            ? maybeGraph
            : graphOrModel && graphOrModel.parentOf
            ? graphOrModel
            : null;
    const activeGraph = resolvedGraph || (await getDonLineageGraph());
    const { parentOf, getRootAndDepth } = activeGraph;

    const parentIdsToFetch = new Set();
    for (const maDon of maDonList) {
        if (parentOf.has(maDon)) {
            parentIdsToFetch.add(parentOf.get(maDon).parentMaDon);
        }
    }

    const parentDonMap = new Map();
    if (parentIdsToFetch.size > 0) {
        const parentDons = await DonDangKy.findAll({
            where: { maDonDangKy: { [Op.in]: Array.from(parentIdsToFetch) } },
            attributes: ["maDonDangKy", "soDon", "ngayNopDon", "maHoSo", "maHoSoVuViec", "loaiDon"],
            raw: true,
        }).catch(() => []);
        for (const p of parentDons) {
            parentDonMap.set(p.maDonDangKy, p);
        }
    }

    for (const maDon of maDonList) {
        const edge = parentOf.get(maDon) || null;
        const parentDon = edge ? parentDonMap.get(edge.parentMaDon) || null : null;
        const { rootMaDon, depth } = getRootAndDepth(maDon);

        metadataMap.set(maDon, {
            maDonDangKyGoc: edge ? edge.parentMaDon : null,
            soDonGoc: parentDon ? parentDon.soDon : null,
            ngayNopDonGoc: parentDon ? parentDon.ngayNopDon : null,
            loaiBienDongGoc: edge ? edge.loaiBienDong : null,
            capDoGiaPha: depth,
            maDonGocBanDau: rootMaDon,
            donCha: parentDon
                ? {
                      maDonDangKy: parentDon.maDonDangKy,
                      soDon: parentDon.soDon,
                      ngayNopDon: parentDon.ngayNopDon,
                      maHoSo: parentDon.maHoSo || parentDon.maHoSoVuViec || null,
                      loaiDon: parentDon.loaiDon,
                  }
                : null,
        });
    }

    return metadataMap;
};

export const getDonPendingBienDongMap = async (maDonList) => {
    const resultMap = new Map();
    if (!Array.isArray(maDonList) || maDonList.length === 0) return resultMap;

    const [pendingSD, pendingCQ] = await Promise.all([
        DonSuaDoi_NH_VN.findAll({
            where: {
                maDonDangKyGoc: { [Op.in]: maDonList },
                trangThaiDuyet: 0,
            },
            attributes: ["id", "maDonDangKyGoc", "soDon", "ngayYeuCau", "lanSuaDoi", "hanTraLoi", "moTa", "trangThaiDuyet", "duLieuThayDoi"],
            raw: true,
        }).catch(() => []),
        DonCQSH_VN.findAll({
            where: {
                maDonDangKyGoc: { [Op.in]: maDonList },
                trangThaiDuyet: 0,
            },
            attributes: ["id", "maDonDangKyGoc", "soDon", "ngayYeuCau", "lanChuyenQuyen", "hanTraLoi", "idKhachHang", "noiDung", "moTa", "trangThaiDuyet", "duLieuThayDoi"],
            raw: true,
        }).catch(() => []),
    ]);

    for (const maDon of maDonList) {
        resultMap.set(maDon, {
            dangSuaDoi: false,
            dangChuyenQuyen: false,
            dsBienDongChoDuyet: [],
            trangThaiBienDong: {
                dangSuaDoi: false,
                dangChuyenQuyen: false,
                dsBienDongChoDuyet: [],
            },
        });
    }

    for (const sd of pendingSD) {
        const entry = resultMap.get(sd.maDonDangKyGoc);
        if (entry) {
            entry.dangSuaDoi = true;
            entry.trangThaiBienDong.dangSuaDoi = true;
            const item = {
                id: sd.id,
                loaiBienDong: "SUA_DOI",
                tenBienDong: "Đang sửa đổi",
                soDon: sd.soDon,
                ngayYeuCau: sd.ngayYeuCau,
                lanBienDong: sd.lanSuaDoi,
                hanTraLoi: sd.hanTraLoi || null,
                moTa: sd.moTa,
                trangThaiDuyet: 0,
            };
            entry.dsBienDongChoDuyet.push(item);
            entry.trangThaiBienDong.dsBienDongChoDuyet.push(item);
        }
    }

    for (const cq of pendingCQ) {
        const entry = resultMap.get(cq.maDonDangKyGoc);
        if (entry) {
            entry.dangChuyenQuyen = true;
            entry.trangThaiBienDong.dangChuyenQuyen = true;
            const item = {
                id: cq.id,
                loaiBienDong: "CHUYEN_QUYEN",
                tenBienDong: "Đơn chuyển quyền sở hữu",
                soDon: cq.soDon,
                ngayYeuCau: cq.ngayYeuCau,
                lanBienDong: cq.lanChuyenQuyen,
                hanTraLoi: cq.hanTraLoi || null,
                idKhachHangMoi: cq.idKhachHang,
                noiDung: cq.noiDung,
                moTa: cq.moTa,
                trangThaiDuyet: 0,
            };
            entry.dsBienDongChoDuyet.push(item);
            entry.trangThaiBienDong.dsBienDongChoDuyet.push(item);
        }
    }

    return resultMap;
};

/**
 * ============================================================================
 * 2. PHẢ HỆ & BIẾN ĐỘNG GIẤY CHỨNG NHẬN NHÃN HIỆU VN (GCN_NH)
 * ============================================================================
 */

export const getGCNLineageGraph = async () => {
    const [gcnLinks, sdGCNRows, cqGCNRows] = await Promise.all([
        GCN_NH.findAll({
            where: {
                idGCN_NH_Goc: { [Op.not]: null },
                daXoa: { [Op.ne]: true },
            },
            attributes: ["id", "idGCN_NH_Goc", "loaiBang", "soBang", "soDon", "createdAt"],
            raw: true,
        }).catch(() => []),
        DonSuaDoiGCN_NH_VN.findAll({
            where: {
                idGCN_NH: { [Op.not]: null },
                idGCN_NH_Goc: { [Op.not]: null },
            },
            attributes: ["id", "idGCN_NH", "idGCN_NH_Goc", "soDon", "ngayYeuCau", "createdAt"],
            raw: true,
        }).catch(() => []),
        DonCQSH_GCN_VN.findAll({
            where: {
                idGCN_NH: { [Op.not]: null },
                idGCN_NH_Goc: { [Op.not]: null },
            },
            attributes: ["id", "idGCN_NH", "idGCN_NH_Goc", "soDon", "ngayYeuCau", "createdAt"],
            raw: true,
        }).catch(() => []),
    ]);

    const parentOf = new Map();
    const childrenOf = new Map();

    const addEdge = (parentIdRaw, childIdRaw, loaiBienDong, row) => {
        const parentId = Number(parentIdRaw);
        const childId = Number(childIdRaw);
        if (!parentId || !childId || parentId === childId) return;
        const edgeInfo = {
            parentId,
            childId,
            loaiBienDong,
            id: row.id,
            soDonBienDong: row.soDon || null,
            ngayYeuCau: row.ngayYeuCau || null,
            createdAt: row.createdAt || null,
        };
        if (!parentOf.has(childId)) {
            parentOf.set(childId, edgeInfo);
        }
        if (!childrenOf.has(parentId)) {
            childrenOf.set(parentId, []);
        }
        const list = childrenOf.get(parentId);
        if (!list.some((x) => x.childId === childId)) {
            list.push(edgeInfo);
        }
    };

    for (const r of sdGCNRows) addEdge(r.idGCN_NH_Goc, r.idGCN_NH, "SUA_DOI", r);
    for (const r of cqGCNRows) addEdge(r.idGCN_NH_Goc, r.idGCN_NH, "CHUYEN_QUYEN", r);
    for (const r of gcnLinks) {
        const loai = r.loaiBang === 3 ? "CHUYEN_QUYEN" : "SUA_DOI";
        addEdge(r.idGCN_NH_Goc, r.id, loai, r);
    }

    for (const [, list] of childrenOf.entries()) {
        list.sort((a, b) => {
            const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tA - tB || (a.childId || 0) - (b.childId || 0);
        });
    }

    const getRootAndDepth = (idRaw) => {
        let curr = Number(idRaw);
        let depth = 0;
        const visited = new Set([curr]);
        while (parentOf.has(curr)) {
            const p = parentOf.get(curr).parentId;
            if (!p || visited.has(p)) break;
            visited.add(p);
            curr = p;
            depth++;
        }
        return { rootId: curr, depth };
    };

    return { parentOf, childrenOf, getRootAndDepth };
};

export const expandGCNFamilyIds = (seedIdList, graph) => {
    const { parentOf, childrenOf } = graph;
    const expanded = new Set();
    const queue = [];

    for (const rawId of seedIdList || []) {
        const id = Number(rawId);
        if (id && !expanded.has(id)) {
            expanded.add(id);
            queue.push(id);
        }
    }

    while (queue.length > 0) {
        const curr = queue.shift();
        if (parentOf.has(curr)) {
            const p = parentOf.get(curr).parentId;
            if (p && !expanded.has(p)) {
                expanded.add(p);
                queue.push(p);
            }
        }
        if (childrenOf.has(curr)) {
            for (const edge of childrenOf.get(curr)) {
                if (edge.childId && !expanded.has(edge.childId)) {
                    expanded.add(edge.childId);
                    queue.push(edge.childId);
                }
            }
        }
    }

    return Array.from(expanded);
};

export const clusterGCNIdsByFamily = (orderedIdList, graph, metaMap = null) => {
    if (!Array.isArray(orderedIdList) || orderedIdList.length === 0) return [];
    const normalizedList = orderedIdList.map((x) => Number(x)).filter(Boolean);
    const { getRootAndDepth } = graph;
    const orderIndexMap = new Map();
    normalizedList.forEach((id, idx) => {
        if (!orderIndexMap.has(id)) orderIndexMap.set(id, idx);
    });

    const familyOrder = [];
    const familyMembersMap = new Map();

    for (const id of normalizedList) {
        const { rootId } = getRootAndDepth(id);
        if (!familyMembersMap.has(rootId)) {
            familyMembersMap.set(rootId, new Set());
            familyOrder.push(rootId);
        }
        familyMembersMap.get(rootId).add(id);
    }

    const compareMembers = (a, b) => {
        if (metaMap) {
            const metaA = metaMap.get(a);
            const metaB = metaMap.get(b);
            const frozenA = Number(metaA?.bangGoc) === 1 ? 1 : 0;
            const frozenB = Number(metaB?.bangGoc) === 1 ? 1 : 0;
            if (frozenA !== frozenB) return frozenA - frozenB;

            const updA = metaA?.updatedAt ? new Date(metaA.updatedAt).getTime() : 0;
            const updB = metaB?.updatedAt ? new Date(metaB.updatedAt).getTime() : 0;
            if (updA !== updB) return updB - updA;

            const crtA = metaA?.createdAt ? new Date(metaA.createdAt).getTime() : 0;
            const crtB = metaB?.createdAt ? new Date(metaB.createdAt).getTime() : 0;
            if (crtA !== crtB) return crtB - crtA;
        }
        return (orderIndexMap.get(a) ?? 0) - (orderIndexMap.get(b) ?? 0);
    };

    const result = [];
    for (const rootId of familyOrder) {
        const members = Array.from(familyMembersMap.get(rootId));
        members.sort(compareMembers);
        result.push(...members);
    }

    return result;
};

export const buildGCNLineageMetadataMap = async (idList, graphOrModel = null, maybeGraph = null) => {
    const metadataMap = new Map();
    if (!Array.isArray(idList) || idList.length === 0) return metadataMap;

    const normalizedIds = idList.map((x) => Number(x)).filter(Boolean);
    const resolvedGraph =
        maybeGraph && maybeGraph.parentOf
            ? maybeGraph
            : graphOrModel && graphOrModel.parentOf
            ? graphOrModel
            : null;
    const activeGraph = resolvedGraph || (await getGCNLineageGraph());
    const { parentOf, getRootAndDepth } = activeGraph;

    const parentIdsToFetch = new Set();
    for (const id of normalizedIds) {
        if (parentOf.has(id)) {
            parentIdsToFetch.add(parentOf.get(id).parentId);
        }
    }

    const parentGCNMap = new Map();
    if (parentIdsToFetch.size > 0) {
        const parentGCNs = await GCN_NH.findAll({
            where: { id: { [Op.in]: Array.from(parentIdsToFetch) } },
            attributes: ["id", "soBang", "soDon", "ngayCapBang", "ngayNopDon", "maHoSo", "loaiBang"],
            raw: true,
        }).catch(() => []);
        for (const p of parentGCNs) {
            parentGCNMap.set(Number(p.id), p);
        }
    }

    for (const id of normalizedIds) {
        const edge = parentOf.get(id) || null;
        const parentGCN = edge ? parentGCNMap.get(edge.parentId) || null : null;
        const { rootId, depth } = getRootAndDepth(id);

        metadataMap.set(id, {
            idGCN_NH_Goc: edge ? edge.parentId : null,
            soBangGoc: parentGCN ? parentGCN.soBang : null,
            soDonGoc: parentGCN ? parentGCN.soDon : null,
            ngayCapBangGoc: parentGCN ? parentGCN.ngayCapBang : null,
            ngayNopDonGoc: parentGCN ? parentGCN.ngayNopDon : null,
            loaiBienDongGoc: edge ? edge.loaiBienDong : null,
            capDoGiaPha: depth,
            idGCN_GocBanDau: rootId,
            gcnCha: parentGCN
                ? {
                      id: parentGCN.id,
                      soBang: parentGCN.soBang,
                      soDon: parentGCN.soDon,
                      ngayCapBang: parentGCN.ngayCapBang,
                      ngayNopDon: parentGCN.ngayNopDon,
                      maHoSo: parentGCN.maHoSo,
                      loaiBang: parentGCN.loaiBang,
                  }
                : null,
        });
    }

    return metadataMap;
};

export const getGCNPendingBienDongMap = async (idList) => {
    const resultMap = new Map();
    if (!Array.isArray(idList) || idList.length === 0) return resultMap;
    const normalizedIds = idList.map((x) => Number(x)).filter(Boolean);

    const [pendingSD, pendingCQ] = await Promise.all([
        DonSuaDoiGCN_NH_VN.findAll({
            where: {
                idGCN_NH_Goc: { [Op.in]: normalizedIds },
                trangThaiDuyet: 0,
            },
            attributes: ["id", "idGCN_NH_Goc", "soDon", "ngayYeuCau", "lanSuaDoi", "moTa", "trangThaiDuyet", "duLieuThayDoi"],
            raw: true,
        }).catch(() => []),
        DonCQSH_GCN_VN.findAll({
            where: {
                idGCN_NH_Goc: { [Op.in]: normalizedIds },
                trangThaiDuyet: 0,
            },
            attributes: ["id", "idGCN_NH_Goc", "soDon", "ngayYeuCau", "lanChuyenQuyen", "idKhachHang", "noiDung", "moTa", "trangThaiDuyet", "duLieuThayDoi"],
            raw: true,
        }).catch(() => []),
    ]);

    for (const id of normalizedIds) {
        resultMap.set(id, {
            dangSuaDoi: false,
            dangChuyenQuyen: false,
            dsBienDongChoDuyet: [],
            trangThaiBienDong: {
                dangSuaDoi: false,
                dangChuyenQuyen: false,
                dsBienDongChoDuyet: [],
            },
        });
    }

    for (const sd of pendingSD) {
        const entry = resultMap.get(Number(sd.idGCN_NH_Goc));
        if (entry) {
            entry.dangSuaDoi = true;
            entry.trangThaiBienDong.dangSuaDoi = true;
            const item = {
                id: sd.id,
                loaiBienDong: "SUA_DOI",
                tenBienDong: "Đang sửa đổi",
                soDon: sd.soDon,
                ngayYeuCau: sd.ngayYeuCau,
                lanBienDong: sd.lanSuaDoi,
                moTa: sd.moTa,
                trangThaiDuyet: 0,
            };
            entry.dsBienDongChoDuyet.push(item);
            entry.trangThaiBienDong.dsBienDongChoDuyet.push(item);
        }
    }

    for (const cq of pendingCQ) {
        const entry = resultMap.get(Number(cq.idGCN_NH_Goc));
        if (entry) {
            entry.dangChuyenQuyen = true;
            entry.trangThaiBienDong.dangChuyenQuyen = true;
            const item = {
                id: cq.id,
                loaiBienDong: "CHUYEN_QUYEN",
                tenBienDong: "Đang chuyển quyền",
                soDon: cq.soDon,
                ngayYeuCau: cq.ngayYeuCau,
                lanBienDong: cq.lanChuyenQuyen,
                idKhachHangMoi: cq.idKhachHang,
                noiDung: cq.noiDung,
                moTa: cq.moTa,
                trangThaiDuyet: 0,
            };
            entry.dsBienDongChoDuyet.push(item);
            entry.trangThaiBienDong.dsBienDongChoDuyet.push(item);
        }
    }

    return resultMap;
};

/**
 * ============================================================================
 * 3. HELPER XÁC ĐỊNH LẠI loaiDon / loaiBang GỐC CỦA ĐƠN/BẰNG CHA KHI ROLLBACK
 * ============================================================================
 */
const parseDuLieuObject = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

export const resolveOriginalLoaiDon = async (maDonDangKy, transaction = null) => {
    if (!maDonDangKy) return 1;

    const [inTach, inSuaDoi, inCQSH] = await Promise.all([
        DonTachNH_VN.findOne({
            where: { maDonDangKy },
            attributes: ["id"],
            transaction,
        }).catch(() => null),
        DonSuaDoi_NH_VN.findOne({
            where: { maDonDangKy, trangThaiDuyet: 1 },
            attributes: ["id"],
            transaction,
        }).catch(() => null),
        DonCQSH_VN.findOne({
            where: { maDonDangKy, trangThaiDuyet: 1 },
            attributes: ["id"],
            transaction,
        }).catch(() => null),
    ]);

    if (inTach) return 3; // Đơn tách
    if (inSuaDoi) return 2; // Đã sửa đổi
    if (inCQSH) return 4; // Đã chuyển nhượng
    return 1; // Đơn gốc
};

export const resolveOriginalLoaiBang = async (idGCN, transaction = null) => {
    if (!idGCN) return 1;

    const [inSuaDoi, inCQSH] = await Promise.all([
        DonSuaDoiGCN_NH_VN.findOne({
            where: { idGCN_NH: idGCN, trangThaiDuyet: 1 },
            attributes: ["id"],
            transaction,
        }).catch(() => null),
        DonCQSH_GCN_VN.findOne({
            where: { idGCN_NH: idGCN, trangThaiDuyet: 1 },
            attributes: ["id"],
            transaction,
        }).catch(() => null),
    ]);

    if (inSuaDoi) return 2; // Đã sửa đổi
    if (inCQSH) return 3; // Đã chuyển quyền
    return 1; // Bằng gốc
};

/**
 * ============================================================================
 * 4. HELPER THU HỒI ĐƠN CON / BẰNG CON KHI HOÀN TÁC DUYỆT HOẶC XÓA TỜ KHAI
 * ============================================================================
 */
export const rollbackSpawnedChildDon = async (record, transaction = null) => {
    if (!record) return;

    const parentMaDon = record.maDonDangKyGoc;
    const childMaDon = record.maDonDangKy;

    if (childMaDon && childMaDon !== parentMaDon) {
        // Bước 1: Kiểm tra xem đơn con có đang làm maDonDangKyGoc cho bất kỳ tờ khai biến động cấp sau nào không
        const [downstreamSD, downstreamCQ, downstreamTD] = await Promise.all([
            DonSuaDoi_NH_VN.count({ where: { maDonDangKyGoc: childMaDon }, transaction }),
            DonCQSH_VN.count({ where: { maDonDangKyGoc: childMaDon }, transaction }),
            DonTachNH_VN.count({ where: { maDonDangKyGoc: childMaDon }, transaction }),
        ]);

        if (downstreamSD > 0 || downstreamCQ > 0 || downstreamTD > 0) {
            throw new Error(
                `Đơn con (${childMaDon}) đã phát sinh tờ khai biến động cấp sau (Sửa đổi/Chuyển nhượng/Tách đơn). Vui lòng hoàn tác hoặc xóa tờ khai cấp sau trước!`
            );
        }

        // Bước 2: Lưu snapshot dữ liệu của đơn con vào duLieuThayDoi nếu đang thiếu để khi duyệt lại vẫn sinh lại đủ
        const childDon = await DonDangKy.findOne({
            where: { maDonDangKy: childMaDon },
            transaction,
        });

        const existingDuLieu = parseDuLieuObject(record.duLieuThayDoi);
        let mergedDuLieu = { ...existingDuLieu };

        if (childDon) {
            const childSPDVs = await DonDK_SPDV.findAll({
                where: { maDonDangKy: childMaDon },
                attributes: ["maSPDV", "isAutoImport"],
                raw: true,
                transaction,
            }).catch(() => []);

            const spdvCodes = childSPDVs.map((s) => s.maSPDV).filter(Boolean);

            mergedDuLieu = {
                idKhachHangMoi: existingDuLieu.idKhachHangMoi ?? childDon.idKhachHang,
                idKhachHang: existingDuLieu.idKhachHang ?? childDon.idKhachHang,
                maKhachHangMoi: existingDuLieu.maKhachHangMoi ?? childDon.idKhachHang,
                maNhanHieu: existingDuLieu.maNhanHieu ?? childDon.maNhanHieu,
                idDoiTac: existingDuLieu.idDoiTac ?? childDon.idDoiTac,
                idGUQ: existingDuLieu.idGUQ ?? childDon.idGUQ,
                daiDienSHTT: existingDuLieu.daiDienSHTT ?? childDon.daiDienSHTT,
                soDon: existingDuLieu.soDon ?? childDon.soDon,
                maHoSo: existingDuLieu.maHoSo ?? childDon.maHoSo,
                maSPDVList:
                    Array.isArray(existingDuLieu.maSPDVList) && existingDuLieu.maSPDVList.length > 0
                        ? existingDuLieu.maSPDVList
                        : spdvCodes,
                ...existingDuLieu,
            };
        }

        // Bước 3: Gỡ liên kết maDonDangKy trên tờ khai trước, sau đó xóa dữ liệu phụ và xóa bản ghi DonDangKy con
        await record.update(
            {
                maDonDangKy: null,
                duLieuThayDoi: mergedDuLieu,
            },
            { transaction }
        );

        await DonDK_SPDV.destroy({ where: { maDonDangKy: childMaDon }, transaction }).catch(() => {});
        await TaiLieu.destroy({ where: { maDonDangKy: childMaDon }, transaction }).catch(() => {});
        await LichSuThamDinh.destroy({ where: { maDonDangKy: childMaDon }, transaction }).catch(() => {});
        await VuViec.destroy({ where: { maDon: childMaDon }, transaction }).catch(() => {});

        if (childDon) {
            await childDon.destroy({ transaction });
        }
    } else if (childMaDon && childMaDon === parentMaDon) {
        // Trường hợp dữ liệu rất cũ mà maDonDangKy === maDonDangKyGoc
        await record.update({ maDonDangKy: null }, { transaction });
    }

    // Bước 4: Khôi phục đơn cha (donGoc = 0 và loaiDon gốc)
    if (parentMaDon) {
        const originalLoaiDon = await resolveOriginalLoaiDon(parentMaDon, transaction);
        const parentDon = await DonDangKy.findOne({
            where: { maDonDangKy: parentMaDon },
            transaction,
        });

        if (parentDon) {
            const parentUpdate = {
                donGoc: 0,
                loaiDon: originalLoaiDon,
            };
            if (parentDon.trangThaiDon === "Đã chuyển quyền" || parentDon.trangThaiDon === "Đã sửa đổi") {
                parentUpdate.trangThaiDon = parentDon.soDon ? "Thẩm định hình thức" : "Đang giải quyết";
            }
            if (parentDon.trangThaiVuViec === "Đã chuyển quyền" || parentDon.trangThaiVuViec === "Đã sửa đổi") {
                parentUpdate.trangThaiVuViec = "1";
            }
            await parentDon.update(parentUpdate, { transaction });
        }
    }
};

export const rollbackSpawnedChildGCN = async (record, transaction = null) => {
    if (!record) return;

    const parentIdGCN = record.idGCN_NH_Goc;
    const childIdGCN = record.idGCN_NH;

    if (childIdGCN && Number(childIdGCN) !== Number(parentIdGCN)) {
        // Bước 1: Kiểm tra xem bằng con có đang làm idGCN_NH_Goc cho bất kỳ tờ khai biến động cấp sau nào không
        const [downstreamSD, downstreamCQ, downstreamGCN] = await Promise.all([
            DonSuaDoiGCN_NH_VN.count({ where: { idGCN_NH_Goc: childIdGCN }, transaction }),
            DonCQSH_GCN_VN.count({ where: { idGCN_NH_Goc: childIdGCN }, transaction }),
            GCN_NH.count({ where: { idGCN_NH_Goc: childIdGCN }, transaction }),
        ]);

        if (downstreamSD > 0 || downstreamCQ > 0 || downstreamGCN > 0) {
            throw new Error(
                `Giấy chứng nhận con (ID: ${childIdGCN}) đã phát sinh tờ khai biến động cấp sau. Vui lòng hoàn tác hoặc xóa tờ khai cấp sau trước!`
            );
        }

        // Bước 2: Lưu snapshot dữ liệu của bằng con vào duLieuThayDoi nếu đang thiếu
        const childGCN = await GCN_NH.findByPk(childIdGCN, { transaction });
        const existingDuLieu = parseDuLieuObject(record.duLieuThayDoi);
        let mergedDuLieu = { ...existingDuLieu };

        if (childGCN) {
            mergedDuLieu = {
                idKhachHangMoi: existingDuLieu.idKhachHangMoi ?? childGCN.idKhachHang,
                idKhachHang: existingDuLieu.idKhachHang ?? childGCN.idKhachHang,
                maKhachHangMoi: existingDuLieu.maKhachHangMoi ?? childGCN.idKhachHang,
                maNhanHieu: existingDuLieu.maNhanHieu ?? childGCN.maNhanHieu,
                idDoiTac: existingDuLieu.idDoiTac ?? childGCN.idDoiTac,
                idGUQ: existingDuLieu.idGUQ ?? childGCN.idGUQ,
                daiDienSHTT: existingDuLieu.daiDienSHTT ?? childGCN.daiDienSHTT,
                soBang: existingDuLieu.soBang ?? childGCN.soBang,
                maHoSo: existingDuLieu.maHoSo ?? childGCN.maHoSo,
                dsNhomSPDV: existingDuLieu.dsNhomSPDV ?? childGCN.dsNhomSPDV,
                chiTietNhomSPDV: existingDuLieu.chiTietNhomSPDV ?? childGCN.chiTietNhomSPDV,
                mauSacNH: existingDuLieu.mauSacNH ?? childGCN.mauSacNH,
                anhBang: existingDuLieu.anhBang ?? childGCN.anhBang,
                ...existingDuLieu,
            };
        }

        // Bước 3: Gỡ liên kết idGCN_NH trên tờ khai trước, sau đó xóa dữ liệu phụ và xóa bản ghi GCN_NH con
        await record.update(
            {
                idGCN_NH: null,
                duLieuThayDoi: mergedDuLieu,
            },
            { transaction }
        );

        await VuViec.destroy({
            where: { maDon: String(childIdGCN), tenBang: "GCN_NH_VN" },
            transaction,
        }).catch(() => {});

        if (childGCN) {
            await childGCN.destroy({ transaction });
        }
    } else if (childIdGCN && Number(childIdGCN) === Number(parentIdGCN)) {
        await record.update({ idGCN_NH: null }, { transaction });
    }

    // Bước 4: Khôi phục bằng cha (bangGoc = 0 và loaiBang gốc)
    if (parentIdGCN) {
        const originalLoaiBang = await resolveOriginalLoaiBang(parentIdGCN, transaction);
        await GCN_NH.update(
            {
                bangGoc: 0,
                loaiBang: originalLoaiBang,
            },
            { where: { id: parentIdGCN }, transaction }
        );
    }
};


