import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { NhanSu } from "./nhanSuModel.js";

export const Auth = sequelize.define("Auth", {
    AuthID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maNhanSu: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: NhanSu,
            key: "maNhanSu",
        },
        onDelete: "CASCADE",
    },
    Username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    PasswordHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Role: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Token: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "Auth",
});
