import { Auth } from "../models/authModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
export const authenticateUser = async (req, res, next) => {
    const bearerToken = req.header("Authorization");

    if (!bearerToken) {
        return res.status(401).json({ message: "Không có token, vui lòng đăng nhập" });
    }

    const token = bearerToken.replace("Bearer ", "");

    try {
        const decoded = jwt.verify(token,  process.env.JWT_SECRET,);

        // Tìm user trong DB bằng ID từ token
        const user = await Auth.findOne({
            where: { AuthID: decoded.id },
        });

        if (!user) {
            return res.status(401).json({ message: "Không tìm thấy người dùng" });
        }

        // So sánh token gửi lên và token trong DB
        if (user.Token !== token) {
            return res.status(401).json({ message: "Token đã bị thay thế. Vui lòng đăng nhập lại" });
        }

        // Gắn user info vào request để controller có thể dùng
        req.user = decoded;

        next(); // Cho phép đi tiếp
    } catch (error) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const { role } = req.user;
        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập" });
        }
        next();
    };
};
