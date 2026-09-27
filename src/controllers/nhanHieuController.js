import { Op, Sequelize } from "sequelize";
import { NhanHieu } from "../models/nhanHieuModel.js";
// Lấy tất cả nhãn hiệu (có tìm kiếm)
export const getAllNhanHieu = async (req, res) => {
    try {
        const { search, searchText, tenNhanHieu } = req.body || {};
        const query = String(search || searchText || tenNhanHieu || "").trim();
        const where = {};

        if (query) {
            const tokens = query.split(/\s+/).filter(Boolean);
            if (tokens.length === 1) {
                where.tenNhanHieu = { [Op.like]: `%${tokens[0]}%` };
            } else if (tokens.length > 1) {
                where[Op.and] = tokens.map(tok => ({
                    tenNhanHieu: { [Op.like]: `%${tok}%` }
                }));
            }
        }

        const nhanHieus = await NhanHieu.findAll({
            where,
            order: [["tenNhanHieu", "ASC"]],
        });

        res.status(200).json(nhanHieus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getShortListNhanHieu = async (req, res) => {
    try {
        const { search, searchText, tenNhanHieu, limit } = req.body || {};
        const query = String(search || searchText || tenNhanHieu || "").trim();
        const where = {};

        if (query) {
            const tokens = query.split(/\s+/).filter(Boolean);
            if (tokens.length === 1) {
                where.tenNhanHieu = { [Op.like]: `%${tokens[0]}%` };
            } else if (tokens.length > 1) {
                where[Op.and] = tokens.map(tok => ({
                    tenNhanHieu: { [Op.like]: `%${tok}%` }
                }));
            }
        }

        const queryOptions = {
            where,
            attributes: ["maNhanHieu", "tenNhanHieu"],
            order: [["tenNhanHieu", "ASC"]],
        };
        if (limit) {
            queryOptions.limit = Math.min(Math.max(Number(limit) || 20, 1), 200);
        }

        const nhanHieus = await NhanHieu.findAll(queryOptions);

        res.status(200).json(nhanHieus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy nhãn hiệu theo mã
export const getNhanHieuById = async (req, res) => {
    try {
        const { maNhanHieu } = req.body;

        if (!maNhanHieu) {
            return res.status(400).json({ message: "Thiếu mã nhãn hiệu" });
        }

        const nhanHieu = await NhanHieu.findByPk(maNhanHieu);
        if (!nhanHieu) {
            return res.status(404).json({ message: "Nhãn hiệu không tồn tại" });
        }

        res.status(200).json(nhanHieu);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Thêm nhãn hiệu
export const addNhanHieu = async (req, res) => {
    try {
        const { maNhanHieu, tenNhanHieu, moTa, linkAnh } = req.body;

        if (!maNhanHieu || !tenNhanHieu) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ mã và tên nhãn hiệu" });
        }
        const existing = await NhanHieu.findOne({ where: { maNhanHieu } });
        if (existing) {
            return res.status(409).json({ message: "Mã nhãn hiệu đã tồn tại!" });
        }

        const newNhanHieu = await NhanHieu.create({ maNhanHieu, tenNhanHieu, moTa, linkAnh });
        res.status(201).json(newNhanHieu);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maNhanHieu") message = "Mã nhan hiệu đã tồn tại.";
            if (field === "tenNhanHieu") message = "Tên nhãn hiệu đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const updateNhanHieu = async (req, res) => {
    try {
        const { maNhanHieu, tenNhanHieu, moTa, linkAnh } = req.body;

        if (!maNhanHieu || !tenNhanHieu) {
            return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
        }

        const nhanHieu = await NhanHieu.findByPk(maNhanHieu);
        if (!nhanHieu) {
            return res.status(404).json({ message: "Không tìm thấy nhãn hiệu" });
        }

        nhanHieu.tenNhanHieu = tenNhanHieu;
        nhanHieu.moTa = moTa;
        nhanHieu.linkAnh = linkAnh;

        await nhanHieu.save();

        res.status(200).json({ message: "Cập nhật nhãn hiệu thành công", nhanHieu });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maNhanHieu") message = "Mã nhan hiệu đã tồn tại.";
            if (field === "tenNhanHieu") message = "Tên nhãn hiệu đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const deleteNhanHieu = async (req, res) => {
    try {
        const { maNhanHieu } = req.body;

        if (!maNhanHieu) {
            return res.status(400).json({ message: "Thiếu mã nhãn hiệu" });
        }

        const nhanHieu = await NhanHieu.findByPk(maNhanHieu);
        if (!nhanHieu) {
            return res.status(404).json({ message: "Không tìm thấy nhãn hiệu" });
        }

        await nhanHieu.destroy();

        res.status(200).json({ message: "Xóa nhãn hiệu thành công" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Nhãn hiệu đang được sử dụng, không thể xóa." });
        }
        res.status(500).json({ message: error.message });
    }
};

