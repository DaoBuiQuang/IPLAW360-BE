import express from 'express';
import {
    getAllLoaiDon,
    getLoaiDonById,
    createLoaiDon,
    updateLoaiDon,
    deleteLoaiDon
} from '../controllers/loaiDonController.js';
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /applicationtype/all:
 *   post:
 *     summary: Lấy tất cả loại đơn
 *     tags: [Application Type]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/applicationtype/all',authenticateUser, getAllLoaiDon);

/**
 * @swagger
 * /applicationtype/detail:
 *   post:
 *     summary: Lấy chi tiết loại đơn
 *     tags: [Application Type]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maLoaiDon
 *             properties:
 *               maLoaiDon:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy loại đơn
 */
router.post('/applicationtype/detail',authenticateUser, getLoaiDonById);

/**
 * @swagger
 * /applicationtype/add:
 *   post:
 *     summary: Thêm loại đơn mới
 *     tags: [Application Type]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenLoaiDon
 *             properties:
 *               tenLoaiDon:
 *                 type: string
 *                 example: "Đơn đăng ký nhãn hiệu"
 *               moTa:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/applicationtype/add',authenticateUser, authorizeRoles("admin", "staff"), createLoaiDon);

/**
 * @swagger
 * /applicationtype/edit:
 *   put:
 *     summary: Cập nhật loại đơn
 *     tags: [Application Type]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maLoaiDon
 *             properties:
 *               maLoaiDon:
 *                 type: integer
 *                 example: 1
 *               tenLoaiDon:
 *                 type: string
 *               moTa:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.put('/applicationtype/edit',authenticateUser, authorizeRoles("admin", "staff"), updateLoaiDon);

/**
 * @swagger
 * /applicationtype/delete:
 *   post:
 *     summary: Xóa loại đơn
 *     tags: [Application Type]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maLoaiDon
 *             properties:
 *               maLoaiDon:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/applicationtype/delete',authenticateUser, authorizeRoles("admin", "staff"), deleteLoaiDon);

export default router;
