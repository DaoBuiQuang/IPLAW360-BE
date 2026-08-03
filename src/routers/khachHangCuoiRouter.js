import express from "express";
import {
    getCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    generateCustomerCode,
    getCustomerNamesAndCodes,
    restoreCustomer
} from "../controllers/khachHangCuoiController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();
router.post('/customers/by-name',authenticateUser,  getCustomerNamesAndCodes);
router.post('/customer/generate-code-customer',authenticateUser, generateCustomerCode);
router.post("/customer/list",authenticateUser, getCustomers);            
router.post("/customer/detail",authenticateUser, getCustomerById);     
router.post("/customer/add",authenticateUser, authorizeRoles("admin", "staff"), addCustomer);      
router.put("/customer/edit",authenticateUser, authorizeRoles("admin", "staff"), updateCustomer);     
router.post("/customer/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteCustomer);      
router.put("/customer/restore",authenticateUser, authorizeRoles("admin", "staff"), restoreCustomer);     
export default router;
