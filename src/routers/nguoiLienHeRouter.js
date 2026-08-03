import express from "express";
import {
  getContacts,
  getContactById,
  addContact,
  updateContact,
  deleteContact,
} from "../controllers/nguoiLienHeController.js";

const router = express.Router();

router.post("/contacts/list", getContacts);
router.post("/contacts/detail", getContactById);
router.post("/contacts/create", addContact);
router.post("/contacts/update", updateContact);
router.post("/contacts/delete", deleteContact);

export default router;