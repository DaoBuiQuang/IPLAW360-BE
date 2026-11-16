import express from "express";
import {
    addApplicationSDNHVN,
    getAllApplicationSD_VN,
    getApplicationSD_VNDetail,
    updateApplicationSD_VN,
    deleteApplicationSD_VN,
} from "../controllers/NH_VN_SD/donSuaDoi_NH_VNController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /application_sd_nh_vn/add:
 *   post:
 *     summary: Tạo tờ khai sửa đổi đơn đăng ký nhãn hiệu Việt Nam mới
 *     tags: [Application SD VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tạo đơn sửa đổi thành công
 */
router.post("/application_sd_nh_vn/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSDNHVN);

/**
 * @swagger
 * /application_sd_nh_vn/list:
 *   post:
 *     summary: Lấy danh sách tờ khai sửa đổi đơn đăng ký nhãn hiệu Việt Nam
 *     tags: [Application SD VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/application_sd_nh_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationSD_VN);

/**
 * @swagger
 * /application_sd_nh_vn/detail:
 *   post:
 *     summary: Lấy chi tiết tờ khai sửa đổi đơn đăng ký nhãn hiệu Việt Nam
 *     tags: [Application SD VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 */
router.post("/application_sd_nh_vn/detail", authenticateUser, authorizeRoles("admin", "staff"), getApplicationSD_VNDetail);
router.get("/application_sd_nh_vn/detail/:id", authenticateUser, authorizeRoles("admin", "staff"), getApplicationSD_VNDetail);

/**
 * @swagger
 * /application_sd_nh_vn/update:
 *   put:
 *     summary: Cập nhật / Duyệt (0/1/2) tờ khai sửa đổi đơn đăng ký nhãn hiệu Việt Nam
 *     tags: [Application SD VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/application_sd_nh_vn/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_VN);
router.post("/application_sd_nh_vn/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_VN);
router.put("/application_sd_nh_vn/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_VN);
router.post("/application_sd_nh_vn/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_VN);
router.post("/application_sd_nh_vn/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_VN);
router.put("/application_sd_nh_vn/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_VN);

/**
 * @swagger
 * /application_sd_nh_vn/delete:
 *   post:
 *     summary: Xóa tờ khai sửa đổi đơn đăng ký nhãn hiệu Việt Nam
 *     tags: [Application SD VN]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.post("/application_sd_nh_vn/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteApplicationSD_VN);
router.delete("/application_sd_nh_vn/delete/:id", authenticateUser, authorizeRoles("admin", "staff"), deleteApplicationSD_VN);

export default router;
