import { Op, literal, Sequelize } from "sequelize";
import { QuocGia } from "../models/quocGiaModel.js";
import { sendGenericNotification } from "../utils/notificationHelper.js";
const priorityCodes = ['VN', 'KH', 'LA', 'CN', 'BR'];

export const getCountryBasicList = async (req, res) => {
    try {
        const { search } = req.body;

        let whereClause = {};
        if (search) {
            whereClause.tenQuocGia = { [Op.like]: `%${search}%` };
        }

        const countries = await QuocGia.findAll({
            attributes: ["maQuocGia", "tenQuocGia"],
            where: whereClause,
            order: [
                [literal(`CASE 
    WHEN "maQuocGia" IN ('VN', 'KH', 'LA', 'CN') THEN 0 
    ELSE 1 
  END`), "ASC"],
                ["maQuocGia", "ASC"]
            ]

        });

        if (countries.length === 0) {
            return res.status(404).json({ message: "Không có quốc gia nào" });
        }

        res.status(200).json(countries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCountryFullList = async (req, res) => {
    try {
        const { search } = req.body;

        let whereClause = {};
        if (search) {
            whereClause.tenQuocGia = { [Op.like]: `%${search}%` };
        }

        const countries = await QuocGia.findAll({
            where: whereClause,
            order: [
                [literal(`CASE 
    WHEN "maQuocGia" IN ('VN', 'KH', 'LA', 'CN') THEN 0 
    ELSE 1 
  END`), "ASC"],
                ["maQuocGia", "ASC"]
            ]

        });

        if (countries.length === 0) {
            return res.status(404).json({ message: "Không có quốc gia nào" });
        }

        res.status(200).json(countries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCountryById = async (req, res) => {
    try {
        const { maQuocGia } = req.body;
        if (!maQuocGia) {
            return res.status(400).json({ message: "Thiếu mã quốc gia" });
        }
        const country = await QuocGia.findByPk(maQuocGia);
        if (!country) {
            return res.status(404).json({ message: "Quốc gia không tồn tại" });
        }
        res.status(200).json(country);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addCountry = async (req, res) => {
    try {
        const { maQuocGia, tenQuocGia, linkAnh } = req.body;

        if (!maQuocGia || !tenQuocGia) {
            return res.status(400).json({ message: "Điền đầy đủ các thông tin" });
        }
        // const existingCountry = await QuocGia.findOne({ where: { maQuocGia } });
        // if (existingCountry) {
        //     return res.status(409).json({ message: "Mã quốc gia đã tồn tại" });
        // }

        const newCountry = await QuocGia.create({ maQuocGia, tenQuocGia, linkAnh });
        res.status(201).json(newCountry);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maQuocGia") message = "Mã quốc gia đã tồn tại.";
            if (field === "hoTen") message = "Tên quốc gia đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};


export const updateCountry = async (req, res) => {
    try {
        const { maQuocGia, tenQuocGia, linkAnh, maNhanSuCapNhap } = req.body;

        if (!maQuocGia || !tenQuocGia) {
            return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
        }

        const country = await QuocGia.findByPk(maQuocGia);
        if (!country) {
            return res.status(404).json({ message: "Quốc gia không tồn tại" });
        }

        const changedFields = [];

        if (tenQuocGia !== country.tenQuocGia) {
            changedFields.push({
                field: "tenQuocGia",
                oldValue: country.tenQuocGia,
                newValue: tenQuocGia
            });
            country.tenQuocGia = tenQuocGia;
        }

        if (linkAnh && linkAnh !== country.linkAnh) {
            changedFields.push({
                field: "linkAnh",
                oldValue: country.linkAnh || null,
                newValue: linkAnh
            });
            country.linkAnh = linkAnh;
        }

        country.maNhanSuCapNhap = maNhanSuCapNhap;

        await country.save();

        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật quốc gia",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật quốc gia '${country.tenQuocGia}'`,
                data: {
                    maQuocGia,
                    changes: changedFields
                }
            });
        }

        res.status(200).json({ message: "Cập nhật quốc gia thành công", country });

    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maQuocGia") message = "Mã quốc gia đã tồn tại.";
            if (field === "hoTen") message = "Tên quốc gia đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};


// Xóa quốc gia từ body
export const deleteCountry = async (req, res) => {
    try {
        const { maQuocGia,maNhanSuCapNhap } = req.body;
        if (!maQuocGia) {
            return res.status(400).json({ message: "Thiếu mã quốc gia" });
        }

        const country = await QuocGia.findByPk(maQuocGia);
        if (!country) {
            return res.status(404).json({ message: "Quốc gia không tồn tại" });
        }

        await country.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa loại quốc gia",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa loại vụ việc '${country.tenQuocGia}'`,
            data: { maQuocGia },
        });
        res.status(200).json({ message: "Xóa quốc gia thành công" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Quốc gia đang được sử dụng, không thể xóa." });
        }

        res.status(500).json({ message: error.message });
    }
};
