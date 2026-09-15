import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const TimeSheet = sequelize.define("TimeSheet", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    employeeCode: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    caseCode: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    workDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: {
            min: 0.01,
            max: 24,
        },
    },
    activity: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    hourlyRate: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "DRAFT",
    },
    approvedBy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "TimeSheets",
    indexes: [
        { fields: ["employeeCode"] },
        { fields: ["caseCode"] },
        { fields: ["workDate"] },
        { fields: ["status"] },
    ],
});
