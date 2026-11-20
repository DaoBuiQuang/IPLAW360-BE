/**
 * Migration runner đơn giản cho thư mục /migrations (*.sql, chạy theo thứ tự tên file).
 *  - Mỗi file chạy đúng 1 lần, ghi vào bảng SchemaMigrations (kèm checksum).
 *  - Lỗi "đã tồn tại" (cột/index/FK/bảng) được bỏ qua => an toàn với DB đã bị thay đổi trước đó.
 *  - Mọi lỗi khác => dừng, KHÔNG ghi nhận file, thoát mã 1.
 * Dùng:  npm run migrate            (áp dụng các file chưa chạy)
 *        npm run migrate -- --status (xem trạng thái)
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { sequelize } from "../src/config/db.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const IGNORABLE = new Set([1050, 1060, 1061, 1826, 1022, 1091]); // table/col/key/fk exists, drop-missing
const statusOnly = process.argv.includes("--status");

const splitSql = (sql) =>
    sql
        .split(/\r?\n/)
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean);

// Map tên bảng thực tế trong DB (case-insensitive) để file .sql chạy an toàn cả Windows & Linux MySQL
const loadTableNameMap = async () => {
    const [rows] = await sequelize.query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );
    return new Map(rows.map((r) => [String(r.TABLE_NAME).toLowerCase(), String(r.TABLE_NAME)]));
};

const resolveTableNamesInSql = (sql, tableMap) =>
    sql.replace(
        /\b(TABLE(?:\s+IF\s+(?:NOT\s+)?EXISTS)?|FROM|JOIN|UPDATE|ON|INTO|REFERENCES)\s+`([^`]+)`/gi,
        (match, kw, name) => {
            const actual = tableMap.get(name.toLowerCase());
            return actual ? `${kw} \`${actual}\`` : match;
        }
    );

async function main() {
    await sequelize.authenticate();
    await sequelize.query(
        "CREATE TABLE IF NOT EXISTS `SchemaMigrations` (`name` VARCHAR(255) PRIMARY KEY, `checksum` CHAR(64) NOT NULL, `appliedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    const [rows] = await sequelize.query("SELECT name, checksum FROM `SchemaMigrations`");
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const tableMap = await loadTableNameMap();

    for (const file of files) {
        const sql = fs.readFileSync(path.join(dir, file), "utf8");
        const checksum = crypto.createHash("sha256").update(sql).digest("hex");
        if (applied.has(file)) {
            console.log(`${applied.get(file) === checksum ? "✔ đã áp dụng" : "⚠ đã áp dụng (file đã bị sửa sau đó)"}: ${file}`);
            continue;
        }
        if (statusOnly) { console.log(`… chưa áp dụng: ${file}`); continue; }

        console.log(`▶ Áp dụng: ${file}`);
        for (const rawStmt of splitSql(sql)) {
            const stmt = resolveTableNamesInSql(rawStmt, tableMap);
            try {
                await sequelize.query(stmt);
                // Cập nhật tableMap nếu vừa CREATE TABLE mới
                const created = stmt.match(/^\s*CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`([^`]+)`/i);
                if (created) tableMap.set(created[1].toLowerCase(), created[1]);
            } catch (e) {
                const code = e?.parent?.errno;
                if (IGNORABLE.has(code)) { console.log(`   (bỏ qua ${code}: ${e.parent.sqlMessage})`); continue; }
                console.error(`✖ Lỗi tại câu lệnh:\n${stmt.slice(0, 200)}\n${e.message}`);
                throw e;
            }
        }
        await sequelize.query("INSERT INTO `SchemaMigrations` (name, checksum) VALUES (:name, :checksum)", {
            replacements: { name: file, checksum },
        });
        console.log(`✔ Xong: ${file}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((e) => { console.error("Migration thất bại:", e.message); process.exit(1); });
