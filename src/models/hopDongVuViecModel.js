import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { HoSo_VuViec } from "./hoSoVuViecModel.js";

export const HopDongVuViec = sequelize.define("HopDongVuViec", {
    maHopDong: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    maHoSoVuViec: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: HoSo_VuViec,
            key: "maHoSoVuViec",
        },
    },
    ngayKy: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    moTaHopDong: {
        type: DataTypes.STRING(255),
        allowNull: true,
         unique: true,
    },
    noiDungThanhToan: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    hanThanhToan: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    trangThaiThanhToan: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, 
    },
}, {
    timestamps: true,
    tableName: "HopDongVuViec",
});
