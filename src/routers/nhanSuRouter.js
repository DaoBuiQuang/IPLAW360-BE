import express from "express";
import {
    createNhanSu,
    updateNhanSu,
    deleteNhanSu,
    getNhanSuList,
    getNhanSuById,
    getNhanSuBasicList
} from "../controllers/nhanSuController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/staff/add",authenticateUser,authorizeRoles("admin"), createNhanSu); 
router.put("/staff/edit",authenticateUser,authorizeRoles("admin"), updateNhanSu); 
router.post("/staff/list",authenticateUser,authorizeRoles("admin"), getNhanSuList);
router.post("/staff/detail",authenticateUser,authorizeRoles("admin", 'staff', 'trainee'), getNhanSuById); 
router.post("/staff/delete",authenticateUser,authorizeRoles("admin"), deleteNhanSu);
router.post("/staff/basiclist",authenticateUser,authorizeRoles("admin"), getNhanSuBasicList)
export default router;
