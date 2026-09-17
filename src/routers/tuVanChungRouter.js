import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addGeneralAdvice_KH, addGeneralAdvice_VN, getGeneralAdviceDetail_KH, getGeneralAdviceDetail_VN, getGeneralAdvices_KH, getGeneralAdvices_VN, updateGeneralAdvice_KH, updateGeneralAdvice_VN } from "../controllers/tuVanChungController.js";
import { editGCN_NH_CAM } from "../controllers/gcn_nhController.js";

const router = express.Router();

/**
 * @swagger
 * /generaladvices_vn/list:
 *   post:
 *     summary: Lấy danh sách hồ sơ tư vấn chung Việt Nam
 *     tags: [Tư vấn chung]
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
 *               searchText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/generaladvices_vn/list", getGeneralAdvices_VN); 

/**
 * @swagger
 * /generaladvices_vn/add:
 *   post:
 *     summary: Thêm hồ sơ tư vấn chung Việt Nam mới
 *     tags: [Tư vấn chung]
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
 *               noiDungTuVan:
 *                 type: string
 *                 example: "Tư vấn thủ tục đăng ký nhãn hiệu"
 *     responses:
 *       201:
 *         description: Thêm hồ sơ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/generaladvices_vn/add", authenticateUser, authorizeRoles("admin", "staff"), addGeneralAdvice_VN); 

/**
 * @swagger
 * /generaladvices_vn/edit:
 *   post:
 *     summary: Cập nhật hồ sơ tư vấn chung Việt Nam
 *     tags: [Tư vấn chung]
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
 *               noiDungTuVan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy hồ sơ
 */
router.post("/generaladvices_vn/edit", authenticateUser, authorizeRoles("admin", "staff"), updateGeneralAdvice_VN); 

/**
 * @swagger
 * /generaladvices_vn/detail:
 *   post:
 *     summary: Lấy chi tiết hồ sơ tư vấn chung Việt Nam
 *     tags: [Tư vấn chung]
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
 *         description: Không tìm thấy hồ sơ
 */
router.post("/generaladvices_vn/detail", getGeneralAdviceDetail_VN);

/**
 * @swagger
 * /generaladvices_kh/list:
 *   post:
 *     summary: Lấy danh sách hồ sơ tư vấn chung Campuchia
 *     tags: [Tư vấn chung]
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
 *               searchText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/generaladvices_kh/list", getGeneralAdvices_KH); 

/**
 * @swagger
 * /generaladvices_kh/add:
 *   post:
 *     summary: Thêm hồ sơ tư vấn chung Campuchia mới
 *     tags: [Tư vấn chung]
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
 *               noiDungTuVan:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thêm hồ sơ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/generaladvices_kh/add", authenticateUser, authorizeRoles("admin", "staff"), addGeneralAdvice_KH); 

/**
 * @swagger
 * /generaladvices_kh/edit:
 *   post:
 *     summary: Cập nhật hồ sơ tư vấn chung Campuchia
 *     tags: [Tư vấn chung]
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
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy hồ sơ
 */
router.post("/generaladvices_kh/edit", authenticateUser, authorizeRoles("admin", "staff"), updateGeneralAdvice_KH); 

/**
 * @swagger
 * /generaladvices_kh/detail:
 *   post:
 *     summary: Lấy chi tiết hồ sơ tư vấn chung Campuchia
 *     tags: [Tư vấn chung]
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
 *         description: Không tìm thấy hồ sơ
 */
router.post("/generaladvices_kh/detail", getGeneralAdviceDetail_KH);

export default router;
