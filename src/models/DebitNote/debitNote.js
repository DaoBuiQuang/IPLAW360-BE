import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";


export const DebitNote = sequelize.define("DebitNote", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    idKhachHang: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        references: {
            model: HoSo_VuViec,
            key: "maHoSoVuViec",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    ngayTao: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        unique: true,
    },
    price: {
        type: DataTypes.DECIMAL(15, 2), // số tiền, lưu chính xác
        allowNull: true,
    },
    vat: {
        type: DataTypes.DECIMAL(5, 2), // phần trăm VAT, vd 10.00 (%)
        allowNull: true,
    },
    total: {
        type: DataTypes.DECIMAL(15, 2), // tổng tiền
        allowNull: true,
    },
    ngayThanhToan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    noiDung: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "DebitNote",
});
