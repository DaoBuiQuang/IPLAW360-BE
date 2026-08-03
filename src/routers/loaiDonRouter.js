import express from 'express';
import {
    getAllLoaiDon,
    getLoaiDonById,
    createLoaiDon,
    updateLoaiDon,
    deleteLoaiDon
} from '../controllers/loaiDonController.js';
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post('/applicationtype/all',authenticateUser, getAllLoaiDon);
router.post('/applicationtype/detail',authenticateUser, getLoaiDonById);
router.post('/applicationtype/add',authenticateUser, authorizeRoles("admin", "staff"), createLoaiDon);
router.put('/applicationtype/edit',authenticateUser, authorizeRoles("admin", "staff"), updateLoaiDon);
router.post('/applicationtype/delete',authenticateUser, authorizeRoles("admin", "staff"), deleteLoaiDon);

export default router;
