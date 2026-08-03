import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { DonDangKy } from "./donDangKyModel.js";
import { SanPham_DichVu } from "./sanPham_DichVuModel.js";

export const DonDK_SPDV = sequelize.define("DonDK_SPDV", {
    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKy,
            key: "maDonDangKy",
        },
    },
    maSPDV: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: SanPham_DichVu,
            key: "maSPDV",
        },
    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // false = nhập tay, true = nhập máy
        comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
    }
}, {
    timestamps: true,
    tableName: "DonDK_SPDV",
});
