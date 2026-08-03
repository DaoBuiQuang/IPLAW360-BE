import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { sequelize } from "../config/db.js";

// ===== fix __dirname for ES module =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== config =====
const UPLOAD_DIR = path.join(__dirname, "../uploads/uyquyen");
const BATCH_SIZE = 50;

// ===== helpers =====
function parseBase64(data) {
  if (!data || !data.startsWith("data:")) return null;

  const match = data.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function detectExt(mime, buffer) {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("word")) return "docx";
  if (mime.includes("excel")) return "xlsx";

  // fallback magic bytes
  if (buffer[0] === 0x25 && buffer[1] === 0x50) return "pdf"; // %PDF
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return "zip"; // docx/xlsx

  return "bin";
}

// ===== migrate one batch =====
async function migrateOnce() {
  const [rows] = await sequelize.query(
    `
    SELECT id, linkAnh
    FROM giayuyquyen
    WHERE linkAnh LIKE 'data:%'
    LIMIT ?
    `,
    { replacements: [BATCH_SIZE] }
  );

  if (!rows.length) {
    console.log("🎉 Không còn bản ghi base64 nào");
    return false;
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  for (const row of rows) {
    try {
      const parsed = parseBase64(row.linkAnh);
      if (!parsed) {
        console.warn("⚠️ Skip invalid base64, id =", row.id);
        continue;
      }

      const ext = detectExt(parsed.mime, parsed.buffer);
      const fileName = `${uuidv4()}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      fs.writeFileSync(filePath, parsed.buffer);

      await sequelize.query(
        "UPDATE giayuyquyen SET linkAnh = ? WHERE id = ?",
        { replacements: [fileName, row.id] }
      );

      console.log("✔ migrated id =", row.id);
    } catch (err) {
      console.error("❌ failed id =", row.id, err.message);
    }
  }

  return true;
}

// ===== run migrate =====
async function run() {
  console.log("🚀 Start migrate linkAnh (base64 → file path)");

  while (await migrateOnce()) {
    // chạy cho đến khi hết base64
  }

  console.log("✅ Migration done");
  process.exit(0);
}

run();
