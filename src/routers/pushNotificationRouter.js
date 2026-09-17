import express from "express";
import { getNotificationDetail, getNotificationsByNhanSu, markNotificationAsRead, saveTokenFireBase, sendNotification,  } from "../firebase/sendNotification.js";
const router = express.Router();

/**
 * @swagger
 * /save-token:
 *   post:
 *     summary: Lưu Firebase FCM token của nhân sự
 *     tags: [Notification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - maNhanSu
 *             properties:
 *               token:
 *                 type: string
 *               maNhanSu:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lưu token thành công
 */
router.post('/save-token', saveTokenFireBase);

/**
 * @swagger
 * /send-notification:
 *   post:
 *     summary: Gửi thông báo đến người dùng
 *     tags: [Notification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanSu
 *               - title
 *               - body
 *             properties:
 *               maNhanSu:
 *                 type: string
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gửi thông báo thành công
 */
router.post('/send-notification', sendNotification);

/**
 * @swagger
 * /send-notification-to-many:
 *   post:
 *     summary: Lấy danh sách thông báo của nhân sự
 *     tags: [Notification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanSu
 *             properties:
 *               maNhanSu:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post('/send-notification-to-many', getNotificationsByNhanSu);

/**
 * @swagger
 * /send-notification-detail:
 *   post:
 *     summary: Lấy chi tiết thông báo
 *     tags: [Notification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationId
 *             properties:
 *               notificationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 */
router.post('/send-notification-detail', getNotificationDetail);

/**
 * @swagger
 * /notification/mark-read:
 *   post:
 *     summary: Đánh dấu thông báo đã đọc
 *     tags: [Notification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationId
 *             properties:
 *               notificationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đánh dấu đã đọc thành công
 */
router.post('/notification/mark-read', markNotificationAsRead);
export default router;