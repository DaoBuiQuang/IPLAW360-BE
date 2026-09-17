import express from "express";
import { 
    getCaseTypes, 
    getCaseTypeById, 
    addCaseType, 
    updateCaseType, 
    deleteCaseType, 
    getIndustries,
    getIndustryById,
    addIndustry,
    updateIndustry,
    deleteIndustry
} from "../controllers/loaiVuViecController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

/**
 * @swagger
 * /casetype/list:
 *   post:
 *     summary: Lấy danh sách loại vụ việc
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenLoaiVuViec:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/casetype/list", authenticateUser, getCaseTypes); 

/**
 * @swagger
 * /casetype/detail:
 *   post:
 *     summary: Lấy chi tiết loại vụ việc theo mã
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maLoaiVuViec
 *             properties:
 *               maLoaiVuViec:
 *                 type: string
 *                 example: "LVV01"
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy loại vụ việc
 */
router.post("/casetype/detail", authenticateUser, getCaseTypeById); 

/**
 * @swagger
 * /casetype/add:
 *   post:
 *     summary: Thêm loại vụ việc mới
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenLoaiVuViec
 *             properties:
 *               tenLoaiVuViec:
 *                 type: string
 *                 example: "Đăng ký nhãn hiệu"
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/casetype/add", authenticateUser, authorizeRoles("admin", "staff"), addCaseType); 

/**
 * @swagger
 * /casetype/edit:
 *   put:
 *     summary: Cập nhật loại vụ việc
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maLoaiVuViec
 *             properties:
 *               maLoaiVuViec:
 *                 type: string
 *                 example: "LVV01"
 *               tenLoaiVuViec:
 *                 type: string
 *                 example: "Đăng ký nhãn hiệu cập nhật"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy loại vụ việc
 */
router.put("/casetype/edit", authenticateUser, authorizeRoles("admin", "staff"), updateCaseType); 

/**
 * @swagger
 * /casetype/delete:
 *   post:
 *     summary: Xóa loại vụ việc
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maLoaiVuViec
 *             properties:
 *               maLoaiVuViec:
 *                 type: string
 *                 example: "LVV01"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy loại vụ việc
 */
router.post("/casetype/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteCaseType); 

/**
 * @swagger
 * /industry/list:
 *   post:
 *     summary: Lấy danh sách ngành nghề
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách ngành nghề thành công
 */
router.post("/industry/list", authenticateUser, getIndustries);

/**
 * @swagger
 * /industry/detail:
 *   post:
 *     summary: Lấy chi tiết ngành nghề theo mã
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNganhNghe
 *             properties:
 *               maNganhNghe:
 *                 type: string
 *                 example: "NN01"
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy ngành nghề
 */
router.post("/industry/detail", authenticateUser, getIndustryById); 

/**
 * @swagger
 * /industry/add:
 *   post:
 *     summary: Thêm ngành nghề mới
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenNganhNghe
 *             properties:
 *               tenNganhNghe:
 *                 type: string
 *                 example: "Công nghệ thông tin"
 *     responses:
 *       201:
 *         description: Thêm ngành nghề thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/industry/add", authenticateUser, authorizeRoles("admin", "staff"), addIndustry); 

/**
 * @swagger
 * /industry/edit:
 *   put:
 *     summary: Cập nhật ngành nghề
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNganhNghe
 *             properties:
 *               maNganhNghe:
 *                 type: string
 *                 example: "NN01"
 *               tenNganhNghe:
 *                 type: string
 *                 example: "Công nghệ thông tin cập nhật"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy ngành nghề
 */
router.put("/industry/edit", authenticateUser, authorizeRoles("admin", "staff"), updateIndustry); 

/**
 * @swagger
 * /industry/delete:
 *   post:
 *     summary: Xóa ngành nghề
 *     tags: [Case]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNganhNghe
 *             properties:
 *               maNganhNghe:
 *                 type: string
 *                 example: "NN01"
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy ngành nghề
 */
router.post("/industry/delete", authenticateUser, authorizeRoles("admin", "staff"), deleteIndustry); 
export default router;
