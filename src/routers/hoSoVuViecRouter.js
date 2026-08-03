import express from "express";
import { addCase, deleteCase, generateCaseCode, getCaseDetail, searchCases, updateCase } from "../controllers/hoSoVuViecController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/case/list",authenticateUser, searchCases);            
    
router.post("/case/add",authenticateUser, authorizeRoles("admin", "staff"), addCase);          
router.put("/case/edit",authenticateUser, authorizeRoles("admin", "staff"), updateCase);       
router.post("/case/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteCase);    
router.post("/case/generate-code-case",authenticateUser, authorizeRoles("admin", "staff"), generateCaseCode );  
export default router;
