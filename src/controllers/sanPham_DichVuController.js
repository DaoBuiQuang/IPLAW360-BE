import { SanPham_DichVu } from "../models/sanPham_DichVuModel.js";
import { Op, Sequelize } from "sequelize";
import { sendGenericNotification } from "../utils/notificationHelper.js";

export const getAllSanPhamDichVu = async (req, res) => {
    try {
        const { search } = req.body;
        let whereClause = {};

        if (search) {
            whereClause = {
                [Op.or]: [
                    { tenSPDV: { [Op.like]: `%${search}%` } },
                    { moTa: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const items = await SanPham_DichVu.findAll({
            where: whereClause,
            order: [[Sequelize.literal('CAST(maSPDV AS UNSIGNED)'), 'ASC']]
        });

        if (items.length === 0) {
            return res.status(404).json({ message: "Không có sản phẩm/dịch vụ nào" });
        }

        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getSanPhamDichVuById = async (req, res) => {
    try {
        const { maSPDV } = req.body;

        if (!maSPDV) {
            return res.status(400).json({ message: "Thiếu mã sản phẩm/dịch vụ" });
        }

        const item = await SanPham_DichVu.findByPk(maSPDV);

        if (!item) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm/dịch vụ" });
        }

        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addSanPhamDichVu = async (req, res) => {
    try {
        const { maSPDV, tenSPDV, moTa } = req.body;

        if (!maSPDV || !tenSPDV) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ mã và tên sản phẩm/dịch vụ" });
        }
        // const existingItem = await SanPham_DichVu.findOne({ where: { maSPDV } });
        // if (existingItem) {
        //     return res.status(409).json({ message: "Mã sản phẩm/dịch vụ đã tồn tại" });
        // }

        const newItem = await SanPham_DichVu.create({ maSPDV, tenSPDV, moTa });

        res.status(201).json(newItem);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maSPDV") message = "Mã nhóm sản phẩm & dịch vụ đã tồn tại.";
            if (field === "hoTen") message = "Tên nhóm sản phẩm & dịch vụ đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};


export const updateSanPhamDichVu = async (req, res) => {
    try {
        const { maSPDV, tenSPDV, moTa, maNhanSuCapNhap } = req.body;

        if (!maSPDV || !tenSPDV) {
            return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
        }

        const item = await SanPham_DichVu.findByPk(maSPDV);
        if (!item) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm/dịch vụ" });
        }

        const changedFields = [];

        if (tenSPDV !== item.tenSPDV) {
            changedFields.push({
                field: "tenSPDV",
                oldValue: item.tenSPDV,
                newValue: tenSPDV
            });
            item.tenSPDV = tenSPDV;
        }

        if (moTa !== undefined && moTa !== item.moTa) {
            changedFields.push({
                field: "moTa",
                oldValue: item.moTa,
                newValue: moTa
            });
            item.moTa = moTa;
        }

        await item.save();

        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật sản phẩm/dịch vụ",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật sản phẩm/dịch vụ '${item.tenSPDV}'`,
                data: {
                    maSPDV,
                    changes: changedFields
                }
            });
        }

        res.status(200).json({ message: "Cập nhật thành công", item });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteSanPhamDichVu = async (req, res) => {
    try {
        const { maSPDV, maNhanSuCapNhap } = req.body;
        if (!maSPDV) {
            return res.status(400).json({ message: "Thiếu mã sản phẩm/dịch vụ" });
        }
        const item = await SanPham_DichVu.findByPk(maSPDV);
        if (!item) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm/dịch vụ" });
        }
        await item.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa sản phẩm/dịch vụ",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa sản phẩm/dịch vụ'${item.tenSPDV}'`,
            data: {maSPDV},
        });
        res.status(200).json({ message: "Xóa sản phẩm/dịch vụ thành công" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Sản phẩm/dịch vụ đang được sử dụng, không thể xóa." });
        }
        res.status(500).json({ message: error.message });
    }
};

