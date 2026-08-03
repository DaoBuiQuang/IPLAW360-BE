import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addAffidavit, editAffidavit, getAffidavitDetail, getAffidavitList } from "../controllers/KH/affidavitController.js";

const router = express.Router();
router.post("/affidavit/add", authenticateUser, addAffidavit);
router.post("/affidavit/list", authenticateUser, getAffidavitList);
router.post("/affidavit/detail", authenticateUser, getAffidavitDetail);
router.put("/affidavit/update", authenticateUser, editAffidavit);
export default router;
