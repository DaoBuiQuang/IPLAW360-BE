import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const AuditLog = sequelize.define("AuditLog", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tableName: { type: DataTypes.STRING, allowNull: false },
  recordId: { type: DataTypes.STRING, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false }, // CREATE, UPDATE, DELETE
  oldData: { type: DataTypes.JSON, allowNull: true },
  newData: { type: DataTypes.JSON, allowNull: true },
  changedBy: { type: DataTypes.STRING, allowNull: true },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "AuditLog",
  timestamps: false,
});
