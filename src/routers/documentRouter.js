import express from "express";
import {
    getDocuments,
    getDocumentById,
    addDocument,
    updateDocument,
    deleteDocument
} from "../controllers/documentController.js";

const router = express.Router();

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Lấy danh sách tài liệu
 *     tags: [Document]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get("/documents", getDocuments);

/**
 * @swagger
 * /document/{id}:
 *   get:
 *     summary: Lấy chi tiết tài liệu theo ID
 *     tags: [Document]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 */
router.get("/document/:id", getDocumentById);

/**
 * @swagger
 * /document:
 *   post:
 *     summary: Thêm tài liệu mới
 *     tags: [Document]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenTaiLieu:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thêm tài liệu thành công
 */
router.post("/document", addDocument);

/**
 * @swagger
 * /document/{id}:
 *   put:
 *     summary: Cập nhật tài liệu
 *     tags: [Document]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/document/:id", updateDocument);

/**
 * @swagger
 * /document/{id}:
 *   delete:
 *     summary: Xóa tài liệu
 *     tags: [Document]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/document/:id", deleteDocument);

export default router;
