import { NhanHieu } from "../../models/nhanHieuModel.js";
// import { TaiLieu } from "../../models/taiLieuModel.js";
import { Op, literal } from "sequelize";
import { sendGenericNotification } from "../../utils/notificationHelper.js";
import { SanPham_DichVu } from "../../models/sanPham_DichVuModel.js";
import cron from 'node-cron';
import { Sequelize } from "sequelize";
import { HoSo_VuViec } from "../../models/hoSoVuViecModel.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { DonDangKyNhanHieu_KH } from "../../models/KH/donDangKyNhanHieu_KHModel.js";
import { LichSuThamDinh_KH } from "../../models/KH/lichSuThamDinh_KHModel.js";
import { DonDK_SPDV_KH } from "../../models/KH/donDK_SPDVModel_KHModel.js";
import { TaiLieu_KH } from "../../models/KH/taiLieuKH_Model.js";
import { LichSuGiaHan_KH } from "../../models/KH/lichSuGiaHan_KH.js";
import crypto from "crypto";
import { VuViec } from "../../models/vuViecModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import { GCN_NH_KH } from "../../models/GCN_NH_KHModel.js";
import { GiayUyQuyen } from "../../models/GiayUyQuyenModel.js";
import { DonSuaDoi_NH_KH } from "../../models/KH_SuaDoi_NH/donSuaDoiNH_KHModel.js";
import { DonCQSH_KH } from "../../models/KH_ChuyenQuyenSH/donCQSH_KHModel.js";
import { DonTachNH_KH } from "../../models/index.js";
import { resolveGCNDatesForSave } from "../../utils/gcnDateHelper.js";
import { autoRejectExpiredDonSuaDoi_KH, getDonKHLineageGraph } from "./donSuaDoi_NH_KHController.js";
import { autoRejectExpiredDonCQSH_KH } from "./donCQSH_NH_KHController.js";
const tinhHanXuLy = (app) => {
    let duKienDate = null;

    switch (app.trangThaiDon) {
        case "Hoàn thành hồ sơ tài liệu":
            duKienDate = app.ngayHoanThanhHoSoTaiLieu_DuKien;
            break;
        case "Thẩm định":
            duKienDate = app.ngayKQThamDinh_DuKien;
            break;
    }

    if (!duKienDate) return null;

    const date = new Date(duKienDate);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
};

export const tinhHanTraLoi = async (app, transaction = null) => {
    // ✅ chấp nhận các trạng thái có chứa "Thẩm định"
    const isThamDinh = typeof app.trangThaiDon === "string" && app.trangThaiDon.includes("Thẩm định");
    if (!isThamDinh) return null;

    const lichSu = await LichSuThamDinh_KH.findOne({
        where: { maDonDangKy: app.maDonDangKy },
        order: [["lanThamDinh", "DESC"]],
        transaction,
    });

    if (!lichSu) return null;

    // ✅ nếu đã trả lời -> không còn "Hạn trả lời Cục"
    if (lichSu.ngayTraLoiThongBaoTuChoi) return null;

    const han = lichSu.hanTraLoiGiaHan || lichSu.hanTraLoi;
    if (!han) return null;

    const hanDate = new Date(han);
    return isNaN(hanDate.getTime()) ? null : hanDate.toISOString().split("T")[0];
};


