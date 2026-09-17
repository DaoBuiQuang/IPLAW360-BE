// routes/upload.js
import express from "express";
import { uploadExcel, uploadExcelDoiTac, uploadExcelHoSoVuViec, importHSVVFromDB, importHSVVCamFromDB, uploadFile, viewFile, downloadFile } from "../controllers/uploadController.js";
import { uploadSingle } from "../middleware/upload.js";


const router = express.Router();

/**
 * @swagger
 * /upload-excel:
 *   post:
 *     summary: Upload file Excel (dữ liệu chung)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File Excel (.xlsx, .xls)
 *     responses:
 *       200:
 *         description: Upload thành công
 *       400:
 *         description: File không hợp lệ
 */
router.post("/upload-excel", uploadExcel);

/**
 * @swagger
 * /import-doitac:
 *   post:
 *     summary: Import danh sách đối tác từ Excel
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import thành công
 *       400:
 *         description: File không hợp lệ hoặc dữ liệu lỗi
 */
router.post("/import-doitac", uploadExcelDoiTac);

/**
 * @swagger
 * /import-hsvv:
 *   post:
 *     summary: Import danh sách hồ sơ vụ việc từ Excel
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import thành công
 *       400:
 *         description: File không hợp lệ
 */
router.post("/import-hsvv", uploadExcelHoSoVuViec);

/**
 * @swagger
 * /import-ho-so-db:
 *   post:
 *     summary: Import hồ sơ từ database (VN)
 *     tags: [Upload]
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
 *         description: Import thành công
 */
router.post("/import-ho-so-db", importHSVVFromDB);

/**
 * @swagger
 * /import-ho-so-db_cam_donmoi:
 *   post:
 *     summary: Import hồ sơ đơn mới từ database (Campuchia)
 *     tags: [Upload]
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
 *         description: Import thành công
 */
router.post("/import-ho-so-db_cam_donmoi", importHSVVCamFromDB);

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload file đính kèm (tài liệu, hình ảnh...)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File cần upload (field name phải là "file")
 *     responses:
 *       200:
 *         description: Upload thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 filename:
 *                   type: string
 *                   example: "1705312345678_document.pdf"
 *                 url:
 *                   type: string
 *                   example: "/api/files/view/1705312345678_document.pdf"
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 */
router.post(
    "/upload",
    uploadSingle.single("file"), // FE gửi field = file
    uploadFile
);

/**
 * @swagger
 * /files/view/{filename}:
 *   get:
 *     summary: Xem / hiển thị file inline
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         example: "1705312345678_document.pdf"
 *         description: Tên file (lấy từ response của /upload)
 *     responses:
 *       200:
 *         description: Trả về nội dung file
 *       404:
 *         description: Không tìm thấy file
 */
router.get("/files/view/:filename", viewFile);

/**
 * @swagger
 * /files/download/{filename}:
 *   get:
 *     summary: Tải xuống file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         example: "1705312345678_document.pdf"
 *         description: Tên file cần tải xuống
 *     responses:
 *       200:
 *         description: Tải file thành công
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Không tìm thấy file
 */
router.get("/files/download/:filename", downloadFile);
export default router;
