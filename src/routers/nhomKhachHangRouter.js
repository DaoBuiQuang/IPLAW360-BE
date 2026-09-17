import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addGroup, deleteGroup, getAllGroups, getGroupById, getGroups, updateGroup } from "../controllers/nhomKhachHangController.js";
const router = express.Router();

/**
 * @swagger
 * /group/list:
 *   post:
 *     summary: Lấy danh sách nhóm khách hàng (phân trang)
 *     tags: [Nhóm khách hàng]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenNhom:
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
router.post("/group/list", getGroups); 

/**
 * @swagger
 * /group/all:
 *   post:
 *     summary: Lấy toàn bộ nhóm khách hàng
 *     tags: [Nhóm khách hàng]
 *     responses:
 *       200:
 *         description: Lấy toàn bộ danh sách thành công
 */
router.post("/group/all", getAllGroups); 

/**
 * @swagger
 * /group/detail:
 *   post:
 *     summary: Lấy chi tiết nhóm khách hàng theo ID
 *     tags: [Nhóm khách hàng]
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
 *         description: Không tìm thấy nhóm
 */
router.post("/group/detail", getGroupById); 

/**
 * @swagger
 * /group/add:
 *   post:
 *     summary: Thêm nhóm khách hàng mới
 *     tags: [Nhóm khách hàng]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenNhom
 *             properties:
 *               tenNhom:
 *                 type: string
 *                 example: "Nhóm khách VIP"
 *               ghiChu:
 *                 type: string
 *                 example: "Khách hàng doanh nghiệp lớn"
 *     responses:
 *       201:
 *         description: Tạo nhóm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/group/add", authenticateUser, authorizeRoles("admin", "staff"), addGroup); 

/**
 * @swagger
 * /group/update:
 *   put:
 *     summary: Cập nhật thông tin nhóm khách hàng
 *     tags: [Nhóm khách hàng]
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
 *               tenNhom:
 *                 type: string
 *                 example: "Nhóm khách VIP cập nhật"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.put("/group/update", authenticateUser, authorizeRoles("admin", "staff"), updateGroup); 

/**
 * @swagger
 * /group/delete:
 *   post:
 *     summary: Xóa nhóm khách hàng
 *     tags: [Nhóm khách hàng]
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
 *         description: Xóa nhóm thành công
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.post("/group/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteGroup); 

export default router;
