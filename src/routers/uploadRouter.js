// routes/upload.js
import express from "express";
import { uploadExcel, uploadExcelDoiTac, uploadExcelHoSoVuViec, importHSVVFromDB, importHSVVCamFromDB, uploadFile, viewFile, downloadFile } from "../controllers/uploadController.js";
import { uploadSingle } from "../middleware/upload.js";


const router = express.Router();
router.post("/upload-excel", uploadExcel);
router.post("/import-doitac", uploadExcelDoiTac);
router.post("/import-hsvv", uploadExcelHoSoVuViec);
router.post("/import-ho-so-db", importHSVVFromDB);
router.post("/import-ho-so-db_cam_donmoi", importHSVVCamFromDB);

router.post(
    "/upload",
    uploadSingle.single("file"), // FE gửi field = file
    uploadFile
);

router.get("/files/view/:filename", viewFile);
router.get("/files/download/:filename", downloadFile);
export default router;
