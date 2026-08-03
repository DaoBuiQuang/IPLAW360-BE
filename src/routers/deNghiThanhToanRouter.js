import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addDeNghiThanhToan, editDeNghiThanhToan, getDeNghiThanhToanDetail, getDeNghiThanhToans, getDeNghiThanhToansKH, getDeNghiThanhToansVN } from "../controllers/deNghiThanhToanController.js";


const router = express.Router();

router.post("/denghithanhtoan/add",authenticateUser, addDeNghiThanhToan);
router.post("/denghithanhtoan_vn/list",authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToansVN);
router.post("/denghithanhtoan_kh/list",authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToansKH);
router.post("/denghithanhtoan/detail",authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToanDetail);
router.post("/denghithanhtoan/edit",authenticateUser, editDeNghiThanhToan);
router.post("/denghithanhtoan_all/list",authenticateUser, authorizeRoles("admin", "staff"), getDeNghiThanhToans);
export default router;