export const getAllApplication_KH = async (req, res) => {
    try {
        const {
            maSPDVList,
            maNhanHieu,
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
            pageIndex = 1,
            pageSize = 20,
        } = req.body;

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

        await Promise.all([autoRejectExpiredDonSuaDoi_KH(), autoRejectExpiredDonCQSH_KH()]);

        if (maNhanHieu) whereCondition.maNhanHieu = maNhanHieu;
        if (trangThaiDon) whereCondition.trangThaiDon = trangThaiDon;
        if (trangThaiVuViec) whereCondition.trangThaiVuViec = trangThaiVuViec; // ✅
        if (loaiDon === "DANG_SUA_DOI") {
            const pendingSD = await DonSuaDoi_NH_KH.findAll({
                where: { trangThaiDuyet: 0 },
                attributes: ["maDonDangKyGoc"],
                raw: true,
            });
            const ids = [...new Set(pendingSD.map((x) => x.maDonDangKyGoc).filter(Boolean))];
            whereCondition.maDonDangKy = { [Op.in]: ids.length ? ids : ["__NONE__"] };
        } else if (loaiDon === "DANG_CHUYEN_QUYEN") {
            const pendingCQ = await DonCQSH_KH.findAll({
                where: { trangThaiDuyet: 0 },
                attributes: ["maDonDangKyGoc"],
                raw: true,
            });
            const ids = [...new Set(pendingCQ.map((x) => x.maDonDangKyGoc).filter(Boolean))];
            whereCondition.maDonDangKy = { [Op.in]: ids.length ? ids : ["__NONE__"] };
        } else if (loaiDon) {
            whereCondition.loaiDon = loaiDon;
        }
        if (maNguoiXuLy1) whereCondition.maNguoiXuLy1 = maNguoiXuLy1;
        if (trangThaiTaiLieu) {
            if (Number(trangThaiTaiLieu) === 1) {
                // Chưa hoàn thành
                whereCondition.ngayHoanThanhHoSoTaiLieu = { [Op.is]: null };
            } else if (Number(trangThaiTaiLieu) === 2) {
                // Đã hoàn thành
                whereCondition.ngayHoanThanhHoSoTaiLieu = { [Op.not]: null };
            }
        }
        // 🔍 Tìm kiếm
        if (searchText) {
            const cleanText = searchText.replace(/-/g, "");
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(soDon, '-', '') LIKE '%${cleanText}%'`),
                { maHoSo: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(maHoSo, '-', '') LIKE '%${cleanText}%'`),
            ];
        }

        // Lọc theo field ngày được chọn
        if (selectedField && fromDate && toDate) {
            whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
        }

        // Đơn đã đóng (trangThaiVuViec = '5') thì không xét hạn
        const excludeClosedCondition = { trangThaiVuViec: { [Op.ne]: "5" } };

        // ====== Lọc hạn trả lời ======
        if (hanTraLoiFilter) {
            Object.assign(whereCondition, excludeClosedCondition);
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
            Object.assign(whereCondition, excludeClosedCondition);
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

        // ====== ORDER ======
        const order = [];
        if (sortByHanTraLoi) {
            // Đưa đơn đã đóng xuống cuối
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
        if (!sortByHanTraLoi && !sortByHanXuLy) {
            order.push([
                Sequelize.literal("CASE WHEN COALESCE(`DonDangKyNhanHieu_KH`.`donGoc`, 0) = 1 THEN 1 ELSE 0 END"),
                "ASC",
            ]);
            if (sortByCreatedAt && !sortByUpdatedAt) {
                order.push(["createdAt", "DESC"], ["updatedAt", "DESC"]);
            } else {
                order.push(["updatedAt", "DESC"], ["createdAt", "DESC"]);
            }
        }

        // Bổ sung field cần thiết
        if (fields.includes("trangThaiHoanThienHoSoTaiLieu")) {
            fields.push("taiLieuChuaNop", "ngayHoanThanhHoSoTaiLieu_DuKien");
        }
        if (!fields.includes("hanXuLy")) fields.push("hanXuLy");

        const totalItems = await DonDangKyNhanHieu_KH.count({
            where: whereCondition,
        });

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
                    required: !!effectiveBrandName,
                    where: effectiveBrandName
                        ? { tenNhanHieu: { [Op.like]: `%${effectiveBrandName}%` } }
                        : undefined,
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHang",
                    attributes: ["tenKhachHang", "maKhachHang"],
                    required: !!effectiveCustomerName,
                    where: effectiveCustomerName
                        ? {
                            [Op.or]: [
                                { tenKhachHang: { [Op.like]: `%${effectiveCustomerName}%` } },
                                { maKhachHang: { [Op.like]: `%${effectiveCustomerName}%` } },
                            ]
                        }
                        : undefined,
                },
                {
                    model: DoiTac,
                    as: "doitac",
                    attributes: ["tenDoiTac", "maDoiTac"],
                    required: !!effectivePartnerName,
                    where: effectivePartnerName
                        ? {
                            [Op.or]: [
                                { tenDoiTac: { [Op.like]: `%${effectivePartnerName}%` } },
                                { maDoiTac: { [Op.like]: `%${effectivePartnerName}%` } },
                            ]
                        }
                        : undefined,
                },
            ],
            limit: pageSize,
            offset,
            order,
        });

        if (!applications.length) {
            return res
                .status(404)
                .json({ message: "Không có đơn đăng ký nào" });
        }

        const fieldMap = {
            maDonDangKy: (app) => app.maDonDangKy,
            loaiDon: (app) => app.loaiDon,                 // ✅ nếu FE KH cần hiển thị
            maHoSoVuViec: (app) => app.maHoSoVuViec,
            soDon: (app) => app.soDon,
            tenNhanHieu: (app) => app.nhanHieu?.tenNhanHieu || null,
            tenKhachHang: (app) => app.khachHang?.tenKhachHang || null,
            tenDoiTac: (app) => app.doitac?.tenDoiTac || null,
            tinhTrangDon: (app) => app.trangThaiDon,
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
            laDonTiepNhan: (app) => Boolean(app.laDonTiepNhan),
        };

        const maDonIds = applications.map((app) => app.maDonDangKy).filter(Boolean);
        let pendingSuaDoiSet = new Set();
        let pendingChuyenQuyenSet = new Set();
        if (maDonIds.length > 0) {
            const [pendingSDs, pendingCQs] = await Promise.all([
                DonSuaDoi_NH_KH.findAll({
                    where: {
                        maDonDangKyGoc: { [Op.in]: maDonIds },
                        trangThaiDuyet: 0,
                    },
                    attributes: ["maDonDangKyGoc"],
                    raw: true,
                }),
                DonCQSH_KH.findAll({
                    where: {
                        maDonDangKyGoc: { [Op.in]: maDonIds },
                        trangThaiDuyet: 0,
                    },
                    attributes: ["maDonDangKyGoc"],
                    raw: true,
                }),
            ]);
            pendingSuaDoiSet = new Set(pendingSDs.map((sd) => sd.maDonDangKyGoc));
            pendingChuyenQuyenSet = new Set(pendingCQs.map((cq) => cq.maDonDangKyGoc));
        }

        const result = applications.map((app) => {
            const row = {};
            fields.forEach((field) => {
                if (fieldMap[field]) {
                    row[field] = fieldMap[field](app);
                }
            });

            row.loaiDon = app.loaiDon ?? 1;
            row.donGoc = app.donGoc ?? 0;
            row.laDonTiepNhan = Boolean(app.laDonTiepNhan);
            row.tinhTrangDon = app.trangThaiDon;
            row.trangThaiDon = app.trangThaiDon;
            row.trangThaiVuViec = app.trangThaiVuViec;
            row.dangSuaDoi = pendingSuaDoiSet.has(app.maDonDangKy);
            row.dangChuyenQuyen = pendingChuyenQuyenSet.has(app.maDonDangKy);

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
        console.error("Lỗi getAllApplication_KH:", error);
        res.status(500).json({ message: error.message });
    }
};



