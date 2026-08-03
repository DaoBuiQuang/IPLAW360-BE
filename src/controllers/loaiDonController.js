import { DonDangKy } from "../models/donDangKyModel.js";
import { LoaiDon } from "../models/loaiDonModel.js";
import { Op, Sequelize } from "sequelize";
import { sendGenericNotification } from "../utils/notificationHelper.js";
export const getAllApplication = async (req, res) => {
    try {
        const list = await DonDangKy.findAll();
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// [GET] /api/loaidon/all - Lấy danh sách tất cả loại đơn
export const getAllLoaiDon = async (req, res) => {
    try {
        const { search } = req.body;

        let whereClause = {};
        if (search) {
            whereClause = {
                [Op.or]: [
                    { tenLoaiDon: { [Op.like]: `%${search}%` } },
                    { moTa: { [Op.like]: `%${search}%` } }
                ]
            };
        }

        const list = await LoaiDon.findAll({
            where: whereClause,
            order: [[Sequelize.literal('CAST(maLoaiDon AS UNSIGNED)'), 'ASC']]
        });

        if (list.length === 0) {
            return res.status(404).json({ message: "Không có loại đơn nào" });
        }

        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ error: "Lỗi server: " + err.message });
    }
};


// [POST] /api/loaidon/get - Lấy loại đơn theo mã (dùng body)
export const getLoaiDonById = async (req, res) => {
    const { maLoaiDon } = req.body;
    try {
        const loaiDon = await LoaiDon.findByPk(maLoaiDon);
        if (!loaiDon) return res.status(404).json({ message: "Không tìm thấy loại đơn" });
        res.json(loaiDon);
    } catch (err) {
        res.status(500).json({ error: "Lỗi server: " + err.message });
    }
};

// [POST] /api/loaidon/create - Thêm loại đơn mới
export const createLoaiDon = async (req, res) => {
    const { maLoaiDon, tenLoaiDon, moTa } = req.body;

    if (!maLoaiDon || !tenLoaiDon) {
        return res.status(400).json({ error: "Vui lòng điền đầy đủ mã và tên loại đơn" });
    }

    try {
        // const existingLoaiDon = await LoaiDon.findOne({ where: { maLoaiDon } });
        // if (existingLoaiDon) {
        //     return res.status(409).json({ error: "Mã loại đơn đã tồn tại!" });
        // }
        const newLoaiDon = await LoaiDon.create({ maLoaiDon, tenLoaiDon, moTa });
        res.status(201).json(newLoaiDon);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maLoaiDon") message = "Mã loại đơn đã tồn tại.";
            if (field === "tenLoaiDon") message = "Tên loại đơn đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ error: "Lỗi khi tạo: " + err.message });
    }
};


// [PUT] /api/loaidon/update - Cập nhật loại đơn
export const updateLoaiDon = async (req, res) => {
    const { maLoaiDon, tenLoaiDon, moTa, maNhanSuCapNhap } = req.body;
    try {
        const loaiDon = await LoaiDon.findByPk(maLoaiDon);
        if (!loaiDon) return res.status(404).json({ message: "Không tìm thấy loại đơn" });

        const changedFields = [];

        if (tenLoaiDon !== undefined && tenLoaiDon !== loaiDon.tenLoaiDon) {
            changedFields.push({
                field: "tenLoaiDon",
                oldValue: loaiDon.tenLoaiDon,
                newValue: tenLoaiDon,
            });
            loaiDon.tenLoaiDon = tenLoaiDon;
        }

        if (moTa !== undefined && moTa !== loaiDon.moTa) {
            changedFields.push({
                field: "moTa",
                oldValue: loaiDon.moTa,
                newValue: moTa,
            });
            loaiDon.moTa = moTa;
        }
        await loaiDon.save();
        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật loại đơn",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật loại đơn '${loaiDon.tenLoaiDon}'`,
                data: {
                    maLoaiDon,
                    changes: changedFields,
                },
            });
        }

        res.status(200).json({
            message: "Cập nhật loại đơn thành công",
            loaiDon,
        });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maLoaiDon") message = "Mã loại đơn đã tồn tại.";
            if (field === "tenLoaiDon") message = "Tên loại đơn đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(400).json({ error: "Lỗi khi cập nhật: " + err.message });
    }
};
// [DELETE] /api/loaidon/delete - Xoá loại đơn
export const deleteLoaiDon = async (req, res) => {
    const { maLoaiDon, maNhanSuCapNhap } = req.body;

    try {
        if (!maLoaiDon) {
            return res.status(400).json({ message: "Thiếu mã loại đơn" });
        }

        const loaiDon = await LoaiDon.findByPk(maLoaiDon);
        if (!loaiDon) {
            return res.status(404).json({ message: "Không tìm thấy loại đơn" });
        }

        await loaiDon.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa loại đơn",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa loại đơn '${loaiDon.tenLoaiDon}'`,
            data: {maLoaiDon},
        });
        res.json({ message: "Đã xoá loại đơn thành công" });
    } catch (err) {
        if (err.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Loại đơn đang được sử dụng, không thể xóa." });
        }

        res.status(500).json({ error: "Lỗi khi xoá: " + err.message });
    }
};
