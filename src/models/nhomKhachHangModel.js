import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";
export const NhomKhachHang = sequelize.define("NhomKhachHang", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maNhom: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    tenNhom: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    moTa: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    maNhanSuCapNhap: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    daXoa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },

}, {
    timestamps: true,
    tableName: "NhomKhachHang",
});
addAuditHooks(NhomKhachHang);
