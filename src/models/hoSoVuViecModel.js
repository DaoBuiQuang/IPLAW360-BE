import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { DoiTac } from "./doiTacModel.js";
import { NhanSu } from "./nhanSuModel.js";
import { QuocGia } from "./quocGiaModel.js";
import { LoaiVuViec } from "./loaiVuViecModel.js";
import { LoaiDon } from "./loaiDonModel.js";
import { addAuditHooks } from "./addAuditHooks.js";

export const HoSo_VuViec = sequelize.define("HoSo_VuViec", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maHoSoVuViec: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    maKhachHang: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: KhachHangCuoi,
            key: "maKhachHang",
        },
    },
    maDoiTac: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: DoiTac,
            key: "maDoiTac",
        },
    },
    noiDungVuViec: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ngayTiepNhan: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    ngayXuLy: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    maLoaiVuViec: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: LoaiVuViec,
            key: "maLoaiVuViec",
        },
    },
    maLoaiDon: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: LoaiDon,
            key: "maLoaiDon",
        },
    },
    maQuocGiaVuViec: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: QuocGia,
            key: "maQuocGia",
        },
    },
    trangThaiVuViec: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayDongHS: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayRutHS: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    buocXuLyHienTai: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    maNguoiTao: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: NhanSu,
            key: "maNhanSu",
        },
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
    tableName: "HoSo_VuViec",
});

addAuditHooks(HoSo_VuViec);