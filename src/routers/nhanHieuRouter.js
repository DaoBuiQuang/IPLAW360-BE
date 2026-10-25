import express from "express";
import { addNhanHieu, deleteNhanHieu, getAllNhanHieu, getNhanHieuById, getShortListNhanHieu, updateNhanHieu } from "../controllers/nhanHieuController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /brand/list:
 *   post:
 *     summary: Lấy danh sách nhãn hiệu (hỗ trợ phân trang và tìm kiếm tối ưu)
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search:
 *                 type: string
 *                 description: Tên hoặc mã nhãn hiệu cần tìm
 *                 example: "1734"
 *               pageIndex:
 *                 type: integer
 *                 default: 1
 *                 description: Số thứ tự trang (bắt đầu từ 1)
 *               pageSize:
 *                 type: integer
 *                 default: 10
 *                 description: Số lượng bản ghi trên một trang
 *     responses:
 *       200:
 *         description: Lấy danh sách nhãn hiệu thành công
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
 *                       maNhanHieu:
 *                         type: integer
 *                         example: 1734
 *                       tenNhanHieu:
 *                         type: string
 *                         example: "Logo Đức Ngọc CERAMIC..."
 *                       linkAnh:
 *                         type: string
 *                         example: "data:image/png;base64,..."
 *                       moTa:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     pageIndex:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     totalItems:
 *                       type: integer
 *                       example: 1500
 *                     totalPages:
 *                       type: integer
 *                       example: 150
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi máy chủ nội bộ
 */
router.post("/brand/list", authenticateUser, getAllNhanHieu);

/**
 * @swagger
 * /brand/shortlist:
 *   post:
 *     summary: Lấy danh sách rút gọn nhãn hiệu (dùng cho dropdown)
 *     tags: [Brand]
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
router.post("/brand/shortlist",authenticateUser, getShortListNhanHieu);

/**
 * @swagger
 * /brand/detail:
 *   post:
 *     summary: Lấy chi tiết nhãn hiệu
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanHieu
 *             properties:
 *               maNhanHieu:
 *                 type: string
 *                 example: "NH001"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhãn hiệu
 */
router.post("/brand/detail",authenticateUser, getNhanHieuById);

/**
 * @swagger
 * /brand/add:
 *   post:
 *     summary: Thêm nhãn hiệu mới
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenNhanHieu
 *             properties:
 *               tenNhanHieu:
 *                 type: string
 *                 example: "Coca Cola"
 *               linkAnh:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *               moTa:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/brand/add", addNhanHieu);

/**
 * @swagger
 * /brand/edit:
 *   put:
 *     summary: Cập nhật nhãn hiệu
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanHieu
 *             properties:
 *               maNhanHieu:
 *                 type: string
 *                 example: "NH001"
 *               tenNhanHieu:
 *                 type: string
 *               linkAnh:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy nhãn hiệu
 */
router.put("/brand/edit", updateNhanHieu);

/**
 * @swagger
 * /brand/delete:
 *   post:
 *     summary: Xóa nhãn hiệu
 *     tags: [Brand]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNhanHieu
 *             properties:
 *               maNhanHieu:
 *                 type: string
 *                 example: "NH001"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy nhãn hiệu
 */
router.post("/brand/delete", deleteNhanHieu);

export default router;
