import express from "express";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { approveYCTT, getCaseById, getCasesByMaHoSo, getVuViecs, getVuViecsDaXuatBill_BiTuChoi, getVuViecsDaXuatBill_ChuaDuyet, getVuViecsDaXuatBill_ChuaDuyet_ALL, getVuViecsDaXuatBill_DaDuyet, getVuViecsDaXuatBill_DaDuyet_ALL, getVuViecsDaXuatBill_Full, getVuViecsDaXuatBill_Full_ALL, getVuViecsDaXuatBill_KH_BiTuChoi, getVuViecsDaXuatBill_KH_FULL, getVuViecsDaXuatBillKH_ChuaDuyet, getVuViecsDaXuatBillKH_DaDuyet, getVuViecsKH, rejectYCTT, updateVuViec } from "../controllers/vuViecController.js";

const router = express.Router();

router.post("/vuviec/list",authenticateUser, getVuViecs);
router.post("/billing/list",authenticateUser, getVuViecsDaXuatBill_DaDuyet);
router.post("/billing_full/list",authenticateUser, getVuViecsDaXuatBill_Full);
router.post("/billing_kh_full/list",authenticateUser, getVuViecsDaXuatBill_KH_FULL);
router.post("/vuviec_kh/list", authenticateUser, getVuViecsKH);
router.post("/billing_kh/list", authenticateUser, getVuViecsDaXuatBillKH_DaDuyet)
router.post("/case/detail",authenticateUser, getCaseById);  
router.post("/case/getCaseByHoSo",authenticateUser, getCasesByMaHoSo);
router.post("/billing_chuaduyet/list",authenticateUser, getVuViecsDaXuatBill_ChuaDuyet);
router.post("/billing_chuaduyet_kh/list", authenticateUser, getVuViecsDaXuatBillKH_ChuaDuyet)
router.post("/billing_bituchoi/list",authenticateUser, getVuViecsDaXuatBill_BiTuChoi);
router.post("/billing_kh_bituchoi/list",authenticateUser, getVuViecsDaXuatBill_KH_BiTuChoi);
router.post("/vu-viec/yctt/approve", approveYCTT);
router.post("/vu-viec/yctt/reject", rejectYCTT);

router.post("/billing_daduyet_all/list",authenticateUser, getVuViecsDaXuatBill_DaDuyet_ALL);
router.post("/billing_full_all/list",authenticateUser, getVuViecsDaXuatBill_Full_ALL);
router.post("/billing_chuaduyet_all/list",authenticateUser, getVuViecsDaXuatBill_ChuaDuyet_ALL);

router.put("/vu-viec/edit", updateVuViec);

export default router;
