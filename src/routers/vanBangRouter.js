import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { getShortListGCN_NH } from "../controllers/vanBangController.js";

const router = express.Router();

router.post("/degree/shortlist",authenticateUser, getShortListGCN_NH);

export default router;
