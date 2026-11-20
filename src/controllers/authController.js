import { Auth } from "../models/authModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NhanSu } from "../models/nhanSuModel.js";
import { Op, fn, col, where } from "sequelize";
// Tạm tắt thao tác FCM token cùng notification Firebase.
// import { FCMToken } from "../models/fcmTokenModel.js";
import dotenv from "dotenv";
import { ACCOUNT_ROLES } from "../utils/accountRoles.js";

dotenv.config();

/**
 * Tìm tài khoản Auth theo Username (chính xác) hoặc NhanSu.email (không phân biệt hoa thường).
 * Tách 2 bước truy vấn theo index Username và NhanSu.email để tránh full table scan / ambiguous join.
 */
const findAuthByUsernameOrEmail = async (rawIdentifier) => {
    const loginKey = String(rawIdentifier || "").trim();
    if (!loginKey) return null;

    // Bước 1: Tìm chính xác theo Auth.Username
    let user = await Auth.findOne({
        where: { Username: loginKey },
        include: [{ model: NhanSu, as: "nhanSu" }],
    });
    if (user) return user;

    // Bước 2: Tìm theo NhanSu.email không phân biệt hoa thường
    const nhanSu = await NhanSu.findOne({
        where: {
            [Op.and]: [
                { email: { [Op.ne]: null } },
                { email: { [Op.ne]: "" } },
                where(fn("LOWER", col("email")), loginKey.toLowerCase()),
            ],
        },
        attributes: ["maNhanSu"],
    });
    if (!nhanSu) return null;

    user = await Auth.findOne({
        where: { maNhanSu: nhanSu.maNhanSu },
        include: [{ model: NhanSu, as: "nhanSu" }],
    });
    return user;
};
export const register = async (req, res) => {
    try {
        const { maNhanSu, username, password, role } = req.body;

        if (!maNhanSu || !username || !password || !role) {
            return res.status(400).json({ message: "Mã nhân sự, tên đăng nhập, mật khẩu và vai trò là bắt buộc" });
        }

        const allowedRoles = ACCOUNT_ROLES;
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: `Vai trò không hợp lệ. Chỉ chấp nhận: ${allowedRoles.join(", ")}` });
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
        const { username, identifier, email, password } = req.body || {};
        const loginKey = String(username || identifier || email || "").trim();

        if (!loginKey || !password) {
            return res.status(400).json({ message: "Tên đăng nhập (hoặc email) và mật khẩu là bắt buộc" });
        }

        const user = await findAuthByUsernameOrEmail(loginKey);
        if (!user) {
            return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
        }

        const ten = user.nhanSu?.hoTen || null;
        const userEmail = user.nhanSu?.email || null;
        const token = jwt.sign(
            {
                id: user.AuthID,
                maNhanSu: user.maNhanSu,
                role: user.Role,
                tenNhanSu: ten,
                email: userEmail,
                username: user.Username,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        await user.update({ Token: token });

        res.status(200).json({
            message: "Đăng nhập thành công",
            token,
            maNhanSu: user.maNhanSu,
            role: user.Role,
            tenNhanSu: ten,
            email: userEmail,
            username: user.Username,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const logout = async (req, res) => {
  try {
    const authId = req.user.id;

    const user = await Auth.findByPk(authId);

    if (!user) {
      return res.status(400).json({ message: "Người dùng không tồn tại" });
    }

    // Tạm tắt xóa FCM token cùng notification Firebase.
    // const maNhanSu = user.maNhanSu;
    // await FCMToken.destroy({
    //   where: { maNhanSu }
    // });
    await user.update({ Token: null });

    return res.status(200).json({ message: "Đăng xuất thành công" });
  } catch (error) {
    console.error("Lỗi khi đăng xuất:", error);
    return res.status(500).json({ message: "Lỗi hệ thống: " + error.message });
  }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Không tìm thấy token xác thực, vui lòng đăng nhập" });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || "my_secret_key");
        } catch (error) {
            return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
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
    const { username, identifier, email, newPassword } = req.body || {};
    const loginKey = String(username || identifier || email || "").trim();

    if (!loginKey || !newPassword) {
      return res.status(400).json({ message: "Thiếu tên tài khoản (hoặc email) hoặc mật khẩu mới." });
    }

    const user = await findAuthByUsernameOrEmail(loginKey);
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

