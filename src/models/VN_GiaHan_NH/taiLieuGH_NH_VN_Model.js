import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
// import { sequelize } from "../config/db.js";

import { addAuditHooks } from "../addAuditHooks.js";
import { DonGiaHan_NH_VN } from "./donGiaHanNH_VNModel.js";

export const TaiLieuGH_NH_VN = sequelize.define("TaiLieuGH_NH_VN", {
    maTaiLieu: {  
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    idDonGiaHan: {  
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: DonGiaHan_NH_VN,
            key: "id",
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
    tableName: "TaiLieuGH_NH_VN",
});

addAuditHooks(TaiLieuGH_NH_VN);