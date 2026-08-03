import { sequelize } from "../config/db.js";
import { NganhNghe } from "./nganhNgheModel.js";
import { QuocGia } from "./quocGiaModel.js";
import { DoiTac } from "./doiTacModel.js";
import { KhachHangCuoi } from "./khanhHangCuoiModel.js";
import { LoaiVuViec } from "./loaiVuViecModel.js";
import { NhanSu } from "./nhanSuModel.js";
import { HoSo_VuViec } from "./hoSoVuViecModel.js";
import { NhanSu_VuViec } from "./nhanSu_VuViecModel.js";
import { LoaiDon } from "./loaiDonModel.js";
import { DonDangKy } from "./donDangKyModel.js";
import { TaiLieu } from "./taiLieuModel.js";
import { Auth } from "./authModel.js";
import { NhanHieu } from "./nhanHieuModel.js";
import { SanPham_DichVu } from "./sanPham_DichVuModel.js";
import { HopDongVuViec } from "./hopDongVuViecModel.js";
import { LichSuThamDinh } from "./lichSuThamDinhModel.js";
import { Notification } from "./notificationModel.js";
import { FCMToken } from "./fcmTokenModel.js";
import { AuditLog } from "./auditLogModel.js";
// import { DonDangKy_BuocXuLy } from "./donDangKy_BuocXuLyModel.js";
// import { DonDangKy_QuyTrinhDKNH } from "./donDangKy_QuyTrinhDKNH.js";

import { DonDK_SPDV } from "./donDK_SPDVMolel.js";


////
import { DonDangKyNhanHieu_KH } from "./KH/donDangKyNhanHieu_KHModel.js";
import { TaiLieu_KH } from "./KH/taiLieuKH_Model.js";
import { LichSuThamDinh_KH } from "./KH/lichSuThamDinh_KHModel.js";
import { DonDK_SPDV_KH } from "./KH/donDK_SPDVModel_KHModel.js";
///
import { DonGiaHan_NH_VN } from "./VN_GiaHan_NH/donGiaHanNH_VNModel.js";
// import { DonGH_NH_VN_SPDV } from "./VN_GiaHan_NH/donGH_NH_VN_SPDVModel.js";
import { TaiLieuGH_NH_VN } from "./VN_GiaHan_NH/taiLieuGH_NH_VN_Model.js";
import { DonSuaDoi_NH_VN } from "./VN_SuaDoi_NH/donSuaDoiNH_VNModel.js";
///
// import { dataHSVVExcel } from "./Excel/dataHSVVExcel.js";
// import { dataHSVVExcel_ChuanHoa } from "./Excel/dataHSVVExcel_ChuanHoa.js";
// import { dataHSVVExcel_CanHieuChinh } from "./Excel/dataHSVVExcel_CanHieuChinh.js";
// import { dataHSVVExcel_ChuanHoa_VN } from "./Excel/dataHSVVExcel_ChuanHoa_VN.js";
// import { dataHSVVExcel_ChuanHoa_KH_DonMoi } from "./Excel/dataHSVVExcel_ChuanHoa_KH_DonMoi.js";

import { LichSuGiaHan_KH } from "./KH/lichSuGiaHan_KH.js";

import { VuViec } from "./vuViecModel.js";

import { DeNghiThanhToan } from "./DeNghiThanhToanModel.js";
import { DeNghiThanhToan_VuViec } from "./DeNghiThanhToan_VuViecModel.js";
import { GCN_NH } from "./GCN_NHModel.js";
import { GCN_NH_KH } from "./GCN_NH_KHModel.js";
import { Affidavit } from "./affidavitModel.js";
import { TaiLieuAffidavit } from "./KH/taiLieuAffidavitModel.js";

import { DonGiaHan_NH_KH } from "./KH_GiaHan/DonGiaHan_NH_KHModel.js";
import { TaiLieuGH_NH_KH } from "./KH_GiaHan/taiLieuGH_NH_KHModel.js";
import { NhomKhachHang } from "./nhomKhachHangModel.js";
import { DonSuaDoiGCN_NH_VN } from "./VN_SuaDoi_NH/donSuaDoiGCN_NH_VNModel.js";

