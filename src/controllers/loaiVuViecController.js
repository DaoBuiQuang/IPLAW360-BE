import { Op } from "sequelize";
import { LoaiVuViec } from "../models/loaiVuViecModel.js";
import { NganhNghe } from "../models/nganhNgheModel.js";
import { FCMToken } from "../models/fcmTokenModel.js";
import { sendNotificationToMany } from "../firebase/sendNotification.js";
import { sendGenericNotification } from "../utils/notificationHelper.js";
import { Sequelize } from "sequelize"; 
export const getCaseTypes = async (req, res) => {
    try {
        const { search } = req.body;
        let loaiVuViecs;
        if (search) {
            loaiVuViecs = await LoaiVuViec.findAll({
                where: {
                    [Op.or]: [
                        {
                            tenLoaiVuViec: { [Op.like]: `%${search}%` }
                        },
                        {
                            moTa: { [Op.like]: `%${search}%` }
                        }
                    ]
                }
            });
        } else {
            loaiVuViecs = await LoaiVuViec.findAll();
        }
        if (loaiVuViecs.length === 0) {
            return res.status(404).json({ message: "Không có loại vụ việc nào" });
        }
        res.status(200).json(loaiVuViecs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getIndustries = async (req, res) => {
    try {
        const { search } = req.body;
        let industries;

        if (search) {
            industries = await NganhNghe.findAll({
                where: { tenNganhNghe: { [Op.like]: `%${search}%` } },
            });
        } else {
            industries = await NganhNghe.findAll();
        }

        if (!industries.length) {
            return res.status(404).json({ message: "Không có ngành nghề nào" });
        }

        res.status(200).json(industries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCaseTypeById = async (req, res) => {
    try {
        const { maLoaiVuViec } = req.body;
        if (!maLoaiVuViec) {
            return res.status(400).json({ message: "Thiếu mã loại vụ việc" });
        }
        const loaiVuViec = await LoaiVuViec.findByPk(maLoaiVuViec);
        if (!loaiVuViec) {
            return res.status(404).json({ message: "Loại vụ việc không tồn tại" });
        }
        res.status(200).json(loaiVuViec);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Thêm loại vụ việc
export const addCaseType = async (req, res) => {
    try {
        const { maLoaiVuViec, tenLoaiVuViec, moTa } = req.body;
        if (!maLoaiVuViec || !tenLoaiVuViec) {
            return res.status(400).json({ message: "Điền đầy đủ các thông tin" });
        }
        const newLoaiVuViec = await LoaiVuViec.create({ maLoaiVuViec, tenLoaiVuViec, moTa });
        res.status(201).json(newLoaiVuViec);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maLoaiVuViec") message = "Mã loại vụ việc đã tồn tại.";
            if (field === "tenLoaiVuViec") message = "Tên loại vụ việc đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const updateCaseType = async (req, res) => {
    try {
        const { maLoaiVuViec, tenLoaiVuViec, moTa, maNhanSuCapNhap } = req.body;

        if (!maLoaiVuViec || !tenLoaiVuViec) {
            return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
        }

        const loaiVuViec = await LoaiVuViec.findByPk(maLoaiVuViec);
        if (!loaiVuViec) {
            return res.status(404).json({ message: "Loại vụ việc không tồn tại" });
        }

        const changedFields = [];

        if (tenLoaiVuViec !== loaiVuViec.tenLoaiVuViec) {
            changedFields.push({
                field: "tenLoaiVuViec",
                oldValue: loaiVuViec.tenLoaiVuViec,
                newValue: tenLoaiVuViec,
            });
            loaiVuViec.tenLoaiVuViec = tenLoaiVuViec;
        }

        if (moTa !== undefined && moTa !== loaiVuViec.moTa) {
            changedFields.push({
                field: "moTa",
                oldValue: loaiVuViec.moTa,
                newValue: moTa,
            });
            loaiVuViec.moTa = moTa;
        }

        await loaiVuViec.save();

        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật loại vụ việc",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật loại vụ việc '${loaiVuViec.tenLoaiVuViec}'`,
                data: {
                    maLoaiVuViec,
                    changes: changedFields,
                },
            });
        }
        res.status(200).json({
            message: "Cập nhật loại vụ việc thành công",
            loaiVuViec,
        });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maLoaiVuViec") message = "Mã loại vụ việc đã tồn tại.";
            if (field === "tenLoaiVuViec") message = "Tên loại vụ việc đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// Xóa loại vụ việc
export const deleteCaseType = async (req, res) => {
    try {
        const { maLoaiVuViec, maNhanSuCapNhap } = req.body;
        if (!maLoaiVuViec) {
            return res.status(400).json({ message: "Thiếu mã loại vụ việc" });
        }

        const loaiVuViec = await LoaiVuViec.findByPk(maLoaiVuViec);
        if (!loaiVuViec) {
            return res.status(404).json({ message: "Loại vụ việc không tồn tại" });
        }

        await loaiVuViec.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa loại vụ việc",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa loại vụ việc '${loaiVuViec.tenLoaiVuViec}'`,
            data: {maLoaiVuViec},
        });
        res.status(200).json({ message: "Xóa loại vụ việc thành công" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Loại vụ việc đang được sử dụng, không thể xóa." });
        }
        res.status(500).json({ message: error.message });
    }
};


export const getIndustryById = async (req, res) => {
    try {
        const { maNganhNghe } = req.body; // Nhận ID từ body thay vì params
        if (!maNganhNghe) {
            return res.status(400).json({ message: "Thiếu mã ngành nghề" });
        }

        const industry = await NganhNghe.findByPk(maNganhNghe);

        if (!industry) {
            return res.status(404).json({ message: "Ngành nghề không tồn tại" });
        }

        res.status(200).json(industry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Thêm ngành nghề mới
export const addIndustry = async (req, res) => {
    try {
        const { maNganhNghe, tenNganhNghe } = req.body;

        if (!maNganhNghe || !tenNganhNghe) {
            return res.status(400).json({ message: "Điền đầy đủ các thông tin" });
        }

        const newIndustry = await NganhNghe.create({ maNganhNghe, tenNganhNghe });

        res.status(201).json(newIndustry);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maNganhNghe") message = "Mã ngành nghề việc đã tồn tại.";
            if (field === "tenNganhNghe") message = "Tên ngành nghề việc đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật ngành nghề
export const updateIndustry = async (req, res) => {
    try {
        const { maNganhNghe, tenNganhNghe, maNhanSuCapNhap} = req.body;
    
        if (!maNganhNghe || !tenNganhNghe) {
            return res.status(400).json({ message: "Thiếu thông tin cập nhật" });
        }
        const changedFields = [];
        if (tenNganhNghe !== undefined) {
            changedFields.push({
                field: "tenNganhNghe",
                oldValue: tenNganhNghe,
                newValue: tenNganhNghe,
            });
        }
        const industry = await NganhNghe.findByPk(maNganhNghe);
        // if (!industry) {
        //     return res.status(404).json({ message: "Ngành nghề không tồn tại" });
        // }

        industry.tenNganhNghe = tenNganhNghe;
        await industry.save();
        const tokenRecords = await FCMToken.findAll();
        const tokens = tokenRecords.map(rec => rec.token).filter(Boolean);

        // if (tokens.length > 0) {
        //     await sendNotificationToMany({maNhanSuCapNhap, tokens, "Cập nhật ngành nghề", `Ngành nghề '${tenNganhNghe}' đã được cập nhật.`});
        // }
        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật ngành nghề",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật ngành nghề '${industry.tenNganhNghe}'`,
                data: {
                    maNganhNghe,
                    changes: changedFields,
                },
            });
        }
        res.status(200).json({ message: "Cập nhật ngành nghề thành công", industry });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maNganhNghe") message = "Mã ngành nghề việc đã tồn tại.";
            if (field === "tenNganhNghe") message = "Tên ngành nghề việc đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// Xóa ngành nghề
export const deleteIndustry = async (req, res) => {
    try {
        const { maNganhNghe, maNhanSuCapNhap } = req.body; // Lấy ID từ body

        if (!maNganhNghe) {
            return res.status(400).json({ message: "Thiếu mã ngành nghề để xóa" });
        }

        const industry = await NganhNghe.findByPk(maNganhNghe);
        if (!industry) {
            return res.status(404).json({ message: "Ngành nghề không tồn tại" });
        }

        await industry.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa ngành nghề",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa ngành nghề '${industry.tenNganhNghe}'`,
            data: {},
        });
        res.status(200).json({ message: "Xóa ngành nghề thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
