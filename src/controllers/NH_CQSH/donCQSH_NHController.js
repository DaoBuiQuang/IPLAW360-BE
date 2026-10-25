import { sequelize } from "../../config/db.js";
import { DonDangKy } from "../../models/donDangKyModel.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { DonCQSH_VN } from "../../models/VN_ChuyenQuyenSH/donCQSH_VNModel.js";
import { DonCQSH_GCN_VN } from "../../models/VN_ChuyenQuyenSH/donCQSH_GCN_VNModel.js";
import { DonDK_SPDV } from "../../models/donDK_SPDVMolel.js";
import { GCN_NH } from "../../models/GCN_NHModel.js";
import { NhanHieu } from "../../models/nhanHieuModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import crypto from "crypto";
import { Op } from "sequelize";

// Helper sinh mã đơn đăng ký mới
const generateMaDonDangKy = (maHoSo) => {
    const randomStr = crypto.randomBytes(3).toString("hex");
    return `${maHoSo}_${randomStr}`;
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
            maKhachHangMoi,
            soDonChuyenQuyen,
            ngayYeuCauChuyenQuyen,
            ngayGhiNhanChuyenQuyen,
            ghiChu,
            maNhanSuCapNhap,
        } = req.body;

        // ====== 1. VALIDATE INPUT ======
        if (!maHoSo || !maDonDangKyCu || !maKhachHangMoi) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: mã hồ sơ (maHoSo), mã đơn đăng ký cũ (maDonDangKyCu) hoặc khách hàng mới (maKhachHangMoi).",
            });
        }

        // ====== 2. TÌM ĐƠN ĐĂNG KÝ CŨ ======
        const donCu = await DonDangKy.findOne({
            where: { maDonDangKy: maDonDangKyCu },
            transaction,
        });

        if (!donCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký gốc." });
        }

        // ====== 3. TÌM KHÁCH HÀNG NHẬN CHUYỂN NHƯỢNG ======
        const khachHangMoi = await KhachHangCuoi.findByPk(maKhachHangMoi, { transaction });
        if (!khachHangMoi) {
            await transaction.rollback();
            return res.status(404).json({
                message: `Không tìm thấy khách hàng nhận chuyển quyền sở hữu với ID ${maKhachHangMoi}!`,
            });
        }

        // ====== 4. TÍNH SỐ LẦN CHUYỂN QUYỀN ======
        const countCQ = await DonCQSH_VN.count({
            where: { maDonDangKyGoc: maDonDangKyCu },
            transaction,
        });
        const lanChuyenQuyen = countCQ + 1;

        // ====== 5. TẠO ĐƠN ĐĂNG KÝ MỚI ======
        const maDonDangKyMoi = generateMaDonDangKy(maHoSo);
        // BẮT BUỘC loại bỏ id, createdAt, updatedAt trước khi tạo mới để tránh trùng lặp PRIMARY key
        const { id, createdAt, updatedAt, ...cloneDonData } = donCu.get({ plain: true });

        const donMoi = await DonDangKy.create(
            {
                ...cloneDonData,
                maDonDangKy: maDonDangKyMoi,
                loaiDon: 3, // Loại đơn Chuyển quyền sở hữu
                idKhachHang: khachHangMoi.id,
                donGoc: 0, // Đơn mới đang hoạt động
                trangThai: "MOI",
                soDon: soDonChuyenQuyen || cloneDonData.soDon,
                ngayNop: ngayYeuCauChuyenQuyen || cloneDonData.ngayNop || new Date(),
                maHoSo: maHoSo || cloneDonData.maHoSo,
                maHoSoVuViec: maHoSo || cloneDonData.maHoSoVuViec,
            },
            { transaction }
        );

        // ====== 6. CẬP NHẬT ĐƠN CŨ ======
        await donCu.update(
            {
                donGoc: 1, // Đơn cũ đánh dấu thành gốc/lịch sử
                trangThaiVuViec: "Đã chuyển quyền",
                trangThaiDon: "Đã chuyển quyền",
            },
            { transaction }
        );

        // ====== 7. TẠO BẢN GHI DonCQSH_VN ======
        const newCQ = await DonCQSH_VN.create(
            {
                maHoSo,
                maDonDangKy: donMoi.maDonDangKy,
                idKhachHang: khachHangMoi.id,
                maDonDangKyGoc: maDonDangKyCu,
                soDon: soDonChuyenQuyen || donCu.soDon,
                noiDung: ghiChu || `Chuyển quyền sở hữu đơn đăng ký ${donCu.soDon || maDonDangKyCu} sang khách hàng ${khachHangMoi.tenKhachHang}`,
                moTa: ghiChu || null,
                ngayYeuCau: ngayYeuCauChuyenQuyen || new Date(),
                ngayGhiNhanCQ: ngayGhiNhanChuyenQuyen || null,
                lanChuyenQuyen,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || null,
                isAutoImport: false,
            },
            { transaction }
        );

        // ====== 8. SAO CHÉP DANH SÁCH SPDV SANG ĐƠN MỚI ======
        const spdvCuList = await DonDK_SPDV.findAll({
            where: { maDonDangKy: maDonDangKyCu },
            transaction,
        });

        if (spdvCuList && spdvCuList.length > 0) {
            const spdvMoiList = spdvCuList.map((spdvCu) => ({
                maDonDangKy: maDonDangKyMoi,
                maSPDV: spdvCu.maSPDV,
                isAutoImport: spdvCu.isAutoImport,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            await DonDK_SPDV.bulkCreate(spdvMoiList, { transaction });
        }

        await transaction.commit();

        return res.status(201).json({
            message: "Tiếp nhận chuyển quyền sở hữu đơn đăng ký nhãn hiệu thành công!",
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
            pageIndex = 1,
            pageSize = 20,
        } = req.body;

        const offset = (pageIndex - 1) * pageSize;
        const whereCondition = {};

        if (soDon) {
            whereCondition.soDon = { [Op.like]: `%${soDon}%` };
        }
        if (maHoSo) {
            whereCondition.maHoSo = { [Op.like]: `%${maHoSo}%` };
        }
        if (searchText) {
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                { maHoSo: { [Op.like]: `%${searchText}%` } },
                { maDonDangKy: { [Op.like]: `%${searchText}%` } },
                { maDonDangKyGoc: { [Op.like]: `%${searchText}%` } },
            ];
        }

        const { count, rows } = await DonCQSH_VN.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: DonDangKy,
                    as: "donMoi",
                    attributes: ["maDonDangKy", "soDon", "maHoSo", "trangThaiDon", "ngayNop"],
                    include: [
                        { model: NhanHieu, as: "nhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "doiTac", attributes: ["tenDoiTac"] },
                    ],
                },
                {
                    model: DonDangKy,
                    as: "donGoc",
                    attributes: ["maDonDangKy", "soDon", "maHoSo", "idKhachHang"],
                    include: [
                        { model: KhachHangCuoi, as: "khachHang", attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    attributes: ["id", "tenKhachHang", "maKhachHang", "diaChi", "sdt", "email"],
                },
            ],
            limit: parseInt(pageSize),
            offset: parseInt(offset),
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / pageSize),
            currentPage: parseInt(pageIndex),
            data: rows,
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
        const { id, maDonDangKy } = req.body;
        const whereCondition = {};
        if (id) whereCondition.id = id;
        if (maDonDangKy) whereCondition.maDonDangKy = maDonDangKy;

        if (!id && !maDonDangKy) {
            return res.status(400).json({ message: "Thiếu ID hoặc mã đơn đăng ký của hồ sơ chuyển quyền!" });
        }

        const donCQ = await DonCQSH_VN.findOne({
            where: whereCondition,
            include: [
                {
                    model: DonDangKy,
                    as: "donMoi",
                    include: [
                        { model: NhanHieu, as: "nhanHieu" },
                        { model: DoiTac, as: "doiTac" },
                        { model: KhachHangCuoi, as: "khachHang" },
                    ],
                },
                {
                    model: DonDangKy,
                    as: "donGoc",
                    include: [
                        { model: KhachHangCuoi, as: "khachHang" },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                },
            ],
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
            soBang,
            maKhachHangMoi,
            soDonChuyenQuyen,
            ngayYeuCauChuyenQuyen,
            ngayGhiNhanChuyenQuyen,
            ghiChu,
            maNhanSuCapNhap,
        } = req.body;

        // ====== 1. VALIDATE INPUT ======
        if (!maHoSo || !idGCN_NH_Cu || !maKhachHangMoi) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: mã hồ sơ (maHoSo), ID Giấy chứng nhận cũ (idGCN_NH_Cu) hoặc khách hàng mới (maKhachHangMoi).",
            });
        }

        // ====== 2. TÌM GIẤY CHỨNG NHẬN GỐC ======
        const gcnCu = await GCN_NH.findByPk(idGCN_NH_Cu, { transaction });
        if (!gcnCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy Giấy chứng nhận nhãn hiệu gốc!" });
        }

        // ====== 3. TÌM KHÁCH HÀNG MỚI ======
        const khachHangMoi = await KhachHangCuoi.findByPk(maKhachHangMoi, { transaction });
        if (!khachHangMoi) {
            await transaction.rollback();
            return res.status(404).json({
                message: `Không tìm thấy khách hàng nhận chuyển quyền sở hữu với ID ${maKhachHangMoi}!`,
            });
        }

        // ====== 4. TÍNH SỐ LẦN CHUYỂN QUYỀN GCN ======
        const countCQ = await DonCQSH_GCN_VN.count({
            where: { idGCN_NH_Goc: idGCN_NH_Cu },
            transaction,
        });
        const lanChuyenQuyen = countCQ + 1;

        // ====== 5. TẠO GCN MỚI CHO KHÁCH HÀNG MỚI ======
        // BẮT BUỘC loại bỏ id, createdAt, updatedAt trước khi tạo mới để tránh trùng lặp PRIMARY key
        const { id, createdAt, updatedAt, ...cloneData } = gcnCu.get({ plain: true });

        const gcnMoi = await GCN_NH.create(
            {
                ...cloneData,
                soBang: soBang || cloneData.soBang,
                maHoSo: maHoSo || cloneData.maHoSo,
                loaiBang: 3, // Loại bằng chuyển quyền sở hữu
                idKhachHang: khachHangMoi.id,
                bangGoc: 0, // Bằng mới đang lưu hành
                ghiChu: ghiChu || cloneData.ghiChu,
                idGCN_NH_Goc: idGCN_NH_Cu,
            },
            { transaction }
        );

        // ====== 6. CẬP NHẬT GCN CŨ ======
        await gcnCu.update(
            {
                bangGoc: 1, // Đánh dấu là bằng gốc/lịch sử
                trangThaiBang: "Đã chuyển quyền",
            },
            { transaction }
        );

        // ====== 7. TẠO BẢN GHI DonCQSH_GCN_VN ======
        const newCQGCN = await DonCQSH_GCN_VN.create(
            {
                idGCN_NH: gcnMoi.id,
                idGCN_NH_Goc: idGCN_NH_Cu,
                idKhachHang: khachHangMoi.id,
                soDon: soDonChuyenQuyen || gcnCu.soDon || null,
                noiDung: ghiChu || `Chuyển quyền sở hữu giấy chứng nhận số ${gcnCu.soBang} sang khách hàng ${khachHangMoi.tenKhachHang}`,
                moTa: ghiChu || null,
                ngayYeuCau: ngayYeuCauChuyenQuyen || new Date(),
                ngayGhiNhanCQ: ngayGhiNhanChuyenQuyen || null,
                lanChuyenQuyen,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || null,
                isAutoImport: false,
            },
            { transaction }
        );

        await transaction.commit();

        return res.status(201).json({
            message: "Tiếp nhận chuyển quyền sở hữu giấy chứng nhận thành công!",
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
            searchText,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;

        const offset = (pageIndex - 1) * pageSize;
        const whereCondition = {};

        if (soDon) {
            whereCondition.soDon = { [Op.like]: `%${soDon}%` };
        }
        if (searchText) {
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchText}%` } },
                { noiDung: { [Op.like]: `%${searchText}%` } },
            ];
        }

        const { count, rows } = await DonCQSH_GCN_VN.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: GCN_NH,
                    as: "gcnMoi",
                    attributes: ["id", "soBang", "soDon", "maHoSo", "ngayCapBang", "ngayHetHanBang"],
                    include: [
                        { model: NhanHieu, as: "NhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
                    ],
                },
                {
                    model: GCN_NH,
                    as: "gcnGoc",
                    attributes: ["id", "soBang", "soDon", "maHoSo", "idKhachHang"],
                    include: [
                        { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["tenKhachHang", "maKhachHang"] },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                    attributes: ["id", "tenKhachHang", "maKhachHang", "diaChi", "sdt", "email"],
                },
            ],
            limit: parseInt(pageSize),
            offset: parseInt(offset),
            order: [["createdAt", "DESC"]],
        });

        return res.status(200).json({
            totalItems: count,
            totalPages: Math.ceil(count / pageSize),
            currentPage: parseInt(pageIndex),
            data: rows,
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
        const { id, idGCN_NH } = req.body;
        const whereCondition = {};
        if (id) whereCondition.id = id;
        if (idGCN_NH) whereCondition.idGCN_NH = idGCN_NH;

        if (!id && !idGCN_NH) {
            return res.status(400).json({ message: "Thiếu ID hoặc ID Giấy chứng nhận của hồ sơ chuyển quyền!" });
        }

        const cqGCN = await DonCQSH_GCN_VN.findOne({
            where: whereCondition,
            include: [
                {
                    model: GCN_NH,
                    as: "gcnMoi",
                    include: [
                        { model: NhanHieu, as: "NhanHieu" },
                        { model: DoiTac, as: "DoiTac" },
                        { model: KhachHangCuoi, as: "KhachHangCuoi" },
                    ],
                },
                {
                    model: GCN_NH,
                    as: "gcnGoc",
                    include: [
                        { model: KhachHangCuoi, as: "KhachHangCuoi" },
                    ],
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHangMoi",
                },
            ],
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
