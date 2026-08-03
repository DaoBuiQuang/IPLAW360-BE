import express from "express";
import { register, login, logout, changePassword, resetPassword } from "../controllers/authController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Username
 *               - Password
 *               - maNhanSu
 *               - Role
 *             properties:
 *               Username:
 *                 type: string
 *                 example: "user123"
 *               Password:
 *                 type: string
 *                 example: "password123"
 *               maNhanSu:
 *                 type: string
 *                 example: "NS001"
 *               Role:
 *                 type: string
 *                 example: "staff"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/register",authenticateUser,authorizeRoles("admin"), register);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Đăng nhập vào hệ thống
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Thông tin đăng nhập không chính xác
 *       500:
 *         description: Lỗi server
 */
router.post("/login", login);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Đăng xuất khỏi hệ thống
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/logout", authenticateUser, logout);

/**
 * @swagger
 * /changepassword:
 *   post:
 *     summary: Thay đổi mật khẩu
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: "oldpass123"
 *               newPassword:
 *                 type: string
 *                 example: "newpass456"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu cũ không đúng
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/changepassword",authenticateUser, changePassword);

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Reset mật khẩu cho người dùng (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Username
 *               - newPassword
 *             properties:
 *               Username:
 *                 type: string
 *                 example: "user123"
 *               newPassword:
 *                 type: string
 *                 example: "newpass123"
 *     responses:
 *       200:
 *         description: Reset mật khẩu thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.post("/reset-password",authenticateUser, authorizeRoles("admin"), resetPassword);

export default router;
