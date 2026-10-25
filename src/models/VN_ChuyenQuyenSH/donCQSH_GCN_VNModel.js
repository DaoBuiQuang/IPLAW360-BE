import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
import { GCN_NH } from "../GCN_NHModel.js";
import { KhachHangCuoi } from "../khanhHangCuoiModel.js";

export const DonCQSH_GCN_VN = sequelize.define("DonCQSH_GCN_VN", {
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
        comment: "ID Giấy chứng nhận mới sau khi chuyển quyền",
    },
    idGCN_NH_Goc: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: GCN_NH,
            key: "id",
        },
        comment: "ID Giấy chứng nhận gốc ban đầu",
    },
    idKhachHang: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: KhachHangCuoi,
            key: "id",
        },
        comment: "Khách hàng nhận chuyển quyền",
    },
    soDon: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Số đơn / hồ sơ yêu cầu chuyển quyền",
    },
    noiDung: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    moTa: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ngayYeuCau: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayGhiNhanCQ: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    lanChuyenQuyen: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "Lần chuyển quyền, mặc định 0, lần đầu là 1,...",
    },
    maNhanSuCapNhap: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Phân biệt dữ liệu nhập tay hoặc nhập tự động",
    },
}, {
    timestamps: true,
    tableName: "DonCQSH_GCN_VN",
});
