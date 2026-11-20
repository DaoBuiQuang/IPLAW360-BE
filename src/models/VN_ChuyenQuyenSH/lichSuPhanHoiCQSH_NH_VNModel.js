import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
import { DonCQSH_VN } from "./donCQSH_VNModel.js";

/**
 * Lịch sử vòng phản hồi với Cục SHTT cho Đơn chuyển quyền sở hữu NH VN (1-N).
 */
export const LichSuPhanHoiCQSH_NH_VN = sequelize.define(
    "LichSuPhanHoiCQSH_NH_VN",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        idDonCQSH: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: DonCQSH_VN, key: "id" },
            onDelete: "CASCADE",
        },
        lanThongBao: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        soThongBao: { type: DataTypes.STRING, allowNull: true },
        ngayNhanThongBao: { type: DataTypes.DATEONLY, allowNull: false },
        hanTraLoi: { type: DataTypes.DATEONLY, allowNull: false },
        noiDungThongBao: { type: DataTypes.TEXT, allowNull: true },
        tenFileThongBao: { type: DataTypes.STRING, allowNull: true },
        linkFileThongBao: { type: DataTypes.TEXT("long"), allowNull: true },
        ngayTraLoi: { type: DataTypes.DATEONLY, allowNull: true },
        noiDungTraLoi: { type: DataTypes.TEXT, allowNull: true },
        tenFileTraLoi: { type: DataTypes.STRING, allowNull: true },
        linkFileTraLoi: { type: DataTypes.TEXT("long"), allowNull: true },
        maNhanSuCapNhap: { type: DataTypes.STRING, allowNull: true },
    },
    {
        timestamps: true,
        tableName: "LichSuPhanHoiCQSH_NH_VN",
    }
);
