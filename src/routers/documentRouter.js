import express from "express";
import {
    getDocuments,
    getDocumentById,
    addDocument,
    updateDocument,
    deleteDocument
} from "../controllers/documentController.js";

const router = express.Router();

router.get("/documents", getDocuments);
router.get("/document/:id", getDocumentById);
router.post("/document", addDocument);
router.put("/document/:id", updateDocument);
router.delete("/document/:id", deleteDocument);

export default router;
