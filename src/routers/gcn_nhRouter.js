import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import {  addGCN_NH_Cam, addGCN_NH_VN, editGCN_NH_CAM, editGCN_NH_VN, getGCN_NH_CAMDetail, getGCN_NHDetail, getGCN_NHs, getGCN_NHs_SD, getGCN_NHsCAM, getGCN_NHsCAM_SD } from "../controllers/gcn_nhController.js";
const router = express.Router();
/**
 * @swagger
 * /gcn_nh/list:
 *   post:
 *     summary: Lấy danh sách giấy chứng nhận nhãn hiệu Việt Nam
 *     tags: [GCN Nhãn hiệu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soBang:
 *                 type: string
 *               customerName:
 *                 type: string
 *               partnerName:
 *                 type: string
 *               brandName:
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
router.post("/gcn_nh/list", authenticateUser, getGCN_NHs);

/**
 * @swagger
 * /gcn_nh_sd/list:
 *   post:
 *     summary: Lấy danh sách GCN nhãn hiệu sửa đổi Việt Nam
 *     tags: [GCN Nhãn hiệu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soBang:
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
router.post("/gcn_nh_sd/list", authenticateUser, getGCN_NHs_SD);

/**
 * @swagger
 * /gcn_nh/detail:
 *   post:
 *     summary: Lấy chi tiết giấy chứng nhận nhãn hiệu Việt Nam
 *     tags: [GCN Nhãn hiệu]
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
 *         description: Không tìm thấy GCN
 */
router.post("/gcn_nh/detail", authenticateUser, getGCN_NHDetail);

/**
 * @swagger
 * /gcn_nh_kh/list:
 *   post:
 *     summary: Lấy danh sách giấy chứng nhận nhãn hiệu Campuchia
 *     tags: [GCN Nhãn hiệu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soBang:
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
router.post("/gcn_nh_kh/list", authenticateUser, getGCN_NHsCAM);

/**
 * @swagger
 * /gcn_nh_sd_kh/list:
 *   post:
 *     summary: Lấy danh sách GCN nhãn hiệu sửa đổi Campuchia
 *     tags: [GCN Nhãn hiệu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soBang:
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
router.post("/gcn_nh_sd_kh/list", authenticateUser, getGCN_NHsCAM_SD);

/**
 * @swagger
 * /gcn_nh_kh/detail:
 *   post:
 *     summary: Lấy chi tiết giấy chứng nhận nhãn hiệu Campuchia
 *     tags: [GCN Nhãn hiệu]
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
 *         description: Không tìm thấy GCN
 */
router.post("/gcn_nh_kh/detail", authenticateUser, getGCN_NH_CAMDetail);

/**
 * @swagger
 * /gcn_nh_vn/add:
 *   post:
 *     summary: Thêm mới giấy chứng nhận nhãn hiệu Việt Nam
 *     tags: [GCN Nhãn hiệu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - soBang
 *               - soDon
 *             properties:
 *               soBang:
 *                 type: string
 *                 example: "123456"
 *               soDon:
 *                 type: string
 *                 example: "4-2024-123456"
 *               ngayCapBang:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-01"
 *     responses:
 *       201:
 *         description: Thêm GCN thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/gcn_nh_vn/add", authenticateUser, addGCN_NH_VN);

/**
 * @swagger
 * /gcn_nh_cam/add:
 *   post:
 *     summary: Thêm mới giấy chứng nhận nhãn hiệu Campuchia
 *     tags: [GCN Nhãn hiệu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - soBang
 *               - soDon
 *             properties:
 *               soBang:
 *                 type: string
 *                 example: "KH-123456"
 *               soDon:
 *                 type: string
 *                 example: "KH-2024-123456"
 *               ngayCapBang:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-01"
 *     responses:
 *       201:
 *         description: Thêm GCN thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/gcn_nh_cam/add", authenticateUser, addGCN_NH_Cam);

/**
 * @swagger
 * /gcn_nh_vn/edit:
 *   put:
 *     summary: Cập nhật giấy chứng nhận nhãn hiệu Việt Nam
 *     tags: [GCN Nhãn hiệu]
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
 *               soBang:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy GCN
 */
router.put("/gcn_nh_vn/edit", authenticateUser, editGCN_NH_VN);

/**
 * @swagger
 * /gcn_nh_cam/edit:
 *   put:
 *     summary: Cập nhật giấy chứng nhận nhãn hiệu Campuchia
 *     tags: [GCN Nhãn hiệu]
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
 *               soBang:
 *                 type: string
 *                 example: "KH-123456"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy GCN
 */
router.put("/gcn_nh_cam/edit", authenticateUser, editGCN_NH_CAM);

export default router;
