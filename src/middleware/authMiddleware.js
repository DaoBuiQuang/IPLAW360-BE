import { Auth } from "../models/authModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { canUseTimesheetApi, isTimesheetOnlyRole } from "../utils/accountRoles.js";

dotenv.config();
const authenticatedRequest = Symbol("authenticatedRequest");

// Also protect routes with optional authentication when a signed-in account calls them.
export const authenticateApiRequest = (req, res, next) => {
    if (req.path.toLowerCase().replace(/\/+$/, "") === "/login" || !req.header("Authorization")) {
        return next();
    }
    return authenticateUser(req, res, next);
};

export const authenticateUser = async (req, res, next) => {
    if (req[authenticatedRequest]) return next();
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
        req.user = { ...decoded, maNhanSu: user.maNhanSu, role: user.Role };

        if (isTimesheetOnlyRole(req.user.role)) {
            if (!req.user.maNhanSu || !canUseTimesheetApi(req.method, req.path)) {
                return res.status(403).json({ message: "Tài khoản này chỉ được sử dụng Timesheet" });
            }
        }
        req[authenticatedRequest] = true;

        next(); // Cho phép đi tiếp
    } catch (error) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role?.toString().toLowerCase().trim();
        const normalizedAllowed = allowedRoles.map(r => r.toString().toLowerCase().trim());
        if (!userRole || !normalizedAllowed.includes(userRole)) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập" });
        }
        next();
    };
};
