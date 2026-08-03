import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import db from "../db.js"; // knex / sequelize / mysql2

const UPLOAD_DIR = "uploads/uyquyen";

function parseBase64(data) {
  const match = data.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function detectExt(mime, buffer) {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("word")) return "docx";
  if (mime.includes("excel")) return "xlsx";

  // fallback magic bytes
  if (buffer[0] === 0x25 && buffer[1] === 0x50) return "pdf";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";

  return "bin";
}

async function migrate() {
  const rows = await db.query(`
    SELECT id, linkAnh
    FROM giayuyquyen
    WHERE linkAnh LIKE 'data:%'
    LIMIT 50
  `);

  for (const r of rows) {
    try {
      const parsed = parseBase64(r.linkAnh);
      if (!parsed) continue;

      const ext = detectExt(parsed.mime, parsed.buffer);
      const fileName = `${uuidv4()}.${ext}`;

      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, fileName), parsed.buffer);

      await db.query(
        "UPDATE giayuyquyen SET linkAnh = ? WHERE id = ?",
        [fileName, r.id]
      );

      console.log("✔ migrated id", r.id);
    } catch (e) {
      console.error("❌ failed id", r.id, e);
    }
  }

  process.exit();
}

migrate();
