import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";
import { DonDangKyNhanHieu_KH } from "../KH/donDangKyNhanHieu_KHModel.js";
import { KhachHangCuoi } from "../khanhHangCuoiModel.js";

/**
 * Đơn Chuyển quyền sở hữu Đơn đăng ký nhãn hiệu Campuchia (tương đồng 1:1 với DonCQSH_VN).
 */
export const DonCQSH_KH = sequelize.define(
    "DonCQSH_KH",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        maHoSo: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        maDonDangKy: {
            type: DataTypes.STRING,
            allowNull: true,
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
        idKhachHang: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: KhachHangCuoi,
                key: "id",
            },
        },
        soDon: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        loaiThayDoi: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: "CHUYEN_NHUONG",
            comment: "CHUYEN_NHUONG | THUA_KE_KE_THUA",
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
            defaultValue: 1,
        },
        trangThaiDuyet: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0: Chưa chấp thuận, 1: Được chấp thuận, 2: Từ chối",
        },
        ngayChapThuan: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        ngayTuChoi: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        lyDoTuChoi: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        duLieuThayDoi: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        giayUyQuyenGoc: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        maUyQuyen: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        idGUQ: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "GiayUyQuyen", key: "id" },
            onDelete: "SET NULL",
        },
        hanTraLoi: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        tuDongTuChoi: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        maNhanSuCapNhap: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isAutoImport: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: true,
        tableName: "DonCQSH_KH",
    }
);

export const DonCQSH_NH_KH = DonCQSH_KH;
