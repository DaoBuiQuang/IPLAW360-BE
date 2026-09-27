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
    checkCaseContributions,
    getTimesheetKPI,
    getOfficeSummary,
} from "../controllers/timeSheetController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
// Vai trò có quyền quản lý (admin, manager)
const adminAndManagerRoles = ["admin", "manager"];

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
 *               employeeCode:
 *                 type: string
 *               teamManagerCode:
 *                 type: string
 *                 description: "Lọc theo toàn bộ team của một Manager (Chỉ Admin/CEO)"
 *               caseCode:
 *                 type: string
 *               status:
 *                 type: string
 *               activity:
 *                 type: string
 *               customerCode:
 *                 type: string
 *               partnerCode:
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
 *               employeeCode:
 *                 type: string
 *               teamManagerCode:
 *                 type: string
 *                 description: "Lọc theo team của Manager (Admin truyền mã manager, Manager tự động lấy team mình)"
 *               caseCode:
 *                 type: string
 *               customerCode:
 *                 type: string
 *               partnerCode:
 *                 type: string
 *               status:
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
 * /timesheet/contribution-check:
 *   post:
 *     summary: Kiểm tra và giám sát các hồ sơ có tổng tỉ lệ đóng góp vượt quá 100%
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
 *               caseCode:
 *                 type: string
 *                 example: "VV001"
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Lấy danh sách hồ sơ vượt 100% đóng góp thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/contribution-check", authenticateUser, checkCaseContributions);

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
 *               contributionPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 50.0
 *                 description: Phần trăm tỉ lệ đóng góp vào vụ việc (0 - 100)
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/add", authenticateUser, createTimeSheet);

/**
 * @swagger
 * /timesheet/edit:
 *   put:
 *     summary: Cập nhật timesheet (chỉ chủ sở hữu được sửa)
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
 *               contributionPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 50.0
 *                 description: Phần trăm tỉ lệ đóng góp vào vụ việc (0 - 100)
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Bạn chỉ có quyền chỉnh sửa Time Record của chính mình.
 *       404:
 *         description: Không tìm thấy timesheet
 */
router.put("/timesheet/edit", authenticateUser, updateTimeSheet);
router.post("/timesheet/edit", authenticateUser, updateTimeSheet);

/**
 * @swagger
 * /timesheet/delete:
 *   delete:
 *     summary: Xóa timesheet (chỉ chủ sở hữu được xóa)
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
 *       403:
 *         description: Bạn chỉ có quyền xóa Time Record của chính mình.
 *       404:
 *         description: Không tìm thấy timesheet
 */
router.delete("/timesheet/delete", authenticateUser, deleteTimeSheet);
router.post("/timesheet/delete", authenticateUser, deleteTimeSheet);

/**
 * @swagger
 * /timesheet/kpi:
 *   post:
 *     summary: KPI tổng hợp timesheet theo kỳ (NV/Manager/Admin)
 *     tags: [TimeSheet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeCode:
 *                 type: string
 *                 nullable: true
 *               teamManagerCode:
 *                 type: string
 *                 nullable: true
 *               period:
 *                 type: string
 *                 enum: [week, month, quarter, year]
 *                 default: month
 *               year:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 nullable: true
 *               week:
 *                 type: integer
 *                 nullable: true
 *               quarter:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Lấy KPI thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/kpi", authenticateUser, getTimesheetKPI);

/**
 * @swagger
 * /timesheet/office-summary:
 *   post:
 *     summary: Tổng hợp KPI toàn công ty theo kỳ (CEO/Admin only)
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
 *               period:
 *                 type: string
 *                 enum: [week, month, quarter, year]
 *                 default: month
 *               year:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 nullable: true
 *               week:
 *                 type: integer
 *                 nullable: true
 *               quarter:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Lấy tổng hợp thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Chỉ Admin/CEO mới có quyền truy cập
 */
router.post("/timesheet/office-summary", authenticateUser, authorizeRoles("admin"), getOfficeSummary);

export default router;
