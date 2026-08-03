import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { QuocGia } from "./quocGiaModel.js";
import { LoaiVuViec } from "./loaiVuViecModel.js";
import { addAuditHooks } from "./addAuditHooks.js";
import { DoiTac } from "./doiTacModel.js";

export const DeNghiThanhToan = sequelize.define("DeNghiThanhToan", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    deBitNoteNo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Số Debit Note',
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
    maQuocGia: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: QuocGia,
            key: "maQuocGia",
        },
    },
      maHoSo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    yourRef: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Your Reference',
    },
    nguoiNhan: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Người nhận Debit Note',
    },
    tenKhachHang: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Tên khách hàng',
    },
    diaChiNguoiNhan: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Địa chỉ người nhận Debit Note',
    },
    email:
    {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Email người nhận Debit Note',
    },
    thue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Thuế của Debit Note',
    },
    tongTien: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Tổng tiền của Debit Note',
    },
    tongTienSauThue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Tổng tiền sau thuế của Debit Note',
    },
    loaiTienTe: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Loại tiền tệ (VD: VND, USD, EUR, ...)',
    },
    ngayGui: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        comment: 'Ngày gửi Debit Note',
    },
    ngayThanhToan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Ngày thanh toán Debit Note',
    },
    ngayGuiHoaDon:{
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Ngày gửi hóa đơn',
    },
    ngayXuat: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Ngày xuất Debit Note',
    },
    ghiChu:{
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ghi chú thêm',

    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // false = nhập tay, true = nhập máy
        comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
    }
}, {
    timestamps: true,
    tableName: "DeNghiThanhToan",
});

addAuditHooks(DeNghiThanhToan);