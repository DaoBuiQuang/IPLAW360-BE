import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { createApplication_KH, deleteApplication_KH, getAllApplication_KH, getApplicationById_KH, getApplicationsByMaKhachHang_KH, getFullApplicationDetail_KH, getMaKhachHangByMaHoSoVuViec_KH, updateApplication_KH, exportApplicationsToExcel_KH } from "../controllers/KH/donDangKyNhanHieu_KHController.js";
const router = express.Router();

/**
 * @swagger
 * /application_kh/list:
 *   post:
 *     summary: Lấy danh sách đơn đăng ký nhãn hiệu Campuchia
 *     tags: [Application KH]
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
 *         description: Lấy danh sách đơn thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/application_kh/list", authenticateUser, getAllApplication_KH);

/**
 * @swagger
 * /application_kh/add:
 *   post:
 *     summary: Tạo đơn đăng ký nhãn hiệu Campuchia mới
 *     tags: [Application KH]
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
 *                 example: "KH-2024-001"
 *               tenNhanHieu:
 *                 type: string
 *                 example: "Brand Alpha"
 *               ngayNopDon:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               trangThaiDon:
 *                 type: string
 *                 example: "Nộp đơn"
 *               loaiDon:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/application_kh/add", authenticateUser, authorizeRoles("admin", "staff"), createApplication_KH);

/**
 * @swagger
 * /application_kh/detail:
 *   post:
 *     summary: Lấy thông tin cơ bản đơn đăng ký Campuchia theo mã
 *     tags: [Application KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKy
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "HSVV001_abc123"
 *     responses:
 *       200:
 *         description: Lấy chi tiết đơn thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_kh/detail", authenticateUser, getApplicationById_KH);

/**
 * @swagger
 * /application_kh/fulldetail:
 *   post:
 *     summary: Lấy chi tiết đầy đủ đơn đăng ký Campuchia
 *     tags: [Application KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKy
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "HSVV001_abc123"
 *     responses:
 *       200:
 *         description: Lấy chi tiết đầy đủ thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_kh/fulldetail", authenticateUser, getFullApplicationDetail_KH);

/**
 * @swagger
 * /application_kh/edit:
 *   put:
 *     summary: Cập nhật đơn đăng ký Campuchia
 *     tags: [Application KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKy
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "HSVV001_abc123"
 *               soDon:
 *                 type: string
 *                 example: "KH-2024-001"
 *               tenNhanHieu:
 *                 type: string
 *                 example: "Brand Alpha Updated"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Lỗi cập nhật
 *       404:
 *         description: Không tìm thấy đơn
 */
router.put("/application_kh/edit", authenticateUser, authorizeRoles("admin", "staff"), updateApplication_KH);

/**
 * @swagger
 * /application_kh/delete:
 *   post:
 *     summary: Xóa đơn đăng ký Campuchia
 *     tags: [Application KH]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDonDangKy
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "HSVV001_abc123"
 *     responses:
 *       200:
 *         description: Xóa đơn thành công
 *       404:
 *         description: Không tìm thấy đơn
 */
router.post("/application_kh/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteApplication_KH);

/**
 * @swagger
 * /application_kh/getMaKhachHangByMaHoSoVuViec:
 *   post:
 *     summary: Lấy mã khách hàng theo mã hồ sơ vụ việc (Campuchia)
 *     tags: [Application KH]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maHoSoVuViec
 *             properties:
 *               maHoSoVuViec:
 *                 type: string
 *                 example: "HSVV001"
 *     responses:
 *       200:
 *         description: Lấy mã khách hàng thành công
 *       404:
 *         description: Không tìm thấy hồ sơ
 */
router.post("/application_kh/getMaKhachHangByMaHoSoVuViec", getMaKhachHangByMaHoSoVuViec_KH);

/**
 * @swagger
 * /application_kh/getApplicationByGiayUyQuyenGoc:
 *   post:
 *     summary: Lấy danh sách đơn Campuchia theo giấy ủy quyền gốc của khách hàng
 *     tags: [Application KH]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maKhachHang
 *             properties:
 *               maKhachHang:
 *                 type: string
 *                 example: "KH001"
 *     responses:
 *       200:
 *         description: Lấy danh sách đơn thành công
 *       400:
 *         description: Thiếu mã khách hàng
 */
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
