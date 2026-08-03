import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { DonDangKy } from "./donDangKyModel.js";
import { addAuditHooks } from "./addAuditHooks.js";

export const TaiLieu = sequelize.define("TaiLieu", {
    maTaiLieu: {  
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maDonDangKy: {  
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKy,
            key: "maDonDangKy",
        },
    },
    tenTaiLieu: { 
        type: DataTypes.STRING,
        allowNull: true,
    },
    linkTaiLieu: {  
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
    trangThai: {  
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "TaiLieu",
});

addAuditHooks(TaiLieu);