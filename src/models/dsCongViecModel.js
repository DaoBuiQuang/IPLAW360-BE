import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const DanhSachCongViec = sequelize.define("DanhSachCongViec", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  maVietTat: {
    // Ma Viet Tat of Cong Viec
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  trangThai: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});
