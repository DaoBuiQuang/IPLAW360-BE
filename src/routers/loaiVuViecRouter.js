import express from "express";
import { 
    getCaseTypes, 
    getCaseTypeById, 
    addCaseType, 
    updateCaseType, 
    deleteCaseType, 
    getIndustries,
    getIndustryById,
    addIndustry,
    updateIndustry,
    deleteIndustry
} from "../controllers/loaiVuViecController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/casetype/list",authenticateUser, getCaseTypes); 
router.post("/casetype/detail",authenticateUser, getCaseTypeById); 
router.post("/casetype/add",authenticateUser, authorizeRoles("admin", "staff"), addCaseType); 
router.put("/casetype/edit",authenticateUser, authorizeRoles("admin", "staff"), updateCaseType); 
router.post("/casetype/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteCaseType); 

router.post("/industry/list",authenticateUser, getIndustries);
router.post("/industry/detail",authenticateUser, getIndustryById); 
router.post("/industry/add",authenticateUser, authorizeRoles("admin", "staff"), addIndustry); 
router.put("/industry/edit",authenticateUser, authorizeRoles("admin", "staff"), updateIndustry); 
router.post("/industry/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteIndustry); 
export default router;
