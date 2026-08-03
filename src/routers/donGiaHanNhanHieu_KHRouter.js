import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { createApplication_GH_KH, getAllApplication_GH_KH, getApplicationById_GH_KH, getFullApplicationDetail_GH_KH, updateApplication_GH_KH } from "../controllers/KH/giaHanNhanHieu_KHController.js";


const router = express.Router();

router.post("/application_gh_nh_kh/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_GH_KH);
router.post("/application_gh_nh_kh/add",authenticateUser, authorizeRoles("admin", "staff"), createApplication_GH_KH);
router.post("/application_gh_nh_kh/detail",authenticateUser, authorizeRoles("admin", "staff"), getApplicationById_GH_KH);
router.post("/application_gh_nh_kh/fulldetail",authenticateUser,authorizeRoles("admin", "staff"), getFullApplicationDetail_GH_KH);
router.put("/application_gh_nh_kh/update",authenticateUser, authorizeRoles("admin", "staff"), updateApplication_GH_KH);

export default router;
