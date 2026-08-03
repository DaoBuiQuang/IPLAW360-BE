import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
// import { sequelize } from "../config/db.js";

import { addAuditHooks } from "../addAuditHooks.js";
import { Affidavit } from "../affidavitModel.js";

export const TaiLieuAffidavit = sequelize.define("TaiLieuAffidavit", {
    maTaiLieu: {  
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    idAffidavit: {  
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model:Affidavit,
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
    tableName: "TaiLieuAffidavit",
});

addAuditHooks(TaiLieuAffidavit);