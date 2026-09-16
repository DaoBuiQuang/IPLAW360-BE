import express from "express";
import {
    getPartners,
    getPartnerById,
    addPartner,
    updatePartner,
    deletePartner,
    getAllPartners
} from "../controllers/doiTacController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /partner/list:
 *   post:
 *     summary: Lấy danh sách đối tác (có phân trang)
 *     tags: [Partner]
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
 */
router.post("/partner/list", getPartners);

/**
 * @swagger
 * /partner/all:
 *   post:
 *     summary: Lấy toàn bộ đối tác (không phân trang, dùng cho dropdown)
 *     tags: [Partner]
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
 *         description: Lấy danh sách thành công
 */
router.post("/partner/all", getAllPartners);

/**
 * @swagger
 * /partner/detail:
 *   post:
 *     summary: Lấy chi tiết đối tác
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDoiTac
 *             properties:
 *               maDoiTac:
 *                 type: string
 *                 example: "DT001"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Không tìm thấy đối tác
 */
router.post("/partner/detail", getPartnerById);

/**
 * @swagger
 * /partner/add:
 *   post:
 *     summary: Thêm đối tác mới
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenDoiTac
 *             properties:
 *               tenDoiTac:
 *                 type: string
 *                 example: "Công ty Luật ABC"
 *               quocGia:
 *                 type: string
 *                 example: "VN"
 *               email:
 *                 type: string
 *                 example: "partner@example.com"
 *               soDienThoai:
 *                 type: string
 *                 example: "0901234567"
 *               diaChi:
 *                 type: string
 *                 example: "123 Đường ABC, TP.HCM"
 *     responses:
 *       201:
 *         description: Thêm đối tác thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/partner/add", authenticateUser,authorizeRoles("admin", "staff"), addPartner);

/**
 * @swagger
 * /partner/update:
 *   put:
 *     summary: Cập nhật đối tác
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDoiTac
 *             properties:
 *               maDoiTac:
 *                 type: string
 *                 example: "DT001"
 *               tenDoiTac:
 *                 type: string
 *               quocGia:
 *                 type: string
 *               email:
 *                 type: string
 *               soDienThoai:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đối tác
 */
router.put("/partner/update", authenticateUser,authorizeRoles("admin", "staff"), updatePartner);

/**
 * @swagger
 * /partner/delete:
 *   post:
 *     summary: Xóa đối tác
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maDoiTac
 *             properties:
 *               maDoiTac:
 *                 type: string
 *                 example: "DT001"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đối tác
 */
router.post("/partner/delete", authenticateUser,authorizeRoles("admin", "staff"), deletePartner);

export default router;
