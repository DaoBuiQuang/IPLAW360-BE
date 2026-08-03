import { Document } from "../model/taiLieuModel.js";

export const getDocuments = async (req, res) => {
    try {
        const documents = await Document.findAll();
        if (documents.length === 0) {
            return res.status(404).json({ message: "Không có tài liệu nào" });
        }
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findByPk(req.params.id);
        if (!document) {
            return res.status(404).json({ message: "Tài liệu không tồn tại" });
        }
        res.status(200).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addDocument = async (req, res) => {
    try {
        const { petitionId, documentType, documentLink, status } = req.body;

        if (!petitionId || !documentType || !documentLink) {
            return res.status(400).json({ message: "Thiếu thông tin tài liệu" });
        }

        const validStatuses = ["Đã nộp", "Chưa nộp"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        const newDocument = await Document.create({
            petitionId,
            documentType,
            documentLink,
            status: status || "Chưa nộp",
        });

        res.status(201).json(newDocument);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { documentType, documentLink, status } = req.body;

        const document = await Document.findByPk(id);
        if (!document) {
            return res.status(404).json({ message: "Tài liệu không tồn tại" });
        }

        const validStatuses = ["Đã nộp", "Chưa nộp"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        document.documentType = documentType || document.documentType;
        document.documentLink = documentLink || document.documentLink;
        document.status = status || document.status;

        await document.save();

        res.status(200).json({ message: "Cập nhật tài liệu thành công", document });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa tài liệu
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await Document.findByPk(id);

        if (!document) {
            return res.status(404).json({ message: "Tài liệu không tồn tại" });
        }

        await document.destroy();
        res.status(200).json({ message: "Xóa tài liệu thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
