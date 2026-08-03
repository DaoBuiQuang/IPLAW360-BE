import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { NhanSu } from "./nhanSuModel.js";
import { HoSo_VuViec } from "./hoSoVuViecModel.js";
import { addAuditHooks } from "./addAuditHooks.js";


export const NhanSu_VuViec = sequelize.define("NhanSu_VuViec", {
    maHoSoVuViec: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: HoSo_VuViec,
            key: "maHoSoVuViec",
        },
    },
    maNhanSu: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: NhanSu,
            key: "maNhanSu",
        },
    },
    vaiTro: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ngayGiaoVuViec: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, 
    }
}, {
    timestamps: true,
    tableName: "nhansu_vuviec",
});
addAuditHooks(NhanSu_VuViec);