import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { DoiTac } from "./doiTacModel.js";

export const TuVanChung_VN = sequelize.define("TuVanChung_VN", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    maHoSo: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    idKhachHang: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: KhachHangCuoi,
            key: "id",
        },
    },
    idDoiTac: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: DoiTac,
            key: "id",
        },
    },
    noiDung: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    deadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    softDeadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayXuLy: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayHoanThanh: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    trangThai: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "TuVanChung_VN",
});
addAuditHooks(TuVanChung_VN);