import express from "express";
import { addSanPhamDichVu, deleteSanPhamDichVu, getAllSanPhamDichVu, getSanPhamDichVuById, updateSanPhamDichVu } from "../controllers/sanPham_DichVuController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/productsandservices/list",authenticateUser, getAllSanPhamDichVu);
router.post("/productsandservices/detail",authenticateUser, getSanPhamDichVuById);
router.post("/productsandservices/add",authenticateUser,authorizeRoles("admin", "staff"), addSanPhamDichVu);
router.put("/productsandservices/edit",authenticateUser,authorizeRoles("admin", "staff"), updateSanPhamDichVu);
router.post("/productsandservices/delete",authenticateUser,authorizeRoles("admin", "staff"), deleteSanPhamDichVu);

export default router;
