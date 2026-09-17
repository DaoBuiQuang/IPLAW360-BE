import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addApplicationSD_GCN_NHVN, getAllApplication_SD_GCN_VN } from "../controllers/NH_VN_SD/donSuaDoiGCN_NH_VNController.js";

const router = express.Router();

/**
 * @swagger
 * /application_sd_gcn_nh_vn/add:
 *   post:
 *     summary: Tạo đơn sửa đổi GCN nhãn hiệu Việt Nam mới
 *     tags: [Application SD GCN VN]
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
 *                 example: "4-2024-SD-GCN-001"
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_sd_gcn_nh_vn/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSD_GCN_NHVN);

/**
 * @swagger
 * /application_sd_gcn_nh_vn/list:
 *   post:
 *     summary: Lấy danh sách đơn sửa đổi GCN nhãn hiệu Việt Nam
 *     tags: [Application SD GCN VN]
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
router.post("/application_sd_gcn_nh_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_GCN_VN);

export default router;
