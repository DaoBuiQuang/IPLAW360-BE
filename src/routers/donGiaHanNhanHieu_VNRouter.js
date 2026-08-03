import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { createApplication_GH_VN, deleteApplication_GH_VN, getAllApplication_GH_VN, getApplicationById_GH_VN, getFullApplicationDetail_GH_VN, updateApplication_GH_VN } from "../controllers/NH_VN_GH/giaHanNhanHieu_VNController.js";

const router = express.Router();

router.post("/application_gh_nh_vn/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_GH_VN);
router.post("/application_gh_nh_vn/add",authenticateUser, authorizeRoles("admin", "staff"), createApplication_GH_VN);
router.post("/application_gh_nh_vn/detail",authenticateUser, authorizeRoles("admin", "staff"), getApplicationById_GH_VN);
router.post("/application_gh_nh_vn/fulldetail",authenticateUser,authorizeRoles("admin", "staff"), getFullApplicationDetail_GH_VN);
router.put("/application_gh_nh_vn/update",authenticateUser, authorizeRoles("admin", "staff"), updateApplication_GH_VN);
router.post("/application_gh_nh_vn/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_GH_VN);
//router.post("/application_gh_vn/getMaKhachHangByMaHoSoVuViec", getMaKhachHangByMaHoSoVuViec_KH);
//router.post("/application_gh_vn/getApplicationByGiayUyQuyenGoc", getApplicationsByMaKhachHang_KH);
export default router;
