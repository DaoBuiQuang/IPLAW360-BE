import express from "express";
import { addCountry,  getCountryById, updateCountry, deleteCountry, getCountryBasicList, getCountryFullList } from "../controllers/quocgiaController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /country/list:
 *   post:
 *     summary: Lấy danh sách quốc gia (cơ bản)
 *     tags: [Country]
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
 *                 example: "Việt Nam"
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/country/list",authenticateUser, getCountryBasicList);

/**
 * @swagger
 * /country/full-list:
 *   post:
 *     summary: Lấy danh sách đầy đủ quốc gia
 *     tags: [Country]
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
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/country/full-list",authenticateUser, getCountryFullList);

/**
 * @swagger
 * /country/detail:
 *   post:
 *     summary: Lấy chi tiết quốc gia
 *     tags: [Country]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maQuocGia
 *             properties:
 *               maQuocGia:
 *                 type: string
 *                 example: "VN"
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quốc gia
 */
router.post("/country/detail",authenticateUser, getCountryById);

/**
 * @swagger
 * /country/add:
 *   post:
 *     summary: Thêm quốc gia mới
 *     tags: [Country]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenQuocGia
 *             properties:
 *               tenQuocGia:
 *                 type: string
 *                 example: "Việt Nam"
 *               maQuocGia:
 *                 type: string
 *                 example: "VN"
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/country/add",authenticateUser, authorizeRoles("admin", "staff"), addCountry);

/**
 * @swagger
 * /country/update:
 *   put:
 *     summary: Cập nhật quốc gia
 *     tags: [Country]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maQuocGia
 *             properties:
 *               maQuocGia:
 *                 type: string
 *                 example: "VN"
 *               tenQuocGia:
 *                 type: string
 *                 example: "Việt Nam"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quốc gia
 */
router.put("/country/update",authenticateUser, authorizeRoles("admin", "staff"), updateCountry);

/**
 * @swagger
 * /country/delete:
 *   post:
 *     summary: Xóa quốc gia
 *     tags: [Country]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maQuocGia
 *             properties:
 *               maQuocGia:
 *                 type: string
 *                 example: "VN"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quốc gia
 */
router.post("/country/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteCountry);

export default router;
