import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
// import { sequelize } from "../config/db.js";

import { addAuditHooks } from "../addAuditHooks.js";
import { DonDangKyNhanHieu_KH } from "./donDangKyNhanHieu_KHModel.js";

export const TaiLieu_KH = sequelize.define("TaiLieu_KH", {
    maTaiLieu: {  
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maDonDangKy: {  
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKyNhanHieu_KH,
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
    }
    
}, {
    timestamps: true,
    tableName: "TaiLieu_KH",
});

addAuditHooks(TaiLieu_KH);