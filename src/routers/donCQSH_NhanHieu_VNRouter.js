import express from "express";
import {
    addApplicationCQNHVN,
    getAllApplicationCQ_VN,
    getApplicationCQ_VNDetail,
    addGCN_CQ_NHVN,
    getAllGCN_CQ_VN,
    getGCN_CQ_VNDetail,
} from "../controllers/NH_CQSH/donCQSH_NHController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /application_cq_nh_vn/add:
 *   post:
 *     summary: Tiếp nhận hồ sơ Chuyển quyền sở hữu Đơn đăng ký nhãn hiệu Việt Nam
 *     tags: [Application CQSH VN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maHoSo
 *               - maDonDangKyCu
 *               - maKhachHangMoi
 *             properties:
 *               maHoSo:
 *                 type: string
 *                 example: "HSVV-2024-001"
 *               maDonDangKyCu:
 *                 type: string
 *                 example: "DKNH-2024-001"
 *               maKhachHangMoi:
 *                 type: integer
 *                 example: 2
 *                 description: ID của khách hàng nhận chuyển quyền
 *               soDonChuyenQuyen:
 *                 type: string
 *                 example: "4-2024-CQ001"
 *               ngayYeuCauChuyenQuyen:
 *                 type: string
 *                 format: date
 *                 example: "2024-10-25"
 *               ngayGhiNhanChuyenQuyen:
 *                 type: string
 *                 format: date
 *                 example: "2024-11-01"
 *               ghiChu:
 *                 type: string
 *                 example: "Chuyển nhượng toàn bộ quyền sở hữu đơn nhãn hiệu"
 *     responses:
 *       201:
 *         description: Tiếp nhận chuyển quyền sở hữu thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *       404:
 *         description: Không tìm thấy đơn gốc hoặc khách hàng mới
 */
router.post(
    "/application_cq_nh_vn/add",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    addApplicationCQNHVN
);

/**
 * @swagger
 * /application_cq_nh_vn/list:
 *   post:
 *     summary: Lấy danh sách hồ sơ chuyển quyền sở hữu Đơn đăng ký nhãn hiệu
 *     tags: [Application CQSH VN]
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
 *               soDon:
 *                 type: string
 *               maHoSo:
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
 */
router.post(
    "/application_cq_nh_vn/list",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    getAllApplicationCQ_VN
);

/**
 * @swagger
 * /application_cq_nh_vn/detail:
 *   post:
 *     summary: Lấy chi tiết hồ sơ chuyển quyền sở hữu Đơn đăng ký nhãn hiệu
 *     tags: [Application CQSH VN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               maDonDangKy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy hồ sơ
 */
router.post(
    "/application_cq_nh_vn/detail",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    getApplicationCQ_VNDetail
);

/**
 * @swagger
 * /gcn_cq_nh_vn/add:
 *   post:
 *     summary: Tiếp nhận hồ sơ Chuyển quyền sở hữu Giấy chứng nhận nhãn hiệu Việt Nam
 *     tags: [Application CQSH VN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maHoSo
 *               - idGCN_NH_Cu
 *               - maKhachHangMoi
 *             properties:
 *               maHoSo:
 *                 type: string
 *                 example: "HSVV-2024-GCN-001"
 *               idGCN_NH_Cu:
 *                 type: integer
 *                 example: 1
 *                 description: ID của Giấy chứng nhận nhãn hiệu gốc
 *               maKhachHangMoi:
 *                 type: integer
 *                 example: 2
 *                 description: ID của khách hàng nhận chuyển quyền
 *               soDonChuyenQuyen:
 *                 type: string
 *                 example: "4-2024-CQGCN-001"
 *               ngayYeuCauChuyenQuyen:
 *                 type: string
 *                 format: date
 *                 example: "2024-10-25"
 *               ngayGhiNhanChuyenQuyen:
 *                 type: string
 *                 format: date
 *                 example: "2024-11-01"
 *               ghiChu:
 *                 type: string
 *                 example: "Chuyển nhượng Giấy chứng nhận nhãn hiệu theo hợp đồng chuyển nhượng"
 *     responses:
 *       201:
 *         description: Tiếp nhận chuyển quyền sở hữu GCN thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *       404:
 *         description: Không tìm thấy GCN gốc hoặc khách hàng mới
 */
router.post(
    "/gcn_cq_nh_vn/add",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    addGCN_CQ_NHVN
);

/**
 * @swagger
 * /gcn_cq_nh_vn/list:
 *   post:
 *     summary: Lấy danh sách hồ sơ chuyển quyền sở hữu Giấy chứng nhận nhãn hiệu
 *     tags: [Application CQSH VN]
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
 *               soDon:
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
 */
router.post(
    "/gcn_cq_nh_vn/list",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    getAllGCN_CQ_VN
);

/**
 * @swagger
 * /gcn_cq_nh_vn/detail:
 *   post:
 *     summary: Lấy chi tiết hồ sơ chuyển quyền sở hữu Giấy chứng nhận nhãn hiệu
 *     tags: [Application CQSH VN]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               idGCN_NH:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy hồ sơ
 */
router.post(
    "/gcn_cq_nh_vn/detail",
    authenticateUser,
    authorizeRoles("admin", "staff"),
    getGCN_CQ_VNDetail
);

export default router;
