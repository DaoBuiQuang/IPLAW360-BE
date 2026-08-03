import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const uploadDir = process.env.UPLOAD_DIR || "uploads";

// tạo folder nếu chưa có
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        try {
            const ext = path.extname(file.originalname);
            const baseName = path.basename(file.originalname, ext);

            // Làm sạch tên file (bỏ dấu + ký tự lạ)
            const safeBaseName = baseName
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9-_]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

            let finalName = `${safeBaseName}${ext}`;
            let filePath = path.join(uploadDir, finalName);

            // Nếu file đã tồn tại → thêm random phía sau
            while (fs.existsSync(filePath)) {
                const randomCode = uuidv4().replace(/-/g, "").substring(0, 8);
                finalName = `${safeBaseName}-${randomCode}${ext}`;
                filePath = path.join(uploadDir, finalName);
            }

            cb(null, finalName);
        } catch (err) {
            cb(err);
        }
    }
});

export const uploadSingle = multer({
    storage,
    limits: {
        fileSize: Number(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024,
    },
});