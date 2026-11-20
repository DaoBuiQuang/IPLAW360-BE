import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
import { DonSuaDoi_NH_VN } from "./donSuaDoiNH_VNModel.js";

/**
 * Lịch sử vòng phản hồi với Cục SHTT cho Đơn sửa đổi NH VN (1-N).
 * Mỗi bản ghi = 1 vòng: Cục gửi thông báo thiếu sót -> Công ty trả lời.
 */
export const LichSuPhanHoiSuaDoi_NH_VN = sequelize.define(
    "LichSuPhanHoiSuaDoi_NH_VN",
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        idDonSuaDoi: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: DonSuaDoi_NH_VN, key: "id" },
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
        tableName: "LichSuPhanHoiSuaDoi_NH_VN",
        // Index idx_ls_ph_sd_iddonsuadoi / idx_ls_ph_sd_hantraloi: xem migration + syncDatabase()
    }
);
