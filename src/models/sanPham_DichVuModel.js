import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";

export const SanPham_DichVu = sequelize.define("SanPham_DichVu", {
    maSPDV: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    tenSPDV: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    moTa:{
        type: DataTypes.TEXT('long'),
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: "SanPham_DichVu",
});

addAuditHooks(SanPham_DichVu);