import { TuVanChung_VN } from "./tuVanChung_VNModel.js";
import { TuVanChung_KH } from "./tuVanChung_KHModel.js";
import { DonSuaDoi_NH_KH } from "./KH_SuaDoi_NH/donSuaDoiNH_KHModel.js";
import { DonSuaDoiGCN_NH_KH } from "./KH_SuaDoi_NH/donSuaDoiGCN_NH_KHModel.js";
import { NguoiLienHe } from "./nguoiLienHeModal.js";
import { GiayUyQuyen } from "./GiayUyQuyenModel.js";
import { DonTachNH_VN } from "./VN_TachDon_NH/donTachNH_VNModel.js";
import { DonTachNH_KH } from "./KH_TachDon_NH/donTachNH_KHModel.js";
Auth.belongsTo(NhanSu, {
    foreignKey: 'maNhanSu',
    targetKey: 'maNhanSu',
    as: 'nhanSu',
});

NhanSu.hasOne(Auth, {
    foreignKey: 'maNhanSu',
    sourceKey: 'maNhanSu',
    as: 'Auth',
});

// ========= Quan hệ QuocGia và DoiTac =========
QuocGia.hasMany(DoiTac, { foreignKey: "maQuocGia", as: "doiTac" });
DoiTac.belongsTo(QuocGia, { foreignKey: "maQuocGia", as: "quocGia" });

// ========= Quan hệ KhachHangCuoi =========
KhachHangCuoi.belongsTo(DoiTac, { foreignKey: "maDoiTac", targetKey: "maDoiTac", as: "doiTac" });
KhachHangCuoi.belongsTo(QuocGia, { foreignKey: "maQuocGia", targetKey: "maQuocGia", as: "quocGia" });
KhachHangCuoi.belongsTo(NganhNghe, { foreignKey: "maNganhNghe", targetKey: "maNganhNghe", as: "nganhNghe" });
KhachHangCuoi.belongsTo(NhanSu, { foreignKey: "maNhanSu", targetKey: "maNhanSu", as: "nhanSu" });

// ========= Quan hệ HoSo_VuViec với các bảng khác =========
// HoSo_VuViec - KhachHangCuoi
VuViec.belongsTo(KhachHangCuoi, { foreignKey: "idKhachHang", targetKey: "id", as: "KhachHangCuoi" });
KhachHangCuoi.hasMany(VuViec, { foreignKey: "idKhachHang", as: "VuViec" });

// HoSo_VuViec - DoiTac
VuViec.belongsTo(DoiTac, { foreignKey: "idDoiTac", targetKey: "id", as: "DoiTac" });
DoiTac.hasMany(VuViec, { foreignKey: "idDoiTac", as: "VuViec" });

// HoSo_VuViec - LoaiVuViec
HoSo_VuViec.belongsTo(LoaiVuViec, { foreignKey: "maLoaiVuViec", targetKey: "maLoaiVuViec", as: "loaiVuViec" });
LoaiVuViec.hasMany(HoSo_VuViec, { foreignKey: "maLoaiVuViec", as: "hoSoVuViec" });

// HoSo_VuViec - QuocGia
VuViec.belongsTo(QuocGia, { foreignKey: "maQuocGiaVuViec", targetKey: "maQuocGia", as: "QuocGia" });
QuocGia.hasMany(VuViec, { foreignKey: "maQuocGiaVuViec", as: "hoSoVuViec" });


VuViec.belongsTo(NhanSu, { foreignKey: "maNguoiXuatBill", targetKey: "maNhanSu", as: "NhanSu" });
NhanSu.hasMany(VuViec, { foreignKey: "maNguoiXuatBill", as: "VuViec" });

// HoSo_VuViec.hasOne(DonDangKy, {
//     foreignKey: "maHoSoVuViec",
//     sourceKey: "maHoSoVuViec",
//     as: "donDangKy"
// });


// HoSo_VuViec.js
HoSo_VuViec.hasMany(NhanSu_VuViec, {
    foreignKey: 'maHoSoVuViec',
    sourceKey: 'maHoSoVuViec',
    as: 'nhanSuXuLy'
});

