import express from "express";
import {
    getPartners,
    getPartnerById,
    addPartner,
    updatePartner,
    deletePartner,
    getAllPartners
} from "../controllers/doiTacController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/partner/list", getPartners); 
router.post("/partner/all", getAllPartners); 
router.post("/partner/detail", getPartnerById); 
router.post("/partner/add", authenticateUser,authorizeRoles("admin", "staff"), addPartner); 
router.put("/partner/update", authenticateUser,authorizeRoles("admin", "staff"), updatePartner); 
router.post("/partner/delete", authenticateUser,authorizeRoles("admin", "staff"), deletePartner); 

export default router;
