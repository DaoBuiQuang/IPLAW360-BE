import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import { addGroup, deleteGroup, getAllGroups, getGroupById, getGroups, updateGroup } from "../controllers/nhomKhachHangController.js";
const router = express.Router();

router.post("/group/list", getGroups); 
router.post("/group/all", getAllGroups); 
router.post("/group/detail", getGroupById); 
router.post("/group/add", authenticateUser,authorizeRoles("admin", "staff"), addGroup); 
router.put("/group/update", authenticateUser,authorizeRoles("admin", "staff"), updateGroup); 
router.post("/group/delete", authenticateUser,authorizeRoles("admin", "staff"), deleteGroup); 

export default router;
