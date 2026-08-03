import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { DebitNote } from "./debitNote.js";
import { HoSo_VuViec } from "../hoSoVuViecModel.js";
export const Bill = sequelize.define("Bill", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maHoSoVuViec: {
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
    idDebitNote: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: DebitNote,
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    ngayGuiYeuCau: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanGuiYeuCau: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayTao: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    qly: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
    noiDung: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    denghirabill
}, {
    timestamps: true,
    tableName: "Bill",
});
