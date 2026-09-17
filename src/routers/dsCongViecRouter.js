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
const staffRoles = ["admin", "staff"];

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
 *               searchText:
 *                 type: string
 *                 example: "tư vấn"
 *               limit:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Tìm kiếm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   maCongViec:
 *                     type: string
 *                   tenCongViec:
 *                     type: string
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/ds-cong-viec/search", authenticateUser, searchDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/list:
 *   post:
 *     summary: Lấy danh sách công việc (có phân trang)
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
router.post("/ds-cong-viec/list",   authenticateUser, listDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/detail:
 *   post:
 *     summary: Lấy chi tiết một công việc
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
 *               - maCongViec
 *             properties:
 *               maCongViec:
 *                 type: string
 *                 example: "CV001"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy công việc
 */
router.post("/ds-cong-viec/detail", authenticateUser, getDanhSachCongViecById);

/**
 * @swagger
 * /ds-cong-viec/add:
 *   post:
 *     summary: Thêm công việc mới vào danh sách
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
 *               - tenCongViec
 *             properties:
 *               tenCongViec:
 *                 type: string
 *                 example: "Tư vấn pháp lý"
 *               moTa:
 *                 type: string
 *               donGia:
 *                 type: number
 *                 example: 500000
 *               donViTinh:
 *                 type: string
 *                 example: "giờ"
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/ds-cong-viec/add",     authenticateUser, authorizeRoles(...staffRoles), createDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/edit:
 *   put:
 *     summary: Cập nhật công việc
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
 *               - maCongViec
 *             properties:
 *               maCongViec:
 *                 type: string
 *                 example: "CV001"
 *               tenCongViec:
 *                 type: string
 *               moTa:
 *                 type: string
 *               donGia:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy công việc
 */
router.put("/ds-cong-viec/edit",     authenticateUser, authorizeRoles(...staffRoles), updateDanhSachCongViec);

/**
 * @swagger
 * /ds-cong-viec/delete:
 *   delete:
 *     summary: Xóa mềm công việc
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
 *               - maCongViec
 *             properties:
 *               maCongViec:
 *                 type: string
 *                 example: "CV001"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy công việc
 */
router.delete("/ds-cong-viec/delete", authenticateUser, authorizeRoles(...staffRoles), deleteDanhSachCongViec);

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
 *               - maCongViec
 *             properties:
 *               maCongViec:
 *                 type: string
 *                 example: "CV001"
 *     responses:
 *       200:
 *         description: Khôi phục thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy công việc
 */
router.post("/ds-cong-viec/restore", authenticateUser, authorizeRoles(...staffRoles), restoreDanhSachCongViec);

export default router;
