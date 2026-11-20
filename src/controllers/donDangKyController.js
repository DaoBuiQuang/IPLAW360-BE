import { DonDangKy } from "../models/donDangKyModel.js";
import { DonDK_SPDV } from "../models/donDK_SPDVMolel.js";
import { LichSuThamDinh } from "../models/lichSuThamDinhModel.js";
import { LoaiDon } from "../models/loaiDonModel.js";
import { NhanHieu } from "../models/nhanHieuModel.js";
import { TaiLieu } from "../models/taiLieuModel.js";
import { Op, literal } from "sequelize";
import { sendGenericNotification } from "../utils/notificationHelper.js";
import { SanPham_DichVu } from "../models/sanPham_DichVuModel.js";
import cron from 'node-cron';
import { Sequelize } from "sequelize";
import { HoSo_VuViec } from "../models/hoSoVuViecModel.js";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";
import crypto from "crypto";
import { VuViec } from "../models/vuViecModel.js";
import { now } from "sequelize/lib/utils";
import { DoiTac } from "../models/doiTacModel.js";
import { GCN_NH } from "../models/GCN_NHModel.js";
import { DonSuaDoi_NH_VN } from "../models/VN_SuaDoi_NH/donSuaDoiNH_VNModel.js";
import { DonDangKyNhanHieu_KH } from "../models/KH/donDangKyNhanHieu_KHModel.js";
import { GiayUyQuyen } from "../models/GiayUyQuyenModel.js";
import { NhanSu_VuViec } from "../models/nhanSu_VuViecModel.js";
import { DonCQSH_VN } from "../models/VN_ChuyenQuyenSH/donCQSH_VNModel.js";
import { DonTachNH_VN } from "../models/VN_TachDon_NH/donTachNH_VNModel.js";
import {
    getDonLineageGraph,
    expandDonFamilyIds,
    clusterDonIdsByFamily,
    buildDonLineageMetadataMap,
    getDonPendingBienDongMap,
    rollbackSpawnedChildDon,
} from "../utils/lineageHelper.js";
import { approveDonSuaDoi_NH_VN, autoRejectExpiredDonSuaDoi } from "./NH_VN_SD/donSuaDoi_NH_VNController.js";
import { autoRejectExpiredDonCQSH_VN } from "./NH_CQSH/donCQSH_NHController.js";
import { resolveGCNDatesForSave } from "../utils/gcnDateHelper.js";
import ExcelJS from "exceljs";

// Helper for token-based substring search (case-insensitive)
const buildTokensSearch = (val, field) => {
    if (!val) return undefined;
    const tokens = String(val).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return undefined;
    if (tokens.length === 1) return { [field]: { [Op.like]: `%${tokens[0]}%` } };
    return {
        [Op.and]: tokens.map(tok => ({ [field]: { [Op.like]: `%${tok}%` } }))
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
            ]
        };
    }
    return {
        [Op.and]: tokens.map(tok => ({
            [Op.or]: [
                { tenKhachHang: { [Op.like]: `%${tok}%` } },
                { maKhachHang: { [Op.like]: `%${tok}%` } },
            ]
        }))
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
            ]
        };
    }
    return {
        [Op.and]: tokens.map(tok => ({
            [Op.or]: [
                { tenDoiTac: { [Op.like]: `%${tok}%` } },
                { maDoiTac: { [Op.like]: `%${tok}%` } },
            ]
        }))
    };
};
const tinhHanXuLy = async (app, transaction = null) => {
    console.log("tessttttt 1")
    if (app.soBang) return null;

    let duKienDate = null;

    switch (app.trangThaiDon) {
        case "Hoàn thành hồ sơ tài liệu":
            duKienDate = app.ngayHoanThanhHoSoTaiLieu_DuKien;
            break;
        case "Thẩm định nội dung":
        case "Thẩm định hình thức":
            // Nếu có lịch sử thẩm định và tồn tại hanTraLoi => return null
            const loaiThamDinh = app.trangThaiDon === "Thẩm định nội dung" ? "NoiDung" : "HinhThuc";
            const lichSu = await LichSuThamDinh.findOne({
                where: { maDonDangKy: app.maDonDangKy, loaiThamDinh },
                order: [["lanThamDinh", "DESC"]],
                transaction
            });

            if (lichSu && (lichSu.hanTraLoi || lichSu.hanTraLoiGiaHan)) {
                return null; // Có hạn trả lời => không tính hạn xử lý nữa
            }

            duKienDate =
                app.trangThaiDon === "Thẩm định nội dung"
                    ? app.ngayKQThamDinhND_DuKien
                    : app.ngayKQThamDinhHinhThuc_DuKien;
            break;
        case "Công bố đơn":
            duKienDate = app.ngayCongBoDonDuKien;
            break;
    }

    if (!duKienDate) return null;

    const date = new Date(duKienDate);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
};

export const tinhHanTraLoi = async (app, transaction = null) => {
    console.log("tessttttt 2")
    if (app.soBang) return null;

    if (app.trangThaiDon === "Thẩm định nội dung" || app.trangThaiDon === "Thẩm định hình thức") {
        const loaiThamDinh = app.trangThaiDon === "Thẩm định nội dung" ? "NoiDung" : "HinhThuc";

        const lichSu = await LichSuThamDinh.findOne({
            where: { maDonDangKy: app.maDonDangKy, loaiThamDinh },
            order: [["lanThamDinh", "DESC"]],
            transaction
        });

        if (!lichSu) return null;

        // Trường hợp có hanTraLoi/hạn gia hạn
        const han =
            lichSu.hanTraLoiGiaHan ||
            lichSu.hanTraLoi ||
            lichSu.hanKhieuNaiBKHCN ||
            lichSu.hanKhieuNaiCSHTT;

        if (!han) return null;
        // Nếu có ngayTraLoiThongBaoTuChoi nhưng chưa có hanKhieuNaiCSHTT => bỏ hanTraLoi
        if (((lichSu.hanTraLoiGiaHan || lichSu.hanTraLoi) && lichSu.ngayNhanQuyetDinhTuChoi && !lichSu.hanKhieuNaiCSHTT) || ((lichSu.hanTraLoiGiaHan || lichSu.hanTraLoi) && !lichSu.ngayNhanQuyetDinhTuChoi && !lichSu.hanKhieuNaiCSHTT && lichSu.ngayTraLoiThongBaoTuChoi)) {
            return null;
        }
        // 🚩 Nếu đang ở hanKhieuNaiCSHTT mà có thông tin khiếu nại hoặc kết quả CSHTT, nhưng chưa có hanKhieuNaiBKHCN => bỏ
        if (lichSu.hanKhieuNaiCSHTT &&
            (lichSu.ngayKhieuNaiCSHTT || lichSu.ketQuaKhieuNaiCSHTT || lichSu.ngayKQ_KN_CSHTT) &&
            !lichSu.hanKhieuNaiBKHCN) {
            return null;
        }
        // 🚩 Nếu đang ở hanKhieuNaiBKHCN mà có thông tin khiếu nại hoặc kết quả BKHCN => bỏ
        if (lichSu.hanKhieuNaiBKHCN &&
            (lichSu.ngayKhieuNaiBKHCN || lichSu.ketQuaKhieuNaiBKHCN || lichSu.ngayKQ_KN_BKHCN)) {
            return null;
        }
        const hanDate = new Date(han);
        return isNaN(hanDate.getTime()) ? null : hanDate.toISOString().split("T")[0];
    }

    if (app.trangThaiDon === "Hoàn tất nhận bằng") {
        let han = null;
        if (app.ngayNopPhiCapBang) {
            return null;
        }
        if (app.ngayNopYKien) {
            han = app.hanNopPhiCapBang || null;
        } else {
            han = app.hanNopPhiCapBang || app.hanNopYKien;
        }
        if (!han) return null;
        const hanDate = new Date(han);
        return isNaN(hanDate.getTime()) ? null : hanDate.toISOString().split("T")[0];
    }
    return null;
};

