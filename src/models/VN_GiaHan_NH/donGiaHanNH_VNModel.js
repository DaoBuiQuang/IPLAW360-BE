import { DataTypes } from "sequelize";
// import { sequelize } from "../../../config/db.js";
import { sequelize } from "../../config/db.js";
import { GCN_NH } from "../GCN_NHModel.js";

export const DonGiaHan_NH_VN = sequelize.define("DonGiaHan_NH_VN", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    idGCN_NH: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "gcn_nh",
            key: "id",
        },
    },
    soDon: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    hanTraLoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanXuLy: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayNopYCGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    donGoc: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    ngayKQThamDinh_DuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    trangThaiThamDinh: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ngayKQThamDinh: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayThongBaoTuChoiGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanTraLoiTuChoiGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayTraLoiThongBaoTuChoiGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    trangThaiTuChoiGiaHan: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    },
    ngayQuyetDinhTuChoiGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayQuyetDinhGiaHan_DuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayQuyetDinhGiaHan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayDangBa: {
        type: DataTypes.DATEONLY,
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
    tableName: "DonGiaHan_NH_VN",
});
