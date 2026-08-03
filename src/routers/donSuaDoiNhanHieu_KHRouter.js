import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addApplicationSDNHKH, getAllApplicationSD_KH } from "../controllers/KH/donSuaDoi_NH_KHController.js";
import { addApplicationSD_GCN_NHKH, getAllApplication_SD_KH } from "../controllers/KH/donSuaDoiGCN_NH_KHController.js";
import { get } from "http";
const router = express.Router();
router.post("/application_sd_nh_kh/add",authenticateUser, authorizeRoles("admin", "staff"), addApplicationSDNHKH);
router.post("/application_sd_gcn_nh_kh/add",authenticateUser, authorizeRoles("admin", "staff"), addApplicationSD_GCN_NHKH);
router.post("/application_sd_nh_kh/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationSD_KH);
router.post("/application_sd_gcn_nh_kh/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_KH);
export default router;