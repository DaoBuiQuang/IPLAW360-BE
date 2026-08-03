import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { getAllApplicationTD_KH, getAllApplicationTD_VN, tachDonDangKy_KH, tachDonDangKy_VN } from "../controllers/NH_VN_TD/donTach_NH_VNController.js";
const router = express.Router();
router.post("/application_td_nh_vn/add",authenticateUser, authorizeRoles("admin", "staff"), tachDonDangKy_VN);
router.post("/application_td_nh_kh/add",authenticateUser, authorizeRoles("admin", "staff"), tachDonDangKy_KH);
router.post("/application_td_nh_vn/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationTD_VN);
router.post("/application_td_nh_kh/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationTD_KH);
export default router;