import express from "express";
import { addNhanHieu, deleteNhanHieu, getAllNhanHieu, getNhanHieuById, getShortListNhanHieu, updateNhanHieu } from "../controllers/nhanHieuController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/brand/list",authenticateUser, getAllNhanHieu);
router.post("/brand/shortlist",authenticateUser, getShortListNhanHieu);
router.post("/brand/detail",authenticateUser, getNhanHieuById);
router.post("/brand/add", addNhanHieu);
router.put("/brand/edit", updateNhanHieu);
router.post("/brand/delete", deleteNhanHieu);

export default router;
