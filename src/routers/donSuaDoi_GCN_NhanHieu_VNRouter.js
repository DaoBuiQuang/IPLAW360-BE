import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addApplicationSD_GCN_NHVN, getAllApplication_SD_GCN_VN } from "../controllers/NH_VN_SD/donSuaDoiGCN_NH_VNController.js";

const router = express.Router();

router.post("/application_sd_gcn_nh_vn/add",authenticateUser, authorizeRoles("admin", "staff"), addApplicationSD_GCN_NHVN);
router.post("/application_sd_gcn_nh_vn/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_GCN_VN);

export default router;
