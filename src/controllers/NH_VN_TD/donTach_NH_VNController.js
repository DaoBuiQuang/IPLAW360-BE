import { sequelize } from "../../config/db.js";
import { DonDangKy } from "../../models/donDangKyModel.js";
import { DonDK_SPDV } from "../../models/donDK_SPDVMolel.js"
import crypto from "crypto";

import { DonTachNH_VN } from "../../models/VN_TachDon_NH/donTachNH_VNModel.js";
import { DonDangKyNhanHieu_KH } from "../../models/KH/donDangKyNhanHieu_KHModel.js";
import { DonDK_SPDV_KH } from "../../models/KH/donDK_SPDVModel_KHModel.js";
import { DoiTac, DonTachNH_KH, KhachHangCuoi, NhanHieu, TaiLieu } from "../../models/index.js";
import { Op, literal, Sequelize } from "sequelize";
import { TaiLieu_KH } from "../../models/KH/taiLieuKH_Model.js";

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

const generateMaDonDangKy = (maHoSo) => {
    const randomStr = crypto.randomBytes(3).toString("hex"); // 6 ký tự hex
    return `${maHoSo}_${randomStr}`;
};
export const tachDonDangKy_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { maHoSo, maDonDangKyCu, listDonTach } = req.body;

        if (!maHoSo || !maDonDangKyCu || !Array.isArray(listDonTach)) {
            return res.status(400).json({ message: "Thiếu dữ liệu tách đơn." });
        }

        // Lấy đơn gốc
        const donCu = await DonDangKy.findOne({
            where: { maDonDangKy: maDonDangKyCu }
        });

        if (!donCu) {
            return res.status(404).json({ message: "Không tìm thấy đơn gốc." });
        }

        // Lấy toàn bộ SPDV của đơn gốc
        const spdvCu = await DonDK_SPDV.findAll({
            where: { maDonDangKy: maDonDangKyCu }
        });

        let danhSachDonMoi = [];
        for (let i = 0; i < listDonTach.length; i++) {
            const item = listDonTach[i];

            const nhomSP = item.nhomSPDV.split(",").map(s => s.trim());

            // ====== 1) TẠO MÃ ĐƠN MỚI ======
            const maDonDangKyMoi = generateMaDonDangKy(maHoSo);

            // ====== 2) TẠO DON DANG KY MỚI ======
            const donMoi = await DonDangKy.create(
                {
                    ...donCu.toJSON(),
                    id: undefined,
                    maDonDangKy: maDonDangKyMoi,
                    loaiDon: 3, // 3 = tách đơn
                    donGoc: 0,
                    soDon: item.soDon,
                },
                { transaction }
            );

            // ====== 3) TẠO BẢN GHI DonTachNH_VN ======
            await DonTachNH_VN.create(
                {
                    soDon: item.soDon,
                    maDonDangKy: maDonDangKyMoi,
                    maDonDangKyGoc: maDonDangKyCu,
                    dsNhomSPDV: item.nhomSPDV,
                    ndTachDon: null,
                    moTa: null,
                    ngayYeuCau: item.ngayYeuCau,
                    ngayGhiNhanSuaDoi: item.ngayGhiNhanSuaDoi,
                    lanTachDon: i + 1,
                    maNhanSuCapNhap: req.user?.maNhanSu || null,
                },
                { transaction }
            );

            // ====== 4) COPY SPDV TƯƠNG ỨNG ======
            const spdvMoi = spdvCu
                .filter(sp => nhomSP.includes(sp.maSPDV))
                .map(sp => ({
                    maDonDangKy: maDonDangKyMoi,
                    maSPDV: sp.maSPDV,
                    isAutoImport: sp.isAutoImport,
                }));

            if (spdvMoi.length > 0) {
                await DonDK_SPDV.bulkCreate(spdvMoi, { transaction });
            }

            danhSachDonMoi.push(donMoi);
        }

        await transaction.commit();
        return res.status(201).json({
            message: "Tách đơn thành công!",
            danhSachDonMoi
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi tách đơn:", error);
        res.status(500).json({ message: error.message });
    }
};

