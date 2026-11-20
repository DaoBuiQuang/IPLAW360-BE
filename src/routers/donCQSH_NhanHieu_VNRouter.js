import express from "express";
import {
    addApplicationCQNHVN,
    getAllApplicationCQ_VN,
    getApplicationCQ_VNDetail,
    updateApplicationCQ_VN,
    deleteApplicationCQ_VN,
    savePhanHoiCQSH_VN,
    deletePhanHoiCQSH_VN,
    addGCN_CQ_NHVN,
    getAllGCN_CQ_VN,
    getGCN_CQ_VNDetail,
    updateGCN_CQ_VN,
    deleteGCN_CQ_VN,
} from "../controllers/NH_CQSH/donCQSH_NHController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// =========================================================
// ĐƠN ĐĂNG KÝ CHUYỂN QUYỀN SỞ HỮU (VN)
// =========================================================
router.post(
    "/application_cq_nh_vn/add",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    addApplicationCQNHVN
);

router.post(
    "/application_cq_nh_vn/list",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getAllApplicationCQ_VN
);

router.post(
    "/application_cq_nh_vn/detail",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getApplicationCQ_VNDetail
);
router.get(
    "/application_cq_nh_vn/detail/:id",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getApplicationCQ_VNDetail
);

router.put(
    "/application_cq_nh_vn/update",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_VN
);

router.post(
    "/application_cq_nh_vn/update",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_VN
);

router.put(
    "/application_cq_nh_vn/edit",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_VN
);

router.post(
    "/application_cq_nh_vn/approve",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateApplicationCQ_VN
);

router.post(
    "/application_cq_nh_vn/delete",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deleteApplicationCQ_VN
);
router.delete(
    "/application_cq_nh_vn/delete/:id",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deleteApplicationCQ_VN
);

router.post(
    "/application_cq_nh_vn/phan-hoi/save",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    savePhanHoiCQSH_VN
);

router.post(
    "/application_cq_nh_vn/phan-hoi/delete",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deletePhanHoiCQSH_VN
);
router.delete(
    "/application_cq_nh_vn/phan-hoi/:phanHoiId",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deletePhanHoiCQSH_VN
);

// =========================================================
// GIẤY CHỨNG NHẬN CHUYỂN QUYỀN SỞ HỮU (GCN_CQ_NH_VN)
// =========================================================
router.post(
    "/gcn_cq_nh_vn/add",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    addGCN_CQ_NHVN
);

router.post(
    "/gcn_cq_nh_vn/list",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getAllGCN_CQ_VN
);

router.post(
    "/gcn_cq_nh_vn/detail",
    authenticateUser,
    authorizeRoles("admin", "staff", "trainee"),
    getGCN_CQ_VNDetail
);

router.put(
    "/gcn_cq_nh_vn/update",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateGCN_CQ_VN
);

router.post(
    "/gcn_cq_nh_vn/update",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateGCN_CQ_VN
);

router.put(
    "/gcn_cq_nh_vn/edit",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateGCN_CQ_VN
);

router.post(
    "/gcn_cq_nh_vn/approve",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    updateGCN_CQ_VN
);

router.post(
    "/gcn_cq_nh_vn/delete",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    deleteGCN_CQ_VN
);

export default router;
