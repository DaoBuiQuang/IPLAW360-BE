import { Op, Sequelize } from "sequelize";
import { NhanHieu } from "../models/nhanHieuModel.js";
// Lấy danh sách nhãn hiệu (hỗ trợ phân trang & tìm kiếm tối ưu)
export const getAllNhanHieu = async (req, res) => {
    try {
        const { search, searchText, tenNhanHieu, pageIndex, pageSize, sortBy, sortOrder } = req.body || {};
        const query = String(search ?? searchText ?? tenNhanHieu ?? "").trim();
        const page = Math.max(1, parseInt(pageIndex, 10) || 1);
        const size = Math.max(1, parseInt(pageSize, 10) || 10);
        const offset = (page - 1) * size;

        const where = {};

        if (query) {
            const orConditions = [
                { tenNhanHieu: { [Op.like]: `%${query}%` } },
                Sequelize.where(
                    Sequelize.cast(Sequelize.col("maNhanHieu"), "CHAR"),
                    { [Op.like]: `%${query}%` }
                ),
            ];

            // Nếu từ khóa tìm kiếm là số, bổ sung tìm kiếm theo mã nhãn hiệu chính xác để tối ưu index
            if (/^\d+$/.test(query)) {
                orConditions.push({ maNhanHieu: parseInt(query, 10) });
            }

            // Hỗ trợ tìm kiếm theo nhiều từ khóa (tokens) cho tên nhãn hiệu
            const tokens = query.split(/\s+/).filter(Boolean);
            if (tokens.length > 1) {
                orConditions.push({
                    [Op.and]: tokens.map((tok) => ({
                        tenNhanHieu: { [Op.like]: `%${tok}%` },
                    })),
                });
            }

            where[Op.or] = orConditions;
        }

        // Tùy biến sắp xếp nếu có sortBy, mặc định sắp xếp theo maNhanHieu DESC (nhãn hiệu mới nhất lên đầu)
        let order = [["maNhanHieu", "DESC"]];
        if (sortBy) {
            const allowedSortFields = ["maNhanHieu", "tenNhanHieu", "createdAt", "updatedAt"];
            if (allowedSortFields.includes(sortBy)) {
                const direction = String(sortOrder || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
                order = [[sortBy, direction]];
            }
        }

        const { count: totalItems, rows } = await NhanHieu.findAndCountAll({
            where,
            attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh", "moTa", "isAutoImport", "createdAt", "updatedAt"],
            order,
            limit: size,
            offset,
        });

        return res.status(200).json({
            data: rows,
            pagination: {
                pageIndex: page,
                pageSize: size,
                totalItems,
                totalPages: Math.ceil(totalItems / size),
            },
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách nhãn hiệu /brand/list:", error);
        return res.status(500).json({
            message: "Lỗi máy chủ khi lấy danh sách nhãn hiệu",
            error: error.message,
        });
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

