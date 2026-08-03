import express from "express";
import { getNotificationDetail, getNotificationsByNhanSu, markNotificationAsRead, saveTokenFireBase, sendNotification,  } from "../firebase/sendNotification.js";
const router = express.Router();

router.post('/save-token', saveTokenFireBase);
router.post('/send-notification', sendNotification);
router.post('/send-notification-to-many', getNotificationsByNhanSu);
router.post('/send-notification-detail', getNotificationDetail);
router.post('/notification/mark-read', markNotificationAsRead);
export default router;