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
import { DonTachNH_VN, DonTach_NH_VN } from "./VN_TachDon_NH/donTachNH_VNModel.js";
import { DonTachNH_KH } from "./KH_TachDon_NH/donTachNH_KHModel.js";
import { TimeSheet } from "./timeSheetModel.js";
import { DanhSachCongViec } from "./dsCongViecModel.js";
import { NhomNhanSu } from "./nhomNhanSuModel.js";
import { DonCQSH_VN, DonCQSH_NH_VN } from "./VN_ChuyenQuyenSH/donCQSH_VNModel.js";
import { DonCQSH_GCN_VN } from "./VN_ChuyenQuyenSH/donCQSH_GCN_VNModel.js";

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
    const resolveTableName = async (defaultName) => {
        try {
            const [rows] = await sequelize.query(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(:tName) LIMIT 1`,
                { replacements: { tName: defaultName } }
            );
            if (rows && rows.length > 0 && rows[0].TABLE_NAME) {
                return rows[0].TABLE_NAME;
            }
        } catch (e) {}
        return defaultName;
    };

    const ensureColumnNullable = async (defaultTableName, columnName, fallbackType) => {
        try {
            const tbl = await resolveTableName(defaultTableName);
            const [cols] = await sequelize.query(
                `SELECT COLUMN_TYPE, IS_NULLABLE, CHARACTER_SET_NAME, COLLATION_NAME
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tbl AND LOWER(COLUMN_NAME) = LOWER(:col) LIMIT 1`,
                { replacements: { tbl, col: columnName } }
            );
            if (cols && cols.length > 0) {
                const colInfo = cols[0];
                if (colInfo.IS_NULLABLE === "NO") {
                    const colType = colInfo.COLUMN_TYPE || fallbackType;
                    const charsetClause = colInfo.CHARACTER_SET_NAME
                        ? ` CHARACTER SET ${colInfo.CHARACTER_SET_NAME}${colInfo.COLLATION_NAME ? ` COLLATE ${colInfo.COLLATION_NAME}` : ""}`
                        : "";
                    await sequelize.query(`ALTER TABLE \`${tbl}\` MODIFY COLUMN \`${columnName}\` ${colType}${charsetClause} NULL;`);
                }
            }
        } catch (e) {}
    };

    const ensureDeclarationColumns = async (defaultTableName) => {
        const tbl = await resolveTableName(defaultTableName);
        const addColSafe = async (sqlSuffix) => {
            try {
                await sequelize.query(`ALTER TABLE \`${tbl}\` ADD COLUMN ${sqlSuffix};`);
            } catch (e) {}
        };
        await addColSafe(`\`trangThaiDuyet\` INT NOT NULL DEFAULT 0`);
        await addColSafe(`\`ngayChapThuan\` DATE NULL DEFAULT NULL`);
        await addColSafe(`\`ngayTuChoi\` DATE NULL DEFAULT NULL`);
        await addColSafe(`\`lyDoTuChoi\` TEXT NULL`);
        await addColSafe(`\`duLieuThayDoi\` JSON NULL`);
    };

    try {
        // Safe check and add isSystem column to DanhSachCongViec BEFORE sync to avoid any sync errors
        try {
            const dsTbl = await resolveTableName("DanhSachCongViec");
            await sequelize.query(`
                ALTER TABLE \`${dsTbl}\` ADD COLUMN isSystem TINYINT(1) NOT NULL DEFAULT 0;
            `);
        } catch (colErr) {
            // Error code 1060 (ER_DUP_FIELDNAME) means column already exists; 1146 means table not created yet
        }

        // Safe check and add contributionPercentage column to TimeSheets before sync if not exists
        try {
            const tsTbl = await resolveTableName("TimeSheets");
            await sequelize.query(`
                ALTER TABLE \`${tsTbl}\` ADD COLUMN contributionPercentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00;
            `);
        } catch (colErr) {
            // Error code 1060 means column already exists; 1146 means table not created yet
        }

        // Safe check and add idGCN_NH_Goc, loaiBang, bangGoc to gcn_nh if not exists
        const gcnTbl = await resolveTableName("gcn_nh");
        try {
            await sequelize.query(`ALTER TABLE \`${gcnTbl}\` ADD COLUMN loaiBang INT NULL DEFAULT 1;`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TABLE \`${gcnTbl}\` ADD COLUMN bangGoc TINYINT(1) NULL DEFAULT 0;`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TABLE \`${gcnTbl}\` ADD COLUMN idGCN_NH_Goc INT NULL DEFAULT NULL;`);
        } catch (e) {}

        // 1. Migration trên 4 Bảng Tờ khai Sửa đổi & Chuyển nhượng (trước sync)
        await ensureColumnNullable("DonSuaDoi_NH_VN", "maDonDangKy", "VARCHAR(255)");
        await ensureColumnNullable("DonCQSH_VN", "maDonDangKy", "VARCHAR(255)");
        await ensureColumnNullable("DonCQSH_VN", "idKhachHang", "INT");
        await ensureColumnNullable("DonSuaDoiGCN_NH_VN", "idGCN_NH", "INT");
        await ensureColumnNullable("DonCQSH_GCN_VN", "idGCN_NH", "INT");
        await ensureColumnNullable("DonCQSH_GCN_VN", "idKhachHang", "INT");

        await ensureDeclarationColumns("DonSuaDoi_NH_VN");
        await ensureDeclarationColumns("DonCQSH_VN");
        await ensureDeclarationColumns("DonSuaDoiGCN_NH_VN");
        await ensureDeclarationColumns("DonCQSH_GCN_VN");

        await sequelize.sync();
        console.log("✅ Database synchronized with all models");

        // Đảm bảo lại các cột trên 4 bảng tờ khai (trong trường hợp bảng vừa được tạo mới bởi sync)
        await ensureColumnNullable("DonSuaDoi_NH_VN", "maDonDangKy", "VARCHAR(255)");
        await ensureColumnNullable("DonCQSH_VN", "maDonDangKy", "VARCHAR(255)");
        await ensureColumnNullable("DonCQSH_VN", "idKhachHang", "INT");
        await ensureColumnNullable("DonSuaDoiGCN_NH_VN", "idGCN_NH", "INT");
        await ensureColumnNullable("DonCQSH_GCN_VN", "idGCN_NH", "INT");
        await ensureColumnNullable("DonCQSH_GCN_VN", "idKhachHang", "INT");

        await ensureDeclarationColumns("DonSuaDoi_NH_VN");
        await ensureDeclarationColumns("DonCQSH_VN");
        await ensureDeclarationColumns("DonSuaDoiGCN_NH_VN");
        await ensureDeclarationColumns("DonCQSH_GCN_VN");

        // Đồng bộ dữ liệu cũ an toàn cho 4 bảng tờ khai và bảng dondangkynhanhieu
        try {
            const tblSDDon = await resolveTableName("DonSuaDoi_NH_VN");
            const tblCQDon = await resolveTableName("DonCQSH_VN");
            const tblSDGCN = await resolveTableName("DonSuaDoiGCN_NH_VN");
            const tblCQGCN = await resolveTableName("DonCQSH_GCN_VN");
            const tblDonDK = await resolveTableName("DonDangKyNhanHieu");

            // Các bản ghi tờ khai cũ đã có sẵn maDonDangKy / idGCN_NH khác NULL thì cập nhật trangThaiDuyet = 1
            await sequelize.query(`
                UPDATE \`${tblSDDon}\`
                SET \`trangThaiDuyet\` = 1
                WHERE \`maDonDangKy\` IS NOT NULL AND TRIM(\`maDonDangKy\`) <> '' AND (\`trangThaiDuyet\` IS NULL OR \`trangThaiDuyet\` = 0);
            `);
            await sequelize.query(`
                UPDATE \`${tblCQDon}\`
                SET \`trangThaiDuyet\` = 1
                WHERE \`maDonDangKy\` IS NOT NULL AND TRIM(\`maDonDangKy\`) <> '' AND (\`trangThaiDuyet\` IS NULL OR \`trangThaiDuyet\` = 0);
            `);
            await sequelize.query(`
                UPDATE \`${tblSDGCN}\`
                SET \`trangThaiDuyet\` = 1
                WHERE \`idGCN_NH\` IS NOT NULL AND (\`trangThaiDuyet\` IS NULL OR \`trangThaiDuyet\` = 0);
            `);
            await sequelize.query(`
                UPDATE \`${tblCQGCN}\`
                SET \`trangThaiDuyet\` = 1
                WHERE \`idGCN_NH\` IS NOT NULL AND (\`trangThaiDuyet\` IS NULL OR \`trangThaiDuyet\` = 0);
            `);

            // Bản ghi trong dondangkynhanhieu có maDonDangKy nằm trong doncqsh_vn đang bị gán loaiDon = 3 thì cập nhật thành loaiDon = 4
            await sequelize.query(`
                UPDATE \`${tblDonDK}\` d
                INNER JOIN \`${tblCQDon}\` cq ON d.\`maDonDangKy\` = cq.\`maDonDangKy\`
                SET d.\`loaiDon\` = 4
                WHERE d.\`loaiDon\` = 3;
            `);

            // Đảm bảo Index hiệu năng cho truy vấn phả hệ trên máy chủ lớn
            const ensureIndexSafe = async (tbl, idxName, colName) => {
                try {
                    await sequelize.query(`CREATE INDEX \`${idxName}\` ON \`${tbl}\` (\`${colName}\`);`);
                } catch (e) {}
            };
            await ensureIndexSafe(tblSDDon, "idx_sd_don_madongoc", "maDonDangKyGoc");
            await ensureIndexSafe(tblSDDon, "idx_sd_don_trangthaiduyet", "trangThaiDuyet");
            await ensureIndexSafe(tblCQDon, "idx_cq_don_trangthaiduyet", "trangThaiDuyet");
            await ensureIndexSafe(tblSDGCN, "idx_sd_gcn_trangthaiduyet", "trangThaiDuyet");
            await ensureIndexSafe(tblCQGCN, "idx_cq_gcn_trangthaiduyet", "trangThaiDuyet");
            await ensureIndexSafe(gcnTbl, "idx_gcn_nh_idgcngoc", "idGCN_NH_Goc");
        } catch (migrationErr) {
            console.error("⚠️ Safe data migration warning:", migrationErr?.message);
        }

        // Update legacy records in DanhSachCongViec: tasks created by admin or with null maNhanSu become system tasks
        try {
            const dsTbl = await resolveTableName("DanhSachCongViec");
            const authTbl = await resolveTableName("Auth");
            await sequelize.query(`
                UPDATE \`${dsTbl}\` SET isSystem = 1 WHERE maNhanSu IS NULL;
            `);
            await sequelize.query(`
                UPDATE \`${dsTbl}\` d
                LEFT JOIN \`${authTbl}\` a ON d.maNhanSu = a.maNhanSu
                SET d.isSystem = 1
                WHERE (LOWER(a.Role) IN ('admin', 'ceo') OR d.maNhanSu = 'admin');
            `);
            await sequelize.query(`
                UPDATE \`${dsTbl}\` SET isSystem = 0 WHERE isSystem IS NULL;
            `);
        } catch (updateErr) {
            // Ignore if already set
        }

        // Safe check and add index for isSystem on DanhSachCongViec
        try {
            const dsTbl = await resolveTableName("DanhSachCongViec");
            await sequelize.query(`
                ALTER TABLE \`${dsTbl}\` ADD INDEX idx_ds_cong_viec_is_system (isSystem);
            `);
        } catch (idxErr) {
            // Ignore if index already exists (ER_DUP_KEYNAME)
        }

        // Update legacy records where contributionPercentage is NULL
        try {
            const tsTbl = await resolveTableName("TimeSheets");
            await sequelize.query(`
                UPDATE \`${tsTbl}\` SET contributionPercentage = 0.00 WHERE contributionPercentage IS NULL;
            `);
        } catch (updateErr) {
            // Ignore if already set
        }

        // Tự động backfill ngayHetHanBang (+10 năm từ ngayNopDon) và hanGiaHan (+9.5 năm từ ngayNopDon) cho GCN còn trống
        try {
            const gcnVnTbl = await resolveTableName("gcn_nh");
            const gcnKhTbl = await resolveTableName("GCN_NH_KH");
            for (const tbl of [gcnVnTbl, gcnKhTbl]) {
                await sequelize.query(`
                    UPDATE \`${tbl}\`
                    SET \`ngayHetHanBang\` = DATE_ADD(\`ngayNopDon\`, INTERVAL 10 YEAR)
                    WHERE \`ngayHetHanBang\` IS NULL AND \`ngayNopDon\` IS NOT NULL;
                `);
                await sequelize.query(`
                    UPDATE \`${tbl}\`
                    SET \`hanGiaHan\` = DATE_ADD(DATE_ADD(\`ngayNopDon\`, INTERVAL 9 YEAR), INTERVAL 6 MONTH)
                    WHERE \`hanGiaHan\` IS NULL AND \`ngayNopDon\` IS NOT NULL;
                `);
            }
        } catch (gcnBackfillErr) {
            console.error("⚠️ GCN expiry backfill warning:", gcnBackfillErr?.message);
        }
    } catch (err) {
        console.error("Database sync error:", err);
    }
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
GCN_NH.hasMany(DonSuaDoiGCN_NH_VN, {
    foreignKey: 'idGCN_NH_Goc',
    sourceKey: 'id',
    as: 'dsSuaDoiGCN_Goc'
});
DonSuaDoiGCN_NH_VN.belongsTo(GCN_NH, {
    foreignKey: 'idGCN_NH_Goc',
    targetKey: 'id',
    as: 'gcnGoc'
});
DonSuaDoiGCN_NH_VN.belongsTo(GCN_NH, {
    foreignKey: 'idGCN_NH',
    targetKey: 'id',
    as: 'gcnMoi'
});
GCN_NH.belongsTo(GCN_NH, {
    foreignKey: 'idGCN_NH_Goc',
    targetKey: 'id',
    as: 'gcnCha'
});
GCN_NH.hasMany(GCN_NH, {
    foreignKey: 'idGCN_NH_Goc',
    sourceKey: 'id',
    as: 'dsGCNCon'
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
});

