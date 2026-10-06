import express from "express";
import {
    createDanhSachCongViec,
    listDanhSachCongViec,
    getDanhSachCongViecById,
    updateDanhSachCongViec,
    deleteDanhSachCongViec,
    restoreDanhSachCongViec,
    searchDanhSachCongViec,
} from "../controllers/dsCongViecController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const allowedRoles = ["admin", "ceo", "manager", "staff"];

/**
 * @swagger
 * /ds-cong-viec/search:
 *   post:
 *     summary: Tìm kiếm / autocomplete danh sách công việc (dùng cho dropdown Log Time)
 *     tags: [Task List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keyword:
 *                 type: string
 *                 example: "ND"
 *               limit:
 *                 type: integer
 *                 default: 20
 *     responses:
 *       200:
 *         description: Tìm kiếm thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/ds-cong-viec/search", authenticateUser, searchDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/list:
 *   post:
 *     summary: Lấy danh sách công việc thường nhật (có phân trang, phân quyền Hệ thống / Cá nhân)
 *     tags: [Task List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keyword:
 *                 type: string
 *               isSystem:
 *                 type: boolean
 *               maNhanSu:
 *                 type: string
 *               pageIndex:
 *                 type: integer
 *                 default: 1
 *               pageSize:
 *                 type: integer
 *                 default: 50
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/ds-cong-viec/list",   authenticateUser, listDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/detail:
 *   post:
 *     summary: Lấy chi tiết một công việc thường nhật
 *     tags: [Task List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền xem công việc cá nhân này
 *       404:
 *         description: Không tìm thấy công việc
 */
router.post("/ds-cong-viec/detail", authenticateUser, getDanhSachCongViecById);

/**
 * @swagger
 * /ds-cong-viec/add:
 *   post:
 *     summary: Thêm công việc mới vào danh sách (admin/ceo tạo Hệ thống hoặc Cá nhân; staff/manager tạo Cá nhân)
 *     tags: [Task List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maVietTat
 *             properties:
 *               maVietTat:
 *                 type: string
 *                 example: "NĐ"
 *               moTa:
 *                 type: string
 *                 example: "Nộp đơn đăng ký"
 *               isSystem:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       409:
 *         description: Trùng mã viết tắt
 */
router.post("/ds-cong-viec/add",     authenticateUser, authorizeRoles(...allowedRoles), createDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/edit:
 *   put:
 *     summary: Cập nhật công việc thường nhật
 *     tags: [Task List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               maVietTat:
 *                 type: string
 *               moTa:
 *                 type: string
 *               isSystem:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền chỉnh sửa công việc này
 *       404:
 *         description: Không tìm thấy công việc
 */
router.put("/ds-cong-viec/edit",     authenticateUser, authorizeRoles(...allowedRoles), updateDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/delete:
 *   delete:
 *     summary: Xóa mềm công việc thường nhật
 *     tags: [Task List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền xóa công việc này
 *       404:
 *         description: Không tìm thấy công việc
 */
router.delete("/ds-cong-viec/delete", authenticateUser, authorizeRoles(...allowedRoles), deleteDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/restore:
 *   post:
 *     summary: Khôi phục công việc đã xóa mềm
 *     tags: [Task List]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Khôi phục thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền khôi phục công việc này
 *       404:
 *         description: Không tìm thấy công việc
 */
router.post("/ds-cong-viec/restore", authenticateUser, authorizeRoles(...allowedRoles), restoreDanhSachCongViec);

export default router;
