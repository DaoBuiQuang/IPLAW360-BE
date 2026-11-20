import express from "express";
import {
    addApplicationCQNHKH,
    getAllApplicationCQ_KH,
    getApplicationCQ_KHDetail,
    updateApplicationCQ_KH,
    deleteApplicationCQ_KH,
    savePhanHoiCQSH_KH,
    deletePhanHoiCQSH_KH,
} from "../controllers/KH/donCQSH_NH_KHController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// =========================================================
// ĐƠN ĐĂNG KÝ CHUYỂN QUYỀN SỞ HỮU (KH - CAMPUCHIA)
// =========================================================
router.post(
    "/application_cq_nh_kh/add",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    addApplicationCQNHKH
);

router.post(
    "/application_cq_nh_kh/list",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getAllApplicationCQ_KH
);

router.post(
    "/application_cq_nh_kh/detail",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getApplicationCQ_KHDetail
);
router.get(
    "/application_cq_nh_kh/detail/:id",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getApplicationCQ_KHDetail
);

router.put(
    "/application_cq_nh_kh/update",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_KH
);

router.post(
    "/application_cq_nh_kh/update",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_KH
);

router.put(
    "/application_cq_nh_kh/edit",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_KH
);

router.post(
    "/application_cq_nh_kh/approve",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_KH
);

router.post(
    "/application_cq_nh_kh/delete",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deleteApplicationCQ_KH
);
router.delete(
    "/application_cq_nh_kh/delete/:id",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deleteApplicationCQ_KH
);

router.post(
    "/application_cq_nh_kh/phan-hoi/save",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    savePhanHoiCQSH_KH
);

router.post(
    "/application_cq_nh_kh/phan-hoi/delete",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deletePhanHoiCQSH_KH
);
router.delete(
    "/application_cq_nh_kh/phan-hoi/:phanHoiId",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deletePhanHoiCQSH_KH
);

export default router;