// NhanSu_VuViec.js
NhanSu_VuViec.belongsTo(HoSo_VuViec, {
    foreignKey: 'maHoSoVuViec',
    targetKey: 'maHoSoVuViec',
    as: 'hoSoVuViec'
});

NhanSu_VuViec.belongsTo(NhanSu, {
    foreignKey: "maNhanSu",
    as: "nhanSu"  // **Quan trọng: Phải trùng với alias trong truy vấn**
});
// // HoSo_VuViec - NhanSu (Người tạo hồ sơ vụ việc)
// HoSo_VuViec.belongsTo(NhanSu, { foreignKey: "maNguoiTao", targetKey: "maNhanSu", as: "nguoiTao" });
// NhanSu.hasMany(HoSo_VuViec, { foreignKey: "maNguoiTao", as: "hoSoVuViec" });

// // HoSo_VuViec - NhanSu_VuViec (Nhiều-nhiều giữa nhân sự và vụ việc)
// HoSo_VuViec.belongsToMany(NhanSu, { through: NhanSu_VuViec, foreignKey: "maHoSoVuViec", as: "nhanSu" });
// NhanSu.belongsToMany(HoSo_VuViec, { through: NhanSu_VuViec, foreignKey: "maNhanSu", as: "hoSoVuViec" });

//Quan hệ 1 nhiều giữa loại đơn và đơn

DonDangKy.belongsTo(KhachHangCuoi, { foreignKey: "idKhachHang", targetKey: "id", as: "khachHang" });
KhachHangCuoi.hasMany(DonDangKy, { foreignKey: "idKhachHang", as: "donDangKy" });

DonDangKy.belongsTo(DoiTac, { foreignKey: "idDoiTac", targetKey: "id", as: "doitac" });
DoiTac.hasMany(DonDangKy, { foreignKey: "idDoiTac", as: "donDangKy" });

DonDangKy.hasMany(TaiLieu, { foreignKey: "maDonDangKy", as: "taiLieu", onDelete: 'CASCADE', hooks: true });
TaiLieu.belongsTo(DonDangKy, { foreignKey: "maDonDangKy", as: "donDangKy" });

DonDangKy.hasMany(DonDK_SPDV, { foreignKey: "maDonDangKy", onDelete: 'CASCADE', hooks: true });
DonDK_SPDV.belongsTo(DonDangKy, { foreignKey: "maDonDangKy" });

DonDangKy.hasMany(TaiLieu, { foreignKey: 'maDonDangKy', as: 'taiLieuChuaNop' });
TaiLieu.belongsTo(DonDangKy, { foreignKey: 'maDonDangKy' });

DonDangKy.belongsTo(NhanHieu, {
    foreignKey: "maNhanHieu",
    as: "nhanHieu"
});
NhanHieu.hasMany(DonDangKy, {
    foreignKey: "maNhanHieu"
});

DonDangKy.hasMany(LichSuThamDinh, { foreignKey: "maDonDangKy", as: "lichSuThamDinh", });
LichSuThamDinh.belongsTo(DonDangKy, { foreignKey: "maDonDangKy" });

DonDK_SPDV.belongsTo(SanPham_DichVu, {
    foreignKey: 'maSPDV',
    as: 'SanPham_DichVu'
});
SanPham_DichVu.hasMany(DonDK_SPDV, {
    foreignKey: 'maSPDV',
    as: 'donDK_SPDV'
});
// DonDangKy.belongsTo(HoSo_VuViec, {
//     foreignKey: "maHoSoVuViec",
//     targetKey: "maHoSoVuViec",
//     as: "hoSoVuViec"
// });
////
// DonDangKyNhanHieu_KH.js
DonDangKyNhanHieu_KH.belongsTo(KhachHangCuoi, { foreignKey: "idKhachHang", targetKey: "id", as: "khachHang" });
KhachHangCuoi.hasMany(DonDangKyNhanHieu_KH, { foreignKey: "idKhachHang", as: "DonDangKyNhanHieu_KH" });

