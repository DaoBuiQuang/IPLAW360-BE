import express from "express";
import {
  getContacts,
  getContactById,
  addContact,
  updateContact,
  deleteContact,
} from "../controllers/nguoiLienHeController.js";

const router = express.Router();

/**
 * @swagger
 * /contacts/list:
 *   post:
 *     summary: Lấy danh sách người liên hệ (phân trang)
 *     tags: [Người liên hệ]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pageIndex:
 *                 type: integer
 *                 default: 1
 *               pageSize:
 *                 type: integer
 *                 default: 20
 *               searchText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.post("/contacts/list", getContacts);

/**
 * @swagger
 * /contacts/detail:
 *   post:
 *     summary: Lấy chi tiết người liên hệ theo ID
 *     tags: [Người liên hệ]
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
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy người liên hệ
 */
router.post("/contacts/detail", getContactById);

/**
 * @swagger
 * /contacts/create:
 *   post:
 *     summary: Tạo người liên hệ mới
 *     tags: [Người liên hệ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hoTen
 *             properties:
 *               hoTen:
 *                 type: string
 *                 example: "Trần Thị B"
 *               email:
 *                 type: string
 *                 example: "ttb@example.com"
 *               soDienThoai:
 *                 type: string
 *                 example: "0912345678"
 *               idKhachHang:
 *                 type: string
 *                 example: "KH001"
 *     responses:
 *       201:
 *         description: Tạo người liên hệ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post("/contacts/create", addContact);

/**
 * @swagger
 * /contacts/update:
 *   post:
 *     summary: Cập nhật thông tin người liên hệ
 *     tags: [Người liên hệ]
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
 *               hoTen:
 *                 type: string
 *                 example: "Trần Thị B Updated"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy người liên hệ
 */
router.post("/contacts/update", updateContact);

/**
 * @swagger
 * /contacts/delete:
 *   post:
 *     summary: Xóa người liên hệ
 *     tags: [Người liên hệ]
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
 *       404:
 *         description: Không tìm thấy người liên hệ
 */
router.post("/contacts/delete", deleteContact);

export default router;