DonDangKy.hasMany(DonSuaDoi_NH_VN, {
  foreignKey: "maDonDangKyGoc",
  sourceKey: "maDonDangKy",
  as: "dsSuaDoi_Goc",
});

DonSuaDoi_NH_VN.belongsTo(DonDangKy, {
  foreignKey: "maDonDangKyGoc",
  targetKey: "maDonDangKy",
  as: "donGoc",
});

DonSuaDoi_NH_VN.belongsTo(DonDangKy, {
  foreignKey: "maDonDangKy",
  targetKey: "maDonDangKy",
  as: "donMoi",
});

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
});

DonDangKy.hasMany(DonTachNH_VN, {
  foreignKey: "maDonDangKyGoc",
  sourceKey: "maDonDangKy",
  as: "dsDonTach_Goc",
});

DonTachNH_VN.belongsTo(DonDangKy, {
  foreignKey: "maDonDangKyGoc",
  targetKey: "maDonDangKy",
  as: "donGoc",
});

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

DonDangKyNhanHieu_KH.hasMany(DonTachNH_KH, {
  foreignKey: "maDonDangKyGoc",
  sourceKey: "maDonDangKy",
  as: "dsDonTach_KH_Goc",
});

DonTachNH_KH.belongsTo(DonDangKyNhanHieu_KH, {
  foreignKey: "maDonDangKyGoc",
  targetKey: "maDonDangKy",
  as: "donGoc_KH",
});

