import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";

export const NganhNghe = sequelize.define("NganhNghe", {
    maNganhNghe: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    tenNganhNghe: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    timestamps: true,
    tableName: "NganhNghe",
});

addAuditHooks(NganhNghe);