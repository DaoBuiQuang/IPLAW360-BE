import { sequelize } from "../config/db.js";
import { DonDangKyNhanHieu_KH } from "../models/KH/donDangKyNhanHieu_KHModel.js";
import { DonSuaDoi_NH_KH } from "../models/KH_SuaDoi_NH/donSuaDoiNH_KHModel.js";
import { DonTachNH_KH } from "../models/KH/donTachNH_KHModel.js";

/**
 * Migration backfill loaiDon cho DonDangKyNhanHieu_KH:
 * - Bản ghi thuộc DonSuaDoi_NH_KH và đang NULL/0 -> 2
 * - Bản ghi thuộc DonTachNH_KH và đang NULL/0 -> 3
 * - Bản ghi còn lại đang NULL/0 -> 1 (Đơn gốc)
 */
async function run() {
    console.log("🚀 Bắt đầu migration backfill loaiDon cho DonDangKyNhanHieu_KH...");
    const transaction = await sequelize.transaction();
    try {
        const donKhTbl = DonDangKyNhanHieu_KH.getTableName();
        const sdKhTbl = DonSuaDoi_NH_KH.getTableName();
        const tachKhTbl = DonTachNH_KH.getTableName();

        const [resSD] = await sequelize.query(
            `
            UPDATE \`${donKhTbl}\` d
            INNER JOIN \`${sdKhTbl}\` sd ON d.\`maDonDangKy\` = sd.\`maDonDangKy\`
            SET d.\`loaiDon\` = 2
            WHERE d.\`loaiDon\` IS NULL OR d.\`loaiDon\` = 0;
            `,
            { transaction }
        );

        const [resTD] = await sequelize.query(
            `
            UPDATE \`${donKhTbl}\` d
            INNER JOIN \`${tachKhTbl}\` td ON d.\`maDonDangKy\` = td.\`maDonDangKy\`
            SET d.\`loaiDon\` = 3
            WHERE d.\`loaiDon\` IS NULL OR d.\`loaiDon\` = 0;
            `,
            { transaction }
        );

        const [resGoc] = await sequelize.query(
            `
            UPDATE \`${donKhTbl}\` d
            LEFT JOIN \`${sdKhTbl}\` sd ON d.\`maDonDangKy\` = sd.\`maDonDangKy\`
            LEFT JOIN \`${tachKhTbl}\` td ON d.\`maDonDangKy\` = td.\`maDonDangKy\`
            SET d.\`loaiDon\` = 1
            WHERE (d.\`loaiDon\` IS NULL OR d.\`loaiDon\` = 0)
              AND sd.\`maDonDangKy\` IS NULL
              AND td.\`maDonDangKy\` IS NULL;
            `,
            { transaction }
        );

        await transaction.commit();
        console.log(
            `✅ Hoàn tất backfill loaiDon: đơn sửa đổi=${resSD?.affectedRows ?? 0}, đơn tách=${resTD?.affectedRows ?? 0}, đơn gốc=${resGoc?.affectedRows ?? 0}.`
        );
        process.exit(0);
    } catch (error) {
        await transaction.rollback();
        console.error("❌ Migration backfill loaiDon thất bại:", error);
        process.exit(1);
    }
}

run();