KhachHangCuoi.belongsTo(NhomKhachHang, {
    foreignKey: "idNhomKhachHang",
    as: "nhomKhachHang",
});

// Mỗi danh mục công việc thuộc về 1 nhân sự (nullable: danh mục dùng chung khi null)
DanhSachCongViec.belongsTo(NhanSu, {
    foreignKey: "maNhanSu",
    targetKey: "maNhanSu",
    as: "nhanSu",
});
NhanSu.hasMany(DanhSachCongViec, {
    foreignKey: "maNhanSu",
    sourceKey: "maNhanSu",
    as: "danhSachCongViec",
});

// ========= Quan hệ NhomNhanSu (Team) =========
// Manager (NhanSu) quản lý nhiều thành viên qua NhomNhanSu
NhomNhanSu.belongsTo(NhanSu, {
    foreignKey: "managerCode",
    targetKey: "maNhanSu",
    as: "manager",
});
NhomNhanSu.belongsTo(NhanSu, {
    foreignKey: "maNhanSu",
    targetKey: "maNhanSu",
    as: "thanhVien",
});
NhanSu.hasMany(NhomNhanSu, {
    foreignKey: "managerCode",
    sourceKey: "maNhanSu",
    as: "nhomQuanLy",
});
NhanSu.hasMany(NhomNhanSu, {
    foreignKey: "maNhanSu",
    sourceKey: "maNhanSu",
    as: "nhomThamGia",
});

