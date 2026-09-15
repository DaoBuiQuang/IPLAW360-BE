import express from "express";
import {
    createDanhSachCongViec,
    listDanhSachCongViec,
    getDanhSachCongViecById,
    updateDanhSachCongViec,
    deleteDanhSachCongViec,
    restoreDanhSachCongViec,
    searchDanhSachCongViec,
} from "../controllers/dsCongViecController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const staffRoles = ["admin", "staff"];

// --- Tìm kiếm / autocomplete (dùng cho dropdown Log Time) ---
router.post("/ds-cong-viec/search", authenticateUser, searchDanhSachCongViec);

// --- Đọc dữ liệu ---
router.post("/ds-cong-viec/list",   authenticateUser, listDanhSachCongViec);
router.post("/ds-cong-viec/detail", authenticateUser, getDanhSachCongViecById);

// --- Ghi dữ liệu (yêu cầu đăng nhập + role staff/admin) ---
router.post("/ds-cong-viec/add",     authenticateUser, authorizeRoles(...staffRoles), createDanhSachCongViec);
router.put("/ds-cong-viec/edit",     authenticateUser, authorizeRoles(...staffRoles), updateDanhSachCongViec);
router.delete("/ds-cong-viec/delete", authenticateUser, authorizeRoles(...staffRoles), deleteDanhSachCongViec);

// --- Khôi phục bản ghi đã xóa mềm ---
router.post("/ds-cong-viec/restore", authenticateUser, authorizeRoles(...staffRoles), restoreDanhSachCongViec);

export default router;
