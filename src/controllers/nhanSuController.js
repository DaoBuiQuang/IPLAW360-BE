import { NhanSu } from "../models/nhanSuModel.js";
import { Auth } from "../models/authModel.js";
import { NhomNhanSu } from "../models/nhomNhanSuModel.js";
import { Sequelize, Op } from "sequelize";
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
        const { maNhanSu, hoTen, chucVu, phongBan, sdt, email, ngayThangNamSinh, cccd, bangCap, hourlyRate } = req.body;

        if (!maNhanSu || !hoTen) {
            return res.status(400).json({ message: "Mã nhân sự và họ tên là bắt buộc" });
        }
        // const existingNhanSu = await NhanSu.findOne({ where: { maNhanSu } });
        // if (existingNhanSu) {
        //     return res.status(409).json({ message: "Mã nhân sự đã tồn tại" });
        // }

        const newNhanSu = await NhanSu.create({ maNhanSu, hoTen, chucVu, phongBan, sdt, email, ngayThangNamSinh, cccd, bangCap, hourlyRate });

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
            ngayThangNamSinh, cccd, bangCap, hourlyRate,
            maNhanSuCapNhap
        } = req.body;

        const nhanSu = await NhanSu.findByPk(maNhanSu);
        if (!nhanSu) {
            return res.status(404).json({ message: "Nhân viên không tồn tại" });
        }

        const fieldsToUpdate = {
            hoTen, chucVu, phongBan, sdt, email,
            ngayThangNamSinh, cccd, bangCap, hourlyRate, maNhanSuCapNhap
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
                attributes: ["Username", "Role"],
                required: false
            }]
        });        

        if (!nhanSu) {
            return res.status(404).json({ message: "Nhân viên không tồn tại" });
        }
        const data = nhanSu.toJSON();
        const response = {
            ...data,
            tenTaiKhoan: data.Auth?.Username || null,
            role: data.Auth?.Role || null
        };
        delete response.auth;
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET/POST /staff/myteam
 * Trả về danh sách nhân viên trong nhóm mà manager đang đăng nhập quản lý.
 * - Nếu role là "admin" và có query managerCode → trả về team của manager đó
 * - Nếu role là "manager" → tự động lấy managerCode từ JWT
 */
export const getMyTeam = async (req, res) => {
    try {
        const callerRole = String(req.user?.role || "").toLowerCase();
        const callerCode = req.user?.maNhanSu;

        // admin hoặc ceo có thể xem team của bất kỳ manager nào
        let managerCode;
        if (callerRole === "admin" || callerRole === "ceo") {
            managerCode = req.body?.managerCode || req.query?.managerCode || callerCode;
        } else {
            managerCode = callerCode;
        }

        if (!managerCode) {
            return res.status(400).json({ message: "Không xác định được mã Manager" });
        }

        // Lấy danh sách thành viên từ bảng NhomNhanSu
        const nhomRecords = await NhomNhanSu.findAll({
            where: { managerCode },
            include: [
                {
                    model: NhanSu,
                    as: "thanhVien",
                    attributes: ["maNhanSu", "hoTen", "chucVu", "phongBan", "email", "sdt"],
                    include: [
                        {
                            model: Auth,
                            as: "Auth",
                            attributes: ["Username", "Role"],
                            required: false,
                        },
                    ],
                },
                {
                    model: NhanSu,
                    as: "manager",
                    attributes: ["maNhanSu", "hoTen", "chucVu"],
                },
            ],
        });

        if (nhomRecords.length === 0) {
            return res.status(200).json({
                success: true,
                managerCode,
                members: [],
                message: "Manager này chưa có thành viên trong nhóm",
            });
        }

        const managerInfo = nhomRecords[0]?.manager?.toJSON() || null;

        const members = nhomRecords.map((record) => {
            const tv = record.thanhVien?.toJSON() || {};
            return {
                maNhanSu: tv.maNhanSu,
                hoTen: tv.hoTen,
                chucVu: tv.chucVu,
                phongBan: tv.phongBan,
                email: tv.email,
                sdt: tv.sdt,
                username: tv.Auth?.Username || null,
                role: tv.Auth?.Role || null,
                nhomId: record.id,
                tenNhom: record.tenNhom || null,
            };
        });

        return res.status(200).json({
            success: true,
            manager: managerInfo,
            members,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * POST /staff/update-role
 * Thăng cấp / cập nhật vai trò cho nhân sự (Chỉ Admin)
 * Body: { maNhanSu: string, role: "manager" | "staff" | "admin" | "trainee" }
 * Logic: Cập nhật trường Role trong bảng Auth (TaiKhoan) của maNhanSu tương ứng
 */
export const updateStaffRole = async (req, res) => {
    try {
        const { maNhanSu, role } = req.body;

        if (!maNhanSu || !role) {
            return res.status(400).json({
                success: false,
                message: "Mã nhân sự (maNhanSu) và vai trò (role) là bắt buộc",
            });
        }

        const allowedRoles = ["manager", "staff", "admin", "trainee"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Vai trò không hợp lệ. Chỉ chấp nhận: ${allowedRoles.join(", ")}`,
            });
        }

        const nhanSu = await NhanSu.findByPk(maNhanSu);
        if (!nhanSu) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân sự với mã đã cung cấp",
            });
        }

        const auth = await Auth.findOne({ where: { maNhanSu } });
        if (!auth) {
            return res.status(404).json({
                success: false,
                message: "Nhân sự này chưa có tài khoản đăng nhập trong hệ thống",
            });
        }

        // Bảo vệ tài khoản quản trị hệ thống gốc
        if (maNhanSu === "admin" || auth.Username === "admin") {
            if (role !== "admin") {
                return res.status(400).json({
                    success: false,
                    message: "Không được phép thay đổi vai trò của tài khoản quản trị hệ thống gốc (admin)",
                });
            }
        }

        const oldRole = auth.Role;
        auth.Role = role;
        await auth.save();

        return res.status(200).json({
            success: true,
            message: `Cập nhật vai trò cho nhân sự ${nhanSu.hoTen} (${maNhanSu}) thành "${role}" thành công`,
            data: {
                maNhanSu,
                hoTen: nhanSu.hoTen,
                username: auth.Username,
                oldRole,
                role: auth.Role,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