// ========= Quan hệ Chuyển quyền sở hữu Đơn đăng ký (DonCQSH_VN) =========
DonDangKy.hasMany(DonCQSH_VN, {
    foreignKey: "maDonDangKyGoc",
    sourceKey: "maDonDangKy",
    as: "DonCQSH_VN",
});
DonDangKy.hasOne(DonCQSH_VN, {
    foreignKey: "maDonDangKy",
    sourceKey: "maDonDangKy",
    as: "donCQSH",
});
DonCQSH_VN.belongsTo(DonDangKy, {
    foreignKey: "maDonDangKyGoc",
    targetKey: "maDonDangKy",
    as: "donGoc",
});
DonCQSH_VN.belongsTo(DonDangKy, {
    foreignKey: "maDonDangKy",
    targetKey: "maDonDangKy",
    as: "donMoi",
});
DonCQSH_VN.belongsTo(KhachHangCuoi, {
    foreignKey: "idKhachHang",
    targetKey: "id",
    as: "khachHangMoi",
});

// ========= Quan hệ Chuyển quyền sở hữu Giấy chứng nhận (DonCQSH_GCN_VN) =========
GCN_NH.hasMany(DonCQSH_GCN_VN, {
    foreignKey: "idGCN_NH_Goc",
    sourceKey: "id",
    as: "DonCQSH_GCN_VN",
});
GCN_NH.hasOne(DonCQSH_GCN_VN, {
    foreignKey: "idGCN_NH",
    sourceKey: "id",
    as: "donCQSH_GCN",
});
DonCQSH_GCN_VN.belongsTo(GCN_NH, {
    foreignKey: "idGCN_NH_Goc",
    targetKey: "id",
    as: "gcnGoc",
});
DonCQSH_GCN_VN.belongsTo(GCN_NH, {
    foreignKey: "idGCN_NH",
    targetKey: "id",
    as: "gcnMoi",
});
DonCQSH_GCN_VN.belongsTo(KhachHangCuoi, {
    foreignKey: "idKhachHang",
    targetKey: "id",
    as: "khachHangMoi",
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
    DonTach_NH_VN,
    DonTachNH_KH,
    TimeSheet,
    DanhSachCongViec,
    NhomNhanSu,
    GCN_NH,
    GCN_NH_KH,
    DonSuaDoiGCN_NH_VN,
    DonSuaDoiGCN_NH_KH,
    DonCQSH_VN,
    DonCQSH_NH_VN,
    DonCQSH_GCN_VN,
};