export const getApplicationById_KH = async (req, res) => {
    try {
        const { maDonDangKy } = req.body;
        if (!maDonDangKy) return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });

        const don = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy },
            include: [
                {
                    model: TaiLieu_KH,
                    as: "taiLieuChuaNop_KH",
                    attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"]
                },
                {
                    model: DonDK_SPDV_KH,
                    as: "DonDK_SPDV_KH",
                    attributes: ["maSPDV"]
                },
                {
                    model: NhanHieu,
                    as: "nhanHieu",
                    attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh"]
                },
                {
                    model: LichSuThamDinh_KH,
                    as: "lichSuThamDinh",
                    attributes: {
                        exclude: ['createdAt', 'updatedAt']
                    },
                    include: [
                        {
                            model: LichSuGiaHan_KH,
                            as: "giaHanList", // tên alias phải khớp với định nghĩa quan hệ
                            attributes: { exclude: ['createdAt', 'updatedAt'] }
                        }
                    ]
                }
            ]
        });


        if (!don) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });

        const plainDon = don.toJSON();

        // lấy thông tin VuViec bằng maHoSo (guard null cho đơn tiếp nhận)
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
                    "xuatBill",
                    "isMainCase",
                    "maNguoiXuLy"
                ],
                order: [["createdAt", "DESC"]]
            });
            plainDon.vuViec = vuViecs.map(v => v.toJSON());
        } else {
            plainDon.vuViec = [];
        }
        plainDon.laDonTiepNhan = Boolean(plainDon.laDonTiepNhan);
        plainDon.maSPDVList = Array.isArray(plainDon.DonDK_SPDV_KH)
            ? plainDon.DonDK_SPDV_KH.map(sp => sp.maSPDV)
            : [];
        delete plainDon.DonDK_SPDV_KH;
        if (plainDon.loaiDon === 2) {
            const donSuaDoi = await DonSuaDoi_NH_KH.findOne({
                where: { maDonDangKy: maDonDangKy },
            });
            if (donSuaDoi) plainDon.donSuaDoi = donSuaDoi.toJSON();
        }
        if (plainDon.loaiDon === 3) {
            const donTach = await DonTachNH_KH.findOne({
                where: { maDonDangKy: maDonDangKy },
            });
            if (donTach) plainDon.donTach = donTach.toJSON();
        }
        res.json(plainDon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const generateMaDonDangKy = (prefix) => {
    const safePrefix = prefix && String(prefix).trim() !== "" ? String(prefix).trim() : "TN_KH";
    const randomStr = crypto.randomBytes(3).toString("hex");
    return `${safePrefix}_${randomStr}`;
};

export const createApplication_KH = async (req, res) => {
    const transaction = await DonDangKyNhanHieu_KH.sequelize.transaction();
    try {
        const {
            nhanHieu,
            taiLieus,
            vuViecs,
            maHoSo,
            maHoSoVuViec,
            laDonTiepNhan = false,
            lichSuThamDinh,
            maSPDVList,
            maNguoiXuLy1,
            maNguoiXuLy2,
            maNhanSuCapNhap,
            ...donData
        } = req.body;

        const isDonTiepNhan = Boolean(laDonTiepNhan);
        const rawHoSo = maHoSo !== undefined && maHoSo !== null && String(maHoSo).trim() !== ""
            ? maHoSo
            : maHoSoVuViec;
        const cleanMaHoSo = rawHoSo && String(rawHoSo).trim() !== "" ? String(rawHoSo).trim() : null;
        const cleanIdKhachHang =
            donData.idKhachHang !== undefined &&
            donData.idKhachHang !== null &&
            String(donData.idKhachHang).trim() !== ""
                ? Number(donData.idKhachHang)
                : null;
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
        const cleanSoDon = donData.soDon && String(donData.soDon).trim() !== "" ? String(donData.soDon).trim() : null;

        const hasMaNhanHieu =
            donData.maNhanHieu !== undefined &&
            donData.maNhanHieu !== null &&
            String(donData.maNhanHieu).trim() !== "";
        const hasTenNhanHieu = Boolean(nhanHieu?.tenNhanHieu && String(nhanHieu.tenNhanHieu).trim() !== "");

        // Validate theo 2 chế độ (tương đồng với VN)
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
            if (!hasMaNhanHieu && !hasTenNhanHieu) {
                missingFields.push("tên hoặc mã nhãn hiệu (tenNhanHieu / maNhanHieu)");
            }
            if (missingFields.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    message: `Đơn tiếp nhận KH thiếu thông tin bắt buộc: ${missingFields.join(", ")}.`,
                });
            }
        } else {
            if (!cleanMaHoSo) {
                await transaction.rollback();
                return res.status(400).json({ message: "Vui lòng nhập mã hồ sơ (maHoSo)." });
            }
        }

        const sanitizedSoDon = cleanSoDon ? cleanSoDon.replace(/[^a-zA-Z0-9]/g, "") : "";
        const maDonPrefix = cleanMaHoSo || (sanitizedSoDon ? `TN_KH_${sanitizedSoDon}` : "TN_KH");
        const maDonDangKy = generateMaDonDangKy(maDonPrefix);

        if (!hasMaNhanHieu) {
            if (!hasTenNhanHieu) {
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

        if (donData.giayUyQuyenGoc === false && !donData.maUyQuyen) {
            await transaction.rollback();
            return res.status(400).json({ message: "Vui lòng chọn gốc của giấy ủy quyền." });
        }

        if (donData.giayUyQuyenGoc === true) {
            donData.maUyQuyen = null;
        }

        const newDon = await DonDangKyNhanHieu_KH.create(
            {
                ...donData,
                loaiDon: donData.loaiDon || 1,
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
        if (donData.soBang) {
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
                maQuocGia: "KH",
                trangThaiDon: donData.trangThaiDon || null,
            };

            const newGCN = await GCN_NH_KH.create(gcnData, { transaction });
            idGCN_NH = newGCN.id
                ?? newGCN.dataValues?.id
                ?? newGCN.getDataValue('id');
        }

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
        if (Array.isArray(taiLieus)) {
            for (const tl of taiLieus) {
                await TaiLieu_KH.create({
                    maDonDangKy: newDon.maDonDangKy,
                    tenTaiLieu: tl.tenTaiLieu,
                    trangThai: tl.trangThai,
                    linkTaiLieu: tl.linkTaiLieu || null,
                }, { transaction });
            }
        }
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
                        idDoiTac: cleanIdDoiTac,
                        maQuocGiaVuViec: "KH",
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
                        isMainCase: vuViec.isMainCase,
                    },
                    { transaction }
                );
            }
        }
        if (Array.isArray(maSPDVList)) {
            for (const maSPDV of maSPDVList) {
                await DonDK_SPDV_KH.create({
                    maDonDangKy: newDon.maDonDangKy,
                    maSPDV: maSPDV,
                }, { transaction });
            }
        }
        if (Array.isArray(lichSuThamDinh)) {
            for (const item of lichSuThamDinh) {
                const createdThamDinh = await LichSuThamDinh_KH.create({
                    maDonDangKy,
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
                    ngayNopYeuCauSauKN: item.ngayNopYeuCauSauKN
                }, { transaction });

                // Nếu có nhiều lần gia hạn trong lần thẩm định này
                if (Array.isArray(item.giaHanList)) {
                    for (const gh of item.giaHanList) {
                        await LichSuGiaHan_KH.create({
                            idLichSuThamDinh: createdThamDinh.id,
                            maDonDangKy,
                            lanGiaHan: gh.lanGiaHan,
                            ngayYeuCauGiaHan: gh.ngayYeuCauGiaHan,
                            ngayCapGiaHan: gh.ngayCapGiaHan,
                            hanTraLoi: gh.hanTraLoi || null,
                            ghiChu: gh.ghiChu || null
                        }, { transaction });
                    }
                }
            }
        }

        const hanXuLy = await tinhHanXuLy(newDon);
        const hanTraLoi = await tinhHanTraLoi(newDon, transaction);

        await newDon.update({ hanXuLy, hanTraLoi }, { transaction });
        await transaction.commit();
        res.status(201).json({
            message: "Tạo đơn đăng ký và tài liệu thành công",
            don: newDon
        });

    } catch (error) {
        await transaction.rollback();
        res.status(400).json({ message: error.message });
    }
};

