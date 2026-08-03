import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { addAuditHooks } from "./addAuditHooks.js";
import { DonDangKyKD_VN } from "./donDangKyKD_VNModel.js";

export const lichSuThamDinhKD_VN = sequelize.define("lichSuThamDinhKD_VN", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKyKD_VN,
            key: "maDonDangKy",
        },
    },
    loaiThamDinh: {
        type: DataTypes.ENUM('HinhThuc', 'NoiDung'),
        allowNull: false,
    },
    lanThamDinh: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ngayNhanThongBaoTuChoiTD: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    ketQuaThamDinh: {
        type: DataTypes.ENUM('Dat', 'KhongDat'),
        allowNull: false,
    },
    hanTraLoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    giaHan: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    ngayGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanTraLoiGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayTraLoiThongBaoTuChoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    trangThaiBiNhanQuyetDinhTuChoi: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    ngayNhanQuyetDinhTuChoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanKhieuNaiCSHTT: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKhieuNaiCSHTT: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ketQuaKhieuNaiCSHTT: {
        type: DataTypes.ENUM('ThatBai', 'ThanhCong'),
        allowNull: true,
    },
    ngayKQ_KN_CSHTT: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ghiChuKetQuaKNCSHTT: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    hanKhieuNaiBKHCN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKhieuNaiBKHCN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ketQuaKhieuNaiBKHCN: {
        type: DataTypes.ENUM('ThatBai', 'ThanhCong'),
        allowNull: true,
    },
    ngayKQ_KN_BKHCN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ghiChuKetQuaKNBKHCN: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ngayNopYeuCauSauKN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
}, {
    timestamps: true,
    tableName: "lichSuThamDinhKD_VN",
});
addAuditHooks(lichSuThamDinhKD_VN);
