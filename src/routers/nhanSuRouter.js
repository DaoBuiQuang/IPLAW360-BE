import express from "express";
import {
    createNhanSu,
    updateNhanSu,
    deleteNhanSu,
    getNhanSuList,
    getNhanSuById,
    getNhanSuBasicList
} from "../controllers/nhanSuController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /staff/add:
 *   post:
 *     summary: Thêm nhân sự mới
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hoTen
 *             properties:
 *               hoTen:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               email:
 *                 type: string
 *                 example: "nva@example.com"
 *               soDienThoai:
 *                 type: string
 *                 example: "0901234567"
 *               chucVu:
 *                 type: string
 *                 example: "Luật sư"
 *               phongBan:
 *                 type: string
 *                 example: "Phòng nhãn hiệu"
 *     responses:
 *       201:
 *         description: Thêm nhân sự thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/staff/add",authenticateUser,authorizeRoles("admin"), createNhanSu);

/**
 * @swagger
 * /staff/edit:
 *   put:
 *     summary: Cập nhật thông tin nhân sự
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanSu
 *             properties:
 *               maNhanSu:
 *                 type: string
 *                 example: "NS001"
 *               hoTen:
 *                 type: string
 *               email:
 *                 type: string
 *               soDienThoai:
 *                 type: string
 *               chucVu:
 *                 type: string
 *               phongBan:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhân sự
 */
router.put("/staff/edit",authenticateUser,authorizeRoles("admin"), updateNhanSu);

/**
 * @swagger
 * /staff/list:
 *   post:
 *     summary: Lấy danh sách nhân sự (có phân trang/lọc)
 *     tags: [Staff]
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
 *                 description: Tìm kiếm theo tên hoặc mã
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
router.post("/staff/list",authenticateUser,authorizeRoles("admin"), getNhanSuList);

/**
 * @swagger
 * /staff/detail:
 *   post:
 *     summary: Lấy chi tiết nhân sự
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanSu
 *             properties:
 *               maNhanSu:
 *                 type: string
 *                 example: "NS001"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhân sự
 */
router.post("/staff/detail",authenticateUser,authorizeRoles("admin", 'staff', 'trainee'), getNhanSuById);

/**
 * @swagger
 * /staff/delete:
 *   post:
 *     summary: Xóa nhân sự
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanSu
 *             properties:
 *               maNhanSu:
 *                 type: string
 *                 example: "NS001"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhân sự
 */
router.post("/staff/delete",authenticateUser,authorizeRoles("admin"), deleteNhanSu);

/**
 * @swagger
 * /staff/basiclist:
 *   post:
 *     summary: Lấy danh sách cơ bản nhân sự (dùng cho dropdown)
 *     tags: [Staff]
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
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/staff/basiclist",authenticateUser,authorizeRoles("admin", "staff"), getNhanSuBasicList)
export default router;
