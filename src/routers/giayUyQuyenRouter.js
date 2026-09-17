import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addGiayUyQuyen, deleteGiayUyQuyen, getAllGiayUyQuyen, getGiayUyQuyen, getGiayUyQuyenById, updateGiayUyQuyen } from "../controllers/giayUyQuyenController.js";
const router = express.Router();

/**
 * @swagger
 * /power-of-attorney/list:
 *   post:
 *     summary: Lấy danh sách giấy ủy quyền (phân trang)
 *     tags: [Giấy ủy quyền]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soDonGoc:
 *                 type: string
 *               idKhachHang:
 *                 type: string
 *               idDoiTac:
 *                 type: string
 *               pageIndex:
 *                 type: integer
 *                 default: 1
 *               pageSize:
 *                 type: integer
 *                 default: 20
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/power-of-attorney/list", getGiayUyQuyen);

/**
 * @swagger
 * /power-of-attorney/all:
 *   post:
 *     summary: Lấy tất cả giấy ủy quyền không phân trang
 *     tags: [Giấy ủy quyền]
 *     responses:
 *       200:
 *         description: Lấy toàn bộ danh sách thành công
 */
router.post("/power-of-attorney/all", getAllGiayUyQuyen);

/**
 * @swagger
 * /power-of-attorney/detail:
 *   post:
 *     summary: Lấy chi tiết giấy ủy quyền theo ID
 *     tags: [Giấy ủy quyền]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy giấy ủy quyền
 */
router.post("/power-of-attorney/detail", getGiayUyQuyenById);

/**
 * @swagger
 * /power-of-attorney/add:
 *   post:
 *     summary: Thêm giấy ủy quyền mới
 *     tags: [Giấy ủy quyền]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - soGUQ
 *             properties:
 *               soGUQ:
 *                 type: string
 *                 example: "GUQ-2024-001"
 *               soDonGoc:
 *                 type: string
 *                 example: "4-2024-123456"
 *               idKhachHang:
 *                 type: string
 *                 example: "KH001"
 *               idDoiTac:
 *                 type: string
 *                 example: "DT001"
 *               ngayKy:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *     responses:
 *       201:
 *         description: Tạo giấy ủy quyền thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/power-of-attorney/add", authenticateUser, authorizeRoles("admin", "staff"), addGiayUyQuyen);

/**
 * @swagger
 * /power-of-attorney/update:
 *   put:
 *     summary: Cập nhật thông tin giấy ủy quyền
 *     tags: [Giấy ủy quyền]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               soGUQ:
 *                 type: string
 *                 example: "GUQ-2024-001"
 *               soDonGoc:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy giấy ủy quyền
 */
router.put("/power-of-attorney/update", authenticateUser, authorizeRoles("admin", "staff"), updateGiayUyQuyen);

/**
 * @swagger
 * /power-of-attorney/delete:
 *   post:
 *     summary: Xóa giấy ủy quyền
 *     tags: [Giấy ủy quyền]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy giấy ủy quyền
 */
router.post("/power-of-attorney/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteGiayUyQuyen); 

export default router;