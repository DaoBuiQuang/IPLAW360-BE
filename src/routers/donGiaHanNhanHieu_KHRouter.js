import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { createApplication_GH_KH, getAllApplication_GH_KH, getApplicationById_GH_KH, getFullApplicationDetail_GH_KH, updateApplication_GH_KH } from "../controllers/KH/giaHanNhanHieu_KHController.js";


const router = express.Router();

/**
 * @swagger
 * /application_gh_nh_kh/list:
 *   post:
 *     summary: Lấy danh sách đơn gia hạn nhãn hiệu Campuchia
 *     tags: [Application GH KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplicationListRequest'
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/application_gh_nh_kh/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_GH_KH);

/**
 * @swagger
 * /application_gh_nh_kh/add:
 *   post:
 *     summary: Tạo đơn gia hạn nhãn hiệu Campuchia mới
 *     tags: [Application GH KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maHoSo
 *             properties:
 *               maHoSo:
 *                 type: string
 *                 example: "HSVV001"
 *               soDon:
 *                 type: string
 *                 example: "KH-GH-2024-001"
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_gh_nh_kh/add", authenticateUser, authorizeRoles("admin", "staff"), createApplication_GH_KH);

/**
 * @swagger
 * /application_gh_nh_kh/detail:
 *   post:
 *     summary: Lấy thông tin cơ bản đơn gia hạn Campuchia
 *     tags: [Application GH KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKy
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "GH_KH_001"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_gh_nh_kh/detail", authenticateUser, authorizeRoles("admin", "staff"), getApplicationById_GH_KH);

/**
 * @swagger
 * /application_gh_nh_kh/fulldetail:
 *   post:
 *     summary: Lấy chi tiết đầy đủ đơn gia hạn Campuchia
 *     tags: [Application GH KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKy
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "GH_KH_001"
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_gh_nh_kh/fulldetail", authenticateUser, authorizeRoles("admin", "staff"), getFullApplicationDetail_GH_KH);

/**
 * @swagger
 * /application_gh_nh_kh/update:
 *   put:
 *     summary: Cập nhật đơn gia hạn Campuchia
 *     tags: [Application GH KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKy
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "GH_KH_001"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.put("/application_gh_nh_kh/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_GH_KH);

export default router;
