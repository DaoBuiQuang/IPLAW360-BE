import express from "express";
import { addApplicationSDNHVN, getAllApplicationSD_VN } from "../controllers/NH_VN_SD/donSuaDoi_NH_VNController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// router.post("/application_sd_nh_vn/list",authenticateUser, authorizeRoles("admin", "staff"), getAllApplication_SD_VN);
/**
 * @swagger
 * /application_sd_nh_vn/add:
 *   post:
 *     summary: Tạo đơn sửa đổi nhãn hiệu Việt Nam mới
 *     tags: [Application SD VN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maHoSo
 *             properties:
 *               maHoSo:
 *                 type: string
 *                 example: "HSVV001"
 *               soDon:
 *                 type: string
 *                 example: "4-2024-SD001"
 *     responses:
 *       201:
 *         description: Tạo đơn sửa đổi thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/application_sd_nh_vn/add", authenticateUser, authorizeRoles("admin", "staff"), addApplicationSDNHVN);

/**
 * @swagger
 * /application_sd_nh_vn/list:
 *   post:
 *     summary: Lấy danh sách đơn sửa đổi nhãn hiệu Việt Nam
 *     tags: [Application SD VN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplicationListRequest'
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/application_sd_nh_vn/list", authenticateUser, authorizeRoles("admin", "staff"), getAllApplicationSD_VN);

// router.post("/application_sd_nh_vn/detail",authenticateUser, authorizeRoles("admin", "staff"), getApplicationById_SD_VN);
// router.post("/application_sd_nh_vn/fulldetail",authenticateUser,authorizeRoles("admin", "staff"), getFullApplicationDetail_GH_VN);
// router.put("/application_sd_nh_vn/edit",authenticateUser, authorizeRoles("admin", "staff"), updateApplication_SD_VN);
// router.post("/application_sd_nh_vn/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_SD_VN);
// //router.post("/application_gh_vn/getMaKhachHangByMaHoSoVuViec", getMaKhachHangByMaHoSoVuViec_KH);
// //router.post("/application_gh_vn/getApplicationByGiayUyQuyenGoc", getApplicationsByMaKhachHang_KH);
export default router;
