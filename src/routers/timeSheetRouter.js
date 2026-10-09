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
    getCaseInfo,
    checkCaseContributions,
    getTimesheetKPI,
    getOfficeSummary,
    getMatterList,
    getMatterActivities,
    getMatterActivityDetail,
    updateMatterActivity,
    deleteMatterActivity,
    checkMatterCanEdit,
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       caseCode:
 *                         type: string
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/case-options", authenticateUser, getCaseCodeOptions);

/**
 * @swagger
 * /timesheet/case-info:
 *   post:
 *     summary: Tra cứu chi tiết thông tin hồ sơ theo mã (phục vụ autofill khách hàng, đối tác, quốc gia)
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
 *               - caseCode
 *             properties:
 *               caseCode:
 *                 type: string
 *                 example: "HS20260001"
 *     responses:
 *       200:
 *         description: Lấy thông tin hồ sơ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 caseCode:
 *                   type: string
 *                   example: "HS20260001"
 *                 customerCode:
 *                   type: string
 *                   nullable: true
 *                   example: "KH001"
 *                 partnerCode:
 *                   type: string
 *                   nullable: true
 *                   example: "DT001"
 *                 countryCode:
 *                   type: string
 *                   nullable: true
 *                   example: "VN"
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/timesheet/case-info", authenticateUser, getCaseInfo);

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

// ============================================================
// MATTER MODULE routes
// ============================================================

/**
 * @swagger
 * /timesheet/matter/list:
 *   post:
 *     summary: Danh sach matter (caseCode) thuoc pham vi quyen cua nguoi dung
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
 *               customerCode:
 *                 type: string
 *               partnerCode:
 *                 type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               employeeCode:
 *                 type: string
 *                 description: "Chi admin/ceo su dung"
 *               teamManagerCode:
 *                 type: string
 *                 description: "Chi admin/ceo su dung"
 *               pageIndex:
 *                 type: integer
 *                 default: 1
 *               pageSize:
 *                 type: integer
 *                 default: 20
 *     responses:
 *       200:
 *         description: Danh sach matter thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       caseCode:
 *                         type: string
 *                       customerCode:
 *                         type: string
 *                         nullable: true
 *                       customerName:
 *                         type: string
 *                         nullable: true
 *                       partnerCode:
 *                         type: string
 *                         nullable: true
 *                       partnerName:
 *                         type: string
 *                         nullable: true
 *                       countryCode:
 *                         type: string
 *                         nullable: true
 *                       countryName:
 *                         type: string
 *                         nullable: true
 *                       totalHours:
 *                         type: number
 *                       totalContributionPercentage:
 *                         type: number
 *                       activityCount:
 *                         type: integer
 *                       employeeCount:
 *                         type: integer
 *                       earliestWorkDate:
 *                         type: string
 *                         nullable: true
 *                       latestWorkDate:
 *                         type: string
 *                         nullable: true
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
 *         description: Khong co quyen truy cap
 */
router.post("/timesheet/matter/list", authenticateUser, getMatterList);

/**
 * @swagger
 * /timesheet/matter/activities:
 *   post:
 *     summary: Danh sach activity trong mot matter, group theo activity + employeeCode
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
 *               - caseCode
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
 *         description: Danh sach activity thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 caseCode:
 *                   type: string
 *                 activities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       activity:
 *                         type: string
 *                       employeeCode:
 *                         type: string
 *                       employeeName:
 *                         type: string
 *                         nullable: true
 *                       totalHours:
 *                         type: number
 *                       contributionPercentage:
 *                         type: number
 *                       latestDescription:
 *                         type: string
 *                         nullable: true
 *                       latestNotes:
 *                         type: string
 *                         nullable: true
 *                       latestWorkDate:
 *                         type: string
 *                         nullable: true
 *                       earliestWorkDate:
 *                         type: string
 *                         nullable: true
 *                       recordCount:
 *                         type: integer
 *                       latestRecordId:
 *                         type: integer
 *                         nullable: true
 *                       colleagues:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             employeeCode:
 *                               type: string
 *                             employeeName:
 *                               type: string
 *                               nullable: true
 *       400:
 *         description: Thieu caseCode
 *       401:
 *         description: Khong co quyen truy cap
 */