export const getAllApplication = async (req, res) => {
    try {
        const {
            maSPDVList,
            trangThaiDon,
            trangThaiVuViec,
            trangThaiTaiLieu,
            loaiDon,
            soDon,
            maHoSo,
            searchText,
            fields = [],
            filterCondition = {},
            customerName,
            partnerName,
            brandName,
            maNguoiXuLy1,
            pageIndex = 1,
            pageSize = 20,
        } = req.body || {};

        const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
        const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
        const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

        if (!fields.includes("maDonDangKy")) fields.push("maDonDangKy");
        if (!fields.includes("donGoc")) fields.push("donGoc");
        if (!fields.includes("loaiDon")) fields.push("loaiDon");

        const offset = (pageIndex - 1) * pageSize;
        const {
            selectedField,
            fromDate,
            toDate,
            hanXuLyFilter,
            hanTraLoiFilter,
            sortByHanXuLy,
            sortByHanTraLoi,
            sortByUpdatedAt,
            sortByCreatedAt,
        } = filterCondition;

        const whereCondition = {};

        // ====== Lọc cơ bản (KHÔNG ẩn đơn gốc đã đóng băng / đã chuyển quyền để FE làm mờ theo phả hệ) ======
        if (trangThaiDon) {
            whereCondition.trangThaiDon = trangThaiDon;
        }
        if (trangThaiVuViec) {
            whereCondition.trangThaiVuViec = trangThaiVuViec;
        }
        if (loaiDon) whereCondition.loaiDon = loaiDon;
        if (maNguoiXuLy1) whereCondition.maNguoiXuLy1 = maNguoiXuLy1;

        if (soDon) {
            const normSoDon = String(soDon).trim().replace(/-/g, "");
            whereCondition[Op.and] = whereCondition[Op.and] || [];
            whereCondition[Op.and].push({
                [Op.or]: [
                    { soDon: { [Op.like]: `%${String(soDon).trim()}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normSoDon}%'`),
                ],
            });
        }

        if (maHoSo) {
            const normMaHoSo = String(maHoSo).trim().replace(/-/g, "");
            whereCondition[Op.and] = whereCondition[Op.and] || [];
            whereCondition[Op.and].push({
                [Op.or]: [
                    { maHoSoVuViec: { [Op.like]: `%${String(maHoSo).trim()}%` } },
                    { maHoSo: { [Op.like]: `%${String(maHoSo).trim()}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normMaHoSo}%'`),
                ],
            });
        }

        // ====== Lọc trạng thái tài liệu ======
        if (trangThaiTaiLieu) {
            if (Number(trangThaiTaiLieu) === 1) {
                whereCondition.ngayHoanThanhHoSoTaiLieu = { [Op.is]: null };
            } else if (Number(trangThaiTaiLieu) === 2) {
                whereCondition.ngayHoanThanhHoSoTaiLieu = { [Op.not]: null };
            }
        }

        // ====== Tìm kiếm (soDon, maHoSoVuViec, clientsRef) ======
        if (searchText) {
            const raw = String(searchText).trim();
            const tokens = raw.split(/\s+/).filter(Boolean);
            const normalizedSearch = raw.replace(/-/g, "");

            if (tokens.length <= 1) {
                whereCondition[Op.or] = [
                    { soDon: { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { maHoSoVuViec: { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { clientsRef: { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normalizedSearch}%'`),
                ];
            } else {
                whereCondition[Op.and] = whereCondition[Op.and] || [];
                tokens.forEach((tok) => {
                    const normTok = tok.replace(/-/g, "");
                    whereCondition[Op.and].push({
                        [Op.or]: [
                            { soDon: { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normTok}%'`),
                            { maHoSoVuViec: { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normTok}%'`),
                            { clientsRef: { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normTok}%'`),
                        ],
                    });
                });
            }
        }

        // ====== Lọc theo ngày (selectedField) ======
        if (selectedField && fromDate && toDate) {
            whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
        }

        // ====== Lọc hạn trả lời ======
        if (hanTraLoiFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null,
                to = null;

            switch (hanTraLoiFilter) {
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "<15":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 15);
                    break;
                case "<30":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 30);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) {
                whereCondition.hanTraLoi = { [Op.between]: [from, to] };
            } else if (to) {
                whereCondition.hanTraLoi = { [Op.lt]: to };
            }
        }

        // ====== Lọc hạn xử lý ======
        if (hanXuLyFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null,
                to = null;

            switch (hanXuLyFilter) {
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "<15":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 15);
                    break;
                case "<30":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 30);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) {
                whereCondition.hanXuLy = { [Op.between]: [from, to] };
            } else if (to) {
                whereCondition.hanXuLy = { [Op.lt]: to };
            }
        }

        // ====== Bổ sung field ======
        if (fields.includes("trangThaiHoanThienHoSoTaiLieu"))
            fields.push("taiLieuChuaNop", "ngayHoanThanhHoSoTaiLieu_DuKien");

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
            if (sortByCreatedAt && !sortByUpdatedAt) {
                order.push(["createdAt", "DESC"], ["updatedAt", "DESC"]);
            } else {
                order.push(["updatedAt", "DESC"], ["createdAt", "DESC"]);
            }
        }

        // ====== 1. Tìm danh sách maDonDangKy khớp điều kiện lọc ======
        const filterIncludes = [];
        if (maSPDVList && maSPDVList.length > 0) {
            filterIncludes.push({
                model: DonDK_SPDV,
                where: { maSPDV: { [Op.in]: maSPDVList } },
                required: true,
                attributes: [],
            });
        }
        if (effectiveBrandName) {
            filterIncludes.push({
                model: NhanHieu,
                as: "nhanHieu",
                attributes: [],
                required: true,
                where: buildTokensSearch(effectiveBrandName, "tenNhanHieu"),
            });
        }
        if (effectiveCustomerName) {
            filterIncludes.push({
                model: KhachHangCuoi,
                as: "khachHang",
                attributes: [],
                required: true,
                where: buildCustomerSearch(effectiveCustomerName),
            });
        }
        if (effectivePartnerName) {
            filterIncludes.push({
                model: DoiTac,
                as: "doitac",
                attributes: [],
                required: true,
                where: buildPartnerSearch(effectivePartnerName),
            });
        }

        const matchedRows = await DonDangKy.findAll({
            attributes: ["maDonDangKy", "donGoc", "updatedAt", "createdAt"],
            where: whereCondition,
            include: filterIncludes,
            order,
            subQuery: false,
            raw: true,
        });

        const matchedIds = [...new Set(matchedRows.map((r) => r.maDonDangKy).filter(Boolean))];
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
            if (r.maDonDangKy && !orderMetaMap.has(r.maDonDangKy)) {
                orderMetaMap.set(r.maDonDangKy, {
                    donGoc: r.donGoc,
                    updatedAt: r.updatedAt,
                    createdAt: r.createdAt,
                });
            }
        }

        // ====== 2. Mở rộng & gom cụm theo Phả hệ (Đơn cha <-> Đơn con) ======
        const graph = await getDonLineageGraph();
        const isSearchingFamily = Boolean(
            searchText ||
            soDon ||
            maHoSo ||
            effectiveCustomerName ||
            effectivePartnerName ||
            effectiveBrandName ||
            (maSPDVList && maSPDVList.length > 0)
        );

        let targetIds = matchedIds;
        if (isSearchingFamily && !loaiDon) {
            const expandedSet = expandDonFamilyIds(matchedIds, graph);
            // Giữ thứ tự gốc của matchedIds và bổ sung các đơn cùng dòng họ
            const extraIds = [...expandedSet].filter((id) => !matchedIds.includes(id));
            if (extraIds.length > 0) {
                const extraRows = await DonDangKy.findAll({
                    attributes: ["maDonDangKy", "donGoc", "updatedAt", "createdAt"],
                    where: { maDonDangKy: { [Op.in]: extraIds } },
                    raw: true,
                }).catch(() => []);
                for (const r of extraRows) {
                    if (r.maDonDangKy && !orderMetaMap.has(r.maDonDangKy)) {
                        orderMetaMap.set(r.maDonDangKy, {
                            donGoc: r.donGoc,
                            updatedAt: r.updatedAt,
                            createdAt: r.createdAt,
                        });
                    }
                }
            }
            targetIds = [...matchedIds, ...extraIds];
        }

        const clusteredIds = clusterDonIdsByFamily(
            targetIds,
            graph,
            !sortByHanTraLoi && !sortByHanXuLy ? orderMetaMap : null
        );
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

        // ====== 3. Query chi tiết các đơn trong trang hiện tại ======
        const applicationsUnordered = await DonDangKy.findAll({
            where: { maDonDangKy: { [Op.in]: pagedIds } },
            include: [
                {
                    model: DonDK_SPDV,
                    required: false,
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
                    required: false,
                    attributes: ["tenNhanHieu", "linkAnh"],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHang",
                    required: false,
                    attributes: ["tenKhachHang", "maKhachHang"],
                },
                {
                    model: DoiTac,
                    as: "doitac",
                    required: false,
                    attributes: ["tenDoiTac", "maDoiTac"],
                },
            ],
        });

        const appById = new Map(applicationsUnordered.map((a) => [a.maDonDangKy, a]));
        const applications = pagedIds.map((id) => appById.get(id)).filter(Boolean);

        // ====== 4. Lấy metadata phả hệ & trạng thái biến động động ======
        const [lineageMap, pendingMap] = await Promise.all([
            buildDonLineageMetadataMap(pagedIds, DonDangKy, graph),
            getDonPendingBienDongMap(pagedIds),
        ]);

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
            trangThaiDon: (app) => app.trangThaiDon,
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
            dsSPDV: (app) =>
                app.DonDK_SPDVs?.map((sp) => ({ maSPDV: sp.maSPDV })) || [],
            hanXuLy: (app) => app.hanXuLy,
            hanTraLoi: (app) => app.hanTraLoi,
            linkAnh: (app) => app.nhanHieu?.linkAnh || null,
            donGoc: (app) => app.donGoc,
            laDonTiepNhan: (app) => Boolean(app.laDonTiepNhan),
        };

        const result = applications.map((app) => {
            const row = {};
            fields.forEach((field) => {
                if (fieldMap[field]) row[field] = fieldMap[field](app);
            });

            const meta = lineageMap.get(app.maDonDangKy) || {};
            const bienDong = pendingMap.get(app.maDonDangKy) || {
                dangSuaDoi: false,
                dangChuyenQuyen: false,
                trangThaiBienDong: null,
                dsBienDongChoDuyet: [],
            };

            row.loaiDon = app.loaiDon;
            row.donGoc = app.donGoc;
            row.laDonTiepNhan = Boolean(app.laDonTiepNhan);
            row.maDonDangKyGoc = meta.maDonDangKyGoc || null;
            row.soDonGoc = meta.soDonGoc || null;
            row.ngayNopDonGoc = meta.ngayNopDonGoc || null;
            row.loaiBienDongGoc = meta.loaiBienDongGoc || null;
            row.capDoGiaPha = meta.capDoGiaPha || 0;
            row.maDonGocBanDau = meta.maDonGocBanDau || app.maDonDangKy;
            row.donCha = meta.donCha || null;

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
        console.error("Lỗi getAllApplication:", error);
        res.status(500).json({ message: error.message });
    }
};



export const getApplicationById = async (req, res) => {
    try {
        const { maDonDangKy } = req.body;
        if (!maDonDangKy) return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });

        // lấy đơn đăng ký
        const don = await DonDangKy.findOne({
            where: { maDonDangKy },
            include: [
                { model: TaiLieu, as: "taiLieu", required: false, attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"] },
                { model: DonDK_SPDV, required: false, attributes: ["maSPDV"] },
                { model: NhanHieu, as: "nhanHieu", required: false, attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh"] },
                { model: LichSuThamDinh, as: "lichSuThamDinh", required: false, attributes: { exclude: ['createdAt', 'updatedAt'] } }
            ]
        });

        if (!don) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });

        // convert sang JSON
        const plainDon = don.toJSON();

        // lấy thông tin VuViec bằng maHoSo (guard null cho đơn tiếp nhận không có maHoSo)
        if (plainDon.maHoSo) {
            const vuViecs = await VuViec.findAll({
                where: { maHoSo: plainDon.maHoSo },
                attributes: ["id", "maHoSo", "tenVuViec", "soDon", "idKhachHang", "ngayTaoVV", "deadline", "softDeadline", "soTien", "loaiTienTe", "xuatBill", "isMainCase", "maNguoiXuLy", "moTa", "trangThaiYCTT", "ghiChuTuChoi"],
                order: [["createdAt", "DESC"]]
            });
            plainDon.vuViec = vuViecs.map(v => v.toJSON());
        } else {
            plainDon.vuViec = [];
        }

        // phân loại lịch sử thẩm định
        plainDon.lichSuThamDinhHT = [];
        plainDon.lichSuThamDinhND = [];
        if (Array.isArray(plainDon.lichSuThamDinh)) {
            for (const item of plainDon.lichSuThamDinh) {
                if (item.loaiThamDinh === "HinhThuc") plainDon.lichSuThamDinhHT.push(item);
                else if (item.loaiThamDinh === "NoiDung") plainDon.lichSuThamDinhND.push(item);
            }
        }
        delete plainDon.lichSuThamDinh;

        // map maSPDV list
        plainDon.maSPDVList = plainDon.DonDK_SPDVs.map(sp => sp.maSPDV);
        delete plainDon.DonDK_SPDVs;

        // ====== LẤY THÔNG TIN PHẢ HỆ & TRẠNG THÁI BIẾN ĐỘNG ======
        const graph = await getDonLineageGraph();
        const [lineageMap, pendingMap] = await Promise.all([
            buildDonLineageMetadataMap([maDonDangKy], DonDangKy, graph),
            getDonPendingBienDongMap([maDonDangKy]),
        ]);
        const meta = lineageMap.get(maDonDangKy) || {};
        const bienDong = pendingMap.get(maDonDangKy) || {
            dangSuaDoi: false,
            dangChuyenQuyen: false,
            trangThaiBienDong: null,
            dsBienDongChoDuyet: [],
        };

        plainDon.maDonDangKyGoc = meta.maDonDangKyGoc || null;
        plainDon.soDonGoc = meta.soDonGoc || null;
        plainDon.ngayNopDonGoc = meta.ngayNopDonGoc || null;
        plainDon.loaiBienDongGoc = meta.loaiBienDongGoc || null;
        plainDon.capDoGiaPha = meta.capDoGiaPha || 0;
        plainDon.maDonGocBanDau = meta.maDonGocBanDau || maDonDangKy;
        plainDon.donCha = meta.donCha || null;
        plainDon.dangSuaDoi = bienDong.dangSuaDoi;
        plainDon.dangChuyenQuyen = bienDong.dangChuyenQuyen;
        plainDon.trangThaiBienDong = bienDong.trangThaiBienDong;
        plainDon.dsBienDongChoDuyet = bienDong.dsBienDongChoDuyet;

        // ====== LẤY THÊM THÔNG TIN TỜ KHAI SỬA ĐỔI / TÁCH ĐƠN / CHUYỂN NHƯỢNG ======
        const donSuaDoi = await DonSuaDoi_NH_VN.findOne({
            where: {
                [Op.or]: [
                    { maDonDangKy },
                    { maDonDangKyGoc: maDonDangKy, trangThaiDuyet: 0 },
                ],
            },
            order: [["id", "DESC"]],
        });
        if (donSuaDoi) plainDon.donSuaDoi = donSuaDoi.toJSON();

        const donTach = await DonTachNH_VN.findOne({
            where: { maDonDangKy },
            include: [
                {
                    model: DonDangKy,
                    as: "donGoc",
                    required: false,
                    attributes: ["maDonDangKy", "soDon", "ngayNopDon", "maHoSo", "maHoSoVuViec"],
                },
            ],
        });
        if (donTach) {
            plainDon.donTach = {
                ...donTach.toJSON(),
                soDonGoc: donTach.donGoc?.soDon || plainDon.soDonGoc || null,
                ngayNopDonGoc: donTach.donGoc?.ngayNopDon || plainDon.ngayNopDonGoc || null,
            };
        }

        const donCQSH = await DonCQSH_VN.findOne({
            where: {
                [Op.or]: [
                    { maDonDangKy },
                    { maDonDangKyGoc: maDonDangKy, trangThaiDuyet: 0 },
                ],
            },
            order: [["id", "DESC"]],
        });
        if (donCQSH) plainDon.donCQSH = donCQSH.toJSON();

        plainDon.clientRef = plainDon.clientsRef || null;
        res.status(200).json(plainDon);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const generateMaDonDangKy = (prefix) => {
    const safePrefix = prefix && String(prefix).trim() !== "" ? String(prefix).trim() : "TN";
    const randomStr = crypto.randomBytes(3).toString("hex");
    return `${safePrefix}_${randomStr}`;
};

export const createApplication = async (req, res) => {
    const transaction = await DonDangKy.sequelize.transaction();

    try {
        const {
            nhanHieu,
            maHoSo,
            laDonTiepNhan = false,
            taiLieus,
            vuViecs,
            lichSuThamDinhHT,
            lichSuThamDinhND,
            maSPDVList,
            maNguoiXuLy1,
            maNguoiXuLy2,
            maNhanSuCapNhap,
            idSoBangOld,
            ...donData
        } = req.body;

        const isDonTiepNhan = Boolean(laDonTiepNhan);
        const cleanMaHoSo = maHoSo && String(maHoSo).trim() !== "" ? String(maHoSo).trim() : null;
        const cleanIdKhachHang =
            donData.idKhachHang !== undefined &&
            donData.idKhachHang !== null &&
            String(donData.idKhachHang).trim() !== ""
                ? Number(donData.idKhachHang)
                : null;
        const cleanSoDon = donData.soDon && String(donData.soDon).trim() !== "" ? String(donData.soDon).trim() : null;
        const cleanIdDoiTac =
            donData.idDoiTac !== undefined &&
            donData.idDoiTac !== null &&
            String(donData.idDoiTac).trim() !== ""
                ? Number(donData.idDoiTac)
                : null;
        const cleanIdGUQ =
            donData.idGUQ !== undefined &&
            donData.idGUQ !== null &&
            String(donData.idGUQ).trim() !== ""
                ? Number(donData.idGUQ)
                : null;

        // ✅ Validate bắt buộc cho Đơn tiếp nhận: soDon, trangThaiVuViec, maSPDVList, và maNhanHieu / tenNhanHieu
        if (isDonTiepNhan) {
            const missingFields = [];
            if (!cleanSoDon) missingFields.push("số đơn (soDon)");
            if (
                donData.trangThaiVuViec === undefined ||
                donData.trangThaiVuViec === null ||
                String(donData.trangThaiVuViec).trim() === ""
            ) {
                missingFields.push("trạng thái vụ việc (trangThaiVuViec)");
            }
            if (!Array.isArray(maSPDVList) || maSPDVList.length === 0) {
                missingFields.push("nhóm sản phẩm/dịch vụ (maSPDVList)");
            }
            const hasMaNhanHieu =
                donData.maNhanHieu !== undefined &&
                donData.maNhanHieu !== null &&
                String(donData.maNhanHieu).trim() !== "";
            const hasTenNhanHieu = Boolean(nhanHieu?.tenNhanHieu && String(nhanHieu.tenNhanHieu).trim() !== "");
            if (!hasMaNhanHieu && !hasTenNhanHieu) {
                missingFields.push("tên hoặc mã nhãn hiệu (tenNhanHieu / maNhanHieu)");
            }
            if (missingFields.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    message: `Đơn tiếp nhận thiếu thông tin bắt buộc: ${missingFields.join(", ")}.`,
                });
            }
        }

        const sanitizedSoDonPrefix = cleanSoDon ? cleanSoDon.replace(/[^a-zA-Z0-9]/g, "") : "";
        const maDonPrefix = cleanMaHoSo || (sanitizedSoDonPrefix ? `TN_${sanitizedSoDonPrefix}` : "TN");
        const maDonDangKy = generateMaDonDangKy(maDonPrefix);

        // ✅ Nếu chưa có nhãn hiệu thì tạo mới
        if (!donData.maNhanHieu) {
            if (!nhanHieu?.tenNhanHieu || String(nhanHieu.tenNhanHieu).trim() === "") {
                await transaction.rollback();
                return res.status(400).json({ message: "Vui lòng điền tên nhãn hiệu" });
            }

            const createdNhanHieu = await NhanHieu.create(
                {
                    tenNhanHieu: String(nhanHieu.tenNhanHieu).trim(),
                    linkAnh: nhanHieu.linkAnh || null,
                },
                { transaction }
            );

            donData.maNhanHieu = createdNhanHieu.maNhanHieu;
        }

        // ✅ Tạo đơn đăng ký trước
        if (donData.soBang) {
            donData.trangThaiVuViec = 5;
        }
        const newDon = await DonDangKy.create(
            {
                ...donData,
                maDonDangKy,
                soDon: cleanSoDon,
                maHoSoVuViec: cleanMaHoSo,
                maHoSo: cleanMaHoSo,
                idKhachHang: cleanIdKhachHang,
                idDoiTac: cleanIdDoiTac,
                idGUQ: cleanIdGUQ,
                laDonTiepNhan: isDonTiepNhan,
                maNguoiXuLy1: maNguoiXuLy1 || null,
                maNguoiXuLy2: maNguoiXuLy2 || null,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || donData.maNhanSuCapNhap || null,
            },
            { transaction }
        );

        let idGCN_NH = null;

        if (
            donData.soBang
        ) {
            const actualMaHoSo = cleanMaHoSo || newDon.maHoSo || newDon.maHoSoVuViec || null;
            const effectiveNgayNopDon = newDon.ngayNopDon || donData.ngayNopDon || null;
            const resolvedGCNDates = resolveGCNDatesForSave({
                ngayNopDon: effectiveNgayNopDon,
                ngayHetHanBang: donData.ngayHetHanBang,
                hanGiaHan: donData.hanGiaHan,
            });
            const gcnData = {
                maDonDangKy: newDon.maDonDangKy,
                soBang: donData.soBang || null,
                quyetDinhSo: donData.quyetDinhSo || null,
                ngayNopDon: effectiveNgayNopDon,
                ngayCapBang: donData.ngayCapBang || null,
                ngayHetHanBang: resolvedGCNDates.ngayHetHanBang,
                hanGiaHan: resolvedGCNDates.hanGiaHan,
                ngayGuiBangChoKhachHang: donData.ngayGuiBangChoKhachHang || null,
                idKhachHang: cleanIdKhachHang,
                idDoiTac: cleanIdDoiTac,
                maHoSo: actualMaHoSo,
                soDon: newDon.soDon || cleanSoDon,
                clientsRef: donData.clientsRef || null,
                maNhanHieu: donData.maNhanHieu || null,
                maQuocGia: "VN",
                trangThaiDon: donData.trangThaiDon || null,
            };

            console.log("👉 Tạo mới GCN_NH với dữ liệu:", gcnData);

            const newGCN = await GCN_NH.create(gcnData, { transaction });
            idGCN_NH = newGCN.id
                ?? newGCN.dataValues?.id
                ?? newGCN.getDataValue('id');

        }

        // ✅ Update lại DonDangKy để gán idGCN_NH
        if (idGCN_NH) {
            await newDon.update({ idGCN_NH }, { transaction });
        }

        if (cleanIdGUQ) {
            const guq = await GiayUyQuyen.findByPk(cleanIdGUQ, { transaction });

            if (guq) {
                const isEmptySoDonGoc =
                    guq.soDonGoc === null ||
                    guq.soDonGoc === undefined ||
                    (typeof guq.soDonGoc === "string" && guq.soDonGoc.trim() === "");

                if (isEmptySoDonGoc && cleanSoDon) {
                    await guq.update(
                        { soDonGoc: cleanSoDon },
                        { transaction }
                    );
                }
            }
        }

        // ✅ Tạo tài liệu
        if (Array.isArray(taiLieus)) {
            for (const tl of taiLieus) {
                await TaiLieu.create(
                    {
                        maDonDangKy: newDon.maDonDangKy,
                        tenTaiLieu: tl.tenTaiLieu,
                        trangThai: tl.trangThai,
                        linkTaiLieu: tl.linkTaiLieu || null,
                    },
                    { transaction }
                );
            }
        }

        // ✅ Tạo vụ việc (chỉ tạo khi có đủ maHoSo & idKhachHang để tránh vi phạm NOT NULL trên VuViec)
        if (Array.isArray(vuViecs) && vuViecs.length > 0 && cleanMaHoSo && cleanIdKhachHang) {
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
                        maHoSo: cleanMaHoSo,
                        maDon: maDonDangKy,
                        soDon: cleanSoDon,
                        idKhachHang: cleanIdKhachHang,
                        maQuocGiaVuViec: "VN",
                        ngayTaoVV: new Date(),
                        maNguoiXuLy: vuViec.maNguoiXuLy,
                        clientsRef: donData.clientsRef,
                        tenBang: "DonDangKyNhanHieu",
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

        // ✅ Gắn SPDV
        if (Array.isArray(maSPDVList)) {
            for (const maSPDV of maSPDVList) {
                await DonDK_SPDV.create(
                    {
                        maDonDangKy: newDon.maDonDangKy,
                        maSPDV,
                    },
                    { transaction }
                );
            }
        }

        // ✅ Tạo lịch sử thẩm định
        const insertLichSu = async (items, loaiThamDinh) => {
            if (Array.isArray(items)) {
                for (const item of items) {
                    await LichSuThamDinh.create(
                        {
                            maDonDangKy,
                            loaiThamDinh,
                            lanThamDinh: item.lanThamDinh,
                            ngayNhanThongBaoTuChoiTD: item.ngayNhanThongBaoTuChoiTD,
                            ketQuaThamDinh: "KhongDat",
                            hanTraLoi: item.hanTraLoi || null,
                            giaHan: item.giaHan || false,
                            ngayGiaHan: item.ngayGiaHan || null,
                            hanTraLoiGiaHan: item.hanTraLoiGiaHan || null,
                            ngayTraLoiThongBaoTuChoi: item.ngayTraLoiThongBaoTuChoi || null,
                            ghiChu: item.ghiChu || null,
                            trangThaiBiNhanQuyetDinhTuChoi: item.trangThaiBiNhanQuyetDinhTuChoi || false,
                            ngayNhanQuyetDinhTuChoi: item.ngayNhanQuyetDinhTuChoi,
                            hanKhieuNaiCSHTT: item.hanKhieuNaiCSHTT,
                            ngayKhieuNaiCSHTT: item.ngayKhieuNaiCSHTT,
                            ketQuaKhieuNaiCSHTT: item.ketQuaKhieuNaiCSHTT,
                            ngayKQ_KN_CSHTT: item.ngayKQ_KN_CSHTT,
                            ghiChuKetQuaKNCSHTT: item.ghiChuKetQuaKNCSHTT,
                            hanKhieuNaiBKHCN: item.hanKhieuNaiBKHCN,
                            ngayKhieuNaiBKHCN: item.ngayKhieuNaiBKHCN,
                            ketQuaKhieuNaiBKHCN: item.ketQuaKhieuNaiBKHCN,
                            ngayKQ_KN_BKHCN: item.ngayKQ_KN_BKHCN,
                            ghiChuKetQuaKNBKHCN: item.ghiChuKetQuaKNBKHCN,
                            ngayNopYeuCauSauKN: item.ngayNopYeuCauSauKN,
                        },
                        { transaction }
                    );
                }
            }
        };

        await insertLichSu(lichSuThamDinhHT, "HT");
        await insertLichSu(lichSuThamDinhND, "ND");

        // ✅ Cập nhật hạn xử lý, hạn trả lời
        const hanXuLy = await tinhHanXuLy(newDon);
        const hanTraLoi = await tinhHanTraLoi(newDon, transaction);
        await newDon.update({ hanXuLy, hanTraLoi }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: "Tạo đơn đăng ký thành công",
            don: newDon,
        });
    } catch (err) {
        await transaction.rollback();

        if (err.name === "SequelizeValidationError") {
            const messages = err.errors.map((e) => ({
                field: e.path,
                message: e.message,
            }));
            console.log("❌ SequelizeValidationError:", messages);
            return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: messages });
        } else {
            console.error("❌ Lỗi khác:", err);
            return res.status(500).json({ message: err.message });
        }
    }
};



export const updateApplication = async (req, res) => {
    const t = await DonDangKy.sequelize.transaction();
    try {
        const { maDonDangKy, maHoSo, laDonTiepNhan, taiLieus, vuViecs, maSPDVList, lichSuThamDinhHT, lichSuThamDinhND, maNhanHieu, maNhanSuCapNhap, nhanHieu, maNguoiXuLy1, maNguoiXuLy2, idSoBangOld, donSuaDoi, donTach, ...updateData } = req.body;
        //  idHoSoVuViec: idHoSoVuViec,
        if (!maDonDangKy) {
            await t.rollback();
            return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });
        }

        const don = await DonDangKy.findOne({
            where: { maDonDangKy },
            transaction: t,
        });

        if (!don) {
            await t.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        }

        // Chặn cập nhật tiến trình thẩm định nếu đơn đã bị đóng băng (donGoc == 1)
        if (Number(don.donGoc) === 1 || don.donGoc === true) {
            await t.rollback();
            return res.status(400).json({
                message: "Đơn đăng ký gốc này đã bị đóng băng (do đã sửa đổi / chuyển nhượng được chấp thuận), không thể cập nhật tiến trình thẩm định!",
            });
        }

        // Chuẩn hóa các trường cho phép null (hỗ trợ Đơn tiếp nhận)
        if (maHoSo !== undefined) {
            const cleanMaHoSo = maHoSo && String(maHoSo).trim() !== "" ? String(maHoSo).trim() : null;
            updateData.maHoSo = cleanMaHoSo;
            updateData.maHoSoVuViec = cleanMaHoSo;
        } else if (updateData.maHoSoVuViec !== undefined) {
            updateData.maHoSoVuViec =
                updateData.maHoSoVuViec && String(updateData.maHoSoVuViec).trim() !== ""
                    ? String(updateData.maHoSoVuViec).trim()
                    : null;
        }
        if (updateData.idKhachHang !== undefined) {
            updateData.idKhachHang =
                updateData.idKhachHang !== null && String(updateData.idKhachHang).trim() !== ""
                    ? Number(updateData.idKhachHang)
                    : null;
        }
        if (updateData.idDoiTac !== undefined) {
            updateData.idDoiTac =
                updateData.idDoiTac !== null && String(updateData.idDoiTac).trim() !== ""
                    ? Number(updateData.idDoiTac)
                    : null;
        }
        if (laDonTiepNhan !== undefined) {
            updateData.laDonTiepNhan = Boolean(laDonTiepNhan);
        }

        const changedFields = [];
        if (maNhanSuCapNhap) {
            updateData.maNhanSuCapNhap = maNhanSuCapNhap;
        }

        for (const key in updateData) {
            if (
                updateData[key] !== undefined &&
                updateData[key] !== don[key]
            ) {
                changedFields.push({
                    field: key,
                    oldValue: don[key],
                    newValue: updateData[key],
                });
                don[key] = updateData[key];
            }
        }
        if (nhanHieu && maNhanHieu) {
            const nhanHieuInstance = await NhanHieu.findByPk(maNhanHieu, { transaction: t });
            if (nhanHieuInstance) {
                if (nhanHieu.tenNhanHieu !== undefined) nhanHieuInstance.tenNhanHieu = nhanHieu.tenNhanHieu;
                if (nhanHieu.linkAnh !== undefined) nhanHieuInstance.linkAnh = nhanHieu.linkAnh;
                await nhanHieuInstance.save({ transaction: t });
            }
        }
        // Kiểm tra logic giấy ủy quyền gốc và mã ủy quyền
        if (updateData.giayUyQuyenGoc === false && !updateData.maUyQuyen) {
            await t.rollback();
            return res.status(400).json({ message: "Vui lòng chọn giấy ủy quyền khi không phải là bản gốc." });
        }

        if (updateData.giayUyQuyenGoc === true) {
            updateData.maUyQuyen = null; // reset nếu là bản gốc
        }
        const updatePayload = { ...updateData };
        if (maNhanHieu !== undefined) updatePayload.maNhanHieu = maNhanHieu;
        if (maNguoiXuLy1 !== undefined) updatePayload.maNguoiXuLy1 = maNguoiXuLy1 || null;
        if (maNguoiXuLy2 !== undefined) updatePayload.maNguoiXuLy2 = maNguoiXuLy2 || null;
        await don.update(updatePayload, { transaction: t });
        let idGCN_NH = null;

        if (
            updateData.soBang
        ) {
            const actualMaHoSo = maHoSo || updateData.maHoSoVuViec || don.maHoSo || don.maHoSoVuViec || null;
            if (don.idGCN_NH) {
                const gcn = await GCN_NH.findByPk(don.idGCN_NH, { transaction: t });
                if (gcn) {
                    const effectiveNgayNopDon = don.ngayNopDon || gcn.ngayNopDon;
                    const resolvedGCNDates = resolveGCNDatesForSave({
                        ngayNopDon: effectiveNgayNopDon,
                        ngayHetHanBang: updateData.ngayHetHanBang !== undefined ? updateData.ngayHetHanBang : gcn.ngayHetHanBang,
                        hanGiaHan: updateData.hanGiaHan !== undefined ? updateData.hanGiaHan : gcn.hanGiaHan,
                    });
                    await gcn.update({
                        soBang: updateData.soBang || gcn.soBang,
                        quyetDinhSo: updateData.quyetDinhSo || gcn.quyetDinhSo,
                        ngayCapBang: updateData.ngayCapBang || gcn.ngayCapBang,
                        ngayHetHanBang: resolvedGCNDates.ngayHetHanBang,
                        hanGiaHan: resolvedGCNDates.hanGiaHan,
                        ngayGuiBangChoKhachHang: updateData.ngayGuiBangChoKhachHang || gcn.ngayGuiBangChoKhachHang,
                        maNhanHieu: updateData.maNhanHieu || gcn.maNhanHieu,
                        trangThaiDon: updateData.trangThaiDon || gcn.trangThaiDon,
                        soDon: don.soDon,
                        idKhachHang: don.idKhachHang,
                        idDoiTac: don.idDoiTac,
                        ngayNopDon: effectiveNgayNopDon,
                        clientsRef: don.clientsRef,
                        maHoSo: actualMaHoSo || gcn.maHoSo
                    }, { transaction: t });
                }
                idGCN_NH = don.idGCN_NH;
            } else {
                // 🔹 Nếu chưa có thì tạo mới
                const resolvedGCNDates = resolveGCNDatesForSave({
                    ngayNopDon: don.ngayNopDon,
                    ngayHetHanBang: updateData.ngayHetHanBang,
                    hanGiaHan: updateData.hanGiaHan,
                });
                const newGCN = await GCN_NH.create({
                    maDonDangKy: maDonDangKy,
                    soBang: updateData.soBang || null,
                    quyetDinhSo: updateData.quyetDinhSo || null,
                    ngayCapBang: updateData.ngayCapBang || null,
                    ngayHetHanBang: resolvedGCNDates.ngayHetHanBang,
                    hanGiaHan: resolvedGCNDates.hanGiaHan,
                    ngayGuiBangChoKhachHang: updateData.ngayGuiBangChoKhachHang || null,
                    idKhachHang: don.idKhachHang,
                    idDoiTac: don.idDoiTac,
                    maHoSo: actualMaHoSo,
                    clientsRef: don.clientsRef,
                    maNhanHieu: maNhanHieu,
                    maQuocGia: "VN",
                    trangThaiDon: updateData.trangThaiDon || don.trangThaiDon,
                    soDon: don.soDon,
                    ngayNopDon: don.ngayNopDon,
                }, { transaction: t });

                idGCN_NH = newGCN.id;
            }
        }
        // ✅ Update lại DonDangKy
        if (idGCN_NH) {
            await don.update({ idGCN_NH }, { transaction: t });
        }
        if (updateData.idGUQ) {
            const guq = await GiayUyQuyen.findByPk(updateData.idGUQ, { transaction: t });

            if (guq) {
                const isEmptySoDonGoc =
                    guq.soDonGoc === null ||
                    guq.soDonGoc === undefined ||
                    (typeof guq.soDonGoc === "string" && guq.soDonGoc.trim() === "");

                if (isEmptySoDonGoc && updateData.soDon) {
                    await guq.update(
                        { soDonGoc: updateData.soDon },
                        { transaction: t }
                    );
                }
            }
        }
        const taiLieusHienTai = await TaiLieu.findAll({
            where: { maDonDangKy },
            transaction: t
        });

        const maTaiLieusTruyenLen = taiLieus?.filter(tl => tl.maTaiLieu).map(tl => tl.maTaiLieu) || [];

        for (const taiLieuCu of taiLieusHienTai) {
            if (!maTaiLieusTruyenLen.includes(taiLieuCu.maTaiLieu)) {
                await taiLieuCu.destroy({ transaction: t });
            }
        }

        if (Array.isArray(taiLieus)) {
            for (const taiLieu of taiLieus) {
                if (taiLieu.maTaiLieu) {
                    await TaiLieu.update({
                        tenTaiLieu: taiLieu.tenTaiLieu,
                        linkTaiLieu: taiLieu.linkTaiLieu,
                        trangThai: taiLieu.trangThai,
                    }, {
                        where: { maTaiLieu: taiLieu.maTaiLieu },
                        transaction: t
                    });
                } else {
                    await TaiLieu.create({
                        tenTaiLieu: taiLieu.tenTaiLieu,
                        linkTaiLieu: taiLieu.linkTaiLieu,
                        trangThai: taiLieu.trangThai,
                        maDonDangKy: maDonDangKy
                    }, { transaction: t });
                }
            }
        }
        // ==================== Đồng bộ Vụ Việc ====================
        const effectiveMaHoSoForVV = don.maHoSo || (maHoSo && String(maHoSo).trim() !== "" ? String(maHoSo).trim() : null);
        if (Array.isArray(vuViecs) && effectiveMaHoSoForVV) {
            const vuViecsHienTai = await VuViec.findAll({
                where: { maHoSo: effectiveMaHoSoForVV },
                transaction: t
            });

            const idVuViecsTruyenLen = vuViecs
                .filter(vv => vv.id)
                .map(vv => vv.id);

            for (const vuViecCu of vuViecsHienTai) {
                if (!idVuViecsTruyenLen.includes(vuViecCu.id)) {
                    await vuViecCu.destroy({ transaction: t });
                }
            }

            // Thêm mới hoặc cập nhật vụ việc
            for (const vuViec of vuViecs) {
                if (!don.idKhachHang) continue;
                let ngayXuatBill = null;
                let maNguoiXuatBill = null;
                if (vuViec.xuatBill === true) {
                    ngayXuatBill = new Date();
                    maNguoiXuatBill = maNhanSuCapNhap
                }
                if (vuViec.id) {
                    // ✅ chỉ update các field có thể thay đổi
                    await VuViec.update(
                        {
                            tenVuViec: vuViec.tenVuViec,
                            moTa: vuViec.moTa,
                            trangThai: vuViec.trangThai,
                            maHoSo: effectiveMaHoSoForVV,
                            maDon: maDonDangKy,
                            soDon: don.soDon,
                            idKhachHang: don.idKhachHang,
                            idDoiTac: don.idDoiTac,
                            maQuocGiaVuViec: "VN",
                            ngayTaoVV: new Date(),
                            maNguoiXuLy: vuViec.maNguoiXuLy,
                            clientsRef: don.clientsRef,
                            tenBang: "DonDangKyNhanHieu",
                            deadline: vuViec.deadline,
                            softDeadline: vuViec.softDeadline,
                            xuatBill: vuViec.xuatBill,
                            ngayXuatBill: ngayXuatBill,
                            maNguoiXuatBill: maNguoiXuatBill,
                            soTien: vuViec.soTien,
                            loaiTienTe: vuViec.loaiTienTe,
                            isMainCase: vuViec.isMainCase,
                        },
                        {
                            where: { id: vuViec.id },
                            transaction: t
                        }
                    );
                } else {
                    // ✅ create thì set đầy đủ
                    await VuViec.create(
                        {
                            tenVuViec: vuViec.tenVuViec,
                            moTa: vuViec.moTa,
                            trangThai: vuViec.trangThai,
                            maHoSo: effectiveMaHoSoForVV,
                            maDon: maDonDangKy,
                            soDon: don.soDon,
                            idKhachHang: don.idKhachHang,
                            maQuocGiaVuViec: "VN",
                            ngayTaoVV: new Date(),
                            maNguoiXuLy: vuViec.maNguoiXuLy,
                            clientsRef: don.clientsRef,
                            tenBang: "DonDangKyNhanHieu",
                            deadline: vuViec.deadline,
                            softDeadline: vuViec.softDeadline,
                            xuatBill: vuViec.xuatBill,
                            ngayXuatBill: ngayXuatBill,
                            maNguoiXuatBill: maNguoiXuatBill,
                            soTien: vuViec.soTien,
                            loaiTienTe: vuViec.loaiTienTe,
                            isMainCase: vuViec.isMainCase,
                        },
                        { transaction: t }
                    );
                }
            }
        }
        if (Array.isArray(maSPDVList)) {
            await DonDK_SPDV.destroy({
                where: { maDonDangKy },
                transaction: t
            });
            for (const maSPDV of maSPDVList) {
                await DonDK_SPDV.create({
                    maDonDangKy,
                    maSPDV
                }, { transaction: t });
            }
        }
        if (Array.isArray(lichSuThamDinhHT) || Array.isArray(lichSuThamDinhND)) {
            await LichSuThamDinh.destroy({
                where: { maDonDangKy },
                transaction: t
            });
        }

        if (Array.isArray(lichSuThamDinhHT)) {
            for (const item of lichSuThamDinhHT) {
                await LichSuThamDinh.create({
                    maDonDangKy,
                    loaiThamDinh: item.loaiThamDinh,
                    lanThamDinh: item.lanThamDinh,
                    ngayNhanThongBaoTuChoiTD: item.ngayNhanThongBaoTuChoiTD,
                    ketQuaThamDinh: "KhongDat",
                    hanTraLoi: item.hanTraLoi || null,
                    giaHan: item.giaHan || false,
                    ngayGiaHan: item.ngayGiaHan || null,
                    hanTraLoiGiaHan: item.hanTraLoiGiaHan || null,
                    ghiChu: item.ghiChu || null,
                    ngayTraLoiThongBaoTuChoi: item.ngayTraLoiThongBaoTuChoi || null,
                    trangThaiBiNhanQuyetDinhTuChoi: item.trangThaiBiNhanQuyetDinhTuChoi || false,
                    ngayNhanQuyetDinhTuChoi: item.ngayNhanQuyetDinhTuChoi,

                    hanKhieuNaiCSHTT: item.hanKhieuNaiCSHTT,
                    ngayKhieuNaiCSHTT: item.ngayKhieuNaiCSHTT,
                    ketQuaKhieuNaiCSHTT: item.ketQuaKhieuNaiCSHTT,
                    ngayKQ_KN_CSHTT: item.ngayKQ_KN_CSHTT,
                    ghiChuKetQuaKNCSHTT: item.ghiChuKetQuaKNCSHTT,

                    hanKhieuNaiBKHCN: item.hanKhieuNaiBKHCN,
                    ngayKhieuNaiBKHCN: item.ngayKhieuNaiBKHCN,
                    ketQuaKhieuNaiBKHCN: item.ketQuaKhieuNaiBKHCN,
                    ngayKQ_KN_BKHCN: item.ngayKQ_KN_BKHCN,
                    ghiChuKetQuaKNBKHCN: item.ghiChuKetQuaKNBKHCN,

                    ngayNopYeuCauSauKN: item.ngayNopYeuCauSauKN
                }, { transaction: t });
            }
        }

        if (Array.isArray(lichSuThamDinhND)) {
            for (const item of lichSuThamDinhND) {
                await LichSuThamDinh.create({
                    maDonDangKy,
                    loaiThamDinh: item.loaiThamDinh,
                    lanThamDinh: item.lanThamDinh,
                    ngayNhanThongBaoTuChoiTD: item.ngayNhanThongBaoTuChoiTD,
                    ketQuaThamDinh: "KhongDat",
                    hanTraLoi: item.hanTraLoi || null,
                    giaHan: item.giaHan || false,
                    ngayGiaHan: item.ngayGiaHan || null,
                    hanTraLoiGiaHan: item.hanTraLoiGiaHan || null,
                    ghiChu: item.ghiChu || null,
                    ngayTraLoiThongBaoTuChoi: item.ngayTraLoiThongBaoTuChoi || null,
                    trangThaiBiNhanQuyetDinhTuChoi: item.trangThaiBiNhanQuyetDinhTuChoi || false,
                    ngayNhanQuyetDinhTuChoi: item.ngayNhanQuyetDinhTuChoi,

                    hanKhieuNaiCSHTT: item.hanKhieuNaiCSHTT,
                    ngayKhieuNaiCSHTT: item.ngayKhieuNaiCSHTT,
                    ketQuaKhieuNaiCSHTT: item.ketQuaKhieuNaiCSHTT,
                    ngayKQ_KN_CSHTT: item.ngayKQ_KN_CSHTT,
                    ghiChuKetQuaKNCSHTT: item.ghiChuKetQuaKNCSHTT,

                    hanKhieuNaiBKHCN: item.hanKhieuNaiBKHCN,
                    ngayKhieuNaiBKHCN: item.ngayKhieuNaiBKHCN,
                    ketQuaKhieuNaiBKHCN: item.ketQuaKhieuNaiBKHCN,
                    ngayKQ_KN_BKHCN: item.ngayKQ_KN_BKHCN,
                    ghiChuKetQuaKNBKHCN: item.ghiChuKetQuaKNBKHCN,

                    ngayNopYeuCauSauKN: item.ngayNopYeuCauSauKN
                }, { transaction: t });
            }
        }
        if (donSuaDoi) {
            const ds = donSuaDoi;
            if (ds.id) {
                const existingDS = await DonSuaDoi_NH_VN.findByPk(ds.id, { transaction: t });
                if (existingDS) {
                    await existingDS.update({
                        soDon: ds.soDon || existingDS.soDon,
                        ngayYeuCau: ds.ngayYeuCau || existingDS.ngayYeuCau,
                        lanSuaDoi: ds.lanSuaDoi ?? existingDS.lanSuaDoi,
                        ngayGhiNhanSuaDoi: ds.ngayGhiNhanSuaDoi || existingDS.ngayGhiNhanSuaDoi,
                        duocGhiNhanSuaDoi: ds.duocGhiNhanSuaDoi ?? existingDS.duocGhiNhanSuaDoi,
                        moTa: ds.moTa || existingDS.moTa,
                        suaDoiDaiDien: ds.suaDoiDaiDien ?? existingDS.suaDoiDaiDien,
                        ndSuaDoiDaiDien: ds.ndSuaDoiDaiDien || existingDS.ndSuaDoiDaiDien,
                        suaDoiTenChuDon: ds.suaDoiTenChuDon ?? existingDS.suaDoiTenChuDon,
                        ndSuaDoiTenChuDon: ds.ndSuaDoiTenChuDon || existingDS.ndSuaDoiTenChuDon,
                        suaDoiDiaChi: ds.suaDoiDiaChi ?? existingDS.suaDoiDiaChi,
                        ndSuaDoiDiaChi: ds.ndSuaDoiDiaChi || existingDS.ndSuaDoiDiaChi,
                        suaNhan: ds.suaNhan ?? existingDS.suaNhan,
                        ndSuaNhan: ds.ndSuaNhan || existingDS.ndSuaNhan,
                        suaNhomSPDV: ds.suaNhomSPDV ?? existingDS.suaNhomSPDV,
                        ndSuaNhomSPDV: ds.ndSuaNhomSPDV || existingDS.ndSuaNhomSPDV,
                        suaDoiNoiDungKhac: ds.suaDoiNoiDungKhac ?? existingDS.suaDoiNoiDungKhac,
                        trangThaiDuyet: ds.trangThaiDuyet ?? existingDS.trangThaiDuyet,
                        ngayChapThuan: ds.ngayChapThuan !== undefined ? ds.ngayChapThuan : existingDS.ngayChapThuan,
                        ngayTuChoi: ds.ngayTuChoi !== undefined ? ds.ngayTuChoi : existingDS.ngayTuChoi,
                        lyDoTuChoi: ds.lyDoTuChoi !== undefined ? ds.lyDoTuChoi : existingDS.lyDoTuChoi,
                        duLieuThayDoi: ds.duLieuThayDoi !== undefined ? ds.duLieuThayDoi : existingDS.duLieuThayDoi,
                        maNhanSuCapNhap: maNhanSuCapNhap || existingDS.maNhanSuCapNhap
                    }, { transaction: t });

                    if (Number(ds.trangThaiDuyet) === 1 && !existingDS.maDonDangKy) {
                        await approveDonSuaDoi_NH_VN(existingDS, ds, t);
                    } else if (
                        ds.trangThaiDuyet !== undefined &&
                        ds.trangThaiDuyet !== null &&
                        (Number(ds.trangThaiDuyet) === 2 || Number(ds.trangThaiDuyet) === 0)
                    ) {
                        await rollbackSpawnedChildDon(existingDS, t);
                    }
                }
            }
        }
        if (donTach) {
            const ds = donTach;
            if (ds.id) {

                const existingDS = await DonTachNH_VN.findByPk(ds.id, { transaction: t });
                if (existingDS) {
                    await existingDS.update({
                        soDon: ds.soDon || existingDS.soDon,
                        dsNhomSPDV: ds.dsNhomSPDV || existingDS.dsNhomSPDV,
                        ngayYeuCau: ds.ngayYeuCauTD || existingDS.ngayYeuCauTD,
                        lanTachDon: ds.lanTachDon ?? existingDS.lanTachDon,
                        ngayGhiNhanTachDon: ds.ngayGhiNhanTD || existingDS.ngayGhiNhanTD,
                        ndTachDon: ds.ndTachDon ?? existingDS.ndTachDon,
                        moTa: ds.moTa || existingDS.moTa,
                        maNhanSuCapNhap: maNhanSuCapNhap || existingDS.maNhanSuCapNhap
                    }, { transaction: t });
                }
            }
        }
        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhập đơn đăng ký",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhập đơn đăng ký'${don.soDon || don.maDonDangKy}'`,
                data: {
                    maDonDangKy,
                    changes: changedFields,
                },
            });

        }
        const hanXuLy = await tinhHanXuLy(don);
        const hanTraLoi = await tinhHanTraLoi(don, t);

        await don.update({ hanXuLy, hanTraLoi, idGCN_NH: don.idGCN_NH }, { transaction: t });
        await t.commit();
        res.json({ message: "Cập nhật đơn thành công", data: don });
    } catch (error) {
        await t.rollback();
        if (error.name === "SequelizeValidationError") {
            const messages = error.errors.map((e) => ({
                field: e.path,
                message: e.message,
            }));
            console.log("❌ SequelizeValidationError:", messages);
            return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: messages });
        } else {
            console.error("❌ Lỗi khác:", error);
            return res.status(500).json({ message: error.message });
        }
    }

};

