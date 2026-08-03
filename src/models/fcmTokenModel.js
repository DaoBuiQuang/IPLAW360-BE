// models/fcmTokenModel.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { NhanSu } from "./nhanSuModel.js";

export const FCMToken = sequelize.define("FCMToken", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  maNhanSu: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: NhanSu,
      key: "maNhanSu",
    },
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: "fcmtokens",
});