DonDangKyNhanHieu_KH.belongsTo(DoiTac, { foreignKey: "idDoiTac", targetKey: "id", as: "doitac" });
DoiTac.hasMany(DonDangKyNhanHieu_KH, { foreignKey: "idDoiTac", as: "DonDangKyNhanHieu_KH" });

DonDangKyNhanHieu_KH.hasMany(DonDK_SPDV_KH, {
    foreignKey: 'maDonDangKy',
    as: 'DonDK_SPDV_KH'
});

// DonDK_SPDV_KH.js
DonDK_SPDV_KH.belongsTo(DonDangKyNhanHieu_KH, {
    foreignKey: 'maDonDangKy',
    as: 'DonDangKyNhanHieu_KH'
});
DonDangKyNhanHieu_KH.hasMany(TaiLieu_KH, { foreignKey: 'maDonDangKy', as: 'taiLieuChuaNop_KH' });
TaiLieu_KH.belongsTo(DonDangKyNhanHieu_KH, { foreignKey: 'maDonDangKy' });
export const syncDatabase = async () => {
    await sequelize.sync();
    console.log("✅ Database synchronized with all models");
};
DonDangKyNhanHieu_KH.belongsTo(NhanHieu, {
    foreignKey: "maNhanHieu",
    as: "nhanHieu"
});
NhanHieu.hasMany(DonDangKyNhanHieu_KH, {
    foreignKey: "maNhanHieu"
});
DonDangKyNhanHieu_KH.hasMany(LichSuThamDinh_KH, { foreignKey: "maDonDangKy", as: "lichSuThamDinh", });
LichSuThamDinh_KH.belongsTo(DonDangKyNhanHieu_KH, { foreignKey: "maDonDangKy" });

// Trong file model LichSuThamDinh_KH.js
LichSuThamDinh_KH.hasMany(LichSuGiaHan_KH, {
    foreignKey: 'idLichSuThamDinh',
    as: 'giaHanList',
    onDelete: 'CASCADE',
    hooks: true
});

LichSuGiaHan_KH.belongsTo(LichSuThamDinh_KH, {
    foreignKey: 'idLichSuThamDinh',
    as: 'lichSuThamDinh'
});
// 
DonGiaHan_NH_VN.belongsTo(KhachHangCuoi, { foreignKey: "idKhachHang", targetKey: "id", as: "khachHang" });
KhachHangCuoi.hasMany(DonGiaHan_NH_VN, { foreignKey: "idKhachHang", as: "DonGiaHan_NH_VN" });
// DonGiaHan_NH_VN.hasMany(DonGH_NH_VN_SPDV, {
//     foreignKey: 'maDonGiaHan',
//     as: 'DonGH_NH_VN_SPDV'
// });

// DonGH_NH_VN_SPDV.belongsTo(DonGiaHan_NH_VN, {
//     foreignKey: 'maDonGiaHan',
//     as: 'DonGiaHan_NH_VN'
// });

DonGiaHan_NH_VN.belongsTo(NhanHieu, {
    foreignKey: "maNhanHieu",
    as: "NhanHieu"
});
NhanHieu.hasMany(DonGiaHan_NH_VN, {
    foreignKey: "maNhanHieu"
});
DonGiaHan_NH_VN.hasMany(TaiLieuGH_NH_VN, { foreignKey: 'idDonGiaHan', as: 'TaiLieuGH_NH_VN' });
TaiLieuGH_NH_VN.belongsTo(DonGiaHan_NH_VN, { foreignKey: 'idDonGiaHan' });
// VuViec.hasOne(DonGiaHan_NH_VN, {
//     foreignKey: "maHoSoVuViec",
//     sourceKey: "maHoSoVuViec",
//     as: "DonGiaHan_NH_VN"
// });
// DonGiaHan_NH_VN.belongsTo(VuViec, {
//     foreignKey: "maHoSoVuViec",
//     targetKey: "maHoSoVuViec",
//     as: "hoSoVuViec"  // alias ngược lại
// });

DeNghiThanhToan.hasMany(DeNghiThanhToan_VuViec, { foreignKey: 'idDeNghiThanhToan', as: 'DeNghiThanhToan_VuViec' });
DeNghiThanhToan_VuViec.belongsTo(DeNghiThanhToan, { foreignKey: 'idDeNghiThanhToan' });