export const deleteApplication = async (req, res) => {
    const transaction = await DonDangKy.sequelize.transaction();
    try {
        const { maDonDangKy, maNhanSuCapNhap } = req.body;

        if (!maDonDangKy) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });
        }

        const don = await DonDangKy.findByPk(maDonDangKy, { transaction });
        if (!don) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        }

        // 1. Kiểm tra xem đơn này có phải là đơn nhận chuyển quyền hay không (tìm trong bảng DonCQSH_VN)
        const donCQ = await DonCQSH_VN.findOne({
            where: { maDonDangKy: maDonDangKy },
            transaction,
        });

        if (donCQ) {
            // === TRƯỜNG HỢP: ĐƠN NHẬN CHUYỂN QUYỀN SỞ HỮU ===
            const maDonGoc = donCQ.maDonDangKyGoc;
            const donCu = await DonDangKy.findByPk(maDonGoc, { transaction });

            // 1. Xóa bản ghi chuyển quyền tương ứng trong bảng DonCQSH_VN
            await donCQ.destroy({ transaction });

            // 2. Xóa các vụ việc (VuViec) và giải phóng phân công nhân sự (NhanSu_VuViec) liên kết với đơn mới
            const vuViecs = await VuViec.findAll({
                where: {
                    [Op.or]: [
                        { maDon: don.maDonDangKy },
                        ...(don.id ? [{ maDon: don.id }] : []),
                        ...(don.maHoSo ? [{ maHoSo: don.maHoSo, tenBang: "DonDangKy" }] : []),
                        ...(don.soDon ? [{ soDon: don.soDon, tenBang: "DonDangKy" }] : []),
                    ]
                },
                transaction
            });

            if (vuViecs && vuViecs.length > 0) {
                const vuViecIds = vuViecs.map(v => v.id);
                await NhanSu_VuViec.destroy({
                    where: { idVuViec: { [Op.in]: vuViecIds } },
                    transaction
                }).catch(() => {});

                await VuViec.destroy({
                    where: { id: { [Op.in]: vuViecIds } },
                    transaction
                });
            }

            // 3. Xóa tài liệu, sản phẩm dịch vụ và lịch sử thẩm định liên kết với đơn mới
            await TaiLieu.destroy({ where: { maDonDangKy }, transaction });
            await DonDK_SPDV.destroy({ where: { maDonDangKy }, transaction }).catch(() => {});
            await LichSuThamDinh.destroy({ where: { maDonDangKy }, transaction }).catch(() => {});

            // 4. Xóa bản ghi đơn mới
            await don.destroy({ transaction });

            // 5. Hoàn trả lại quyền sở hữu đơn cho chủ cũ
            if (donCu) {
                // Khôi phục trạng thái đơn hợp lệ trước khi chuyển quyền
                const trangThaiDonKhoiPhuc = (donCu.trangThaiDon === "Đã chuyển quyền" || !donCu.trangThaiDon)
                    ? (donCu.soDon ? "Thẩm định hình thức" : "Đang giải quyết")
                    : donCu.trangThaiDon;

                await donCu.update(
                    {
                        donGoc: 0, // Đơn cũ trở lại thành đơn hoạt động chính thức
                        trangThaiVuViec: "1", // 1 = Đang giải quyết
                        trangThaiDon: trangThaiDonKhoiPhuc,
                    },
                    { transaction }
                );
            }

            await transaction.commit();

            // Gửi thông báo nếu có
            if (maNhanSuCapNhap) {
                sendGenericNotification({
                    maNhanSuCapNhap,
                    title: "Hủy chuyển quyền & Hoàn trả đơn",
                    bodyTemplate: (tenNhanSu) =>
                        `${tenNhanSu} đã xóa đơn nhận chuyển quyền '${don.soDon || maDonDangKy}' và hoàn trả lại cho đơn gốc '${donCu?.soDon || maDonGoc}'`,
                    data: { maDonDangKy, maDonGoc },
                }).catch(() => {});
            }

            return res.status(200).json({
                message: "Đã xóa đơn chuyển quyền và hoàn trả đơn lại cho chủ cũ thành công!",
                data: {
                    maDonDangKyMoi: maDonDangKy,
                    maDonDangKyCu: maDonGoc,
                }
            });
        }

        // =========================================================================
        // 2. KIỂM TRA ĐƠN TÁCH (bảng DonTachNH_VN - vai trò là đơn tách mới maDonDangKy)
        // =========================================================================
        const donTach = await DonTachNH_VN.findOne({
            where: { maDonDangKy: maDonDangKy },
            transaction,
        });

        if (donTach) {
            // === TRƯỜNG HỢP: ĐƠN TÁCH (TỜ KHAI TÁCH ĐƠN ĐĂNG KÝ NHÃN HIỆU) ===
            const maDonGoc = donTach.maDonDangKyGoc;
            const donCu = await DonDangKy.findByPk(maDonGoc, { transaction });

            // 1. Xóa bản ghi liên kết trong bảng DonTachNH_VN
            await donTach.destroy({ transaction });

            // 2. Xóa các vụ việc (VuViec) và giải phóng phân công nhân sự (NhanSu_VuViec) liên kết với đơn tách
            const vuViecs = await VuViec.findAll({
                where: {
                    [Op.or]: [
                        { maDon: don.maDonDangKy },
                        ...(don.id ? [{ maDon: don.id }] : []),
                        ...(don.maHoSo ? [{ maHoSo: don.maHoSo, tenBang: "DonDangKy" }] : []),
                        ...(don.soDon ? [{ soDon: don.soDon, tenBang: "DonDangKy" }] : []),
                    ]
                },
                transaction
            });

            if (vuViecs && vuViecs.length > 0) {
                const vuViecIds = vuViecs.map(v => v.id);
                await NhanSu_VuViec.destroy({
                    where: { idVuViec: { [Op.in]: vuViecIds } },
                    transaction
                }).catch(() => {});

                await VuViec.destroy({
                    where: { id: { [Op.in]: vuViecIds } },
                    transaction
                });
            }

            // 3. Xóa các nhóm SPDV liên kết, tài liệu và lịch sử thẩm định của đơn tách
            await DonDK_SPDV.destroy({ where: { maDonDangKy }, transaction }).catch(() => {});
            await TaiLieu.destroy({ where: { maDonDangKy }, transaction });
            await LichSuThamDinh.destroy({ where: { maDonDangKy }, transaction }).catch(() => {});

            // 4. Xóa bản ghi đơn tách trong bảng DonDangKy
            await don.destroy({ transaction });

            // 5. Cập nhật lại đơn gốc (nếu có đánh dấu trạng thái tách đơn)
            if (donCu) {
                const remainingDonTach = await DonTachNH_VN.count({
                    where: { maDonDangKyGoc: maDonGoc },
                    transaction
                });

                if (remainingDonTach === 0) {
                    const updateData = {};
                    if (donCu.donGoc === 1) updateData.donGoc = 0;
                    if (donCu.trangThaiDon === "Đã tách đơn") {
                        updateData.trangThaiDon = donCu.soDon ? "Thẩm định hình thức" : "Đang giải quyết";
                    }
                    if (donCu.trangThaiVuViec === "Đã tách đơn") {
                        updateData.trangThaiVuViec = "1";
                    }
                    if (Object.keys(updateData).length > 0) {
                        await donCu.update(updateData, { transaction });
                    }
                }
            }

            await transaction.commit();

            // Gửi thông báo nếu có
            if (maNhanSuCapNhap) {
                sendGenericNotification({
                    maNhanSuCapNhap,
                    title: "Xóa đơn tách",
                    bodyTemplate: (tenNhanSu) =>
                        `${tenNhanSu} đã xóa đơn tách '${don.soDon || maDonDangKy}' liên kết từ đơn gốc '${donCu?.soDon || maDonGoc}'`,
                    data: { maDonDangKy, maDonGoc },
                }).catch(() => {});
            }

            return res.status(200).json({
                message: "Xóa đơn tách thành công!",
                data: {
                    maDonDangKy,
                    maDonDangKyGoc: maDonGoc,
                }
            });
        }

        // === TRƯỜNG HỢP: ĐƠN THÔNG THƯỜNG ===
        // Kiểm tra xem đơn này có đang là đơn gốc của các đơn tách con không
        const countDonTachCon = await DonTachNH_VN.count({
            where: { maDonDangKyGoc: maDonDangKy },
            transaction
        });
        if (countDonTachCon > 0) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Đơn đăng ký đang là đơn gốc của ${countDonTachCon} đơn tách, vui lòng xóa các đơn tách trước khi xóa đơn gốc!`
            });
        }

        // Kiểm tra xem đơn này có đang là đơn gốc của đơn chuyển quyền không
        const countCQCon = await DonCQSH_VN.count({
            where: { maDonDangKyGoc: maDonDangKy },
            transaction
        });
        if (countCQCon > 0) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Đơn đăng ký đang có hồ sơ chuyển quyền sở hữu liên kết, vui lòng xóa hồ sơ chuyển quyền trước khi xóa đơn gốc!"
            });
        }
        // Xóa các vụ việc và giải phóng nhân sự liên quan nếu có
        const vuViecs = await VuViec.findAll({
            where: {
                [Op.or]: [
                    { maDon: don.maDonDangKy },
                    ...(don.id ? [{ maDon: don.id }] : []),
                    ...(don.maHoSo ? [{ maHoSo: don.maHoSo, tenBang: "DonDangKy" }] : []),
                ]
            },
            transaction
        });

        if (vuViecs && vuViecs.length > 0) {
            const vuViecIds = vuViecs.map(v => v.id);
            await NhanSu_VuViec.destroy({
                where: { idVuViec: { [Op.in]: vuViecIds } },
                transaction
            }).catch(() => {});

            await VuViec.destroy({
                where: { id: { [Op.in]: vuViecIds } },
                transaction
            });
        }

        // Xóa tài liệu, sản phẩm dịch vụ và lịch sử thẩm định
        await TaiLieu.destroy({ where: { maDonDangKy }, transaction });
        await DonDK_SPDV.destroy({ where: { maDonDangKy }, transaction }).catch(() => {});
        await LichSuThamDinh.destroy({ where: { maDonDangKy }, transaction }).catch(() => {});

        // Xóa bản ghi đơn
        await don.destroy({ transaction });

        await transaction.commit();

        if (maNhanSuCapNhap) {
            sendGenericNotification({
                maNhanSuCapNhap,
                title: "Xóa đơn đăng ký",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã xóa đơn đăng ký '${don.soDon || maDonDangKy}'`,
                data: { maDonDangKy },
            }).catch(() => {});
        }

        return res.status(200).json({ message: "Đã xoá đơn đăng ký và tài liệu liên quan thành công!" });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Đơn đăng ký đang được sử dụng ở các dữ liệu liên quan khác, không thể xóa." });
        }

        console.error("❌ Lỗi khi xóa đơn đăng ký:", error);
        return res.status(500).json({ message: error.message });
    }
};


