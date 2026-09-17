import express from "express";
import {
    getIndustries,
    getIndustryById,
    addIndustry,
    updateIndustry,
    deleteIndustry,
} from "../controllers/nganhNgheController.js";

const router = express.Router();

/**
 * @swagger
 * /industry/update:
 *   post:
 *     summary: Cập nhật ngành nghề (POST update)
 *     tags: [Case]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maNganhNghe
 *             properties:
 *               maNganhNghe:
 *                 type: string
 *                 example: "NN01"
 *               tenNganhNghe:
 *                 type: string
 *                 example: "Công nghệ thông tin"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post("/industry/update", updateIndustry);

router.post("/industry/list", getIndustries);
router.post("/industry/detail", getIndustryById);
router.post("/industry/add", addIndustry);
router.post("/industry/delete", deleteIndustry);

export default router;
