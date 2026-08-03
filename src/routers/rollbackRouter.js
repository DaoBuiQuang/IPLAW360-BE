import express from "express";
import {  getHistoryByNotification, rollbackByLogId } from "../controllers/rollbackController.js";


const router = express.Router();

router.post("/rollback/:logId", rollbackByLogId);
router.post("/history/by-notification", getHistoryByNotification);
export default router;
