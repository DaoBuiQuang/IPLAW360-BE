import { DataTypes } from "sequelize";
// import { sequelize } from "../../../config/db.js";
import { sequelize } from "../../config/db.js";
import { HoSo_VuViec } from "../hoSoVuViecModel.js";
import { NhanHieu } from "../nhanHieuModel.js";
import { KhachHangCuoi } from "../khanhHangCuoiModel.js";
import { DoiTac } from "../doiTacModel.js";
import { NhanSu } from "../nhanSuModel.js";
import { GCN_NH_KH } from "../GCN_NH_KHModel.js";
import { GiayUyQuyen } from "../GiayUyQuyenModel.js";

export const DonDangKyNhanHieu_KH = sequelize.define("DonDangKyNhanHieu_KH", {
    // id: {
    //     type: DataTypes.INTEGER,
    //     autoIncrement: true,
    //     primaryKey: true,
    // },
    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        unique: true,
    },
    loaiDon: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '1: Đăng ký mới, 2: Đơn sửa đổi, 3: Đơn tách',
    },
    idKhachHang: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: KhachHangCuoi,
            key: "id",
        },
    },
    idDoiTac: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: DoiTac,
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
        type: DataTypes.TEXT,
        allowNull: true,
    },
    donGoc: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
        allowNull: false,
        unique: true,
        references: {
            model: HoSo_VuViec,
            key: "maHoSoVuViec",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    maNhanHieu: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: NhanHieu,
            key: "maNhanHieu",
        },
    },
    idGCN_NH: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: GCN_NH_KH,
            key: "id",
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
    ngayKQThamDinh_DuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinh_DK_SauKN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ngayKQThamDinh: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    ///
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
    maUyQuyen: {
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
    tableName: "DonDangKyNhanHieu_KH",
});
