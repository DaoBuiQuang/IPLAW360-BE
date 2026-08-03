import express from "express";
import { createApplication, deleteApplication, getAllApplication, getApplicationById, getApplicationsByGUQ, getApplicationsByMaKhachHang, getFullApplicationDetail, getMaKhachHangByMaHoSoVuViec, exportApplicationsToExcel, updateApplication } from "../controllers/donDangKyController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /application/list:
 *   post:
 *     summary: Lấy danh sách đơn đăng ký
 *     tags: [Application]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     pageIndex:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không có đơn đăng ký nào
 */
router.post("/application/list",authenticateUser, getAllApplication);

/**
 * @swagger
 * /application/add:
 *   post:
 *     summary: Tạo đơn đăng ký mới
 *     tags: [Application]
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
 *                 example: "4-2024-123456"
 *               maNhanHieu:
 *                 type: string
 *               nhanHieu:
 *                 type: object
 *                 properties:
 *                   tenNhanHieu:
 *                     type: string
 *                   linkAnh:
 *                     type: string
 *               maSPDVList:
 *                 type: array
 *                 items:
 *                   type: string
 *               taiLieus:
 *                 type: array
 *                 items:
 *                   type: object
 *               vuViecs:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Tạo đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/application/add",authenticateUser, authorizeRoles("admin", "staff"), createApplication);

/**
 * @swagger
 * /application/detail:
 *   post:
 *     summary: Lấy thông tin chi tiết đơn đăng ký
 *     tags: [Application]
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
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         description: Thiếu mã đơn đăng ký
 *       404:
 *         description: Không tìm thấy đơn đăng ký
 */
router.post("/application/detail",authenticateUser, getApplicationById);

/**
 * @swagger
 * /application/fulldetail:
 *   post:
 *     summary: Lấy thông tin đầy đủ đơn đăng ký (bao gồm vụ việc, lịch sử thẩm định)
 *     tags: [Application]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maDonDangKy:
 *                 type: string
 *                 example: "HSVV001_abc123"
 *               soDon:
 *                 type: string
 *                 example: "4-2024-123456"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       400:
 *         description: Thiếu mã đơn hoặc số đơn
 *       404:
 *         description: Không tìm thấy đơn đăng ký
 */
router.post("/application/fulldetail",authenticateUser, getFullApplicationDetail);

/**
 * @swagger
 * /application/edit:
 *   put:
 *     summary: Cập nhật đơn đăng ký
 *     tags: [Application]
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
 *               trangThaiDon:
 *                 type: string
 *               trangThaiVuViec:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đơn đăng ký
 */
router.put("/application/edit",authenticateUser, authorizeRoles("admin", "staff"), updateApplication);

/**
 * @swagger
 * /application/delete:
 *   post:
 *     summary: Xóa đơn đăng ký
 *     tags: [Application]
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
 *               maNhanSuCapNhap:
 *                 type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Thiếu mã đơn đăng ký hoặc đơn đang được sử dụng
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đơn đăng ký
 */
router.post("/application/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteApplication);

router.post("/application/getMaKhachHangByMaHoSoVuViec", getMaKhachHangByMaHoSoVuViec);
router.post("/application/getApplicationByGiayUyQuyenGoc", getApplicationsByMaKhachHang);

/**
 * @swagger
 * /application/export-excel:
 *   post:
 *     summary: Xuất danh sách đơn đăng ký ra file Excel
 *     tags: [Application]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExportExcelRequest'
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
 *       500:
 *         description: Lỗi server
 */
router.post("/application/export-excel", authenticateUser, exportApplicationsToExcel);

/**
 * @swagger
 * /application/guq:
 *   post:
 *     summary: Lấy danh sách đơn theo giấy ủy quyền
 *     tags: [Application]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idGUQ
 *             properties:
 *               idGUQ:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       400:
 *         description: Thiếu idGUQ
 */
router.post("/application/guq", getApplicationsByGUQ);

export default router;
