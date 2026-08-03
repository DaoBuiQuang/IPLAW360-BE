import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";

export const NhanHieu = sequelize.define("NhanHieu", {
  maNhanHieu: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tenNhanHieu: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  moTa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  linkAnh: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  isAutoImport: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, 
    comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
  }
}, {
  timestamps: true,
  tableName: "NhanHieu",
});

addAuditHooks(NhanHieu);