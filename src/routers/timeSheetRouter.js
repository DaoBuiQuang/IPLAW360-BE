import express from "express";
import {
    createTimeSheet,
    updateTimeSheet,
    getTimeSheetById,
    listTimeSheets,
    deleteTimeSheet,
    getTimeSheetsByCase,
    getTimeSheetSummary,
    getCaseCodeOptions,
} from "../controllers/timeSheetController.js";
import { authenticateUser, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const managerRoles = ["admin", "staff"];

router.post("/timesheet/case-options", authenticateUser, getCaseCodeOptions);
router.post("/timesheet/list", authenticateUser, listTimeSheets);
router.post("/timesheet/detail", authenticateUser, getTimeSheetById);
router.post("/timesheet/by-case", authenticateUser, getTimeSheetsByCase);
router.post("/timesheet/summary", authenticateUser, getTimeSheetSummary);
router.post("/timesheet/add", authenticateUser, authorizeRoles(...managerRoles), createTimeSheet);
router.put("/timesheet/edit", authenticateUser, authorizeRoles(...managerRoles), updateTimeSheet);
router.delete("/timesheet/delete", authenticateUser, authorizeRoles(...managerRoles), deleteTimeSheet);

export default router;