export const tachDonDangKy_KH = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { maHoSo, maDonDangKyCu, listDonTach } = req.body;

        if (!maHoSo || !maDonDangKyCu || !Array.isArray(listDonTach)) {
            return res.status(400).json({ message: "Thiếu dữ liệu tách đơn." });
        }

        // Lấy đơn gốc
        const donCu = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy: maDonDangKyCu }
        });

        if (!donCu) {
            return res.status(404).json({ message: "Không tìm thấy đơn gốc." });
        }

        // Lấy toàn bộ SPDV của đơn gốc
        const spdvCu = await DonDK_SPDV_KH.findAll({
            where: { maDonDangKy: maDonDangKyCu }
        });

        let danhSachDonMoi = [];
        for (let i = 0; i < listDonTach.length; i++) {
            const item = listDonTach[i];

            const nhomSP = item.nhomSPDV.split(",").map(s => s.trim());

            // ====== 1) TẠO MÃ ĐƠN MỚI ======
            const maDonDangKyMoi = generateMaDonDangKy(maHoSo);

            // ====== 2) TẠO DON DANG KY MỚI ======
            const donMoi = await DonDangKyNhanHieu_KH.create(
                {
                    ...donCu.toJSON(),
                    id: undefined,
                    maDonDangKy: maDonDangKyMoi,
                    loaiDon: 3, // 3 = tách đơn
                    donGoc: 0,
                    soDon: item.soDon
                },
                { transaction }
            );

            // ====== 3) TẠO BẢN GHI DonTachNH_VN ======
            await DonTachNH_KH.create(
                {
                    soDon: item.soDon,
                    maDonDangKy: maDonDangKyMoi,
                    maDonDangKyGoc: maDonDangKyCu,
                    dsNhomSPDV: item.nhomSPDV,
                    ndTachDon: null,
                    moTa: null,
                    ngayYeuCau: item.ngayYeuCau,
                    ngayGhiNhanSuaDoi: item.ngayGhiNhanSuaDoi,
                    lanTachDon: i + 1,
                    maNhanSuCapNhap: req.user?.maNhanSu || null,
                },
                { transaction }
            );

            // ====== 4) COPY SPDV TƯƠNG ỨNG ======
            const spdvMoi = spdvCu
                .filter(sp => nhomSP.includes(sp.maSPDV))
                .map(sp => ({
                    maDonDangKy: maDonDangKyMoi,
                    maSPDV: sp.maSPDV,
                    isAutoImport: sp.isAutoImport,
                }));

            if (spdvMoi.length > 0) {
                await DonDK_SPDV_KH.bulkCreate(spdvMoi, { transaction });
            }

            danhSachDonMoi.push(donMoi);
        }

        await transaction.commit();
        return res.status(201).json({
            message: "Tách đơn thành công!",
            danhSachDonMoi
        });

    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi tách đơn:", error);
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
            pageSize = 20
        } = req.body;

        const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
        const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
        const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

        // luôn đảm bảo có các field tối thiểu
        if (!fields.includes("maDonDangKy")) fields.push("maDonDangKy");
        if (!fields.includes("donGoc")) fields.push("donGoc");

        const offset = (pageIndex - 1) * pageSize;
        const {
            selectedField,
            fromDate,
            toDate,
            hanXuLyFilter,
            hanTraLoiFilter,
            sortByHanXuLy,
            sortByHanTraLoi
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
                    { '$DonDangKy.soDon$': { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { '$DonDangKy.maHoSoVuViec$': { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { '$DonDangKy.clientsRef$': { [Op.like]: `%${raw}%` } },
                    literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normalizedSearch}%'`),
                    { '$nhanHieu.tenNhanHieu$': { [Op.like]: `%${raw}%` } },
                ];
            } else {
                whereCondition[Op.and] = whereCondition[Op.and] || [];
                tokens.forEach((tok) => {
                    const normTok = tok.replace(/-/g, "");
                    whereCondition[Op.and].push({
                        [Op.or]: [
                            { '$DonDangKy.soDon$': { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normTok}%'`),
                            { '$DonDangKy.maHoSoVuViec$': { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normTok}%'`),
                            { '$DonDangKy.clientsRef$': { [Op.like]: `%${tok}%` } },
                            literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normTok}%'`),
                            { '$nhanHieu.tenNhanHieu$': { [Op.like]: `%${tok}%` } },
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
            let from = null, to = null;

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

            if (from && to)
                whereCondition.hanTraLoi = { [Op.between]: [from, to] };
            else if (to)
                whereCondition.hanTraLoi = { [Op.lt]: to };
        }

        // ====== Lọc theo hạn xử lý ======
        if (hanXuLyFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let from = null, to = null;

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

            if (from && to)
                whereCondition.hanXuLy = { [Op.between]: [from, to] };
            else if (to)
                whereCondition.hanXuLy = { [Op.lt]: to };
        }

        // ====== Bổ sung field liên quan tài liệu chưa nộp ======
        if (fields.includes("trangThaiHoanThienHoSoTaiLieu")) {
            if (!fields.includes("taiLieuChuaNop"))
                fields.push("taiLieuChuaNop");
            if (!fields.includes("ngayHoanThanhHoSoTaiLieu_DuKien"))
                fields.push("ngayHoanThanhHoSoTaiLieu_DuKien");
        }

        if (!fields.includes("hanXuLy"))
            fields.push("hanXuLy");

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

        // ====== Query chính ======
        const { count: totalItems, rows: applications } =
            await DonDangKy.findAndCountAll({
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
                    // ====== include thêm thông tin ĐƠN TÁCH ======
                    {
                        model: DonTachNH_VN,
                        as: "donTach",
                        required: false,
                        attributes: [
                            "soDon",
                            "ngayYeuCau",
                            "lanTachDon",
                            "ngayGhiNhanTachDon",
                            "ndTachDon",
                            "moTa",
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
            ngayHoanThanhHoSoTaiLieu_DuKien: (app) =>
                app.ngayHoanThanhHoSoTaiLieu_DuKien,
            taiLieuChuaNop: (app) =>
                app.taiLieuChuaNop?.map((tl) => ({ tenTaiLieu: tl.tenTaiLieu })) ||
                [],
            dsSPDV: (app) =>
                app.DonDK_SPDVs?.map((sp) => ({ maSPDV: sp.maSPDV })) || [],
            hanXuLy: (app) => app.hanXuLy,
            hanTraLoi: (app) => app.hanTraLoi,
            linkAnh: (app) => app.nhanHieu?.linkAnh || null,
            donGoc: (app) => app.donGoc,

            // ====== Các field lấy từ DonSuaDoi_NH_VN (donSuaDoi) ======
            soDonSD: (app) => app.donSuaDoi?.soDonSD || null,
            ngayYeuCau: (app) => app.donSuaDoi?.ngayYeuCau || null,
            lanSuaDoi: (app) => app.donSuaDoi?.lanSuaDoi || null,
            ngayGhiNhanSuaDoi: (app) => app.donSuaDoi?.ngayGhiNhanSuaDoi || null,
            duocGhiNhanSuaDoi: (app) => app.donSuaDoi?.duocGhiNhanSuaDoi || null,
            moTaSuaDoi: (app) => app.donSuaDoi?.moTaSuaDoi || null,
            suaDoiDaiDien: (app) => app.donSuaDoi?.suaDoiDaiDien || null,
            ndSuaDoiDaiDien: (app) => app.donSuaDoi?.ndSuaDoiDaiDien || null,
            suaDoiTenChuDon: (app) => app.donSuaDoi?.suaDoiTenChuDon || null,
            ndSuaDoiTenChuDon: (app) => app.donSuaDoi?.ndSuaDoiTenChuDon || null,
            suaDoiDiaChi: (app) => app.donSuaDoi?.suaDoiDiaChi || null,
            ndSuaDoiDiaChi: (app) => app.donSuaDoi?.ndSuaDoiDiaChi || null,
            suaNhan: (app) => app.donSuaDoi?.suaNhan || null,
            ndSuaNhan: (app) => app.donSuaDoi?.ndSuaNhan || null,
            suaNhomSPDV: (app) => app.donSuaDoi?.suaNhomSPDV || null,
            ndSuaNhomSPDV: (app) => app.donSuaDoi?.ndSuaNhomSPDV || null,
        };

        const result = applications.map((app) => {
            const row = {};
            fields.forEach((field) => {
                if (fieldMap[field]) row[field] = fieldMap[field](app);
            });
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
        console.error("Lỗi getAllApplicationSD_VN:", error);
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
            pageSize = 20
        } = req.body;

        if (!fields.includes("maDonDangKy")) fields.push("maDonDangKy");
        if (!fields.includes("donGoc")) fields.push("donGoc");

        const offset = (pageIndex - 1) * pageSize;
        const {
            selectedField,
            fromDate,
            toDate,
            hanXuLyFilter,
            hanTraLoiFilter,
            sortByHanXuLy,
            sortByHanTraLoi
        } = filterCondition;

        const whereCondition = { loaiDon: 3 };

        if (maNhanHieu) whereCondition.maNhanHieu = maNhanHieu;
        if (trangThaiDon) whereCondition.trangThaiDon = trangThaiDon;

        // 🔍 Tìm kiếm
        if (searchText) {
            const cleanText = searchText.replace(/-/g, "");
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(soDon, '-', '') LIKE '%${cleanText}%'`),
                { maHoSo: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(maHoSo, '-', '') LIKE '%${cleanText}%'`)
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
            let from = null, to = null;

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
            let from = null, to = null;

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
                Sequelize.literal(`CASE WHEN trangThaiVuViec = '5' THEN 1 ELSE 0 END`),
                "ASC"
            ]);
            order.push(["hanTraLoi", "ASC"]);
        }
        if (sortByHanXuLy) {
            order.push([
                Sequelize.literal(`CASE WHEN trangThaiVuViec = '5' THEN 1 ELSE 0 END`),
                "ASC"
            ]);
            order.push(["hanXuLy", "ASC"]);
        }

        // Bổ sung field cần thiết
        if (fields.includes("trangThaiHoanThienHoSoTaiLieu")) {
            if (!fields.includes("taiLieuChuaNop"))
                fields.push("taiLieuChuaNop");
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
                // 🔽 include thêm thông tin ĐƠN SỬA ĐỔI KH
                {
                    model: DonTachNH_KH,
                    as: "donTach_KH",     // phải khớp alias với hasOne
                    required: false,
                    attributes: [
                        "ngayYeuCau",
                        "lanTachDon",
                        "ngayGhiNhanTachDon",
                    ],
                },
            ],
            limit: pageSize,
            offset,
            order,
        });

        if (!applications.length) {
            return res.status(404).json({ message: "Không có đơn đăng ký nào" });
        }

        const fieldMap = {
            maDonDangKy: (app) => app.maDonDangKy,
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
            ngayHoanThanhHoSoTaiLieu_DuKien: (app) =>
                app.ngayHoanThanhHoSoTaiLieu_DuKien,
            taiLieuChuaNop: (app) =>
                app.taiLieuChuaNop_KH?.map((tl) => ({ tenTaiLieu: tl.tenTaiLieu })) ||
                [],
            dsSPDV: (app) =>
                app.DonDK_SPDV_KH?.map((sp) => ({ maSPDV: sp.maSPDV })) || [],
            hanXuLy: (app) =>
                app.trangThaiVuViec === "5" ? null : app.hanXuLy,
            hanTraLoi: (app) =>
                app.trangThaiVuViec === "5" ? null : app.hanTraLoi,
            trangThaiVuViec: (app) => app.trangThaiVuViec,
            linkAnh: (app) => app.nhanHieu?.linkAnh || null,
            donGoc: (app) => app.donGoc,

            // 🔽 Các field lấy từ DonSuaDoi_NH_KH
            soDonSD: (app) => app.donSuaDoi_KH?.soDonSD || null,
            ngayYeuCau: (app) => app.donSuaDoi_KH?.ngayYeuCau || null,
            lanSuaDoi: (app) => app.donSuaDoi_KH?.lanSuaDoi || null,
            ngayGhiNhanSuaDoi: (app) => app.donSuaDoi_KH?.ngayGhiNhanSuaDoi || null,
            duocGhiNhanSuaDoi: (app) => app.donSuaDoi_KH?.duocGhiNhanSuaDoi || null,
            moTaSuaDoi: (app) => app.donSuaDoi_KH?.moTaSuaDoi || null,
            suaDoiDaiDien: (app) => app.donSuaDoi_KH?.suaDoiDaiDien || null,
            ndSuaDoiDaiDien: (app) => app.donSuaDoi_KH?.ndSuaDoiDaiDien || null,
            suaDoiTenChuDon: (app) => app.donSuaDoi_KH?.suaDoiTenChuDon || null,
            ndSuaDoiTenChuDon: (app) =>
                app.donSuaDoi_KH?.ndSuaDoiTenChuDon || null,
            suaDoiDiaChi: (app) => app.donSuaDoi_KH?.suaDoiDiaChi || null,
            ndSuaDoiDiaChi: (app) => app.donSuaDoi_KH?.ndSuaDoiDiaChi || null,
            suaNhan: (app) => app.donSuaDoi_KH?.suaNhan || null,
            ndSuaNhan: (app) => app.donSuaDoi_KH?.ndSuaNhan || null,
            suaNhomSPDV: (app) => app.donSuaDoi_KH?.suaNhomSPDV || null,
            ndSuaNhomSPDV: (app) => app.donSuaDoi_KH?.ndSuaNhomSPDV || null,
        };

        const result = applications.map((app) => {
            const row = {};
            fields.forEach((field) => {
                if (fieldMap[field]) {
                    row[field] = fieldMap[field](app);
                }
            });
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
        console.error("Lỗi getAllApplicationSD_KH:", error);
        res.status(500).json({ message: error.message });
    }
};
