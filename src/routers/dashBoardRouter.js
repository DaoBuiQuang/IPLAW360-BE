import express from "express";
import { getDeadlineDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.post("/deadline-dashboard", getDeadlineDashboard);

export default router;