// DeNghiThanhToan_VuViec.js
DeNghiThanhToan_VuViec.belongsTo(VuViec, {
    foreignKey: "idVuViec",
    as: "VuViec",
});

// VuViec.js
VuViec.hasMany(DeNghiThanhToan_VuViec, {
    foreignKey: "idVuViec",
    as: "DeNghiThanhToan_VuViec",
});
// Giấy chứng nhận
GCN_NH.belongsTo(KhachHangCuoi, {
    foreignKey: "idKhachHang",
    as: "KhachHangCuoi",
});
GCN_NH.belongsTo(DoiTac, {
    foreignKey: "idDoiTac",
    as: "DoiTac",
});
GCN_NH.belongsTo(NhanHieu, {
    foreignKey: "maNhanHieu",
    as: "NhanHieu",
});

GCN_NH_KH.belongsTo(KhachHangCuoi, {
    foreignKey: "idKhachHang",
    as: "KhachHangCuoi",
});
GCN_NH_KH.belongsTo(DoiTac, {
    foreignKey: "idDoiTac",
    as: "DoiTac",
});
GCN_NH_KH.belongsTo(NhanHieu, {
    foreignKey: "maNhanHieu",
    as: "NhanHieu",
});


GCN_NH_KH.hasMany(Affidavit, {
    foreignKey: 'idGCN_NH',
    sourceKey: 'id',
    as: 'affidavits'
});
Affidavit.belongsTo(GCN_NH_KH, {
    foreignKey: 'idGCN_NH',
    targetKey: 'id',
    as: 'gcn',
    onDelete: 'CASCADE'
});

GCN_NH.hasMany(DonGiaHan_NH_VN, {
    foreignKey: 'idGCN_NH',
    sourceKey: 'id',
    as: 'DonGiaHan_NH_VN'
});
DonGiaHan_NH_VN.belongsTo(GCN_NH, {
    foreignKey: 'idGCN_NH',
    targetKey: 'id',
    as: 'gcn',
    onDelete: 'CASCADE'
});

Affidavit.hasMany(TaiLieuAffidavit, { foreignKey: 'idAffidavit', as: 'taiLieu' });
TaiLieuAffidavit.belongsTo(Affidavit, { foreignKey: 'idAffidavit' });

GCN_NH_KH.hasMany(DonGiaHan_NH_KH, {
    foreignKey: 'idGCN_NH',
    sourceKey: 'id',
    as: 'DonGiaHan_NH_KH'
});
DonGiaHan_NH_KH.belongsTo(GCN_NH_KH, {
    foreignKey: 'idGCN_NH',
    targetKey: 'id',
    as: 'gcn',
    onDelete: 'CASCADE'
});

TuVanChung_VN.belongsTo(KhachHangCuoi, {
    foreignKey: "idKhachHang",
    as: "KhachHangCuoi",
});
TuVanChung_VN.belongsTo(DoiTac, {
    foreignKey: "idDoiTac",
    as: "DoiTac",
});

TuVanChung_KH.belongsTo(KhachHangCuoi, {
    foreignKey: "idKhachHang",
    as: "KhachHangCuoi",
});
TuVanChung_KH.belongsTo(DoiTac, {
    foreignKey: "idDoiTac",
    as: "DoiTac",
});

GCN_NH_KH.hasMany(DonSuaDoiGCN_NH_KH, {
    foreignKey: 'idGCN_NH',
    sourceKey: 'id',
    as: 'DonSuaDoiGCN_NH_KH'
});
DonSuaDoiGCN_NH_KH.belongsTo(GCN_NH_KH, {
    foreignKey: 'idGCN_NH',
    targetKey: 'id',
    as: 'gcn',
    onDelete: 'CASCADE'
});

GCN_NH.hasMany(DonSuaDoiGCN_NH_VN, {
    foreignKey: 'idGCN_NH',
    sourceKey: 'id',
    as: 'DonSuaDoiGCN_NH_VN'
});
DonSuaDoiGCN_NH_VN.belongsTo(GCN_NH, {
    foreignKey: 'idGCN_NH',
    targetKey: 'id',
    as: 'gcn',
    onDelete: 'CASCADE'
});

