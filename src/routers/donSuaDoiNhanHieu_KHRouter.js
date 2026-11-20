import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import {
    addApplicationSDNHKH,
    getAllApplicationSD_KH,
    getApplicationSD_KHDetail,
    updateApplicationSD_KH,
    deleteApplicationSD_KH,
    savePhanHoiSuaDoi_KH,
    deletePhanHoiSuaDoi_KH,
} from "../controllers/KH/donSuaDoi_NH_KHController.js";
import { addApplicationSD_GCN_NHKH, getAllApplication_SD_KH } from "../controllers/KH/donSuaDoiGCN_NH_KHController.js";

const router = express.Router();

/**
 * @swagger
 * /application_sd_nh_kh/add:
 *   post:
 *     summary: Tạo tờ khai sửa đổi đơn đăng ký nhãn hiệu Campuchia mới
 *     tags: [Application SD KH]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tạo đơn sửa đổi KH thành công
 */
router.post("/application_sd_nh_kh/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSDNHKH);

/**
 * @swagger
 * /application_sd_nh_kh/list:
 *   post:
 *     summary: Lấy danh sách tờ khai sửa đổi đơn đăng ký nhãn hiệu Campuchia
 *     tags: [Application SD KH]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/application_sd_nh_kh/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationSD_KH);

/**
 * @swagger
 * /application_sd_nh_kh/detail:
 *   post:
 *     summary: Lấy chi tiết tờ khai sửa đổi đơn đăng ký nhãn hiệu Campuchia
 *     tags: [Application SD KH]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 */
router.post("/application_sd_nh_kh/detail", authenticateUser, authorizeRoles("admin", "staff"), getApplicationSD_KHDetail);
router.get("/application_sd_nh_kh/detail/:id", authenticateUser, authorizeRoles("admin", "staff"), getApplicationSD_KHDetail);

/**
 * @swagger
 * /application_sd_nh_kh/update:
 *   put:
 *     summary: Cập nhật / Duyệt (0/1/2) tờ khai sửa đổi đơn đăng ký nhãn hiệu Campuchia
 *     tags: [Application SD KH]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/application_sd_nh_kh/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_KH);
router.post("/application_sd_nh_kh/update", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_KH);
router.put("/application_sd_nh_kh/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_KH);
router.post("/application_sd_nh_kh/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_KH);
router.post("/application_sd_nh_kh/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_KH);
router.put("/application_sd_nh_kh/approve", authenticateUser, authorizeRoles("admin", "staff"), updateApplicationSD_KH);

/**
 * @swagger
 * /application_sd_nh_kh/delete:
 *   post:
 *     summary: Xóa tờ khai sửa đổi đơn đăng ký nhãn hiệu Campuchia
 *     tags: [Application SD KH]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.post("/application_sd_nh_kh/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteApplicationSD_KH);
router.delete("/application_sd_nh_kh/delete/:id", authenticateUser, authorizeRoles("admin", "staff"), deleteApplicationSD_KH);

/**
 * @swagger
 * /application_sd_nh_kh/phan-hoi/save:
 *   post:
 *     summary: Thêm / cập nhật vòng phản hồi với Cục SHTT cho đơn sửa đổi KH
 *     tags: [Application SD KH]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lưu vòng phản hồi thành công
 */
router.post("/application_sd_nh_kh/phan-hoi/save", authenticateUser, authorizeRoles("admin", "staff"), savePhanHoiSuaDoi_KH);

/**
 * @swagger
 * /application_sd_nh_kh/phan-hoi/delete:
 *   post:
 *     summary: Xóa vòng phản hồi với Cục SHTT cho đơn sửa đổi KH
 *     tags: [Application SD KH]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa vòng phản hồi thành công
 */
router.post("/application_sd_nh_kh/phan-hoi/delete", authenticateUser, authorizeRoles("admin", "staff"), deletePhanHoiSuaDoi_KH);
router.delete("/application_sd_nh_kh/phan-hoi/:phanHoiId", authenticateUser, authorizeRoles("admin", "staff"), deletePhanHoiSuaDoi_KH);

// ==================== ĐƠN SỬA ĐỔI GCN NHÃN HIỆU CAMPUCHIA ====================
router.post("/application_sd_gcn_nh_kh/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSD_GCN_NHKH);
router.post("/application_sd_gcn_nh_kh/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_KH);

export default router;
