import { DataTypes } from "sequelize";
// import { sequelize } from "../../../config/db.js";
import { sequelize } from "../../config/db.js";
import { DonDangKyNhanHieu_KH } from "../KH/donDangKyNhanHieu_KHModel.js";


export const DonSuaDoi_NH_KH = sequelize.define("DonSuaDoi_NH_KH", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKyNhanHieu_KH,
            key: "maDonDangKy",
        },
    },
    maDonDangKyGoc: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKyNhanHieu_KH,
            key: "maDonDangKy",
        },
    },
    soDon: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayYeuCau: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    suaDoiDaiDien: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ndSuaDoiDaiDien: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    suaDoiTenChuDon: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ndSuaDoiTenChuDon: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    suaDoiDiaChi: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ndSuaDoiDiaChi: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    suaNhan: {
        type: DataTypes.BOOLEAN,
        allowNull: true,

    },
    ndSuaNhan: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    suaNhomSPDV: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ndSuaNhomSPDV: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    suaDoiNoiDungKhac: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    moTa: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ngayGhiNhanSuaDoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    duocGhiNhanSuaDoi: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    lanSuaDoi: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Lần sửa đổi, mặc định lần đầu là 0, lần sửa đổi đầu tiên là 1, lần sửa đổi thứ hai là 2,...'
    },
    maNhanSuCapNhap: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // false = nhập tay, true = nhập máy
        comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
    }
}, {
    timestamps: true,
    tableName: "DonSuaDoi_NH_KH",
    charset: 'utf8mb4',
    collate: 'utf8mb4_0900_ai_ci',
});
