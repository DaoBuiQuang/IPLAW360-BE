import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { LoaiVuViec } from "./loaiVuViecModel.js";
import { addAuditHooks } from "./addAuditHooks.js";
import { DoiTac } from "./doiTacModel.js";

export const VuViec = sequelize.define("VuViec", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    maHoSo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    maDon: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    idKhachHang: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: KhachHangCuoi,
            key: "id",
        },
    },
    idDoiTac: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: DoiTac,
            key: "id",
        },
    },
    soDon: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    maQuocGiaVuViec: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    tenVuViec: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    moTa: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    clientsRef: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayTaoVV: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    deadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    softDeadline: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    maNguoiXuLy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    soTien: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
    },
    loaiTienTe: {
        type: DataTypes.ENUM("VND", "USD"),
        allowNull: true,
        comment: "Loại tiền tệ"
    },

    xuatBill: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    trangThaiYCTT: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "0=Chưa đề nghị, 1=Chờ duyệt, 2=Từ chối, 3=Đã duyệt",
        validate: {
            isIn: [[0, 1, 2, 3]]
        }
    },
    ghiChuTuChoi:{
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ngayXuatBill: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },

    maNguoiXuatBill: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayDebitNote: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    maDebitNote: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    maLoaiVuViec: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: LoaiVuViec,
            key: "maLoaiVuViec",
        },
    },
    tenBang: {
        type: DataTypes.STRING,
        allowNull: true
    },
    trangThaiDebitNote: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    maNhanSuCapNhap: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isMainCase: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Đánh dấu đây có phải vụ việc chính hay không"
    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // false = nhập tay, true = nhập máy
        comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
    }
}, {
    timestamps: true,
    tableName: "VuViec",
});

addAuditHooks(VuViec);