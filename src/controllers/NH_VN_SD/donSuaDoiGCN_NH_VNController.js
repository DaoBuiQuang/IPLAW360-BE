import { sequelize } from "../../config/db.js";
import { DonDangKy } from "../../models/donDangKyModel.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { DonSuaDoi_NH_VN } from "../../models/VN_SuaDoi_NH/donSuaDoiNH_VNModel.js";
import { DonDK_SPDV } from "../../models/donDK_SPDVMolel.js";
import crypto from "crypto";
import { GCN_NH } from "../../models/GCN_NHModel.js";
import { DonSuaDoiGCN_NH_VN } from "../../models/VN_SuaDoi_NH/donSuaDoiGCN_NH_VNModel.js";
import { NhanHieu } from "../../models/nhanHieuModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import { Op, literal, Sequelize } from "sequelize";

// Helper for token-based substring search (case-insensitive)
const buildTokensSearch = (val, field) => {
    if (!val) return undefined;
    const tokens = String(val).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return undefined;
    if (tokens.length === 1) return { [field]: { [Op.like]: `%${tokens[0]}%` } };
    return {
        [Op.and]: tokens.map(tok => ({ [field]: { [Op.like]: `%${tok}%` } }))
    };
};

// Helper for customer multi-field token search (tenKhachHang + maKhachHang)
const buildCustomerSearch = (val) => {
    if (!val) return undefined;
    const tokens = String(val).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return undefined;
    if (tokens.length === 1) {
        return {
            [Op.or]: [
                { tenKhachHang: { [Op.like]: `%${tokens[0]}%` } },
                { maKhachHang: { [Op.like]: `%${tokens[0]}%` } },
            ]
        };
    }
    return {
        [Op.and]: tokens.map(tok => ({
            [Op.or]: [
                { tenKhachHang: { [Op.like]: `%${tok}%` } },
                { maKhachHang: { [Op.like]: `%${tok}%` } },
            ]
        }))
    };
};

// Helper for partner multi-field token search (tenDoiTac + maDoiTac)
const buildPartnerSearch = (val) => {
    if (!val) return undefined;
    const tokens = String(val).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return undefined;
    if (tokens.length === 1) {
        return {
            [Op.or]: [
                { tenDoiTac: { [Op.like]: `%${tokens[0]}%` } },
                { maDoiTac: { [Op.like]: `%${tokens[0]}%` } },
            ]
        };
    }
    return {
        [Op.and]: tokens.map(tok => ({
            [Op.or]: [
                { tenDoiTac: { [Op.like]: `%${tok}%` } },
                { maDoiTac: { [Op.like]: `%${tok}%` } },
            ]
        }))
    };
};
// const generateMaDonDangKy = (maHoSo) => {
//     const randomStr = crypto.randomBytes(3).toString("hex"); // 6 ký tự hex
//     return `${maHoSo}_${randomStr}`;
// };

// 🧩 Hàm sinh mã khách hàng mới từ mã cũ
function generateNewMaKhachHang(maCu) {
    // Nếu chưa có hậu tố (chưa từng sửa) → thêm "-A"
    if (!maCu.includes("-")) {
        return `${maCu}-A`;
    }

    // Nếu đã có hậu tố, tách phần gốc và hậu tố ra
    const [prefix, suffix] = maCu.split("-");

    // Nếu hậu tố là 1 ký tự chữ cái (A, B, C,...)
    if (/^[A-Z]$/.test(suffix)) {
        const nextChar = String.fromCharCode(suffix.charCodeAt(0) + 1);
        return `${prefix}-${nextChar}`;
    }

    // Trường hợp đặc biệt (nhiều chữ, sai định dạng) → fallback
    return `${maCu}-A`;
}

