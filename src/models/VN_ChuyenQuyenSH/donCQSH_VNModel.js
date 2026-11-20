import { DataTypes } from "sequelize";
// import { sequelize } from "../../../config/db.js";
import { sequelize } from "../../config/db.js";

import { DonDangKy } from "../donDangKyModel.js";
import { KhachHangCuoi } from "../khanhHangCuoiModel.js";

export const DonCQSH_VN = sequelize.define("DonCQSH_VN", {
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
            model: DonDangKy,
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
    maDonDangKyGoc: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKy,
            key: "maDonDangKy",
        },
    },
    soDon: {
        type: DataTypes.STRING,
        allowNull: true,
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
    },
    trangThaiDuyet: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0: Chưa chấp thuận, 1: Được chấp thuận, 2: Từ chối'
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
    loaiThayDoi: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "CHUYEN_NHUONG",
        comment: "CHUYEN_NHUONG | THUA_KE_KE_THUA",
    },
    giayUyQuyenGoc: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        comment: "GUQ bản gốc (1) / bản sao (0)",
    },
    maUyQuyen: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Số đơn chứa GUQ gốc nếu dùng bản sao",
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
        comment: "Hạn trả lời Cục hiện hành của vòng thông báo mới nhất chưa trả lời",
    },
    tuDongTuChoi: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "1 = hệ thống tự chuyển Từ chối do quá hạn trả lời",
    },
}, {
    timestamps: true,
    tableName: "DonCQSH_VN",
});

export const DonCQSH_NH_VN = DonCQSH_VN;