GiayUyQuyen.belongsTo(DoiTac, {
    foreignKey: "idDoiTac",
    as: "DoiTac",
});

GiayUyQuyen.belongsTo(KhachHangCuoi, {
    foreignKey: "idKhachHang",
    as: "KhachHangCuoi",
});
GiayUyQuyen.belongsTo(QuocGia, {
    foreignKey: "maQuocGia",
    as: "QuocGia",
});
///
DonDangKy.hasOne(DonSuaDoi_NH_VN, {
  foreignKey: "maDonDangKy",   // FK nằm bên bảng DonSuaDoi_NH_VN
  sourceKey: "maDonDangKy",    // DonDangKy.maDonDangKy
  as: "donSuaDoi",
});

DonSuaDoi_NH_VN.belongsTo(DonDangKy, {
  foreignKey: "maDonDangKy",
  targetKey: "maDonDangKy",
  as: "don",                   // alias này nếu cần dùng ngược lại
})

DonDangKyNhanHieu_KH.hasOne(DonSuaDoi_NH_KH, {
  foreignKey: "maDonDangKy",   // nằm bên bảng DonSuaDoi_NH_KH
  sourceKey: "maDonDangKy",
  as: "donSuaDoi_KH",
});

DonSuaDoi_NH_KH.belongsTo(DonDangKyNhanHieu_KH, {
  foreignKey: "maDonDangKy",
  targetKey: "maDonDangKy",
  as: "don_KH",
});

DonDangKyNhanHieu_KH.belongsTo(GiayUyQuyen, { foreignKey: "idGUQ", targetKey: "id", as: "GiayUyQuyen" });
GiayUyQuyen.hasMany(DonDangKyNhanHieu_KH, { foreignKey: "idGUQ", as: "DonDangKyNhanHieu_KH" });

DonDangKy.belongsTo(GiayUyQuyen, { foreignKey: "idGUQ", targetKey: "id", as: "GiayUyQuyen" });
GiayUyQuyen.hasMany(DonDangKy, { foreignKey: "idGUQ", as: "DonDangKyNhanHieu" });

///
DonDangKy.hasOne(DonTachNH_VN, {
  foreignKey: "maDonDangKy",   // FK nằm bên bảng DonSuaDoi_NH_VN
  sourceKey: "maDonDangKy",    // DonDangKy.maDonDangKy
  as: "donTach",
});

DonTachNH_VN.belongsTo(DonDangKy, {
  foreignKey: "maDonDangKy",
  targetKey: "maDonDangKy",
  as: "don",                   // alias này nếu cần dùng ngược lại
})

DonDangKyNhanHieu_KH.hasOne(DonTachNH_KH, {
  foreignKey: "maDonDangKy",   // nằm bên bảng DonSuaDoi_NH_KH
  sourceKey: "maDonDangKy",
  as: "donTach_KH",
});

DonTachNH_KH.belongsTo(DonDangKyNhanHieu_KH, {
  foreignKey: "maDonDangKy",
  targetKey: "maDonDangKy",
  as: "don_KH",
});

KhachHangCuoi.belongsTo(NhomKhachHang, {
    foreignKey: "idNhomKhachHang",
    as: "nhomKhachHang",
});



export {
    sequelize,
    NganhNghe,
    QuocGia,
    DoiTac,
    KhachHangCuoi,
    LoaiVuViec,
    NhanSu,
    HoSo_VuViec,
    NhanSu_VuViec,
    LoaiDon,
    DonDangKy,
    TaiLieu,
    Auth,
    NhanHieu,
    SanPham_DichVu,
    HopDongVuViec,
    LichSuThamDinh,
    Notification,
    FCMToken,
    AuditLog,
    DonDK_SPDV,
    DonGiaHan_NH_VN,
    TaiLieuGH_NH_VN,
    TaiLieuAffidavit,
    DonGiaHan_NH_KH,
    TaiLieuGH_NH_KH,
    DonSuaDoi_NH_VN,
    TuVanChung_VN,
    TuVanChung_KH,
    DonTachNH_VN,
    DonTachNH_KH    
};
