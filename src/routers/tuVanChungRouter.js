import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addGeneralAdvice_KH, addGeneralAdvice_VN, getGeneralAdviceDetail_KH, getGeneralAdviceDetail_VN, getGeneralAdvices_KH, getGeneralAdvices_VN, updateGeneralAdvice_KH, updateGeneralAdvice_VN } from "../controllers/tuVanChungController.js";
import { editGCN_NH_CAM } from "../controllers/gcn_nhController.js";

const router = express.Router();

router.post("/generaladvices_vn/list", getGeneralAdvices_VN); 
router.post("/generaladvices_vn/add", authenticateUser,authorizeRoles("admin", "staff"), addGeneralAdvice_VN); 
router.post("/generaladvices_vn/edit", authenticateUser,authorizeRoles("admin", "staff"), updateGeneralAdvice_VN); 
router.post("/generaladvices_vn/detail", getGeneralAdviceDetail_VN);

router.post("/generaladvices_kh/list", getGeneralAdvices_KH); 
router.post("/generaladvices_kh/add", authenticateUser,authorizeRoles("admin", "staff"), addGeneralAdvice_KH); 
router.post("/generaladvices_kh/edit", authenticateUser,authorizeRoles("admin", "staff"), updateGeneralAdvice_KH); 
router.post("/generaladvices_kh/detail", getGeneralAdviceDetail_KH);
export default router;
