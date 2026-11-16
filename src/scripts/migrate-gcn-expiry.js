import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import { GCN_NH } from "../models/GCN_NHModel.js";
import { GCN_NH_KH } from "../models/GCN_NH_KHModel.js";
import { resolveGCNDatesForSave } from "../utils/gcnDateHelper.js";

const backfillModel = async (Model, label, transaction) => {
    const rows = await Model.findAll({
        where: {
            ngayNopDon: { [Op.ne]: null },
            [Op.or]: [
                { ngayHetHanBang: { [Op.is]: null } },
                { hanGiaHan: { [Op.is]: null } },
            ],
        },
        attributes: ["id", "ngayNopDon", "ngayHetHanBang", "hanGiaHan"],
        transaction,
    });

    let updatedCount = 0;
    for (const row of rows) {
        const resolved = resolveGCNDatesForSave({
            ngayNopDon: row.ngayNopDon,
            ngayHetHanBang: row.ngayHetHanBang,
            hanGiaHan: row.hanGiaHan,
        });

        const patch = {};
        if (!row.ngayHetHanBang && resolved.ngayHetHanBang) {
            patch.ngayHetHanBang = resolved.ngayHetHanBang;
        }
        if (!row.hanGiaHan && resolved.hanGiaHan) {
            patch.hanGiaHan = resolved.hanGiaHan;
        }

        if (Object.keys(patch).length > 0) {
            await row.update(patch, { transaction });
            updatedCount++;
        }
    }

    console.log(`✅ [${label}] Đã cập nhật ${updatedCount}/${rows.length} bản ghi thiếu ngayHetHanBang/hanGiaHan.`);
    return updatedCount;
};

async function run() {
    console.log("🚀 Bắt đầu backfill ngayHetHanBang (ngayNopDon + 10 năm) & hanGiaHan (ngayNopDon + 9.5 năm)...");
    const transaction = await sequelize.transaction();
    try {
        await backfillModel(GCN_NH, "GCN_NH", transaction);
        await backfillModel(GCN_NH_KH, "GCN_NH_KH", transaction);
        await transaction.commit();
        console.log("🎉 Hoàn tất migration backfill ngày hết hạn bằng & hạn gia hạn!");
        process.exit(0);
    } catch (error) {
        await transaction.rollback();
        console.error("❌ Migration thất bại:", error);
        process.exit(1);
    }
}

run();

