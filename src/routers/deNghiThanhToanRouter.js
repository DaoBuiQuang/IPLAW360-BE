import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addDeNghiThanhToan, editDeNghiThanhToan, getDeNghiThanhToanDetail, getDeNghiThanhToans, getDeNghiThanhToansKH, getDeNghiThanhToansVN } from "../controllers/deNghiThanhToanController.js";


const router = express.Router();

/**
 * @swagger
 * /denghithanhtoan/add:
 *   post:
 *     summary: Tạo đề nghị thanh toán mới
 *     tags: [Đề nghị thanh toán]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deBitNoteNo
 *               - nguoiNhan
 *             properties:
 *               deBitNoteNo:
 *                 type: string
 *                 example: "DN-2024-001"
 *               nguoiNhan:
 *                 type: string
 *                 example: "Nguyễn Văn B"
 *               total:
 *                 type: number
 *                 example: 5000000
 *               subtotal:
 *                 type: number
 *                 example: 4500000
 *               vat:
 *                 type: number
 *                 example: 500000
 *     responses:
 *       201:
 *         description: Tạo đề nghị thanh toán thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/denghithanhtoan/add", authenticateUser, addDeNghiThanhToan);

/**
 * @swagger
 * /denghithanhtoan_vn/list:
 *   post:
 *     summary: Lấy danh sách đề nghị thanh toán Việt Nam
 *     tags: [Đề nghị thanh toán]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchText:
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
router.post("/denghithanhtoan_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToansVN);

/**
 * @swagger
 * /denghithanhtoan_kh/list:
 *   post:
 *     summary: Lấy danh sách đề nghị thanh toán Campuchia
 *     tags: [Đề nghị thanh toán]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchText:
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
router.post("/denghithanhtoan_kh/list", authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToansKH);

/**
 * @swagger
 * /denghithanhtoan/detail:
 *   post:
 *     summary: Lấy chi tiết đề nghị thanh toán theo ID
 *     tags: [Đề nghị thanh toán]
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
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy đề nghị thanh toán
 */
router.post("/denghithanhtoan/detail", authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToanDetail);

/**
 * @swagger
 * /denghithanhtoan/edit:
 *   post:
 *     summary: Cập nhật đề nghị thanh toán
 *     tags: [Đề nghị thanh toán]
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
 *               total:
 *                 type: number
 *                 example: 6000000
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy đề nghị thanh toán
 */
router.post("/denghithanhtoan/edit", authenticateUser, editDeNghiThanhToan);

/**
 * @swagger
 * /denghithanhtoan_all/list:
 *   post:
 *     summary: Lấy tất cả đề nghị thanh toán
 *     tags: [Đề nghị thanh toán]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
router.post("/denghithanhtoan_all/list", authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToans);

export default router;
