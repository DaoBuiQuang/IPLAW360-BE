import { Op, Sequelize } from "sequelize";
import { NhomKhachHang } from "../models/nhomKhachHangModel.js";

import { QuocGia } from "../models/quocGiaModel.js"; // nếu NhomKhachHang có liên kết quốc gia
import { sendGenericNotification } from "../utils/notificationHelper.js";

// 📄 Lấy danh sách nhóm khách hàng (phân trang + tìm kiếm)
export const getGroups = async (req, res) => {
    try {
        const { tenNhom, pageIndex = 1, pageSize = 20 } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        const whereCondition = {};
        if (tenNhom) whereCondition.tenNhom = { [Op.like]: `%${tenNhom}%` };

        const totalItems = await NhomKhachHang.count({ where: whereCondition });

        const groups = await NhomKhachHang.findAll({
            where: whereCondition,
            attributes: ["id", "maNhom", "tenNhom", "moTa"],
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
            limit: pageSize,
            offset,
        });

        if (!groups.length) {
            return res.status(404).json({ message: "Không có nhóm khách hàng nào phù hợp" });
        }

        res.status(200).json({
            data: groups,
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

// 📋 Lấy toàn bộ nhóm khách hàng
export const getAllGroups = async (req, res) => {
    try {
        const groups = await NhomKhachHang.findAll({
            attributes: ["id", "maNhom", "tenNhom", "moTa", "ghiChu"],
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
        });

        if (!groups.length) {
            return res.status(404).json({ message: "Không có nhóm khách hàng nào" });
        }

        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 🔍 Lấy nhóm khách hàng theo ID
export const getGroupById = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Thiếu id nhóm khách hàng" });
        }

        const group = await NhomKhachHang.findByPk(id);

        if (!group) {
            return res.status(404).json({ message: "Nhóm khách hàng không tồn tại" });
        }

        res.status(200).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ➕ Thêm nhóm khách hàng mới
export const addGroup = async (req, res) => {
    try {
        const { maNhom, tenNhom, moTa, ghiChu } = req.body;

        if (!maNhom || !tenNhom) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
        }

        const existingGroup = await NhomKhachHang.findOne({ where: { maNhom } });
        if (existingGroup) {
            return res.status(409).json({ message: "Mã nhóm khách hàng đã tồn tại!" });
        }

        const newGroup = await NhomKhachHang.create({ maNhom, tenNhom, moTa, ghiChu });

        res.status(201).json(newGroup);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "tenNhom") message = "Tên nhóm khách hàng đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// ✏️ Cập nhật nhóm khách hàng
export const updateGroup = async (req, res) => {
    try {
        const { id, maNhom, tenNhom, moTa, ghiChu, maNhanSuCapNhap } = req.body;

        const group = await NhomKhachHang.findByPk(id);
        if (!group) {
            return res.status(404).json({ message: "Nhóm khách hàng không tồn tại" });
        }

        const changedFields = [];

        const updateField = (field, newValue) => {
            if (newValue !== undefined && newValue !== group[field]) {
                changedFields.push({
                    field,
                    oldValue: group[field],
                    newValue,
                });
                group[field] = newValue;
            }
        };

        updateField("maNhom", maNhom);
        updateField("tenNhom", tenNhom);
        updateField("moTa", moTa);
        updateField("ghiChu", ghiChu);

        group.maNhanSuCapNhap = maNhanSuCapNhap;

        await group.save({ userId: maNhanSuCapNhap });

        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật nhóm khách hàng",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật nhóm khách hàng '${group.tenNhom}'`,
                data: { maNhom: group.maNhom, changes: changedFields },
            });
        }

        res.status(200).json({
            message: "Cập nhật nhóm khách hàng thành công",
            group,
            changes: changedFields,
        });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "tenNhom") message = "Tên nhóm khách hàng đã tồn tại.";
            if (field === "maNhom") message = "Mã nhóm khách hàng đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// 🗑️ Xóa nhóm khách hàng
export const deleteGroup = async (req, res) => {
    try {
        const { id, maNhanSuCapNhap } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Thiếu id nhóm khách hàng" });
        }

        const group = await NhomKhachHang.findByPk(id);
        if (!group) {
            return res.status(404).json({ message: "Nhóm khách hàng không tồn tại" });
        }

        await group.destroy();

        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa nhóm khách hàng",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa nhóm khách hàng '${group.tenNhom}'`,
            data: { id, maNhom: group.maNhom },
        });

        res.status(200).json({ message: "Xóa nhóm khách hàng thành công" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res
                .status(400)
                .json({ message: "Nhóm khách hàng đang được sử dụng, không thể xóa." });
        }
        res.status(500).json({ message: error.message });
    }
};
