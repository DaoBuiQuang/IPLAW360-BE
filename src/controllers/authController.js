import { Auth } from "../models/authModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NhanSu } from "../models/nhanSuModel.js";
import { FCMToken } from "../models/fcmTokenModel.js";
import dotenv from "dotenv";

dotenv.config();
export const register = async (req, res) => {
    try {
        const { maNhanSu, username, password, role } = req.body;

        if (!maNhanSu || !username || !password || !role) {
            return res.status(400).json({ message: "Mã nhân sự, tên đăng nhập, mật khẩu và vai trò là bắt buộc" });
        }

        const allowedRoles = ['admin', 'staff', 'trainee']; 
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Vai trò không hợp lệ. Chỉ chấp nhận: admin, staff, trainee" });
        }

        const existingUser = await Auth.findOne({ where: { Username: username } });
        if (existingUser) {
            return res.status(400).json({ message: "Tên đăng nhập đã được sử dụng" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await Auth.create({
            maNhanSu,
            Username: username,
            PasswordHash: hashedPassword,
            Role: role,
        });

        res.status(201).json({ message: "Đăng ký thành công", user: newUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Tên đăng nhập và mật khẩu là bắt buộc" });
        }
        const user = await Auth.findOne({
            where: { Username: username },
            include: [
                {
                    model: NhanSu,
                    as: 'nhanSu', 
                },
            ],
        });        
        if (!user) {
            return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
        }
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
        }
        const ten = user.nhanSu?.hoTen;
        const token = jwt.sign(
            { id: user.AuthID, maNhanSu: user.maNhanSu, role: user.Role, tenNhanSu: ten },
             process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        await user.update({ Token: token });

        res.status(200).json({ message: "Đăng nhập thành công", token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const logout = async (req, res) => {
  try {
    const { authId } = req.body;

    const user = await Auth.findByPk(authId);

    if (!user) {
      return res.status(400).json({ message: "Người dùng không tồn tại" });
    }

    const maNhanSu = user.maNhanSu;

    await FCMToken.destroy({
      where: { maNhanSu }
    });
    await user.update({ Token: null });

    return res.status(200).json({ message: "Đăng xuất thành công" });
  } catch (error) {
    console.error("Lỗi khi đăng xuất:", error);
    return res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Không có token" });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, "my_secret_key");
        } catch (error) {
            return res.status(401).json({ message: "Token không hợp lệ" });
        }

        const user = await Auth.findByPk(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ PasswordHash: hashedNewPassword });

        res.status(200).json({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const resetPassword = async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ message: "Thiếu tên tài khoản hoặc mật khẩu mới." });
    }

    const user = await Auth.findOne({ where: { Username: username } });
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({ PasswordHash: hashedPassword });

    return res.status(200).json({ message: "Mật khẩu đã được đặt lại thành công." });
  } catch (error) {
    console.error("Lỗi reset mật khẩu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi đặt lại mật khẩu." });
  }
};

