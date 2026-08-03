import express from "express";

import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";
import {  addGCN_NH_Cam, addGCN_NH_VN, editGCN_NH_CAM, editGCN_NH_VN, getGCN_NH_CAMDetail, getGCN_NHDetail, getGCN_NHs, getGCN_NHs_SD, getGCN_NHsCAM, getGCN_NHsCAM_SD } from "../controllers/gcn_nhController.js";
const router = express.Router();
router.post("/gcn_nh/list", authenticateUser, getGCN_NHs);
router.post("/gcn_nh_sd/list", authenticateUser, getGCN_NHs_SD);
router.post("/gcn_nh/detail", authenticateUser, getGCN_NHDetail);
router.post("/gcn_nh_kh/list", authenticateUser, getGCN_NHsCAM);
router.post("/gcn_nh_sd_kh/list", authenticateUser, getGCN_NHsCAM_SD);
router.post("/gcn_nh_kh/detail", authenticateUser, getGCN_NH_CAMDetail);
router.post("/gcn_nh_vn/add", authenticateUser, addGCN_NH_VN);
router.post("/gcn_nh_cam/add", authenticateUser, addGCN_NH_Cam);
router.put("/gcn_nh_vn/edit", authenticateUser, editGCN_NH_VN);
router.put("/gcn_nh_cam/edit", authenticateUser, editGCN_NH_CAM);
export default router;
