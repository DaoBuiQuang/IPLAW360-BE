import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addAffidavit, editAffidavit, getAffidavitDetail, getAffidavitList } from "../controllers/KH/affidavitController.js";

const router = express.Router();
/**
 * @swagger
 * /affidavit/add:
 *   post:
 *     summary: Thêm mới tờ khai sử dụng nhãn hiệu (Affidavit)
 *     tags: [Affidavit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idGCN_NH
 *               - lanNop
 *             properties:
 *               soAffidavit:
 *                 type: string
 *                 example: "AFF-2024-001"
 *               idGCN_NH:
 *                 type: integer
 *                 example: 1
 *               lanNop:
 *                 type: integer
 *                 example: 1
 *               ngayNop:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               ngayGhiNhan:
 *                 type: string
 *                 format: date
 *                 example: "2024-02-15"
 *               ghiChu:
 *                 type: string
 *                 example: "Ghi chú tờ khai"
 *     responses:
 *       201:
 *         description: Tạo Affidavit thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/affidavit/add", authenticateUser, addAffidavit);

/**
 * @swagger
 * /affidavit/list:
 *   post:
 *     summary: Lấy danh sách tờ khai Affidavit
 *     tags: [Affidavit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 default: 20
 *               searchText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/affidavit/list", authenticateUser, getAffidavitList);

/**
 * @swagger
 * /affidavit/detail:
 *   post:
 *     summary: Lấy chi tiết tờ khai Affidavit theo ID
 *     tags: [Affidavit]
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
 *         description: Không tìm thấy Affidavit
 */
router.post("/affidavit/detail", authenticateUser, getAffidavitDetail);

/**
 * @swagger
 * /affidavit/update:
 *   put:
 *     summary: Cập nhật tờ khai Affidavit
 *     tags: [Affidavit]
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
 *               soAffidavit:
 *                 type: string
 *                 example: "AFF-2024-001"
 *               ghiChu:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy Affidavit
 */
router.put("/affidavit/update", authenticateUser, editAffidavit);

export default router;
