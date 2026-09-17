import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { getAllApplicationTD_KH, getAllApplicationTD_VN, tachDonDangKy_KH, tachDonDangKy_VN } from "../controllers/NH_VN_TD/donTach_NH_VNController.js";
const router = express.Router();
/**
 * @swagger
 * /application_td_nh_vn/add:
 *   post:
 *     summary: Tách đơn đăng ký nhãn hiệu Việt Nam
 *     tags: [Application Tách Đơn]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKyGoc
 *             properties:
 *               maDonDangKyGoc:
 *                 type: string
 *                 example: "HSVV001_abc123"
 *               soDon:
 *                 type: string
 *                 example: "4-2024-TD001"
 *     responses:
 *       201:
 *         description: Tách đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_td_nh_vn/add", authenticateUser, authorizeRoles("admin", "staff"), tachDonDangKy_VN);

/**
 * @swagger
 * /application_td_nh_kh/add:
 *   post:
 *     summary: Tách đơn đăng ký nhãn hiệu Campuchia
 *     tags: [Application Tách Đơn]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKyGoc
 *             properties:
 *               maDonDangKyGoc:
 *                 type: string
 *                 example: "HSVV001_kh123"
 *               soDon:
 *                 type: string
 *                 example: "KH-TD-2024-001"
 *     responses:
 *       201:
 *         description: Tách đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_td_nh_kh/add", authenticateUser, authorizeRoles("admin", "staff"), tachDonDangKy_KH);

/**
 * @swagger
 * /application_td_nh_vn/list:
 *   post:
 *     summary: Lấy danh sách đơn tách nhãn hiệu Việt Nam
 *     tags: [Application Tách Đơn]
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
router.post("/application_td_nh_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationTD_VN);

/**
 * @swagger
 * /application_td_nh_kh/list:
 *   post:
 *     summary: Lấy danh sách đơn tách nhãn hiệu Campuchia
 *     tags: [Application Tách Đơn]
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
router.post("/application_td_nh_kh/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationTD_KH);

export default router;