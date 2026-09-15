import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const DanhSachCongViec = sequelize.define(
  "DanhSachCongViec",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Mã viết tắt công việc (VD: "NĐ", "GQ") — tự động UPPER + trim trước khi lưu
    maVietTat: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "Mã viết tắt công việc, VD: NĐ, GQ",
    },
    // Mô tả đầy đủ của công việc
    moTa: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: "Mô tả chi tiết công việc",
    },
    // Nhân sự tạo ra danh mục này (FK → NhanSu.maNhanSu)
    maNhanSu: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Mã nhân sự tạo danh mục",
    },
    // deletedAt do Sequelize paranoid tự quản lý (soft delete)
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,   // createdAt, updatedAt
    paranoid: true,     // kích hoạt soft delete qua deletedAt
    tableName: "DanhSachCongViec",
    indexes: [
      { fields: ["maNhanSu"] },
      { fields: ["maVietTat"] },
      {
        // Mỗi nhân sự không được có 2 mã viết tắt trùng nhau (scope by maNhanSu)
        unique: true,
        fields: ["maNhanSu", "maVietTat"],
        name: "unique_nhanSu_maVietTat",
      },
    ],
    hooks: {
      // Chuẩn hóa maVietTat: trim + UPPER trước khi tạo mới
      beforeCreate: (record) => {
        if (record.maVietTat) {
          record.maVietTat = record.maVietTat.trim().toUpperCase();
        }
        if (record.moTa) {
          record.moTa = record.moTa.trim();
        }
      },
      // Chuẩn hóa maVietTat: trim + UPPER trước khi cập nhật
      beforeUpdate: (record) => {
        if (record.maVietTat) {
          record.maVietTat = record.maVietTat.trim().toUpperCase();
        }
        if (record.moTa) {
          record.moTa = record.moTa.trim();
        }
      },
    },
  }
);
