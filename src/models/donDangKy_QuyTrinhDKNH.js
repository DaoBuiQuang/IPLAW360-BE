import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { DonDangKy } from "./donDangKyModel.js";

export const DonDangKy_QuyTrinhDKNH = sequelize.define("DonDangKy_QuyTrinhDKNH", {
    maDonDangKy_QuyTrinh: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKy,
            key: 'maDonDangKy'
        }
    },
    ngayNopDon: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    ngayHoanThanhHoSoTaiLieu_DuKien: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayHoanThanhHoSoTaiLieu: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    trangThaiHoanThienHoSoTaiLieu: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayKQThamDinhHinhThuc_DuKien: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayKQThamDinhHinhThuc: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayTraLoiKQTuChoiThamDinhHinhThuc:{
        type: DataTypes.DATE,
        allowNull: true,
    },
    giaHanTraLoiKQTuChoiThamDinhHinhThuc:{
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ngayCongBoDonDuKien: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayCongBoDon: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayKQThamDinhND_DuKien: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayKetQuaThamDinhNoiDung: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayKQTraLoiThamDinhND_DuKien: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayKQTraLoiThamDinhND: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayTraLoiKQTuChoiThamDinhND:{
        type: DataTypes.DATE,
        allowNull: true,
    },
    giaHanTraLoiKQTuChoiThamDinhNoiDung:{
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ngayThongBaoCapBang: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayNopPhiCapBang: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayNhanBang: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ngayGuiBangChoKhachHang: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: "DonDangKy_QuyTrinhDKNH",
});
