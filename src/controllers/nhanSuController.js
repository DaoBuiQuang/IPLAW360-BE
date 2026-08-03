import { NhanSu } from "../models/nhanSuModel.js";
import { Auth } from "../models/authModel.js";
import { Sequelize } from "sequelize";
import { sendGenericNotification } from "../utils/notificationHelper.js";

export const getNhanSuBasicList = async (req, res) => {
    try {
        const nhanSuList = await NhanSu.findAll({
            attributes: ["maNhanSu", "hoTen"] 
        });

        if (nhanSuList.length === 0) {
            return res.status(404).json({ message: "Không có nhân viên nào" });
        }

        res.status(200).json(nhanSuList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createNhanSu = async (req, res) => {
    try {
        const { maNhanSu, hoTen, chucVu, phongBan, sdt, email, ngayThangNamSinh, cccd, bangCap } = req.body;

        if (!maNhanSu || !hoTen) {
            return res.status(400).json({ message: "Mã nhân sự và họ tên là bắt buộc" });
        }
        // const existingNhanSu = await NhanSu.findOne({ where: { maNhanSu } });
        // if (existingNhanSu) {
        //     return res.status(409).json({ message: "Mã nhân sự đã tồn tại" });
        // }

        const newNhanSu = await NhanSu.create({ maNhanSu, hoTen, chucVu, phongBan, sdt, email, ngayThangNamSinh, cccd, bangCap });

        res.status(201).json({ message: "Thêm nhân viên thành công", nhanSu: newNhanSu });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maNhanSu") message = "Mã nhân sự đã tồn tại.";
            if (field === "hoTen") message = "Tên nhân sự đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};


export const updateNhanSu = async (req, res) => {
    try {
        const {
            maNhanSu,
            hoTen, chucVu, phongBan, sdt, email,
            ngayThangNamSinh, cccd, bangCap,
            maNhanSuCapNhap
        } = req.body;

        const nhanSu = await NhanSu.findByPk(maNhanSu);
        if (!nhanSu) {
            return res.status(404).json({ message: "Nhân viên không tồn tại" });
        }

        const fieldsToUpdate = {
            hoTen, chucVu, phongBan, sdt, email,
            ngayThangNamSinh, cccd, bangCap, maNhanSuCapNhap
        };

        const changedFields = [];

        for (const key in fieldsToUpdate) {
            if (
                fieldsToUpdate[key] !== undefined &&
                fieldsToUpdate[key] !== nhanSu[key]
            ) {
                changedFields.push({
                    field: key,
                    oldValue: nhanSu[key],
                    newValue: fieldsToUpdate[key],
                });
                nhanSu[key] = fieldsToUpdate[key];
            }
        }

        await nhanSu.save();

        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật nhân sự",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật thông tin nhân sự '${nhanSu.hoTen}'`,
                data: {
                    maNhanSu,
                    changes: changedFields,
                }
            });
        }

        res.status(200).json({ message: "Cập nhật nhân viên thành công", nhanSu });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            let message = "Dữ liệu đã tồn tại";
            const field = error.errors[0].path;
            if (field === "maNhanSu") message = "Mã nhân sự đã tồn tại.";
            if (field === "hoTen") message = "Tên nhân sự đã tồn tại.";
            return res.status(409).json({ message });
        }
        res.status(500).json({ message: error.message });
    }
};

// Xóa nhân viên
export const deleteNhanSu = async (req, res) => {
    try {
        const { maNhanSu, maNhanSuCapNhap } = req.body;
        const nhanSu = await NhanSu.findByPk(maNhanSu);
        if (!nhanSu) {
            return res.status(404).json({ message: "Nhân viên không tồn tại" });
        }
        await nhanSu.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa nhân sự",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa nhân sự '${nhanSu.hoTen}'`,
            data: {maNhanSu},
        });
        res.status(200).json({ message: "Xóa nhân sự thành công" });

    } catch (error) {
        // Kiểm tra lỗi khóa ngoại (MySQL dùng mã lỗi 'ER_ROW_IS_REFERENCED_' hoặc tương tự)
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Nhân sự đang được sử dụng, không thể xóa." });
        }
        res.status(500).json({ message: error.message });
    }
};


// Lấy danh sách nhân viên kèm theo tên tài khoản
export const getNhanSuList = async (req, res) => {
    try {
        const nhanSuList = await NhanSu.findAll({
            include: [
                {
                    model: Auth,
                    as: "Auth",
                    attributes: ["Username", "Role"], // Lấy cả Username và Role
                }
            ]
        });

        if (nhanSuList.length === 0) {
            return res.status(404).json({ message: "Không có nhân viên nào" });
        }

        const result = nhanSuList.map(nhanSu => {
            const { Username, Role } = nhanSu.Auth || {};
            const nhanSuData = nhanSu.toJSON();
            delete nhanSuData.Auth;
            return {
                ...nhanSuData,
                Username,
                Role
            };
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Lấy chi tiết nhân viên
export const getNhanSuById = async (req, res) => {
    try {
        const { maNhanSu } = req.body;

        const nhanSu = await NhanSu.findByPk(maNhanSu, {
            include: [{
                model: Auth,
                as: "Auth", // ✅ đúng alias
                attributes: ["Username"],
                required: false
            }]
        });        

        if (!nhanSu) {
            return res.status(404).json({ message: "Nhân viên không tồn tại" });
        }
        const data = nhanSu.toJSON();
        const response = {
            ...data,
            tenTaiKhoan: data.Auth?.Username || null
        };
        delete response.auth;
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

