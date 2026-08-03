import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

import { addAuditHooks } from "../addAuditHooks.js";
import { DonDangKyNhanHieu_KH } from "./donDangKyNhanHieu_KHModel.js";

export const LichSuThamDinh_KH = sequelize.define("LichSuThamDinh_KH", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKyNhanHieu_KH,
            key: "maDonDangKy",
        },
    },
    lanThamDinh: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ngayNhanThongBaoTuChoiTD: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    ketQuaThamDinh: {
        type: DataTypes.ENUM('Dat', 'KhongDat'),
        allowNull: false,
    },
    hanTraLoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    giaHan: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    ngayGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanTraLoiGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayTraLoiThongBaoTuChoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "LichSuThamDinh_KH",
});
addAuditHooks(LichSuThamDinh_KH);
