import express from "express";
import {
    createTimeSheet,
    updateTimeSheet,
    getTimeSheetById,
    listTimeSheets,
    deleteTimeSheet,
    getTimeSheetsByCase,
    getTimeSheetSummary,
    getCaseCodeOptions,
} from "../controllers/timeSheetController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const managerRoles = ["admin", "staff"];

/**
 * @swagger
 * /timesheet/case-options:
 *   post:
 *     summary: Lấy danh sách mã vụ việc (cho dropdown log time)
 *     tags: [TimeSheet]
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
router.post("/timesheet/case-options", authenticateUser, getCaseCodeOptions);

/**
 * @swagger
 * /timesheet/list:
 *   post:
 *     summary: Lấy danh sách timesheet (có lọc/phân trang)
 *     tags: [TimeSheet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maNhanSu:
 *                 type: string
 *               maVuViec:
 *                 type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
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
router.post("/timesheet/list", authenticateUser, listTimeSheets);

/**
 * @swagger
 * /timesheet/detail:
 *   post:
 *     summary: Lấy chi tiết một timesheet
 *     tags: [TimeSheet]
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
 *                 example: 42
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy timesheet
 */
router.post("/timesheet/detail", authenticateUser, getTimeSheetById);

/**
 * @swagger
 * /timesheet/by-case:
 *   post:
 *     summary: Lấy danh sách timesheet theo mã vụ việc
 *     tags: [TimeSheet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maVuViec
 *             properties:
 *               maVuViec:
 *                 type: string
 *                 example: "VV001"
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/by-case", authenticateUser, getTimeSheetsByCase);

/**
 * @swagger
 * /timesheet/summary:
 *   post:
 *     summary: Lấy tổng hợp timesheet (số giờ, phân bổ theo nhân sự/vụ việc)
 *     tags: [TimeSheet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maNhanSu:
 *                 type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Lấy tổng hợp thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/summary", authenticateUser, getTimeSheetSummary);

/**
 * @swagger
 * /timesheet/add:
 *   post:
 *     summary: Tạo timesheet (log time)
 *     tags: [TimeSheet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maVuViec
 *               - soGio
 *               - ngayLogTime
 *             properties:
 *               maVuViec:
 *                 type: string
 *                 example: "VV001"
 *               soGio:
 *                 type: number
 *                 example: 2.5
 *               ngayLogTime:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               moTa:
 *                 type: string
 *                 example: "Soạn thảo hợp đồng"
 *               maCongViec:
 *                 type: string
 *                 example: "CV001"
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/add", authenticateUser, authorizeRoles(...managerRoles), createTimeSheet);

/**
 * @swagger
 * /timesheet/edit:
 *   put:
 *     summary: Cập nhật timesheet
 *     tags: [TimeSheet]
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
 *                 example: 42
 *               soGio:
 *                 type: number
 *               ngayLogTime:
 *                 type: string
 *                 format: date
 *               moTa:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy timesheet
 */
router.put("/timesheet/edit", authenticateUser, authorizeRoles(...managerRoles), updateTimeSheet);

/**
 * @swagger
 * /timesheet/delete:
 *   delete:
 *     summary: Xóa timesheet
 *     tags: [TimeSheet]
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
 *                 example: 42
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy timesheet
 */
router.delete("/timesheet/delete", authenticateUser, authorizeRoles(...managerRoles), deleteTimeSheet);

export default router;
