import { DataTypes } from "sequelize";
// import { sequelize } from "../../../config/db.js";
import { sequelize } from "../../config/db.js";

import { DonDangKy } from "../donDangKyModel.js";
import { GCN_NH } from "../GCN_NHModel.js";

export const DonSuaDoiGCN_NH_VN = sequelize.define("DonSuaDoiGCN_NH_VN", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    idGCN_NH: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: GCN_NH,
            key: "id",
        },
    },
    idGCN_NH_Goc: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: GCN_NH,
            key: "id",
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
    suaDoiTenChuBang: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ndSuaDoiTenChuBang: {
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
    suaDoiNoiDungKhac: {
        type: DataTypes.BOOLEAN,
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
    tableName: "DonSuaDoiGCN_NH_VN",
});