export const updateApplication_KH = async (req, res) => {
    const t = await DonDangKyNhanHieu_KH.sequelize.transaction();
    try {
        const { maDonDangKy, maHoSo, laDonTiepNhan, taiLieus, vuViecs, maSPDVList, lichSuThamDinh, maNhanHieu, maNhanSuCapNhap, nhanHieu, maNguoiXuLy1, maNguoiXuLy2, donSuaDoi, donTach, donData, ...updateData } = req.body;

        if (!maDonDangKy) {
            await t.rollback();
            return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });
        }

        const don = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy },
            transaction: t,
        });

        if (!don) {
            await t.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký ....." });
        }

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
                const gcn = await GCN_NH_KH.findByPk(don.idGCN_NH, { transaction: t });
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
                const newGCN = await GCN_NH_KH.create({
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
                    maQuocGia: "KH",
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
        // const hanXuLy = await tinhHanXuLy(don);
        // const hanTraLoi = await tinhHanTraLoi(don);

        // await don.update({ hanXuLy, hanTraLoi }, { transaction: t });
        const taiLieusHienTai = await TaiLieu_KH.findAll({
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
                    await TaiLieu_KH.update({
                        tenTaiLieu: taiLieu.tenTaiLieu,
                        linkTaiLieu: taiLieu.linkTaiLieu,
                        trangThai: taiLieu.trangThai,
                    }, {
                        where: { maTaiLieu: taiLieu.maTaiLieu },
                        transaction: t
                    });
                } else {
                    await TaiLieu_KH.create({
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

            // Xoá vụ việc không còn trong request
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
                            maQuocGiaVuViec: "KH",
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
                            isMainCase: vuViec.isMainCase,
                        },
                        {
                            where: { id: vuViec.id },
                            transaction: t
                        }
                    );
                } else {
                    await VuViec.create(
                        {
                            tenVuViec: vuViec.tenVuViec,
                            moTa: vuViec.moTa,
                            trangThai: vuViec.trangThai,
                            maHoSo: effectiveMaHoSoForVV,
                            maDon: maDonDangKy,
                            soDon: don.soDon,
                            idKhachHang: don.idKhachHang,
                            idDoiTac: don.idDoiTac,
                            maQuocGiaVuViec: "KH",
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
                            isMainCase: vuViec.isMainCase,
                        },
                        { transaction: t }
                    );
                }
            }
        }


        if (Array.isArray(maSPDVList)) {
            await DonDK_SPDV_KH.destroy({
                where: { maDonDangKy },
                transaction: t
            });
            for (const maSPDV of maSPDVList) {
                await DonDK_SPDV_KH.create({
                    maDonDangKy,
                    maSPDV
                }, { transaction: t });
            }
        }
        if (Array.isArray(lichSuThamDinh)) {
            let coGiaHan = false;
            for (const item of lichSuThamDinh) {
                if (Array.isArray(item.giaHanList) && item.giaHanList.length > 0) {
                    coGiaHan = true;
                    break;
                }
            }

            if (coGiaHan) {
                await LichSuGiaHan_KH.destroy({
                    where: { maDonDangKy },
                    transaction: t
                });
            }

            await LichSuThamDinh_KH.destroy({
                where: { maDonDangKy },
                transaction: t
            });
        }


        if (Array.isArray(lichSuThamDinh)) {
            for (const item of lichSuThamDinh) {
                const createdThamDinh = await LichSuThamDinh_KH.create({
                    maDonDangKy,
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

                    ngayNopYeuCauSauKN: item.ngayNopYeuCauSauKN
                }, { transaction: t });

                if (Array.isArray(item.giaHanList)) {
                    for (const gh of item.giaHanList) {
                        await LichSuGiaHan_KH.create({
                            idLichSuThamDinh: createdThamDinh.id,
                            maDonDangKy,
                            lanGiaHan: gh.lanGiaHan,
                            ngayYeuCauGiaHan: gh.ngayYeuCauGiaHan,
                            ngayCapGiaHan: gh.ngayCapGiaHan,
                            hanTraLoiGiaHan: gh.hanTraLoiGiaHan || null,
                            // ghiChu: gh.ghiChu || null
                        }, { transaction: t });
                    }
                }

            }
        }
        // Chỉ cập nhật DonSuaDoi_NH_KH nếu client chủ động gửi object donSuaDoi có id (không ghi đè/xóa khi undefined/null)
        if (donSuaDoi && typeof donSuaDoi === "object" && donSuaDoi.id) {
            const ds = donSuaDoi;
            const existingDS = await DonSuaDoi_NH_KH.findByPk(ds.id, { transaction: t });
            if (existingDS) {
                await existingDS.update({
                    soDon: ds.soDon ?? existingDS.soDon,
                    ngayYeuCau: ds.ngayYeuCau ?? existingDS.ngayYeuCau,
                    lanSuaDoi: ds.lanSuaDoi ?? existingDS.lanSuaDoi,
                    ngayGhiNhanSuaDoi: Number(existingDS.trangThaiDuyet) === 1 ? (ds.ngayGhiNhanSuaDoi ?? existingDS.ngayGhiNhanSuaDoi) : null,
                    duocGhiNhanSuaDoi: ds.duocGhiNhanSuaDoi ?? existingDS.duocGhiNhanSuaDoi,
                    moTa: ds.moTa ?? existingDS.moTa,
                    suaDoiDaiDien: ds.suaDoiDaiDien ?? existingDS.suaDoiDaiDien,
                    ndSuaDoiDaiDien: ds.ndSuaDoiDaiDien ?? existingDS.ndSuaDoiDaiDien,
                    suaDoiTenChuDon: ds.suaDoiTenChuDon ?? existingDS.suaDoiTenChuDon,
                    ndSuaDoiTenChuDon: ds.ndSuaDoiTenChuDon ?? existingDS.ndSuaDoiTenChuDon,
                    suaDoiDiaChi: ds.suaDoiDiaChi ?? existingDS.suaDoiDiaChi,
                    ndSuaDoiDiaChi: ds.ndSuaDoiDiaChi ?? existingDS.ndSuaDoiDiaChi,
                    suaNhan: ds.suaNhan ?? existingDS.suaNhan,
                    ndSuaNhan: ds.ndSuaNhan ?? existingDS.ndSuaNhan,
                    suaNhomSPDV: ds.suaNhomSPDV ?? existingDS.suaNhomSPDV,
                    ndSuaNhomSPDV: ds.ndSuaNhomSPDV ?? existingDS.ndSuaNhomSPDV,
                    suaDoiNoiDungKhac: ds.suaDoiNoiDungKhac ?? existingDS.suaDoiNoiDungKhac,
                    ndSuaDoiNoiDungKhac: ds.ndSuaDoiNoiDungKhac ?? existingDS.ndSuaDoiNoiDungKhac,
                    maNhanSuCapNhap: maNhanSuCapNhap || existingDS.maNhanSuCapNhap
                }, { transaction: t });
            }
        }
        if (donTach) {
            const ds = donTach;
            if (ds.id) {

                const existingDS = await DonTachNH_KH.findByPk(ds.id, { transaction: t });
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

        await don.update({ hanXuLy, hanTraLoi }, { transaction: t });
        await t.commit();
        res.json({ message: "Cập nhật đơn thành công", data: don });
    } catch (error) {
        await t.rollback();
        res.status(400).json({ message: error.message });
    }
};


export const deleteApplication_KH = async (req, res) => {
    try {
        const { maDonDangKy, maNhanSuCapNhap } = req.body;

        if (!maDonDangKy) {
            return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });
        }

        const don = await DonDangKyNhanHieu_KH.findByPk(maDonDangKy);
        if (!don) {
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        }
        await TaiLieu_KH.destroy({ where: { maDonDangKy: maDonDangKy } });
        await don.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa đơn đăng ký",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa đơn đăng ký '${don.soDon}'`,
            data: {
                maDonDangKy,
            },
        });
        res.status(200).json({ message: "Đã xoá đơn đăng ký và tài liệu liên quan" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Đơn đăng ký đang được sử dụng, không thể xóa." });
        }

        res.status(500).json({ message: error.message });
    }
};


