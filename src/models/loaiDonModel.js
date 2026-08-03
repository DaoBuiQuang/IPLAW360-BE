import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";

export const LoaiDon = sequelize.define("LoaiDon", {
    maLoaiDon: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    tenLoaiDon: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    moTa: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: "LoaiDon",
});
addAuditHooks(LoaiDon);