router.post("/timesheet/matter/activities", authenticateUser, getMatterActivities);

/**
 * @swagger
 * /timesheet/matter/activity-detail:
 *   post:
 *     summary: Chi tiet mot time record (theo id)
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
 *                 example: 123
 *     responses:
 *       200:
 *         description: Chi tiet time record thanh cong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 caseCode:
 *                   type: string
 *                   nullable: true
 *                 activity:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 contributionPercentage:
 *                   type: number
 *                 notes:
 *                   type: string
 *                   nullable: true
 *                 employeeCode:
 *                   type: string
 *                 employeeName:
 *                   type: string
 *                   nullable: true
 *                 workDate:
 *                   type: string
 *                   nullable: true
 *                 hours:
 *                   type: number
 *                 customerCode:
 *                   type: string
 *                   nullable: true
 *                 customerName:
 *                   type: string
 *                   nullable: true
 *                 partnerCode:
 *                   type: string
 *                   nullable: true
 *                 partnerName:
 *                   type: string
 *                   nullable: true
 *                 countryCode:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   type: string
 *       401:
 *         description: Khong co quyen truy cap
 *       403:
 *         description: Khong co quyen xem time record nay
 *       404:
 *         description: Khong tim thay time record
 */
router.post("/timesheet/matter/activity-detail", authenticateUser, getMatterActivityDetail);

/**
 * @swagger
 * /timesheet/matter/activity-edit:
 *   put:
 *     summary: Sua contributionPercentage, description, notes cua time record (chi chu so huu)
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
 *                 example: 123
 *               contributionPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               description:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cap nhat thanh cong
 *       400:
 *         description: Du lieu khong hop le
 *       401:
 *         description: Khong co quyen truy cap
 *       403:
 *         description: Chi duoc sua time record cua chinh minh
 *       404:
 *         description: Khong tim thay time record
 */
router.put("/timesheet/matter/activity-edit", authenticateUser, updateMatterActivity);

/**
 * @swagger
 * /timesheet/matter/activity-delete:
 *   delete:
 *     summary: Xoa time record cua chinh nguoi dung (theo id)
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
 *                 example: 123
 *     responses:
 *       200:
 *         description: Xoa thanh cong
 *       401:
 *         description: Khong co quyen truy cap
 *       403:
 *         description: Chi duoc xoa time record cua chinh minh
 *       404:
 *         description: Khong tim thay time record
 */
router.delete("/timesheet/matter/activity-delete", authenticateUser, deleteMatterActivity);

/**
 * @swagger
 * /timesheet/matter/check-can-edit-matter:
 *   post:
 *     summary: Kiem tra xem matter co the xoa toan bo khong (canDeleteMatter)
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
 *               - caseCode
 *             properties:
 *               caseCode:
 *                 type: string
 *                 example: "VV001"
 *     responses:
 *       200:
 *         description: Ket qua kiem tra
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 caseCode:
 *                   type: string
 *                 totalRecords:
 *                   type: integer
 *                   description: Tong so time record trong caseCode nay (tat ca nhan vien)
 *                 myRecords:
 *                   type: integer
 *                   description: So time record cua nguoi dung hien tai trong caseCode nay
 *                 canDeleteMatter:
 *                   type: boolean
 *                   description: true neu tat ca record trong case nay thuoc ve nguoi dung hien tai
 *       400:
 *         description: Thieu caseCode
 *       401:
 *         description: Khong co quyen truy cap
 */
router.post("/timesheet/matter/check-can-edit-matter", authenticateUser, checkMatterCanEdit);

export default router;
