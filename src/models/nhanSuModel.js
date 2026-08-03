import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";

export const NhanSu = sequelize.define("NhanSu", {
    maNhanSu: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    hoTen: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    chucVu: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phongBan: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    sdt: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    ngayThangNamSinh: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    cccd: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    bangCap: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // maNhanSuCapNhap: {
    //     type: DataTypes.STRING,
    //     allowNull: true,
    // },
}, {
    timestamps: true,
    tableName: "NhanSu",
});

addAuditHooks(NhanSu);