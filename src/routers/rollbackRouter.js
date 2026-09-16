import express from "express";
import {  getHistoryByNotification, rollbackByLogId } from "../controllers/rollbackController.js";


const router = express.Router();

/**
 * @swagger
 * /rollback/{logId}:
 *   post:
 *     summary: Hoàn tác thay đổi dữ liệu theo mã log
 *     tags: [Rollback]
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã log cần hoàn tác
 *     responses:
 *       200:
 *         description: Hoàn tác thành công
 *       400:
 *         description: Không thể hoàn tác
 */
router.post("/rollback/:logId", rollbackByLogId);

/**
 * @swagger
 * /history/by-notification:
 *   post:
 *     summary: Lấy lịch sử thay đổi theo thông báo
 *     tags: [Rollback]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy lịch sử thành công
 */
router.post("/history/by-notification", getHistoryByNotification);
export default router;
