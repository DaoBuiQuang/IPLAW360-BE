import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

import { addAuditHooks } from "../addAuditHooks.js";
import { LichSuThamDinh_KH } from "./lichSuThamDinh_KHModel.js";
import { DonDangKyNhanHieu_KH } from "./donDangKyNhanHieu_KHModel.js";

export const LichSuGiaHan_KH = sequelize.define("LichSuGiaHan_KH", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    idLichSuThamDinh: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: LichSuThamDinh_KH,
            key: "id",
        },
    },
    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKyNhanHieu_KH,
            key: "maDonDangKy",
        },
    },
    lanGiaHan: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    ngayYeuCauGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayCapGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanTraLoiGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "LichSuGiaHan_KH",
});
addAuditHooks(LichSuGiaHan_KH);
