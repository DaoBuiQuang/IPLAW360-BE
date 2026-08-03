import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addGiayUyQuyen, deleteGiayUyQuyen, getAllGiayUyQuyen, getGiayUyQuyen, getGiayUyQuyenById, updateGiayUyQuyen } from "../controllers/giayUyQuyenController.js";
const router = express.Router();

router.post("/power-of-attorney/list", getGiayUyQuyen); 
router.post("/power-of-attorney/all", getAllGiayUyQuyen); 
router.post("/power-of-attorney/detail", getGiayUyQuyenById); 
router.post("/power-of-attorney/add", authenticateUser,authorizeRoles("admin", "staff"), addGiayUyQuyen); 
router.put("/power-of-attorney/update", authenticateUser,authorizeRoles("admin", "staff"), updateGiayUyQuyen); 
router.post("/power-of-attorney/delete", authenticateUser,authorizeRoles("admin", "staff"), deleteGiayUyQuyen); 

export default router;