import express from "express";
import { addCase, deleteCase, generateCaseCode, getCaseDetail, searchCases, updateCase } from "../controllers/hoSoVuViecController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /case/list:
 *   post:
 *     summary: Tìm kiếm / lấy danh sách hồ sơ vụ việc
 *     tags: [Case File]
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
 *                 description: Tìm kiếm theo mã hoặc tên hồ sơ
 *               maKhachHang:
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
router.post("/case/list",authenticateUser, searchCases);

/**
 * @swagger
 * /case/add:
 *   post:
 *     summary: Tạo hồ sơ vụ việc mới
 *     tags: [Case File]
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
 *               maDoiTac:
 *                 type: string
 *                 example: "DT001"
 *               tenHoSo:
 *                 type: string
 *                 example: "Hồ sơ nhãn hiệu ABC"
 *               loaiVuViec:
 *                 type: string
 *                 example: "Nhãn hiệu"
 *     responses:
 *       201:
 *         description: Tạo hồ sơ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/case/add",authenticateUser, authorizeRoles("admin", "staff"), addCase);

/**
 * @swagger
 * /case/edit:
 *   put:
 *     summary: Cập nhật hồ sơ vụ việc
 *     tags: [Case File]
 *     security:
 *       - bearerAuth: []
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
 *               tenHoSo:
 *                 type: string
 *               trangThai:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy hồ sơ
 */
router.put("/case/edit",authenticateUser, authorizeRoles("admin", "staff"), updateCase);

/**
 * @swagger
 * /case/delete:
 *   post:
 *     summary: Xóa hồ sơ vụ việc
 *     tags: [Case File]
 *     security:
 *       - bearerAuth: []
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
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy hồ sơ
 */
router.post("/case/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteCase);

/**
 * @swagger
 * /case/generate-code-case:
 *   post:
 *     summary: Sinh mã hồ sơ vụ việc tự động theo số thứ tự tiếp theo của khách hàng
 *     tags: [Case File]
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
 *                 example: "J00025"
 *                 description: Mã khách hàng cần sinh mã hồ sơ
 *     responses:
 *       200:
 *         description: Sinh mã thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tạo mã hồ sơ vụ việc thành công"
 *                 maHoSoVuViec:
 *                   type: string
 *                   example: "J00025-00003"
 *                   description: Mã hồ sơ = maKhachHang + "-" + số thứ tự 5 chữ số
 *       400:
 *         description: Thiếu mã khách hàng trong request body
 *       401:
 *         description: Không có quyền truy cập (JWT không hợp lệ)
 *       404:
 *         description: Không tìm thấy khách hàng với mã đã cung cấp
 */
router.post("/case/generate-code-case",authenticateUser, authorizeRoles("admin", "staff"), generateCaseCode);
export default router;
