import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

import { DonDangKy } from "../donDangKyModel.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { DoiTac } from "./doiTacModel.js";
import { NhanSu } from "./nhanSuModel.js";

export const DonDKBanQuyenTG_VH = sequelize.define("DonDKBanQuyenTG_VH", {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },

    maHoSo: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Mã hồ sơ nội bộ hệ thống"
    },

    maDonDangKy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: DonDangKy,
            key: "maDonDangKy",
        },
        comment: "Mã đơn đăng ký chung của hệ thống"
    },

    idKhachHang: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: KhachHangCuoi,
            key: "id",
        },
        comment: "Khách hàng cuối thực hiện đăng ký QTG"
    },

    idDoiTac: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: DoiTac,
            key: "id",
        },
        comment: "Đối tác (nếu có) cùng xử lý vụ việc"
    },

    maNhanSuCapNhap: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Nhân sự cập nhật cuối cùng"
    },

    trangThai: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: "1: Mới tạo, 2: Đang xử lý, 3: Hoàn tất, 4: Đã đóng"
    },

    // ===== THÔNG TIN TÁC PHẨM =====
    tenTacPham: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    loaiHinhTacPham: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    ngayHoanThanhTacPham: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },

    daCongBo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },

    ngayCongBo: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },

    diaDiemCongBo: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    hinhThucCongBo: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    linkCongBo: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    thongTinTacGia: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Danh sách tác giả nếu chưa tách bảng riêng"
    },

    thongTinChuSoHuu: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Danh sách chủ sở hữu nếu chưa tách bảng"
    },

    ghiChu: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    // ===== THÔNG TIN NHÂN SỰ PHỤ TRÁCH =====
    maNhanSu: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: NhanSu,
            key: "maNhanSu",
        },
        comment: "Nhân sự chính phụ trách hồ sơ"
    },

    // ===== THÔNG TIN NỘP CỤC BẢN QUYỀN =====
    maHoSoCuc: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Mã hồ sơ trên cổng dịch vụ công"
    },

    ngayNopCuc: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Ngày nộp hồ sơ lên Cục Bản quyền"
    },

    hanTraKQDuKien: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Thời hạn trả kết quả dự kiến Cục đưa ra"
    },

    trangThaiCuc: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Trạng thái hồ sơ tại Cục: dang_thu_ly / yeu_cau_bo_sung / da_cap_gcn / tu_choi"
    },

    coYeuCauBoSung: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "Cục có yêu cầu bổ sung tài liệu hay không"
    },

    hanBoSungGanNhat: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Hạn cuối cùng để bổ sung tài liệu"
    },

    // ===== KẾT QUẢ GIẤY CHỨNG NHẬN =====
    duocCapGCN: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "Hồ sơ đã được Cục cấp GCN hay chưa"
    },

    soGCN: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Số Giấy chứng nhận Quyền tác giả"
    },

    ngayCapGCN: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Ngày cấp Giấy chứng nhận"
    },

    soDangKy: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Số đăng ký tác phẩm"
    },

    fileGCNUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Link file scan GCN"
    },

    fileTacPhamDongDauUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Link file tác phẩm bản sao có dấu"
    },

    // ===== HỆ THỐNG =====
    isAutoImport: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "false = nhập tay / true = hệ thống nhập tự động"
    },

}, {
    timestamps: true,
    tableName: "DonDKBanQuyenTG_VH",
});
