import express from "express";
import {
    getIndustries,
    getIndustryById,
    addIndustry,
    updateIndustry,
    deleteIndustry,
} from "../controllers/nganhNgheController.js";

const router = express.Router();

router.post("/industry/list", getIndustries); // Lấy danh sách ngành nghề
router.post("/industry/detail", getIndustryById); // Lấy chi tiết ngành nghề theo ID
router.post("/industry/add", addIndustry); // Thêm ngành nghề mới
router.post("/industry/update", updateIndustry); // Cập nhật ngành nghề
router.post("/industry/delete", deleteIndustry); // Xóa ngành nghề

export default router;