export const getFullApplicationDetail = async (req, res) => {
    try {
        const { maDonDangKy, soDon } = req.body;

        if (!maDonDangKy && !soDon) {
            return res.status(400).json({ message: "Thiếu maDonDangKy hoặc soDon" });
        }

        const where = maDonDangKy ? { maDonDangKy } : { soDon };

        const don = await DonDangKy.findOne({
            where,
            include: [
                {
                    model: TaiLieu,
                    as: "taiLieu",
                    required: false,
                    attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"],
                },
                {
                    model: DonDK_SPDV,
                    as: "DonDK_SPDVs",
                    required: false,
                    attributes: ["maSPDV"],
                },
                {
                    model: NhanHieu,
                    as: "nhanHieu",
                    required: false,
                    attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh"],
                },
                {
                    model: LichSuThamDinh,
                    as: "lichSuThamDinh",
                    required: false,
                    attributes: { exclude: ["createdAt", "updatedAt"] },
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHang",
                    required: false,
                    attributes: ["id", "maKhachHang", "tenKhachHang", "diaChi", "sdt"],
                },
                {
                    model: GiayUyQuyen,
                    as: "GiayUyQuyen",
                    required: false,
                    attributes: ["id", "soDonGoc", "soGUQ"],
                }
            ],
        });

        if (!don) {
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        }

        const plainDon = don.toJSON();

        // Lấy danh sách vụ việc theo maHoSo
        if (plainDon.maHoSo) {
            const vuViecs = await VuViec.findAll({
                where: { maHoSo: plainDon.maHoSo },
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
                ],
                order: [["createdAt", "DESC"]],
            });
            plainDon.vuViec = vuViecs.map((v) => v.toJSON());
        } else {
            plainDon.vuViec = [];
        }

        // Tách lịch sử thẩm định hình thức / nội dung
        plainDon.lichSuThamDinhHT = [];
        plainDon.lichSuThamDinhND = [];
        if (Array.isArray(plainDon.lichSuThamDinh)) {
            for (const item of plainDon.lichSuThamDinh) {
                if (item.loaiThamDinh === "HinhThuc") {
                    plainDon.lichSuThamDinhHT.push(item);
                } else if (item.loaiThamDinh === "NoiDung") {
                    plainDon.lichSuThamDinhND.push(item);
                }
            }
        }
        delete plainDon.lichSuThamDinh;

        // List mã SPDV
        plainDon.maSPDVList = Array.isArray(plainDon.DonDK_SPDVs)
            ? plainDon.DonDK_SPDVs.map((sp) => sp.maSPDV)
            : [];
        delete plainDon.DonDK_SPDVs;

        /**
         * ====== PHẦN PHẢ HỆ & ĐƠN SỬA ĐỔI / TÁCH ĐƠN / CHUYỂN NHƯỢNG ======
         */
        await Promise.all([autoRejectExpiredDonSuaDoi(), autoRejectExpiredDonCQSH_VN()]);
        const graph = await getDonLineageGraph();
        const [lineageMap, pendingMap] = await Promise.all([
            buildDonLineageMetadataMap([plainDon.maDonDangKy], DonDangKy, graph),
            getDonPendingBienDongMap([plainDon.maDonDangKy]),
        ]);

        const meta = lineageMap.get(plainDon.maDonDangKy) || {};
        const bienDong = pendingMap.get(plainDon.maDonDangKy) || {
            dangSuaDoi: false,
            dangChuyenQuyen: false,
            trangThaiBienDong: null,
            dsBienDongChoDuyet: [],
        };

        plainDon.maDonDangKyGoc = meta.maDonDangKyGoc || null;
        plainDon.soDonGoc = meta.soDonGoc || null;
        plainDon.ngayNopDonGoc = meta.ngayNopDonGoc || null;
        plainDon.loaiBienDongGoc = meta.loaiBienDongGoc || null;
        plainDon.capDoGiaPha = meta.capDoGiaPha || 0;
        plainDon.maDonGocBanDau = meta.maDonGocBanDau || plainDon.maDonDangKy;
        plainDon.donCha = meta.donCha || null;
        plainDon.dangSuaDoi = bienDong.dangSuaDoi;
        plainDon.dangChuyenQuyen = bienDong.dangChuyenQuyen;
        plainDon.trangThaiBienDong = bienDong.trangThaiBienDong;
        plainDon.dsBienDongChoDuyet = bienDong.dsBienDongChoDuyet;

        // 1. Tờ khai sửa đổi của đơn hiện tại (hoặc tờ khai đang chờ duyệt trên đơn gốc này)
        const donSuaDoiHienTai = await DonSuaDoi_NH_VN.findOne({
            where: {
                [Op.or]: [
                    { maDonDangKy: plainDon.maDonDangKy },
                    { maDonDangKyGoc: plainDon.maDonDangKy, trangThaiDuyet: 0 },
                ],
            },
            order: [["id", "DESC"]],
        });
        if (donSuaDoiHienTai) {
            plainDon.donSuaDoi = donSuaDoiHienTai.toJSON();
        }

        // 2. Tờ khai tách đơn của đơn hiện tại (nếu là đơn tách loaiDon = 3)
        const donTachHienTai = await DonTachNH_VN.findOne({
            where: { maDonDangKy: plainDon.maDonDangKy },
            include: [
                {
                    model: DonDangKy,
                    as: "donGoc",
                    required: false,
                    attributes: ["maDonDangKy", "soDon", "ngayNopDon", "maHoSo", "maHoSoVuViec"],
                },
            ],
        });
        if (donTachHienTai) {
            plainDon.donTach = {
                ...donTachHienTai.toJSON(),
                soDonGoc: donTachHienTai.donGoc?.soDon || plainDon.soDonGoc || null,
                ngayNopDonGoc: donTachHienTai.donGoc?.ngayNopDon || plainDon.ngayNopDonGoc || null,
            };
        }

        // 3. Tờ khai chuyển quyền sở hữu của đơn hiện tại
        const donCQHienTai = await DonCQSH_VN.findOne({
            where: {
                [Op.or]: [
                    { maDonDangKy: plainDon.maDonDangKy },
                    { maDonDangKyGoc: plainDon.maDonDangKy, trangThaiDuyet: 0 },
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
        });
        if (donCQHienTai) {
            plainDon.donCQSH = donCQHienTai.toJSON();
        }

        // 4. Danh sách tờ khai liên quan đến đơn này hoặc trong cùng hồ sơ
        const [dsToKhaiSuaDoi, dsToKhaiChuyenQuyen, dsToKhaiTachDon] = await Promise.all([
            DonSuaDoi_NH_VN.findAll({
                where: {
                    [Op.or]: [
                        { maDonDangKyGoc: plainDon.maDonDangKy },
                        { maDonDangKy: plainDon.maDonDangKy },
                    ],
                },
                order: [["id", "DESC"]],
            }),
            DonCQSH_VN.findAll({
                where: {
                    [Op.or]: [
                        { maDonDangKyGoc: plainDon.maDonDangKy },
                        { maDonDangKy: plainDon.maDonDangKy },
                    ],
                },
                include: [
                    {
                        model: KhachHangCuoi,
                        as: "khachHangMoi",
                        required: false,
                        attributes: ["id", "tenKhachHang", "maKhachHang"],
                    },
                ],
                order: [["id", "DESC"]],
            }),
            DonTachNH_VN.findAll({
                where: {
                    [Op.or]: [
                        { maDonDangKyGoc: plainDon.maDonDangKy },
                        { maDonDangKy: plainDon.maDonDangKy },
                    ],
                },
                include: [
                    {
                        model: DonDangKy,
                        as: "donGoc",
                        required: false,
                        attributes: ["maDonDangKy", "soDon", "ngayNopDon"],
                    },
                ],
                order: [["id", "DESC"]],
            }),
        ]);

        plainDon.dsToKhaiSuaDoi = dsToKhaiSuaDoi.map((d) => d.toJSON());
        plainDon.dsToKhaiChuyenQuyen = dsToKhaiChuyenQuyen.map((d) => d.toJSON());
        plainDon.dsToKhaiTachDon = dsToKhaiTachDon.map((d) => ({
            ...d.toJSON(),
            soDonGoc: d.donGoc?.soDon || null,
            ngayNopDonGoc: d.donGoc?.ngayNopDon || null,
        }));

        // 5. Danh sách ĐƠN SỬA ĐỔI & ĐƠN CHUYỂN QUYỀN SỞ HỮU của tất cả đơn trong cùng hồ sơ
        plainDon.danhSachDonSuaDoi = [];
        plainDon.danhSachDonChuyenQuyen = [];
        let maDonListInScope = [plainDon.maDonDangKy];
        if (plainDon.maHoSo) {
            const dsDonCungHoSo = await DonDangKy.findAll({
                where: { maHoSo: plainDon.maHoSo },
                attributes: ["maDonDangKy"],
                raw: true,
            });
            maDonListInScope = [...new Set([...maDonListInScope, ...dsDonCungHoSo.map((d) => d.maDonDangKy)])];
        }

        if (maDonListInScope.length > 0) {
            const [dsDonSuaDoi, dsDonChuyenQuyen] = await Promise.all([
                DonSuaDoi_NH_VN.findAll({
                    where: {
                        [Op.or]: [
                            { maDonDangKy: { [Op.in]: maDonListInScope } },
                            { maDonDangKyGoc: { [Op.in]: maDonListInScope } },
                        ],
                    },
                    order: [["id", "DESC"]],
                }),
                DonCQSH_VN.findAll({
                    where: {
                        [Op.or]: [
                            { maDonDangKy: { [Op.in]: maDonListInScope } },
                            { maDonDangKyGoc: { [Op.in]: maDonListInScope } },
                        ],
                    },
                    include: [
                        {
                            model: KhachHangCuoi,
                            as: "khachHangMoi",
                            required: false,
                            attributes: ["id", "tenKhachHang", "maKhachHang"],
                        },
                    ],
                    order: [["id", "DESC"]],
                }),
            ]);

            plainDon.danhSachDonSuaDoi = dsDonSuaDoi.map((d) => ({
                id: d.id,
                soDon: d.soDon,
                maDonDangKy: d.maDonDangKy,
                maDonDangKyGoc: d.maDonDangKyGoc,
                ngayYeuCau: d.ngayYeuCau,
                ngayGhiNhanSuaDoi: Number(d.trangThaiDuyet) === 1 ? d.ngayGhiNhanSuaDoi : null,
                lanSuaDoi: d.lanSuaDoi,
                trangThaiDuyet: d.trangThaiDuyet,
                ngayChapThuan: Number(d.trangThaiDuyet) === 1 ? d.ngayChapThuan : null,
                ngayTuChoi: d.ngayTuChoi,
                lyDoTuChoi: d.lyDoTuChoi,
            }));

            plainDon.danhSachDonChuyenQuyen = dsDonChuyenQuyen.map((d) => ({
                id: d.id,
                soDon: d.soDon,
                loaiThayDoi: d.loaiThayDoi || "CHUYEN_NHUONG",
                maDonDangKy: d.maDonDangKy,
                maDonDangKyGoc: d.maDonDangKyGoc,
                ngayYeuCau: d.ngayYeuCau,
                ngayGhiNhanCQ: Number(d.trangThaiDuyet) === 1 ? d.ngayGhiNhanCQ : null,
                lanChuyenQuyen: d.lanChuyenQuyen,
                trangThaiDuyet: d.trangThaiDuyet,
                ngayChapThuan: Number(d.trangThaiDuyet) === 1 ? d.ngayChapThuan : null,
                ngayTuChoi: d.ngayTuChoi,
                lyDoTuChoi: d.lyDoTuChoi,
                hanTraLoi: d.hanTraLoi || null,
                tuDongTuChoi: Boolean(d.tuDongTuChoi),
                tenKhachHangMoi: d.khachHangMoi?.tenKhachHang || null,
            }));
        }

        // Gắn info khách hàng phẳng cho tiện frontend
        if (plainDon.khachHang) {
            plainDon.maKhachHang = plainDon.khachHang.maKhachHang;
            plainDon.tenKhachHang = plainDon.khachHang.tenKhachHang;
            plainDon.diaChi = plainDon.khachHang.diaChi;
            plainDon.sdt = plainDon.khachHang.sdt;
        }

        plainDon.clientRef = plainDon.clientsRef || null;
        return res.status(200).json(plainDon);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getApplicationsByMaKhachHang = async (req, res) => {
    try {
        const { maKhachHang } = req.body;

        if (!maKhachHang) {
            return res.status(400).json({ message: "Thiếu mã khách hàng" });
        }

        const applications = await DonDangKy.findAll({
            attributes: ['maDonDangKy', 'soDon'],
            where: {
                giayUyQuyenGoc: true
            },
            include: [
                {
                    model: HoSo_VuViec,
                    as: 'hoSoVuViec',
                    required: true,
                    attributes: [],
                    on: {
                        '$hoSoVuViec.maHoSoVuViec$': { [Op.eq]: Sequelize.col('DonDangKy.maHoSoVuViec') },
                        '$hoSoVuViec.maKhachHang$': maKhachHang
                    }
                }
            ]

        });
        if (!applications || applications.length === 0) {
            // return res.status(404).json({ message: "Không tìm thấy đơn nào" });
        }

        res.status(200).json(applications);
    } catch (error) {
        console.error("Lỗi getApplicationsByMaKhachHang:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getMaKhachHangByMaHoSoVuViec = async (req, res) => {
    try {
        const { maHoSoVuViec } = req.body;

        if (!maHoSoVuViec) {
            return res.status(400).json({ message: "Thiếu mã hồ sơ vụ việc" });
        }

        const hoSo = await HoSo_VuViec.findOne({
            where: { maHoSoVuViec },
            attributes: ['maKhachHang'],
        });

        if (!hoSo) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ vụ việc" });
        }

        res.status(200).json({ maKhachHang: hoSo.maKhachHang });
    } catch (error) {
        console.error("Lỗi getMaKhachHangByMaHoSoVuViec:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getApplicationsByGUQ = async (req, res) => {
    try {
        const { idGUQ } = req.body; // có thể là 1 id hoặc 1 mảng id

        if (!idGUQ || (Array.isArray(idGUQ) && idGUQ.length === 0)) {
            return res.status(400).json({ message: "Thiếu idGUQ" });
        }

        // Chuẩn hóa về mảng để dùng Op.in
        const idList = Array.isArray(idGUQ) ? idGUQ : [idGUQ];

        const applications = await DonDangKy.findAll({
            where: {
                idGUQ: {
                    [Op.in]: idList,
                },
            },
            attributes: ["maDonDangKy", "soDon"], // chỉ lấy 2 field này
        });

        return res.status(200).json({
            data: applications,
        });
    } catch (error) {
        console.error("Lỗi getApplicationsByGUQ:", error);
        return res.status(500).json({ message: error.message });
    }
};



import iconv from "iconv-lite";
import dayjs from "dayjs";

const fixVietnamese = (str) => {
    if (!str) return str;
    if (typeof str !== "string") return str;

    // Nếu không có pattern bể font → trả nguyên
    if (!/[ÃÂÊÔƠƯÐÃáàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/.test(str)) {
        return str;
    }

    try {
        return Buffer.from(str, "latin1").toString("utf8");
    } catch {
        return str;
    }
};

export const exportApplicationsToExcel = async (req, res) => {
    try {
        const {
            maSPDVList,
            trangThaiDon,
            trangThaiVuViec,
            trangThaiTaiLieu,
            loaiDon,
            searchText,
            fields = [],
            filterCondition = {},
            customerName,
            partnerName,
            brandName,
            maNguoiXuLy1,
            reportTitle = "BÁO CÁO DANH SÁCH ĐƠN ĐĂNG KÝ NHÃN HIỆU VIỆT NAM",
            reportFileName,
        } = req.body;

        // Lấy tất cả dữ liệu (không phân trang)
        const {
            selectedField,
            fromDate,
            toDate,
            hanXuLyFilter,
            hanTraLoiFilter,
        } = filterCondition;

        const whereCondition = {};

        if (trangThaiDon) {
            whereCondition.trangThaiDon = trangThaiDon;
        }

        if (trangThaiVuViec) {
            whereCondition.trangThaiVuViec = trangThaiVuViec;
        }

        if (loaiDon) whereCondition.loaiDon = loaiDon;
        if (maNguoiXuLy1) whereCondition.maNguoiXuLy1 = maNguoiXuLy1;

        if (trangThaiTaiLieu) {
            if (Number(trangThaiTaiLieu) === 1) {
                whereCondition.ngayHoanThanhHoSoTaiLieu = { [Op.is]: null };
            } else if (Number(trangThaiTaiLieu) === 2) {
                whereCondition.ngayHoanThanhHoSoTaiLieu = { [Op.not]: null };
            }
        }

        if (searchText) {
            const normalizedSearch = searchText.replace(/-/g, "");
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(soDon, '-', '') LIKE '%${normalizedSearch}%'`),
                { maHoSoVuViec: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(maHoSoVuViec, '-', '') LIKE '%${normalizedSearch}%'`),
                { clientsRef: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(clientsRef, '-', '') LIKE '%${normalizedSearch}%'`),
            ];
        }

        if (selectedField && fromDate && toDate) {
            whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
        }

        if (hanTraLoiFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null, to = null;

            switch (hanTraLoiFilter) {
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "<15":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 15);
                    break;
                case "<30":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 30);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) {
                whereCondition.hanTraLoi = { [Op.between]: [from, to] };
            } else if (to) {
                whereCondition.hanTraLoi = { [Op.lt]: to };
            }
        }

        if (hanXuLyFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null, to = null;

            switch (hanXuLyFilter) {
                case "<7":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 7);
                    break;
                case "<15":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 15);
                    break;
                case "<30":
                    from = today;
                    to = new Date(today);
                    to.setDate(today.getDate() + 30);
                    break;
                case "overdue":
                    to = today;
                    break;
            }

            if (from && to) {
                whereCondition.hanXuLy = { [Op.between]: [from, to] };
            } else if (to) {
                whereCondition.hanXuLy = { [Op.lt]: to };
            }
        }

        // Query dữ liệu
        const applications = await DonDangKy.findAll({
            where: whereCondition,
            include: [
                {
                    model: DonDK_SPDV,
                    where: maSPDVList && maSPDVList.length > 0
                        ? { maSPDV: { [Op.in]: maSPDVList } }
                        : undefined,
                    required: maSPDVList && maSPDVList.length > 0,
                    attributes: ["maSPDV"],
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
            ],
            order: [["updatedAt", "DESC"]],
        });

        if (!applications || applications.length === 0) {
            return res.status(404).json({ message: "Không có dữ liệu để xuất" });
        }

        // Lấy danh sách SPDV để map tên
        const allSPDV = await SanPham_DichVu.findAll({
            attributes: ["maSPDV", "tenSPDV"],
        });

        // Tạo workbook Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Bao_cao_don_VN");

        const allFieldOptions = [
            { label: "Số Đơn", key: "soDon" },
            { label: "Mã HSVV", key: "maHoSoVuViec" },
            { label: "Tên khách hàng", key: "tenKhachHang" },
            { label: "Tên đối tác", key: "tenDoiTac" },
            { label: "Tên nhãn hiệu", key: "tenNhanHieu" },
            { label: "Ảnh nhãn hiệu", key: "linkAnh" },
            { label: "Nhóm SPDV", key: "dsSPDV" },
            { label: "Tình trạng xử lý đơn", key: "tinhTrangDon" },
            { label: "Trạng thái đơn", key: "trangThaiVuViec" },
            { label: "Hạn trả lời Cục", key: "hanTraLoi" },
            { label: "Hạn Cục xử lý", key: "hanXuLy" },
            { label: "Trạng thái hoàn thành TL", key: "trangThaiHoanThienHoSoTaiLieu" },
            { label: "Ngày nộp đơn", key: "ngayNopDon" },
            { label: "Ngày hoàn thành TL", key: "ngayHoanThanhHoSoTaiLieu" },
            { label: "Ngày có KQ thẩm định hình thức", key: "ngayKQThamDinhHinhThuc" },
            { label: "Ngày công bố đơn", key: "ngayCongBoDon" },
            { label: "Ngày kết quả thẩm định nội dung", key: "ngayKQThamDinhND" },
            { label: "Ngày TL kết quả thẩm định nội dung", key: "ngayTraLoiKQThamDinhND" },
            { label: "Ngày thông báo cấp bằng", key: "ngayThongBaoCapBang" },
            { label: "Hạn nộp phí cấp bằng", key: "hanNopPhiCapBang" },
            { label: "Ngày nộp phí cấp bằng", key: "ngayNopPhiCapBang" },
            { label: "Ngày nhận bằng", key: "ngayNhanBang" },
            { label: "Số bằng", key: "soBang" },
            { label: "Ngày cấp bằng", key: "ngayCapBang" },
            { label: "Ngày hết hạn bằng", key: "ngayHetHanBang" },
            { label: "Ngày gửi bằng cho khách hàng", key: "ngayGuiBangChoKhachHang" },
            { label: "Loại đơn", key: "loaiDon" },
        ];

        const columns = allFieldOptions.filter((field) => fields.includes(field.key));
        const totalColumns = 1 + columns.length;

        // Row 1: Tiêu đề
        const titleRow = worksheet.addRow([reportTitle]);
        worksheet.mergeCells(1, 1, 1, totalColumns);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { horizontal: "center" };

        // Row 2: Ngày xuất
        const exportTime = dayjs().format("DD/MM/YYYY HH:mm:ss");
        const infoRow = worksheet.addRow([`Ngày xuất báo cáo: ${exportTime}`]);
        worksheet.mergeCells(2, 1, 2, totalColumns);
        infoRow.font = { italic: true };
        infoRow.alignment = { horizontal: "left" };

        // Định nghĩa cột
        const excelColumns = [
            { key: "stt", width: 6 },
            ...columns.map((col) => ({ key: col.key, width: 25 })),
        ];
        worksheet.columns = excelColumns;

        // Row 3: Header
        const headerValues = ["STT", ...columns.map((col) => col.label || col.key)];
        const headerRow = worksheet.addRow(headerValues);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: "center" };

        // Helper functions
        const dateFields = [
            "ngayNopDon", "ngayHoanThanhHoSoTaiLieu", "ngayKQThamDinhHinhThuc",
            "ngayCongBoDon", "ngayKQThamDinhND", "ngayTraLoiKQThamDinhND",
            "ngayThongBaoCapBang", "ngayNopPhiCapBang", "ngayNhanBang",
            "ngayCapBang", "ngayHetHanBang", "ngayGuiBangChoKhachHang", "hanNopPhiCapBang",
        ];

        const formatLoaiDon = (value) => {
            switch (value) {
                case 1: return "Đơn gốc";
                case 2: return "Đơn sửa đổi";
                case 3: return "Đơn tách";
                case 4: return "Đơn chuyển nhượng";
                default: return "Không xác định";
            }
        };

        const formatTrangThaiVuViec = (value) => {
            switch (value) {
                case "1": return "Đang giải quyết";
                case "2": return "Cấp bằng";
                case "3": return "Từ chối";
                case "4": return "Rút đơn";
                case "5": return "Đóng đơn";
                case "6": return "Ngừng theo đuổi";
                default: return "Không xác định";
            }
        };

        const getHanText = (dateValue, trangThaiVuViec) => {
            if (trangThaiVuViec === "5") return "";
            if (!dateValue) return "";

            const today = new Date();
            const deadline = new Date(dateValue);
            if (isNaN(deadline.getTime())) return "";

            today.setHours(0, 0, 0, 0);
            deadline.setHours(0, 0, 0, 0);

            const diffTime = deadline - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) return `Quá hạn ${Math.abs(diffDays)} ngày`;
            if (diffDays === 0) return "Hạn là hôm nay";
            return `Còn ${diffDays} ngày`;
        };

        const getTenSPDVChuoi = (spdvList) => {
            if (!Array.isArray(spdvList) || spdvList.length === 0) return "";
            return spdvList
                .map((sp) => {
                    const found = allSPDV.find((p) => p.maSPDV === sp.maSPDV);
                    return found?.tenSPDV || `${sp.maSPDV}`;
                })
                .join(", ");
        };

        // Thêm dữ liệu
        applications.forEach((app, index) => {
            const rowValues = [];
            rowValues.push(index + 1);

            columns.forEach((col) => {
                let value = app[col.key];

                if (dateFields.includes(col.key)) {
                    value = value ? dayjs(value).format("DD/MM/YYYY") : "";
                }

                if (col.key === "loaiDon") {
                    value = formatLoaiDon(app.loaiDon);
                }

                if (col.key === "trangThaiVuViec") {
                    value = formatTrangThaiVuViec(app.trangThaiVuViec);
                }

                if (col.key === "hanXuLy") {
                    value = getHanText(app.hanXuLy, app.trangThaiVuViec);
                }

                if (col.key === "hanTraLoi") {
                    value = getHanText(app.hanTraLoi, app.trangThaiVuViec);
                }

                if (col.key === "trangThaiHoanThienHoSoTaiLieu") {
                    value = app.ngayHoanThanhHoSoTaiLieu
                        ? "Hoàn thành"
                        : app.trangThaiHoanThienHoSoTaiLieu || "Chưa hoàn thành";
                }

                if (col.key === "dsSPDV") {
                    value = getTenSPDVChuoi(app.DonDK_SPDVs);
                }

                if (col.key === "linkAnh") {
                    value = (typeof value === "string" && value.startsWith("data:image/"))
                        ? "Có hình ảnh"
                        : "Không có ảnh";
                }

                if (col.key === "soDon") {
                    const maDon = app.maDonDangKy;
                    const hasDon = !!maDon;
                    const hasSoDon = !!value;
                    value = hasDon ? (hasSoDon ? value : "Chưa có số đơn") : "Không có đơn đăng ký";
                }

                if (col.key === "tenKhachHang") {
                    value = app.khachHang?.tenKhachHang || "";
                }

                if (col.key === "tenDoiTac") {
                    value = app.doitac?.tenDoiTac || "";
                }

                if (col.key === "tenNhanHieu") {
                    value = app.nhanHieu?.tenNhanHieu || "";
                }

                if (col.key === "tinhTrangDon") {
                    value = app.trangThaiDon || "";
                }

                rowValues.push(value ?? "");
            });

            worksheet.addRow(rowValues);
        });

        // Tạo tên file
        const baseName = reportFileName || `bao_cao_don_VN_${dayjs().format("YYYYMMDD_HHmmss")}`;
        const fileName = baseName.toLowerCase().endsWith(".xlsx") ? baseName : `${baseName}.xlsx`;

        // Set response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

        // Ghi workbook vào response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Lỗi exportApplicationsToExcel:", error);
        res.status(500).json({ message: error.message });
    }
};

export const handleExportCSV = () => {
    if (!applications || applications.length === 0) {
        alert("Không có dữ liệu để xuất.");
        return;
    }

    // Dòng đầu tiên: Ngày xuất báo cáo
    const exportTime = dayjs().format("DD/MM/YYYY HH:mm:ss");
    let csvContent = `Ngày xuất báo cáo:,${exportTime}\n`;

    // Header: STT + các cột đang chọn (columns)
    const headerRow = [
        "STT",
        ...columns.map((col) => col.label || col.key),
    ];
    csvContent += headerRow.join(",") + "\n";

    const dateFields = [
        "ngayNopDon",
        "ngayHoanThanhHoSoTaiLieu",
        "ngayKQThamDinhHinhThuc",
        "ngayCongBoDon",
        "ngayKQThamDinhND",
        "ngayTraLoiKQThamDinhND",
        "ngayThongBaoCapBang",
        "ngayNopPhiCapBang",
        "ngayNhanBang",
        "ngayCapBang",
        "ngayHetHanBang",
        "ngayGuiBangChoKhachHang",
        "hanNopPhiCapBang",
    ];

    const formatLoaiDon = (value) => {
        switch (value) {
            case 1:
                return "Đơn gốc";
            case 2:
                return "Đơn sửa đổi";
            case 3:
                return "Đơn tách";
            case 4:
                return "Đơn chuyển nhượng";
            default:
                return "Không xác định";
        }
    };

    const formatTrangThaiVuViec = (value) => {
        switch (value) {
            case "1":
                return "Đang giải quyết";
            case "2":
                return "Cấp bằng";
            case "3":
                return "Từ chối";
            case "4":
                return "Rút đơn";
            case "5":
                return "Đóng đơn";
            case "6":
                return "Ngừng theo đuổi";
            default:
                return "Không xác định";
        }
    };

    const getHanText = (dateValue, trangThaiVuViec) => {
        if (trangThaiVuViec === "5") return ""; // Đóng đơn thì bỏ qua

        if (!dateValue) return "";
        const today = new Date();
        const deadline = new Date(dateValue);

        if (isNaN(deadline.getTime())) return "";

        today.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);

        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `Quá hạn ${Math.abs(diffDays)} ngày`;
        } else {
            return `Còn ${diffDays} ngày`;
        }
    };

    const getTenSPDVChuoi = (spdvList) => {
        if (!Array.isArray(spdvList) || spdvList.length === 0) return "";

        return spdvList
            .map((sp) => {
                const found = productAndService.find((p) => p.maSPDV === sp.maSPDV);
                return found?.tenSPDV || `${sp.maSPDV}`;
            })
            .join(", ");
    };

    // Dòng dữ liệu
    applications.forEach((app, index) => {
        const row = [];

        // STT
        row.push(((pageIndex - 1) * pageSize + index + 1).toString());

        columns.forEach((col) => {
            let value = app[col.key];

            // Xử lý các field đặc biệt giống như render trong table
            if (dateFields.includes(col.key)) {
                value = value ? dayjs(value).format("DD/MM/YYYY") : "";
            }

            if (col.key === "loaiDon") {
                value = formatLoaiDon(app.loaiDon);
            }

            if (col.key === "trangThaiVuViec") {
                value = formatTrangThaiVuViec(app.trangThaiVuViec);
            }

            if (col.key === "hanXuLy") {
                value = getHanText(app.hanXuLy, app.trangThaiVuViec);
            }

            if (col.key === "hanTraLoi") {
                value = getHanText(app.hanTraLoi, app.trangThaiVuViec);
            }

            if (col.key === "trangThaiHoanThienHoSoTaiLieu") {
                // Chỉ xuất text trạng thái, bỏ phần countdown + danh sách TL
                if (app.ngayHoanThanhHoSoTaiLieu) {
                    value = "Hoàn thành";
                } else {
                    value = app.trangThaiHoanThienHoSoTaiLieu || "Chưa hoàn thành";
                }
            }

            if (col.key === "dsSPDV") {
                value = getTenSPDVChuoi(app.dsSPDV);
            }

            if (col.key === "linkAnh") {
                if (typeof value === "string" && value.startsWith("data:image/")) {
                    value = "Có hình ảnh";
                } else {
                    value = "Không có ảnh";
                }
            }

            if (col.key === "soDon") {
                const maDon = app.maDonDangKy;
                const hasDon = !!maDon;
                const hasSoDon = !!value;

                if (hasDon) {
                    value = hasSoDon ? value : "Chưa có số đơn";
                } else {
                    value = "Không có đơn đăng ký";
                }
            }

            // Escape CSV: convert undefined/null -> "", escape "
            if (value === undefined || value === null) value = "";
            value = String(value).replace(/"/g, '""');

            row.push(`"${value}"`);
        });

        csvContent += row.join(",") + "\n";
    });

    // Thêm BOM để Excel đọc tiếng Việt không lỗi font
    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
        "download",
        `bao_cao_don_VN_${dayjs().format("YYYYMMDD_HHmmss")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const getApplicationOptions = async (req, res) => {
    try {
        const { searchText = "", limit = 20 } = req.body;
        const maxLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const search = String(searchText).trim();
        const tokens = search ? search.split(/\s+/).filter(Boolean) : [];

        const queryModel = async (Model) => {
            const where = {};
            if (tokens.length > 0) {
                where[Op.and] = tokens.map(tok => {
                    const normTok = tok.replace(/-/g, "");
                    return {
                        [Op.or]: [
                            { soDon: { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(soDon, '-', '') LIKE '%${normTok}%'`),
                            { maHoSoVuViec: { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(maHoSoVuViec, '-', '') LIKE '%${normTok}%'`),
                            literal(`\`nhanHieu\`.\`tenNhanHieu\` LIKE '%${tok}%'`),
                        ]
                    };
                });
            }

            return await Model.findAll({
                where,
                attributes: ["soDon", "maHoSoVuViec"],
                include: [
                    {
                        model: NhanHieu,
                        as: "nhanHieu",
                        attributes: ["tenNhanHieu"],
                        required: false,
                    }
                ],
                limit: maxLimit * 2,
                order: [["updatedAt", "DESC"]],
                raw: false,
            }).catch(err => {
                console.error("Lỗi getApplicationOptions query:", err?.message);
                return [];
            });
        };

        const [vnDons, khDons] = await Promise.all([
            queryModel(DonDangKy),
            queryModel(DonDangKyNhanHieu_KH),
        ]);

        const combined = [...vnDons, ...khDons];
        const seen = new Set();
        const data = [];

        for (const item of combined) {
            const soDon = item.soDon || "";
            const maHoSoVuViec = item.maHoSoVuViec || item.maHoSo || "";
            const tenNhanHieu = item.nhanHieu?.tenNhanHieu || "";

            const key = `${soDon}__${maHoSoVuViec}__${tenNhanHieu}`;
            if (!seen.has(key)) {
                seen.add(key);
                data.push({
                    soDon,
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
