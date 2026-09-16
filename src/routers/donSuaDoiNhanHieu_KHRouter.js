import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addApplicationSDNHKH, getAllApplicationSD_KH } from "../controllers/KH/donSuaDoi_NH_KHController.js";
import { addApplicationSD_GCN_NHKH, getAllApplication_SD_KH } from "../controllers/KH/donSuaDoiGCN_NH_KHController.js";
import { get } from "http";
const router = express.Router();
/**
 * @swagger
 * /application_sd_nh_kh/add:
 *   post:
 *     summary: Tạo đơn sửa đổi nhãn hiệu Campuchia mới
 *     tags: [Application SD KH]
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
 *                 example: "KH-SD-2024-001"
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_sd_nh_kh/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSDNHKH);

/**
 * @swagger
 * /application_sd_gcn_nh_kh/add:
 *   post:
 *     summary: Tạo đơn sửa đổi GCN nhãn hiệu Campuchia mới
 *     tags: [Application SD KH]
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
 *                 example: "KH-SD-GCN-001"
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_sd_gcn_nh_kh/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSD_GCN_NHKH);

/**
 * @swagger
 * /application_sd_nh_kh/list:
 *   post:
 *     summary: Lấy danh sách đơn sửa đổi nhãn hiệu Campuchia
 *     tags: [Application SD KH]
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
router.post("/application_sd_nh_kh/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationSD_KH);

/**
 * @swagger
 * /application_sd_gcn_nh_kh/list:
 *   post:
 *     summary: Lấy danh sách đơn sửa đổi GCN nhãn hiệu Campuchia
 *     tags: [Application SD KH]
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
router.post("/application_sd_gcn_nh_kh/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_KH);

export default router;