export const getFullApplicationDetail_KH = async (req, res) => {
    try {
        const { maDonDangKy } = req.body;
        if (!maDonDangKy) {
            return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });
        }

        const don = await DonDangKyNhanHieu_KH.findOne({
            where: { maDonDangKy },
            include: [
                {
                    model: TaiLieu_KH,
                    as: "taiLieuChuaNop_KH",
                    required: false,
                    attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"]
                },
                {
                    model: DonDK_SPDV_KH,
                    as: "DonDK_SPDV_KH",
                    required: false,
                    attributes: ["maSPDV"]
                },
                {
                    model: NhanHieu,
                    as: "nhanHieu",
                    required: false,
                    attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh"]
                },
                {
                    model: LichSuThamDinh_KH,
                    as: "lichSuThamDinh",
                    required: false,
                    attributes: {
                        exclude: ['createdAt', 'updatedAt']
                    }
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHang",
                    required: false,
                    attributes: ["id", "maKhachHang", "tenKhachHang", "diaChi", "sdt"]
                },
                {
                    model: DoiTac,
                    as: "doitac",
                    required: false,
                    attributes: ["id", "maDoiTac", "tenDoiTac", "diaChi", "sdt", "email"]
                },
                {
                    model: GiayUyQuyen,
                    as: "GiayUyQuyen",
                    required: false,
                    attributes: ["id", "soDonGoc", "soGUQ"],
                }
            ]
        });

        if (!don) {
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });
        }

        const plainDon = don.toJSON();

        // Nếu cần tách lịch sử thẩm định HT/ND thì bật lại đoạn dưới
        // plainDon.lichSuThamDinhHT = [];
        // plainDon.lichSuThamDinhND = [];
        // if (Array.isArray(plainDon.lichSuThamDinh)) {
        //     for (const item of plainDon.lichSuThamDinh) {
        //         if (item.loaiThamDinh === "HinhThuc") {
        //             plainDon.lichSuThamDinhHT.push(item);
        //         } else if (item.loaiThamDinh === "NoiDung") {
        //             plainDon.lichSuThamDinhND.push(item);
        //         }
        //     }
        // }
        // delete plainDon.lichSuThamDinh;

        // Mã SPDV list
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
        plainDon.maSPDVList = Array.isArray(plainDon.DonDK_SPDV_KH)
            ? plainDon.DonDK_SPDV_KH.map(sp => sp.maSPDV)
            : [];
        delete plainDon.DonDK_SPDV_KH;

        // ====== PHẦN ĐƠN SỬA ĐỔI, CHUYỂN QUYỀN & PHẢ HỆ (KH) ======
        await Promise.all([autoRejectExpiredDonSuaDoi_KH(), autoRejectExpiredDonCQSH_KH()]);

        plainDon.laDonTiepNhan = Boolean(plainDon.laDonTiepNhan);
        plainDon.donGoc = plainDon.donGoc ?? 0;

        // 0. Phả hệ đơn cha của đơn hiện tại (Sửa đổi / Chuyển quyền / Tách đơn KH)
        const graphKH = await getDonKHLineageGraph();
        const parentEdge = graphKH.parentOf.get(plainDon.maDonDangKy) || null;
        if (parentEdge?.parentMaDon) {
            const parentDon = await DonDangKyNhanHieu_KH.findOne({
                where: { maDonDangKy: parentEdge.parentMaDon },
                attributes: ["maDonDangKy", "soDon", "ngayNopDon", "maHoSo", "maHoSoVuViec", "loaiDon"],
                raw: true,
            });
            plainDon.maDonDangKyGoc = parentEdge.parentMaDon;
            plainDon.soDonGoc = parentDon?.soDon || null;
            plainDon.ngayNopDonGoc = parentDon?.ngayNopDon || null;
            plainDon.loaiBienDongGoc = parentEdge.loaiBienDong || null;
            plainDon.donCha = parentDon
                ? {
                      maDonDangKy: parentDon.maDonDangKy,
                      soDon: parentDon.soDon,
                      ngayNopDon: parentDon.ngayNopDon,
                      loaiBienDong: parentEdge.loaiBienDong,
                  }
                : null;
        } else {
            plainDon.maDonDangKyGoc = null;
            plainDon.soDonGoc = null;
            plainDon.ngayNopDonGoc = null;
            plainDon.loaiBienDongGoc = null;
            plainDon.donCha = null;
        }

        // 1. Tờ khai sửa đổi & chuyển quyền của chính đơn KH hiện tại
        const [donSuaDoiHienTai, donCQHienTai] = await Promise.all([
            DonSuaDoi_NH_KH.findOne({
                where: {
                    [Op.or]: [
                        { maDonDangKy: plainDon.maDonDangKy },
                        { maDonDangKyGoc: plainDon.maDonDangKy, trangThaiDuyet: 0 },
                    ],
                },
                order: [["id", "DESC"]],
            }),
            DonCQSH_KH.findOne({
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
            }),
        ]);
        if (donSuaDoiHienTai) {
            const sdPlain = donSuaDoiHienTai.toJSON();
            sdPlain.ngayGhiNhanSuaDoi = Number(sdPlain.trangThaiDuyet) === 1 ? sdPlain.ngayGhiNhanSuaDoi : null;
            plainDon.donSuaDoi = sdPlain;
        }
        if (donCQHienTai) {
            const cqPlain = donCQHienTai.toJSON();
            cqPlain.ngayGhiNhanCQ = Number(cqPlain.trangThaiDuyet) === 1 ? cqPlain.ngayGhiNhanCQ : null;
            plainDon.donCQSH = cqPlain;
        }

        // 2. Biến động đang chờ duyệt (trangThaiDuyet = 0) của đơn hiện tại: gồm cả Sửa đổi + Chuyển quyền
        const [pendingSuaDoiRows, pendingCQRows] = await Promise.all([
            DonSuaDoi_NH_KH.findAll({
                where: { maDonDangKyGoc: plainDon.maDonDangKy, trangThaiDuyet: 0 },
                attributes: ["id", "soDon", "ngayYeuCau", "lanSuaDoi", "hanTraLoi"],
                order: [["id", "DESC"]],
                raw: true,
            }),
            DonCQSH_KH.findAll({
                where: { maDonDangKyGoc: plainDon.maDonDangKy, trangThaiDuyet: 0 },
                attributes: ["id", "soDon", "ngayYeuCau", "lanChuyenQuyen", "hanTraLoi"],
                order: [["id", "DESC"]],
                raw: true,
            }),
        ]);
        plainDon.dsBienDongChoDuyet = [
            ...pendingSuaDoiRows.map((sd) => ({
                id: sd.id,
                loaiBienDong: "SUA_DOI",
                tenBienDong: "Đơn sửa đổi",
                soDon: sd.soDon,
                ngayYeuCau: sd.ngayYeuCau,
                lanBienDong: sd.lanSuaDoi,
                hanTraLoi: sd.hanTraLoi || null,
            })),
            ...pendingCQRows.map((cq) => ({
                id: cq.id,
                loaiBienDong: "CHUYEN_QUYEN",
                tenBienDong: "Đơn chuyển quyền sở hữu",
                soDon: cq.soDon,
                ngayYeuCau: cq.ngayYeuCau,
                lanBienDong: cq.lanChuyenQuyen,
                hanTraLoi: cq.hanTraLoi || null,
            })),
        ];
        plainDon.dangSuaDoi = pendingSuaDoiRows.length > 0;
        plainDon.dangChuyenQuyen = pendingCQRows.length > 0;

        // 3. Danh sách đơn con sau sửa đổi / chuyển quyền nếu đơn hiện tại đã đóng băng (donGoc = 1)
        plainDon.dsDonCon = [];
        if (Number(plainDon.donGoc) === 1) {
            const [approvedSDChildren, approvedCQChildren] = await Promise.all([
                DonSuaDoi_NH_KH.findAll({
                    where: {
                        maDonDangKyGoc: plainDon.maDonDangKy,
                        trangThaiDuyet: 1,
                        maDonDangKy: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
                    },
                    include: [
                        {
                            model: DonDangKyNhanHieu_KH,
                            as: "donMoi",
                            required: false,
                            attributes: ["maDonDangKy", "soDon"],
                        },
                    ],
                    order: [["id", "DESC"]],
                }),
                DonCQSH_KH.findAll({
                    where: {
                        maDonDangKyGoc: plainDon.maDonDangKy,
                        trangThaiDuyet: 1,
                        maDonDangKy: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: "" }] },
                    },
                    include: [
                        {
                            model: DonDangKyNhanHieu_KH,
                            as: "donMoi",
                            required: false,
                            attributes: ["maDonDangKy", "soDon"],
                        },
                    ],
                    order: [["id", "DESC"]],
                }),
            ]);
            plainDon.dsDonCon = [
                ...approvedSDChildren.map((c) => ({
                    maDonDangKy: c.maDonDangKy,
                    soDon: c.donMoi?.soDon || c.soDon || null,
                    loaiBienDong: "Đơn sửa đổi",
                })),
                ...approvedCQChildren.map((c) => ({
                    maDonDangKy: c.maDonDangKy,
                    soDon: c.donMoi?.soDon || c.soDon || null,
                    loaiBienDong: "Đơn chuyển quyền sở hữu",
                })),
            ];
        }

        // 4. Danh sách các đơn sửa đổi & chuyển quyền của tất cả đơn trong cùng hồ sơ KH (hoặc liên quan trực tiếp đơn này)
        plainDon.danhSachDonSuaDoi = [];
        plainDon.danhSachDonChuyenQuyen = [];
        let maDonListForScope = [plainDon.maDonDangKy];
        if (plainDon.maHoSo) {
            const dsDonCungHoSo_KH = await DonDangKyNhanHieu_KH.findAll({
                where: { maHoSo: plainDon.maHoSo },
                attributes: ["maDonDangKy"],
                raw: true,
            });
            maDonListForScope = [...new Set([...maDonListForScope, ...dsDonCungHoSo_KH.map((d) => d.maDonDangKy)])];
        }
        if (maDonListForScope.length > 0) {
            const [dsDonSuaDoi, dsDonChuyenQuyen] = await Promise.all([
                DonSuaDoi_NH_KH.findAll({
                    where: {
                        [Op.or]: [
                            { maDonDangKy: { [Op.in]: maDonListForScope } },
                            { maDonDangKyGoc: { [Op.in]: maDonListForScope } },
                        ],
                    },
                    order: [["id", "DESC"]],
                }),
                DonCQSH_KH.findAll({
                    where: {
                        [Op.or]: [
                            { maDonDangKy: { [Op.in]: maDonListForScope } },
                            { maDonDangKyGoc: { [Op.in]: maDonListForScope } },
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

            plainDon.danhSachDonSuaDoi = dsDonSuaDoi
                .filter((d) => Number(d.trangThaiDuyet) === 1 || Boolean(d.ngayYeuCau))
                .map((d) => ({
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

            plainDon.danhSachDonChuyenQuyen = dsDonChuyenQuyen
                .filter((d) => Number(d.trangThaiDuyet) === 1 || Boolean(d.ngayYeuCau))
                .map((d) => ({
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

        // Gắn thông tin khách hàng phẳng
        if (plainDon.khachHang) {
            plainDon.maKhachHang = plainDon.khachHang.maKhachHang;
            plainDon.tenKhachHang = plainDon.khachHang.tenKhachHang;
            plainDon.diaChi = plainDon.khachHang.diaChi;
            plainDon.sdt = plainDon.khachHang.sdt;
        }

        return res.json(plainDon);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


export const getApplicationsByMaKhachHang_KH = async (req, res) => {
    try {
        const { maKhachHang } = req.body;

        if (!maKhachHang) {
            return res.status(400).json({ message: "Thiếu mã khách hàng" });
        }

        const applications = await DonDangKyNhanHieu_KH.findAll({
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
                        '$hoSoVuViec.maHoSoVuViec$': { [Op.eq]: Sequelize.col('DonDangKyNhanHieu_KH.maHoSoVuViec') },
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

export const getMaKhachHangByMaHoSoVuViec_KH = async (req, res) => {
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

import ExcelJS from "exceljs";
import dayjs from "dayjs";

export const exportApplicationsToExcel_KH = async (req, res) => {
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
            reportTitle = "BÁO CÁO DANH SÁCH ĐƠN ĐĂNG KÝ NHÃN HIỆU CAMPUCHIA",
            reportFileName,
        } = req.body;

        const {
            selectedField,
            fromDate,
            toDate,
            hanXuLyFilter,
            hanTraLoiFilter,
        } = filterCondition;

        const whereCondition = {};

        if (trangThaiDon) whereCondition.trangThaiDon = trangThaiDon;
        if (trangThaiVuViec) whereCondition.trangThaiVuViec = trangThaiVuViec;
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
            const cleanText = searchText.replace(/-/g, "");
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(soDon, '-', '') LIKE '%${cleanText}%'`),
                { maHoSo: { [Op.like]: `%${searchText}%` } },
                literal(`REPLACE(maHoSo, '-', '') LIKE '%${cleanText}%'`),
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

        const applications = await DonDangKyNhanHieu_KH.findAll({
            where: whereCondition,
            include: [
                {
                    model: DonDK_SPDV_KH,
                    as: "DonDK_SPDV_KH",
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

        const allSPDV = await SanPham_DichVu.findAll({
            attributes: ["maSPDV", "tenSPDV"],
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Bao_cao_don_KH");

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
            { label: "Ngày có KQ thẩm định", key: "ngayKQThamDinh" },
            { label: "Ngày nhận bằng", key: "ngayNhanBang" },
            { label: "Số bằng", key: "soBang" },
            { label: "Ngày cấp bằng", key: "ngayCapBang" },
            { label: "Ngày hết hạn bằng", key: "ngayHetHanBang" },
            { label: "Ngày gửi bằng cho khách hàng", key: "ngayGuiBangChoKhachHang" },
            { label: "Loại đơn", key: "loaiDon" },
        ];

        const columns = allFieldOptions.filter((field) => fields.includes(field.key));
        const totalColumns = 1 + columns.length;

        const titleRow = worksheet.addRow([reportTitle]);
        worksheet.mergeCells(1, 1, 1, totalColumns);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { horizontal: "center" };

        const exportTime = dayjs().format("DD/MM/YYYY HH:mm:ss");
        const infoRow = worksheet.addRow([`Ngày xuất báo cáo: ${exportTime}`]);
        worksheet.mergeCells(2, 1, 2, totalColumns);
        infoRow.font = { italic: true };
        infoRow.alignment = { horizontal: "left" };

        const excelColumns = [
            { key: "stt", width: 6 },
            ...columns.map((col) => ({ key: col.key, width: 25 })),
        ];
        worksheet.columns = excelColumns;

        const headerValues = ["STT", ...columns.map((col) => col.label || col.key)];
        const headerRow = worksheet.addRow(headerValues);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: "center" };

        const dateFields = [
            "ngayNopDon", "ngayHoanThanhHoSoTaiLieu", "ngayKQThamDinh",
            "ngayNhanBang", "ngayCapBang", "ngayHetHanBang", "ngayGuiBangChoKhachHang",
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
                    value = getTenSPDVChuoi(app.DonDK_SPDV_KH);
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

        const baseName = reportFileName || `bao_cao_don_KH_${dayjs().format("YYYYMMDD_HHmmss")}`;
        const fileName = baseName.toLowerCase().endsWith(".xlsx") ? baseName : `${baseName}.xlsx`;

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Lỗi exportApplicationsToExcel_KH:", error);
        res.status(500).json({ message: error.message });
    }
};
