import express from "express";
import { addApplicationSDNHVN, getAllApplicationSD_VN } from "../controllers/NH_VN_SD/donSuaDoi_NH_VNController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// router.post("/application_sd_nh_vn/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_VN);
router.post("/application_sd_nh_vn/add",authenticateUser, authorizeRoles("admin", "staff"), addApplicationSDNHVN);
router.post("/application_sd_nh_vn/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationSD_VN);

// router.post("/application_sd_nh_vn/detail",authenticateUser, authorizeRoles("admin", "staff"), getApplicationById_SD_VN);
// router.post("/application_sd_nh_vn/fulldetail",authenticateUser,authorizeRoles("admin", "staff"), getFullApplicationDetail_GH_VN);
// router.put("/application_sd_nh_vn/edit",authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_VN);
// router.post("/application_sd_nh_vn/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_SD_VN);
// //router.post("/application_gh_vn/getMaKhachHangByMaHoSoVuViec", getMaKhachHangByMaHoSoVuViec_KH);
// //router.post("/application_gh_vn/getApplicationByGiayUyQuyenGoc", getApplicationsByMaKhachHang_KH);
export default router;
