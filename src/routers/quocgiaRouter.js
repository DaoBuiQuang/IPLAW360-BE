import express from "express";
import { addCountry,  getCountryById, updateCountry, deleteCountry, getCountryBasicList, getCountryFullList } from "../controllers/quocgiaController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/country/list",authenticateUser, getCountryBasicList);
router.post("/country/full-list",authenticateUser, getCountryFullList);
router.post("/country/detail",authenticateUser, getCountryById);
router.post("/country/add",authenticateUser, authorizeRoles("admin", "staff"), addCountry);
router.put("/country/update",authenticateUser, authorizeRoles("admin", "staff"), updateCountry);
router.post("/country/delete",authenticateUser, authorizeRoles("admin", "staff"), deleteCountry);

export default router;