export const addApplicationSD_GCN_NHVN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            maHoSo,
            idGCN_NH_Cu,
            soDonSD,
            ngayYeuCau,
            lanSuaDoi,
            ngayGhiNhanSuaDoi,
            duocGhiNhanSuaDoi,
            moTaSuaDoi,
            suaDoiDaiDien,
            ndSuaDoiDaiDien,
            suaDoiTenChuBang,
            ndSuaDoiTenChuBang,
            suaDoiDiaChi,
            ndSuaDoiDiaChi,
            suaNhan,
            ndSuaNhan,
            suaNhomSPDV,
            ndSuaNhomSPDV,
        } = req.body;

        // ====== VALIDATE INPUT ======
        if (!maHoSo || !idGCN_NH_Cu) {
            return res
                .status(400)
                .json({ message: "Thiếu thông tin bắt buộc (mã hồ sơ, mã đơn, số đơn)." });
        }

        // ====== TÌM ĐƠN ĐĂNG KÝ CŨ ======
        const gcnCu = await GCN_NH.findOne({ where: { id: idGCN_NH_Cu } });
        if (!gcnCu) {
            return res.status(404).json({ message: "Không tìm thấy giấy chứng nhận gốc." });
        }

        let idKhachHangMoi = gcnCu.idKhachHang;

        // ====== XỬ LÝ SỬA ĐỔI KHÁCH HÀNG ======
        if (suaDoiTenChuBang || suaDoiDiaChi) {
            const khachCu = await KhachHangCuoi.findByPk(gcnCu.idKhachHang);

            if (!khachCu) {
                return res.status(404).json({ message: "Không tìm thấy khách hàng của đơn gốc." });
            }
            const maKhachHangMoi = generateNewMaKhachHang(khachCu.maKhachHang);
            const khachMoi = await KhachHangCuoi.create(
                {
                    tenKhachHang: suaDoiTenChuBang ? ndSuaDoiTenChuBang : khachCu.tenKhachHang,
                    diaChi: suaDoiDiaChi ? ndSuaDoiDiaChi : khachCu.diaChi,
                    email: khachCu.email,
                    maKhachHang: maKhachHangMoi,
                    maKhachHangCu: khachCu.maKhachHang,
                    sdt: khachCu.sdt,
                    maSoThue: khachCu.maSoThue,
                    maQuocGia: khachCu.maQuocGia,
                    nguoiLienHe: khachCu.nguoiLienHe,
                    ghiChu: khachCu.ghiChu,
                    tenVietTatKH: khachCu.tenVietTatKH,
                    maDoiTac: khachCu.maDoiTac,
                    moTa: khachCu.moTa,
                    maNganhNghe: khachCu.maNganhNghe,
                },
                { transaction }
            );

            idKhachHangMoi = khachMoi.id;
        }
        // ====== TẠO BẢN GHI ĐƠN MỚI ======
        const gcnData = gcnCu.toJSON();
        delete gcnData.id;
        delete gcnData.createdAt;
        delete gcnData.updatedAt;

        const gcnMoi = await GCN_NH.create(
            {
                ...gcnData,
                maHoSo: maHoSo || gcnData.maHoSo,
                loaiBang: 2, // bằng sửa đổi
                idKhachHang: idKhachHangMoi,
                bangGoc: 0, // bằng sửa đổi mới giữ 0
                idGCN_NH_Goc: idGCN_NH_Cu,
                ngayNop: ngayYeuCau,
            },
            { transaction }
        );

        await gcnCu.update({ bangGoc: 1, trangThaiVuViec: "5" }, { transaction });
        const newSD = await DonSuaDoiGCN_NH_VN.create(
            {
                maHoSo,
                idGCN_NH_Goc: idGCN_NH_Cu,
                soDonSD,
                idGCN_NH: gcnMoi.id,
                ngayYeuCau,
                lanSuaDoi,
                ngayGhiNhanSuaDoi,
                duocGhiNhanSuaDoi,
                moTaSuaDoi,
                suaDoiDaiDien,
                ndSuaDoiDaiDien,
                suaDoiTenChuBang,
                ndSuaDoiTenChuBang,
                suaDoiDiaChi,
                ndSuaDoiDiaChi,
                suaNhan,
                ndSuaNhan,
                suaNhomSPDV,
                ndSuaNhomSPDV,
            },
            { transaction }
        );

        await transaction.commit();

        res.status(201).json({
            message: "Thêm đơn sửa đổi thành công!",
            gcnMoi,
            newSD,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi thêm đơn sửa đổi:", error);
        res.status(500).json({ message: error.message });
    }

};

export const getAllApplication_SD_GCN_VN = async (req, res) => {
    try {
        const {
            soBang,
            searchText,
            customerName,
            partnerName,
            brandName,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        const searchTerm = String(searchText || soBang || "").trim();
        const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
        const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
        const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

        const whereCondition = {};

        // ✅ Nếu có searchText hoặc soBang: tìm theo số đơn SD GCN, số bằng, số đơn, mã hồ sơ của GCN
        if (searchTerm) {
            whereCondition[Op.or] = [
                { "$DonSuaDoiGCN_NH_VN.soDon$": { [Op.like]: `%${searchTerm}%` } },
                { "$gcn.soBang$": { [Op.like]: `%${searchTerm}%` } },
                { "$gcn.soDon$": { [Op.like]: `%${searchTerm}%` } },
                { "$gcn.maHoSo$": { [Op.like]: `%${searchTerm}%` } },
            ];
        }

        const { count: totalItems, rows } = await DonSuaDoiGCN_NH_VN.findAndCountAll({
            where: whereCondition,
            distinct: true,
            col: "id",
            include: [
                {
                    model: GCN_NH,
                    as: "gcn",
                    required: !!(effectiveBrandName || effectiveCustomerName || effectivePartnerName),
                    attributes: [
                        "id",
                        "soBang",
                        "soDon",
                        "maHoSo",
                        "maNhanHieu",
                        "ngayCapBang",
                        "ngayHetHanBang",
                        "hanGiaHan",
                        "dsNhomSPDV",
                        "ngayNopDon",
                    ],
                    include: [
                        {
                            model: NhanHieu,
                            as: "NhanHieu",
                            attributes: ["tenNhanHieu"],
                            required: !!effectiveBrandName,
                            where: buildTokensSearch(effectiveBrandName, "tenNhanHieu"),
                        },
                        {
                            model: KhachHangCuoi,
                            as: "KhachHangCuoi",
                            attributes: ["tenKhachHang", "maKhachHang"],
                            required: !!effectiveCustomerName,
                            where: buildCustomerSearch(effectiveCustomerName),
                        },
                        {
                            model: DoiTac,
                            as: "DoiTac",
                            attributes: ["tenDoiTac", "maDoiTac"],
                            required: !!effectivePartnerName,
                            where: buildPartnerSearch(effectivePartnerName),
                        },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: pageSize,
            offset,
        });

        return res.status(200).json({
            data: rows,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize),
            },
        });
    } catch (error) {
        console.error("Lỗi application_sd_gcn_nh_vn/list:", error);
        return res.status(500).json({
            message: "Lỗi khi lấy danh sách đơn sửa đổi GCN",
            error: error.message,
        });
    }
};