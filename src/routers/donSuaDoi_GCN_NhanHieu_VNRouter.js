import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import {
    addApplicationSD_GCN_NHVN,
    getAllApplication_SD_GCN_VN,
    getApplication_SD_GCN_VNDetail,
    updateApplication_SD_GCN_VN,
    deleteApplication_SD_GCN_VN,
} from "../controllers/NH_VN_SD/donSuaDoiGCN_NH_VNController.js";

const router = express.Router();

// =========================================================================
// 1. Prefix chuẩn mới: /gcn_nh_sd_vn/...
// =========================================================================

/**
 * @swagger
 * /gcn_nh_sd_vn/add:
 *   post:
 *     summary: Tạo tờ khai sửa đổi GCN nhãn hiệu Việt Nam mới
 *     tags: [Application SD GCN VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 */
router.post("/gcn_nh_sd_vn/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSD_GCN_NHVN);

/**
 * @swagger
 * /gcn_nh_sd_vn/list:
 *   post:
 *     summary: Lấy danh sách tờ khai sửa đổi GCN nhãn hiệu Việt Nam
 *     tags: [Application SD GCN VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/gcn_nh_sd_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_GCN_VN);

/**
 * @swagger
 * /gcn_nh_sd_vn/detail:
 *   post:
 *     summary: Lấy chi tiết tờ khai sửa đổi GCN nhãn hiệu Việt Nam
 *     tags: [Application SD GCN VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 */
router.post("/gcn_nh_sd_vn/detail", authenticateUser, authorizeRoles("admin", "staff"), getApplication_SD_GCN_VNDetail);
router.get("/gcn_nh_sd_vn/detail/:id", authenticateUser, authorizeRoles("admin", "staff"), getApplication_SD_GCN_VNDetail);

/**
 * @swagger
 * /gcn_nh_sd_vn/update:
 *   put:
 *     summary: Cập nhật / Duyệt (0/1/2) tờ khai sửa đổi GCN nhãn hiệu Việt Nam
 *     tags: [Application SD GCN VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/gcn_nh_sd_vn/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.post("/gcn_nh_sd_vn/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.put("/gcn_nh_sd_vn/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.post("/gcn_nh_sd_vn/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.post("/gcn_nh_sd_vn/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.put("/gcn_nh_sd_vn/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);

router.post("/gcn_nh_sd_vn/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_SD_GCN_VN);
router.delete("/gcn_nh_sd_vn/delete/:id", authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_SD_GCN_VN);

// =========================================================================
// 2. Prefix tương thích ngược: /application_sd_gcn_nh_vn/...
// =========================================================================
router.post("/application_sd_gcn_nh_vn/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSD_GCN_NHVN);
router.post("/application_sd_gcn_nh_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_GCN_VN);
router.post("/application_sd_gcn_nh_vn/detail", authenticateUser, authorizeRoles("admin", "staff"), getApplication_SD_GCN_VNDetail);
router.get("/application_sd_gcn_nh_vn/detail/:id", authenticateUser, authorizeRoles("admin", "staff"), getApplication_SD_GCN_VNDetail);
router.put("/application_sd_gcn_nh_vn/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.post("/application_sd_gcn_nh_vn/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.put("/application_sd_gcn_nh_vn/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.post("/application_sd_gcn_nh_vn/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.post("/application_sd_gcn_nh_vn/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.put("/application_sd_gcn_nh_vn/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_GCN_VN);
router.post("/application_sd_gcn_nh_vn/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_SD_GCN_VN);
router.delete("/application_sd_gcn_nh_vn/delete/:id", authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_SD_GCN_VN);

export default router;
