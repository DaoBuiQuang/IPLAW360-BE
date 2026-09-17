import express from "express";
import { addSanPhamDichVu, deleteSanPhamDichVu, getAllSanPhamDichVu, getSanPhamDichVuById, updateSanPhamDichVu } from "../controllers/sanPham_DichVuController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /productsandservices/list:
 *   post:
 *     summary: Lấy danh sách sản phẩm & dịch vụ
 *     tags: [Products & Services]
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
router.post("/productsandservices/list",authenticateUser, getAllSanPhamDichVu);

/**
 * @swagger
 * /productsandservices/detail:
 *   post:
 *     summary: Lấy chi tiết sản phẩm / dịch vụ
 *     tags: [Products & Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maSPDV
 *             properties:
 *               maSPDV:
 *                 type: string
 *                 example: "SPDV001"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm/dịch vụ
 */
router.post("/productsandservices/detail",authenticateUser, getSanPhamDichVuById);

/**
 * @swagger
 * /productsandservices/add:
 *   post:
 *     summary: Thêm sản phẩm / dịch vụ mới
 *     tags: [Products & Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenSPDV
 *             properties:
 *               tenSPDV:
 *                 type: string
 *                 example: "Dịch vụ đăng ký nhãn hiệu VN"
 *               moTa:
 *                 type: string
 *               gia:
 *                 type: number
 *                 example: 5000000
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/productsandservices/add",authenticateUser,authorizeRoles("admin", "staff"), addSanPhamDichVu);

/**
 * @swagger
 * /productsandservices/edit:
 *   put:
 *     summary: Cập nhật sản phẩm / dịch vụ
 *     tags: [Products & Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maSPDV
 *             properties:
 *               maSPDV:
 *                 type: string
 *                 example: "SPDV001"
 *               tenSPDV:
 *                 type: string
 *               moTa:
 *                 type: string
 *               gia:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm/dịch vụ
 */
router.put("/productsandservices/edit",authenticateUser,authorizeRoles("admin", "staff"), updateSanPhamDichVu);

/**
 * @swagger
 * /productsandservices/delete:
 *   post:
 *     summary: Xóa sản phẩm / dịch vụ
 *     tags: [Products & Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maSPDV
 *             properties:
 *               maSPDV:
 *                 type: string
 *                 example: "SPDV001"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm/dịch vụ
 */
router.post("/productsandservices/delete",authenticateUser,authorizeRoles("admin", "staff"), deleteSanPhamDichVu);

export default router;
