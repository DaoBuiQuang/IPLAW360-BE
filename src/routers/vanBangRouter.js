import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { getShortListGCN_NH } from "../controllers/vanBangController.js";

const router = express.Router();

/**
 * @swagger
 * /degree/shortlist:
 *   post:
 *     summary: Lấy danh sách rút gọn các văn bằng bảo hộ (GCN nhãn hiệu)
 *     tags: [Văn bằng]
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
router.post("/degree/shortlist", authenticateUser, getShortListGCN_NH);

export default router;
