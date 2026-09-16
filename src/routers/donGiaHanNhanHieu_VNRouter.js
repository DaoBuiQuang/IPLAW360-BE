import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { createApplication_GH_VN, deleteApplication_GH_VN, getAllApplication_GH_VN, getApplicationById_GH_VN, getFullApplicationDetail_GH_VN, updateApplication_GH_VN } from "../controllers/NH_VN_GH/giaHanNhanHieu_VNController.js";

const router = express.Router();

/**
 * @swagger
 * /application_gh_nh_vn/list:
 *   post:
 *     summary: Lấy danh sách đơn gia hạn nhãn hiệu Việt Nam
 *     tags: [Application GH VN]
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
router.post("/application_gh_nh_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_GH_VN);

/**
 * @swagger
 * /application_gh_nh_vn/add:
 *   post:
 *     summary: Tạo đơn gia hạn nhãn hiệu Việt Nam mới
 *     tags: [Application GH VN]
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
 *                 example: "4-2024-GH001"
 *               soGCN:
 *                 type: string
 *                 example: "123456"
 *               ngayNopDon:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *     responses:
 *       201:
 *         description: Tạo đơn gia hạn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_gh_nh_vn/add", authenticateUser, authorizeRoles("admin", "staff"), createApplication_GH_VN);

/**
 * @swagger
 * /application_gh_nh_vn/detail:
 *   post:
 *     summary: Lấy chi tiết cơ bản đơn gia hạn nhãn hiệu Việt Nam
 *     tags: [Application GH VN]
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
 *                 example: "GH_VN_001"
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_gh_nh_vn/detail", authenticateUser, authorizeRoles("admin", "staff"), getApplicationById_GH_VN);

/**
 * @swagger
 * /application_gh_nh_vn/fulldetail:
 *   post:
 *     summary: Lấy chi tiết đầy đủ đơn gia hạn nhãn hiệu Việt Nam
 *     tags: [Application GH VN]
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
 *                 example: "GH_VN_001"
 *     responses:
 *       200:
 *         description: Lấy chi tiết đầy đủ thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_gh_nh_vn/fulldetail", authenticateUser, authorizeRoles("admin", "staff"), getFullApplicationDetail_GH_VN);

/**
 * @swagger
 * /application_gh_nh_vn/update:
 *   put:
 *     summary: Cập nhật đơn gia hạn nhãn hiệu Việt Nam
 *     tags: [Application GH VN]
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
 *                 example: "GH_VN_001"
 *               soDon:
 *                 type: string
 *                 example: "4-2024-GH001"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.put("/application_gh_nh_vn/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_GH_VN);

/**
 * @swagger
 * /application_gh_nh_vn/delete:
 *   post:
 *     summary: Xóa đơn gia hạn nhãn hiệu Việt Nam
 *     tags: [Application GH VN]
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
 *                 example: "GH_VN_001"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_gh_nh_vn/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_GH_VN);

export default router;
