import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";
export const QuocGia = sequelize.define("QuocGia", {
    maQuocGia: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    tenQuocGia: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    linkAnh: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
    maNhanSuCapNhap: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "QuocGia",
});
// QuocGia.hasMany(DoiTac, {
//     foreignKey: "maQuocGia",
//     as: "doiTac",
// });

addAuditHooks(QuocGia);