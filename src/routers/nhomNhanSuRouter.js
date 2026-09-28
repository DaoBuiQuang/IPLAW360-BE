import express from "express";
import {
    listAllTeams,
    getTeamDetail,
    addTeamMember,
    removeTeamMember,
    bulkAddTeamMembers,
    setTeamMembers,
} from "../controllers/nhomNhanSuController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /team/list:
 *   post:
 *     summary: Lấy danh sách tất cả nhóm (Chỉ Admin)
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               managerCode:
 *                 type: string
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 teams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       managerCode: { type: string }
 *                       managerName: { type: string }
 *                       members:
 *                         type: array
 */
router.post("/team/list", authenticateUser, authorizeRoles("admin"), listAllTeams);

/**
 * @swagger
 * /team/detail:
 *   post:
 *     summary: Chi tiết nhóm của một trưởng nhóm (Manager xem nhóm mình, Admin xem bất kỳ)
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               managerCode:
 *                 type: string
 *                 description: "Chỉ Admin mới cần truyền (Manager tự động lấy từ JWT)"
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 */
router.post("/team/detail", authenticateUser, authorizeRoles("admin", "manager"), getTeamDetail);

/**
 * @swagger
 * /team/add-member:
 *   post:
 *     summary: Thêm 1 thành viên vào nhóm
 *     tags: [Team]
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
 *               managerCode:
 *                 type: string
 *                 description: "Chỉ Admin truyền. Manager tự động dùng mã của mình."
 *               maNhanSu:
 *                 type: string
 *                 example: "NS002"
 *               tenNhom:
 *                 type: string
 *                 nullable: true
 *                 example: "Nhóm Nhãn hiệu"
 *     responses:
 *       201:
 *         description: Thêm thành viên thành công
 *       409:
 *         description: Nhân viên đã là thành viên của nhóm
 */
router.post("/team/add-member", authenticateUser, authorizeRoles("admin", "manager"), addTeamMember);

/**
 * @swagger
 * /team/remove-member:
 *   post:
 *     summary: Xóa thành viên khỏi nhóm
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nhomId:
 *                 type: integer
 *                 description: "ID bản ghi nhóm nhân sự (ưu tiên)"
 *               maNhanSu:
 *                 type: string
 *                 description: "Mã nhân sự (dùng kết hợp với managerCode)"
 *               managerCode:
 *                 type: string
 *                 description: "Chỉ Admin truyền khi xóa bằng mã nhân sự"
 *     responses:
 *       200:
 *         description: Xóa thành viên thành công
 *       404:
 *         description: Không tìm thấy bản ghi
 */
router.post("/team/remove-member", authenticateUser, authorizeRoles("admin", "manager"), removeTeamMember);

/**
 * @swagger
 * /team/bulk-add:
 *   post:
 *     summary: Thêm nhiều thành viên cùng lúc vào nhóm
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - members
 *             properties:
 *               managerCode:
 *                 type: string
 *                 description: "Chỉ Admin truyền khi thao tác thay trưởng nhóm"
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["NS002", "NS003", "NS004"]
 *               tenNhom:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Thêm nhiều thành viên thành công
 */
router.post("/team/bulk-add", authenticateUser, authorizeRoles("admin", "manager"), bulkAddTeamMembers);

/**
 * @swagger
 * /team/set-team:
 *   post:
 *     summary: Thiết lập lại toàn bộ thành viên nhóm (xóa cũ, thêm mới)
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - members
 *             properties:
 *               managerCode:
 *                 type: string
 *                 description: "Chỉ Admin truyền. Manager tự động dùng mã của mình."
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["NS002", "NS005"]
 *                 description: "Danh sách mã nhân sự mới. Toàn bộ nhóm cũ sẽ được cập nhật thay thế bằng danh sách này."
 *               tenNhom:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Thiết lập nhóm thành công
 */
router.post("/team/set-team", authenticateUser, authorizeRoles("admin", "manager"), setTeamMembers);

export default router;
