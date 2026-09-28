import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

/**
 * Model NhomNhanSu (Team / Nhóm nhân sự)
 * - managerCode: mã nhân sự là Manager/Trưởng nhóm
 * - maNhanSu: mã nhân sự thành viên
 * Quan hệ: một manager có nhiều thành viên (1-N)
 */
export const NhomNhanSu = sequelize.define("NhomNhanSu", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    managerCode: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Mã nhân sự là Manager (trưởng nhóm)",
    },
    maNhanSu: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Mã nhân sự thành viên trong nhóm",
    },
    tenNhom: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Tên nhóm (tuỳ chọn)",
    },
}, {
    timestamps: true,
    tableName: "NhomNhanSu",
    indexes: [
        { fields: ["managerCode"] },
        { fields: ["maNhanSu"] },
        { unique: true, fields: ["managerCode", "maNhanSu"] },
    ],
});
