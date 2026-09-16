import express from "express";
import { getDeadlineDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

/**
 * @swagger
 * /deadline-dashboard:
 *   post:
 *     summary: Lấy dữ liệu dashboard deadline (hạn xử lý, hạn trả lời)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maNguoiXuLy:
 *                 type: string
 *                 description: Lọc theo người xử lý (để trống = tất cả)
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Lấy dữ liệu dashboard thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overdue:
 *                   type: array
 *                   items:
 *                     type: object
 *                 dueSoon:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post("/deadline-dashboard", getDeadlineDashboard);

export default router;