import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { createApplication_KH, deleteApplication_KH, getAllApplication_KH, getApplicationById_KH, getApplicationsByMaKhachHang_KH, getFullApplicationDetail_KH, getMaKhachHangByMaHoSoVuViec_KH, updateApplication_KH, exportApplicationsToExcel_KH } from "../controllers/KH/donDangKyNhanHieu_KHController.js";
const router = express.Router();

router.post("/application_kh/list",authenticateUser, getAllApplication_KH);
router.post("/application_kh/add",authenticateUser, authorizeRoles("admin", "staff"), createApplication_KH);
router.post("/application_kh/detail",authenticateUser, getApplicationById_KH);
router.post("/application_kh/fulldetail",authenticateUser, getFullApplicationDetail_KH);
router.put("/application_kh/edit",authenticateUser, authorizeRoles("admin", "staff"), updateApplication_KH);
router.post("/application_kh/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_KH);
router.post("/application_kh/getMaKhachHangByMaHoSoVuViec", getMaKhachHangByMaHoSoVuViec_KH);
router.post("/application_kh/getApplicationByGiayUyQuyenGoc", getApplicationsByMaKhachHang_KH);

/**
 * @swagger
 * /application_kh/export-excel:
 *   post:
 *     summary: Xuất danh sách đơn đăng ký Campuchia ra file Excel
 *     tags: [Application KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchText:
 *                 type: string
 *               customerName:
 *                 type: string
 *               partnerName:
 *                 type: string
 *               brandName:
 *                 type: string
 *               maSPDVList:
 *                 type: array
 *                 items:
 *                   type: string
 *               trangThaiDon:
 *                 type: string
 *               trangThaiVuViec:
 *                 type: string
 *               loaiDon:
 *                 type: integer
 *               fields:
 *                 type: array
 *                 items:
 *                   type: string
 *               filterCondition:
 *                 type: object
 *               reportTitle:
 *                 type: string
 *                 default: "BÁO CÁO DANH SÁCH ĐƠN ĐĂNG KÝ NHÃN HIỆU CAMPUCHIA"
 *               reportFileName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Xuất Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không có dữ liệu để xuất
 */
router.post("/application_kh/export-excel", authenticateUser, exportApplicationsToExcel_KH);

export default router;
