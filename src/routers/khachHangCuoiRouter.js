import express from "express";
import {
    getCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    generateCustomerCode,
    getCustomerNamesAndCodes,
    restoreCustomer
} from "../controllers/khachHangCuoiController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /customers/by-name:
 *   post:
 *     summary: Tìm kiếm khách hàng theo tên (dùng cho dropdown/autocomplete)
 *     tags: [Customer]
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
 *                 example: "Nguyễn"
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/customers/by-name',authenticateUser,  getCustomerNamesAndCodes);

/**
 * @swagger
 * /customer/generate-code-customer:
 *   post:
 *     summary: Sinh mã khách hàng tự động
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Sinh mã thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maKhachHang:
 *                   type: string
 *                   example: "KH0042"
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/customer/generate-code-customer',authenticateUser, generateCustomerCode);

/**
 * @swagger
 * /customer/list:
 *   post:
 *     summary: Lấy danh sách khách hàng (có phân trang/lọc)
 *     tags: [Customer]
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
 *               pageIndex:
 *                 type: integer
 *                 default: 1
 *               pageSize:
 *                 type: integer
 *                 default: 20
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/customer/list",authenticateUser, getCustomers);

/**
 * @swagger
 * /customer/detail:
 *   post:
 *     summary: Lấy chi tiết khách hàng
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
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
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.post("/customer/detail",authenticateUser, getCustomerById);

/**
 * @swagger
 * /customer/add:
 *   post:
 *     summary: Thêm khách hàng mới
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenKhachHang
 *             properties:
 *               tenKhachHang:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               email:
 *                 type: string
 *                 example: "khachhang@example.com"
 *               soDienThoai:
 *                 type: string
 *                 example: "0901234567"
 *               diaChi:
 *                 type: string
 *                 example: "123 Đường ABC, TP.HCM"
 *               quocGia:
 *                 type: string
 *                 example: "VN"
 *               maDoiTac:
 *                 type: string
 *                 example: "DT001"
 *     responses:
 *       201:
 *         description: Thêm khách hàng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/customer/add",authenticateUser, authorizeRoles("admin", "staff"), addCustomer);

/**
 * @swagger
 * /customer/edit:
 *   put:
 *     summary: Cập nhật thông tin khách hàng
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
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
 *               tenKhachHang:
 *                 type: string
 *               email:
 *                 type: string
 *               soDienThoai:
 *                 type: string
 *               diaChi:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.put("/customer/edit",authenticateUser, authorizeRoles("admin", "staff"), updateCustomer);

/**
 * @swagger
 * /customer/delete:
 *   post:
 *     summary: Xóa khách hàng (xóa mềm)
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
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
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.post("/customer/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteCustomer);

/**
 * @swagger
 * /customer/restore:
 *   put:
 *     summary: Khôi phục khách hàng đã xóa mềm
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
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
 *         description: Khôi phục thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.put("/customer/restore",authenticateUser, authorizeRoles("admin", "staff"), restoreCustomer);
export default router;
