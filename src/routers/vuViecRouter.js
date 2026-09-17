import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { approveYCTT, getCaseById, getCasesByMaHoSo, getVuViecs, getVuViecsDaXuatBill_BiTuChoi, getVuViecsDaXuatBill_ChuaDuyet, getVuViecsDaXuatBill_ChuaDuyet_ALL, getVuViecsDaXuatBill_DaDuyet, getVuViecsDaXuatBill_DaDuyet_ALL, getVuViecsDaXuatBill_Full, getVuViecsDaXuatBill_Full_ALL, getVuViecsDaXuatBill_KH_BiTuChoi, getVuViecsDaXuatBill_KH_FULL, getVuViecsDaXuatBillKH_ChuaDuyet, getVuViecsDaXuatBillKH_DaDuyet, getVuViecsKH, rejectYCTT, updateVuViec } from "../controllers/vuViecController.js";

const router = express.Router();

/**
 * @swagger
 * /vuviec/list:
 *   post:
 *     summary: Lấy danh sách vụ việc (VN)
 *     tags: [Task / Case Work]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maHoSoVuViec:
 *                 type: string
 *               trangThai:
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
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/vuviec/list",authenticateUser, getVuViecs);

/**
 * @swagger
 * /billing/list:
 *   post:
 *     summary: Lấy danh sách vụ việc đã xuất bill – đã duyệt (VN)
 *     tags: [Task / Case Work]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/billing/list",authenticateUser, getVuViecsDaXuatBill_DaDuyet);

/**
 * @swagger
 * /billing_full/list:
 *   post:
 *     summary: Lấy danh sách đầy đủ vụ việc đã xuất bill (VN)
 *     tags: [Task / Case Work]
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
router.post("/billing_full/list",authenticateUser, getVuViecsDaXuatBill_Full);

/**
 * @swagger
 * /billing_kh_full/list:
 *   post:
 *     summary: Lấy danh sách đầy đủ vụ việc đã xuất bill (KH/Campuchia)
 *     tags: [Task / Case Work]
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
router.post("/billing_kh_full/list",authenticateUser, getVuViecsDaXuatBill_KH_FULL);

/**
 * @swagger
 * /vuviec_kh/list:
 *   post:
 *     summary: Lấy danh sách vụ việc (KH/Campuchia)
 *     tags: [Task / Case Work]
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
router.post("/vuviec_kh/list", authenticateUser, getVuViecsKH);

/**
 * @swagger
 * /billing_kh/list:
 *   post:
 *     summary: Lấy danh sách vụ việc đã xuất bill – đã duyệt (KH/Campuchia)
 *     tags: [Task / Case Work]
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
router.post("/billing_kh/list", authenticateUser, getVuViecsDaXuatBillKH_DaDuyet)

/**
 * @swagger
 * /case/detail:
 *   post:
 *     summary: Lấy chi tiết vụ việc theo ID
 *     tags: [Task / Case Work]
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
 *         description: Lấy thông tin thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy vụ việc
 */
router.post("/case/detail",authenticateUser, getCaseById);

/**
 * @swagger
 * /case/getCaseByHoSo:
 *   post:
 *     summary: Lấy danh sách vụ việc theo mã hồ sơ
 *     tags: [Task / Case Work]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maHoSoVuViec
 *             properties:
 *               maHoSoVuViec:
 *                 type: string
 *                 example: "HSVV001"
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/case/getCaseByHoSo",authenticateUser, getCasesByMaHoSo);

/**
 * @swagger
 * /billing_chuaduyet/list:
 *   post:
 *     summary: Lấy danh sách vụ việc đã xuất bill – chưa duyệt (VN)
 *     tags: [Task / Case Work]
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
router.post("/billing_chuaduyet/list",authenticateUser, getVuViecsDaXuatBill_ChuaDuyet);

/**
 * @swagger
 * /billing_chuaduyet_kh/list:
 *   post:
 *     summary: Lấy danh sách vụ việc đã xuất bill – chưa duyệt (KH/Campuchia)
 *     tags: [Task / Case Work]
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
router.post("/billing_chuaduyet_kh/list", authenticateUser, getVuViecsDaXuatBillKH_ChuaDuyet)

/**
 * @swagger
 * /billing_bituchoi/list:
 *   post:
 *     summary: Lấy danh sách vụ việc đã xuất bill – bị từ chối (VN)
 *     tags: [Task / Case Work]
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
router.post("/billing_bituchoi/list",authenticateUser, getVuViecsDaXuatBill_BiTuChoi);

/**
 * @swagger
 * /billing_kh_bituchoi/list:
 *   post:
 *     summary: Lấy danh sách vụ việc đã xuất bill – bị từ chối (KH/Campuchia)
 *     tags: [Task / Case Work]
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
router.post("/billing_kh_bituchoi/list",authenticateUser, getVuViecsDaXuatBill_KH_BiTuChoi);

/**
 * @swagger
 * /vu-viec/yctt/approve:
 *   post:
 *     summary: Duyệt yêu cầu thanh toán (YCTT)
 *     tags: [Task / Case Work]
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
 *               ghiChu:
 *                 type: string
 *     responses:
 *       200:
 *         description: Duyệt thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy vụ việc
 */
router.post("/vu-viec/yctt/approve", approveYCTT);

/**
 * @swagger
 * /vu-viec/yctt/reject:
 *   post:
 *     summary: Từ chối yêu cầu thanh toán (YCTT)
 *     tags: [Task / Case Work]
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
 *               lyDoTuChoi:
 *                 type: string
 *                 example: "Số tiền không khớp"
 *     responses:
 *       200:
 *         description: Từ chối thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy vụ việc
 */
router.post("/vu-viec/yctt/reject", rejectYCTT);

/**
 * @swagger
 * /billing_daduyet_all/list:
 *   post:
 *     summary: Lấy tất cả vụ việc đã xuất bill – đã duyệt (VN + KH)
 *     tags: [Task / Case Work]
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
router.post("/billing_daduyet_all/list",authenticateUser, getVuViecsDaXuatBill_DaDuyet_ALL);

/**
 * @swagger
 * /billing_full_all/list:
 *   post:
 *     summary: Lấy tất cả vụ việc đã xuất bill – đầy đủ (VN + KH)
 *     tags: [Task / Case Work]
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
router.post("/billing_full_all/list",authenticateUser, getVuViecsDaXuatBill_Full_ALL);

/**
 * @swagger
 * /billing_chuaduyet_all/list:
 *   post:
 *     summary: Lấy tất cả vụ việc đã xuất bill – chưa duyệt (VN + KH)
 *     tags: [Task / Case Work]
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
router.post("/billing_chuaduyet_all/list",authenticateUser, getVuViecsDaXuatBill_ChuaDuyet_ALL);

/**
 * @swagger
 * /vu-viec/edit:
 *   put:
 *     summary: Cập nhật vụ việc
 *     tags: [Task / Case Work]
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
 *               trangThai:
 *                 type: string
 *               ghiChu:
 *                 type: string
 *               soTien:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy vụ việc
 */
router.put("/vu-viec/edit", updateVuViec);

export default router;
