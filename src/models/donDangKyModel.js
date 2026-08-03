import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { NhanHieu } from "./nhanHieuModel.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { DoiTac } from "./doiTacModel.js";
import { NhanSu } from "./nhanSuModel.js";
import { GCN_NH } from "./GCN_NHModel.js";
import { GiayUyQuyen } from "./GiayUyQuyenModel.js";

export const DonDangKy = sequelize.define("DonDangKy", {
    maDonDangKy: {
        type: DataTypes.STRING(255),
        allowNull: false,
        primaryKey: true,
    },

    loaiDon: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '1: Đăng ký mới, 2: Đơn sửa đổi, 3: Đơn tách',
    },
    donGoc: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    idGCN_NH: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: GCN_NH,
            key: "id",
        },
    },
    idGUQ: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: GiayUyQuyen,
            key: "id",
        },
    },
    daiDienSHTT: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    maHoSo: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    clientsRef: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ngayTiepNhan: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
    ngayXuLy: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW,
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
    soDon: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    maHoSoVuViec: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },

    maNhanHieu: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: NhanHieu,
            key: "maNhanHieu",
        },
    },
    trangThaiDon: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    hanTraLoi: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    hanXuLy: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    buocXuLy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ngayNopDon: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayHoanThanhHoSoTaiLieu_DuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayHoanThanhHoSoTaiLieu: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinhHinhThuc_DuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinhHinhThuc_DK_SauKN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinhHinhThuc: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayCongBoDonDuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayCongBoDon: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinhND_DuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinhND_DK_SauKN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinhND: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    trangThaiTraLoiKQThamDinhND: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ngayTraLoiKQThamDinhND_DuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayTraLoiKQThamDinhND: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayThongBaoCapBang: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    trangThaiDYTBCapBang: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    ///
    hanNopYKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayNopYKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayNhanKQYKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ketQuaYKien: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    hanNopPhiCapBang: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayNopPhiCapBang: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayNhanBang: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayGuiBangChoKhachHang: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    soBang: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    quyetDinhSo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ngayCapBang: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayHetHanBang: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    maNhanSuCapNhap: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    giayUyQuyenGoc: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    maUyQuyen: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Thông tin giấy ủy quyền nếu không có bản gốc đính kèm trong đơn',
    },
    daXoa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    hanExcel: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    maNguoiXuLy1: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: NhanSu,
            key: "maNhanSu",
        },
    },
    maNguoiXuLy2: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: NhanSu,
            key: "maNhanSu",
        },
    },
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // false = nhập tay, true = nhập máy
        comment: 'Phân biệt dữ liệu nhập tay hoặc nhập tự động'
    }
}, {
    timestamps: true,
    tableName: "DonDangKyNhanHieu",
});
