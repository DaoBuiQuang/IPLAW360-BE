// controllers/giayUyQuyenController.js
import { Op, Sequelize } from "sequelize";

import { sendGenericNotification } from "../utils/notificationHelper.js";
import { GiayUyQuyen } from "../models/GiayUyQuyenModel.js";
import { DoiTac } from "../models/doiTacModel.js";
import { QuocGia } from "../models/quocGiaModel.js";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";

// 📄 Lấy danh sách giấy ủy quyền (phân trang + tìm kiếm)
export const getGiayUyQuyen = async (req, res) => {
    try {
        const {
            soDonGoc,
            idKhachHang,
            idDoiTac,
            pageIndex = 1,
            pageSize = 20,
            tenKhachHang,
            tenDoiTac,
        } = req.body;

        const offset = (pageIndex - 1) * pageSize;
        const whereCondition = {};

        if (soDonGoc) {
            whereCondition[Op.or] = [
                { soDonGoc: { [Op.like]: `%${soDonGoc}%` } },
                { soGUQ: { [Op.like]: `%${soDonGoc}%` } },
            ];
        }
        if (idKhachHang) {
            whereCondition.idKhachHang = idKhachHang;
        }
        if (idDoiTac) {
            whereCondition.idDoiTac = idDoiTac;
        }

        // ✅ Lọc KhachHang theo CẢ tên VÀ mã
        const khachHangWhere = tenKhachHang ? {
            [Op.or]: [
                { tenKhachHang: { [Op.like]: `%${tenKhachHang}%` } },
                { maKhachHang: { [Op.like]: `%${tenKhachHang}%` } },
            ]
        } : undefined;

        // ✅ Lọc DoiTac theo CẢ tên VÀ mã
        const doiTacWhere = tenDoiTac ? {
            [Op.or]: [
                { tenDoiTac: { [Op.like]: `%${tenDoiTac}%` } },
                { maDoiTac: { [Op.like]: `%${tenDoiTac}%` } },
            ]
        } : undefined;

        /* ================= COUNT ================= */
        const totalItems = await GiayUyQuyen.count({
            where: whereCondition,
            include: [
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    required: !!tenKhachHang,
                    where: khachHangWhere,
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    required: !!tenDoiTac,
                    where: doiTacWhere,
                },
            ],
            distinct: true,
        });

        /* ================= LIST ================= */
        const list = await GiayUyQuyen.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "soGUQ",
                "loaiGUQ",
                "idKhachHang",
                "idDoiTac",
                "maQuocGia",
                "soDonGoc",
                "ngayUyQuyen",
                "ngayHetHan",
                "linkAnh",
                "ghiChu",
                "maNhanSuCapNhap",
                "createdAt",
                "updatedAt",
            ],
            include: [
                {
                    model: KhachHangCuoi,
                    as: "KhachHangCuoi",
                    attributes: ["tenKhachHang", "maKhachHang"],
                    required: !!tenKhachHang,
                    where: khachHangWhere,
                },
                {
                    model: DoiTac,
                    as: "DoiTac",
                    attributes: ["tenDoiTac", "maDoiTac"],
                    required: !!tenDoiTac,
                    where: doiTacWhere,
                },
                {
                    model: QuocGia,
                    as: "QuocGia",
                    attributes: ["tenQuocGia"],
                    required: false,
                },
            ],
            order: [["ngayUyQuyen", "DESC"]],
            limit: pageSize,
            offset,
        });

        if (!list.length) {
            return res
                .status(404)
                .json({ message: "Không có giấy ủy quyền nào phù hợp" });
        }

        res.status(200).json({
            data: list,
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

export const getAllGiayUyQuyen = async (req, res) => {
    try {
        const { idKhachHang } = req.body;

        // kiểm tra có truyền idKhachHang không
        if (!idKhachHang) {
            return res
                .status(400)
                .json({ message: "Vui lòng truyền idKhachHang trong body" });
        }

        const list = await GiayUyQuyen.findAll({
            attributes: [
                "id",
                "soGUQ",
                "loaiGUQ",
                "idKhachHang",
            ],
            where: { idKhachHang }, // điều kiện lọc theo idKhachHang
            order: [["ngayUyQuyen", "DESC"]],
        });

        if (!list.length) {
            return res
                .status(404)
                .json({ message: "Không có giấy ủy quyền nào cho khách hàng này" });
        }

        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// 🔍 Lấy giấy ủy quyền theo ID
export const getGiayUyQuyenById = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res
                .status(400)
                .json({ message: "Thiếu id giấy ủy quyền" });
        }

        const record = await GiayUyQuyen.findByPk(id);

        if (!record) {
            return res
                .status(404)
                .json({ message: "Giấy ủy quyền không tồn tại" });
        }

        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ➕ Thêm giấy ủy quyền mới
export const addGiayUyQuyen = async (req, res) => {
    try {
        const {
            soGUQ,
            idKhachHang,
            idDoiTac,
            maQuocGia,
            soDonGoc,
            ngayUyQuyen,
            ngayHetHan,
            linkAnh,
            ghiChu,
            maNhanSuCapNhap,
            loaiGUQ,
            nguoiKy,
            chucDang
        } = req.body;

        if (!idKhachHang) {
            return res
                .status(400)
                .json({ message: "Thiếu id khách hàng" });
        }

        // Nếu có ràng unique soDonGoc thì có thể check trùng ở đây
        if (soDonGoc) {
            const existing = await GiayUyQuyen.findOne({
                where: { soDonGoc },
            });
            if (existing) {
                return res
                    .status(409)
                    .json({ message: "Số đơn gốc đã tồn tại!" });
            }
        }

        const newRecord = await GiayUyQuyen.create({
            soGUQ,
            idKhachHang,
            idDoiTac,
            maQuocGia,
            soDonGoc,
            ngayUyQuyen,
            ngayHetHan,
            linkAnh,
            ghiChu,
            maNhanSuCapNhap,
            loaiGUQ,
            nguoiKy,
            chucDang
        });

        res.status(201).json(newRecord);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "soDonGoc") message = "Số đơn gốc đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// ✏️ Cập nhật giấy ủy quyền
export const updateGiayUyQuyen = async (req, res) => {
    try {
        const {
            id,
            idKhachHang,
            idDoiTac,
            maQuocGia,
            soDonGoc,
            ngayUyQuyen,
            ngayHetHan,
            linkAnh,
            ghiChu,
            maNhanSuCapNhap,
        } = req.body;

        const record = await GiayUyQuyen.findByPk(id);
        if (!record) {
            return res
                .status(404)
                .json({ message: "Giấy ủy quyền không tồn tại" });
        }

        const changedFields = [];

        const updateField = (field, newValue) => {
            if (newValue !== undefined && newValue !== record[field]) {
                changedFields.push({
                    field,
                    oldValue: record[field],
                    newValue,
                });
                record[field] = newValue;
            }
        };

        updateField("idKhachHang", idKhachHang);
        updateField("idDoiTac", idDoiTac);
        updateField("maQuocGia", maQuocGia);
        updateField("soDonGoc", soDonGoc);
        updateField("ngayUyQuyen", ngayUyQuyen);
        updateField("ngayHetHan", ngayHetHan);
        updateField("linkAnh", linkAnh);
        updateField("ghiChu", ghiChu);

        record.maNhanSuCapNhap = maNhanSuCapNhap;

        await record.save({ userId: maNhanSuCapNhap });

        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật giấy ủy quyền",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật giấy ủy quyền${record.soDonGoc ? ` số '${record.soDonGoc}'` : ""}`,
                data: { id: record.id, soDonGoc: record.soDonGoc, changes: changedFields },
            });
        }

        res.status(200).json({
            message: "Cập nhật giấy ủy quyền thành công",
            giayUyQuyen: record,
            changes: changedFields,
        });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "soDonGoc") message = "Số đơn gốc đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// 🗑️ Xóa giấy ủy quyền
export const deleteGiayUyQuyen = async (req, res) => {
    try {
        const { id, maNhanSuCapNhap } = req.body;

        if (!id) {
            return res
                .status(400)
                .json({ message: "Thiếu id giấy ủy quyền" });
        }

        const record = await GiayUyQuyen.findByPk(id);
        if (!record) {
            return res
                .status(404)
                .json({ message: "Giấy ủy quyền không tồn tại" });
        }

        await record.destroy();

        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa giấy ủy quyền",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa giấy ủy quyền${record.soDonGoc ? ` số '${record.soDonGoc}'` : ""}`,
            data: { id: record.id, soDonGoc: record.soDonGoc },
        });

        res.status(200).json({ message: "Xóa giấy ủy quyền thành công" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({
                message: "Giấy ủy quyền đang được sử dụng, không thể xóa.",
            });
        }
        res.status(500).json({ message: error.message });
    }
};
