import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { NhanHieu } from "./nhanHieuModel.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { DoiTac } from "./doiTacModel.js";
import { NhanSu } from "./nhanSuModel.js";
import { GCN_NH_KH } from "./GCN_NH_KHModel.js";

export const Affidavit = sequelize.define("Affidavit", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    soAffidavit: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    idGCN_NH: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: GCN_NH_KH,
            key: "id",
        },
    },
    lanNop:{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    ngayNop:{
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayGhiNhan:{
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ghiChu:{
        type: DataTypes.TEXT,
        allowNull: true
    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, 
        comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
    }
}, {
    timestamps: true,
    tableName: "Affidavit",
});
