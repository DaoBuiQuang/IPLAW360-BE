import { sequelize } from "../../config/db.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { GCN_NH } from "../../models/GCN_NHModel.js";
import { DonSuaDoiGCN_NH_VN } from "../../models/VN_SuaDoi_NH/donSuaDoiGCN_NH_VNModel.js";
import { NhanHieu } from "../../models/nhanHieuModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import { generateUniqueMaKhachHang } from "./donSuaDoi_NH_VNController.js";
import { rollbackSpawnedChildGCN } from "../../utils/lineageHelper.js";

/**
 * Helper duyệt Chấp thuận (trangThaiDuyet = 1) cho Tờ khai Sửa đổi GCN Nhãn hiệu VN
 * - Đóng băng GCN cha (bangGoc = 1), giữ nguyên loaiBang của GCN cha
 * - Sinh GCN_NH mới kế thừa GCN cha (loaiBang = 2, bangGoc = 0, idGCN_NH_Goc = gcnCu.id)
 */
export const approveDonSuaDoiGCN_NH_VN = async (record, payload = {}, transaction = null) => {
    const ngayChapThuan =
        payload.ngayChapThuan ||
        payload.ngayGhiNhanSuaDoi ||
        record.ngayChapThuan ||
        record.ngayGhiNhanSuaDoi ||
        new Date().toISOString().split("T")[0];

    if (record.idGCN_NH) {
        await record.update(
            {
                trangThaiDuyet: 1,
                ngayChapThuan,
                ngayGhiNhanSuaDoi: payload.ngayGhiNhanSuaDoi || ngayChapThuan,
                duocGhiNhanSuaDoi: true,
                ngayTuChoi: null,
                lyDoTuChoi: null,
            },
            { transaction }
        );
        const existingGCNMoi = await GCN_NH.findByPk(record.idGCN_NH, { transaction });
        return { gcnMoi: existingGCNMoi, record };
    }

    const gcnCu = await GCN_NH.findByPk(record.idGCN_NH_Goc, { transaction });
    if (!gcnCu) {
        throw new Error("Không tìm thấy Giấy chứng nhận gốc để thực hiện chấp thuận sửa đổi.");
    }

    const savedChanges =
        typeof record.duLieuThayDoi === "string"
            ? (() => {
                  try {
                      return JSON.parse(record.duLieuThayDoi);
                  } catch {
                      return {};
                  }
              })()
            : record.duLieuThayDoi || {};

    const incomingChanges =
        typeof payload.duLieuThayDoi === "object" && payload.duLieuThayDoi !== null
            ? payload.duLieuThayDoi
            : {};

    const duLieu = { ...savedChanges, ...incomingChanges };

    const suaDoiTenChuBang = payload.suaDoiTenChuBang ?? record.suaDoiTenChuBang ?? duLieu.suaDoiTenChuBang;
    const ndSuaDoiTenChuBang = payload.ndSuaDoiTenChuBang ?? record.ndSuaDoiTenChuBang ?? duLieu.ndSuaDoiTenChuBang;
    const suaDoiDiaChi = payload.suaDoiDiaChi ?? record.suaDoiDiaChi ?? duLieu.suaDoiDiaChi;
    const ndSuaDoiDiaChi = payload.ndSuaDoiDiaChi ?? record.ndSuaDoiDiaChi ?? duLieu.ndSuaDoiDiaChi;
    const suaDoiDaiDien = payload.suaDoiDaiDien ?? record.suaDoiDaiDien ?? duLieu.suaDoiDaiDien;
    const ndSuaDoiDaiDien = payload.ndSuaDoiDaiDien ?? record.ndSuaDoiDaiDien ?? duLieu.ndSuaDoiDaiDien;
    const suaNhan = payload.suaNhan ?? record.suaNhan ?? duLieu.suaNhan;
    const ndSuaNhan = payload.ndSuaNhan ?? record.ndSuaNhan ?? duLieu.ndSuaNhan;
    const suaNhomSPDV = payload.suaNhomSPDV ?? record.suaNhomSPDV ?? duLieu.suaNhomSPDV;
    const ndSuaNhomSPDV = payload.ndSuaNhomSPDV ?? record.ndSuaNhomSPDV ?? duLieu.ndSuaNhomSPDV;

    // 1. Xác định khách hàng mới
    let idKhachHangMoi = gcnCu.idKhachHang;
    const explicitKhachHangId = payload.idKhachHangMoi || payload.idKhachHang || duLieu.idKhachHangMoi || duLieu.idKhachHang;
    if (explicitKhachHangId && Number(explicitKhachHangId) !== Number(gcnCu.idKhachHang)) {
        idKhachHangMoi = Number(explicitKhachHangId);
    } else if (suaDoiTenChuBang || suaDoiDiaChi) {
        const khachCu = await KhachHangCuoi.findByPk(gcnCu.idKhachHang, { transaction });
        if (khachCu) {
            const maKhachHangMoi = await generateUniqueMaKhachHang(khachCu.maKhachHang, transaction);
            const khachMoi = await KhachHangCuoi.create(
                {
                    tenKhachHang: suaDoiTenChuBang && ndSuaDoiTenChuBang ? ndSuaDoiTenChuBang : khachCu.tenKhachHang,
                    diaChi: suaDoiDiaChi && ndSuaDoiDiaChi ? ndSuaDoiDiaChi : khachCu.diaChi,
                    maKhachHang: maKhachHangMoi,
                    maKhachHangCu: khachCu.maKhachHang,
                    sdt: khachCu.sdt,
                    maQuocGia: khachCu.maQuocGia,
                    nguoiLienHe: khachCu.nguoiLienHe,
                    ghiChu: khachCu.ghiChu,
                    tenVietTatKH: khachCu.tenVietTatKH,
                    maDoiTac: khachCu.maDoiTac,
                    moTa: khachCu.moTa,
                    maNganhNghe: khachCu.maNganhNghe,
                    idNhomKhachHang: khachCu.idNhomKhachHang,
                },
                { transaction }
            );
            idKhachHangMoi = khachMoi.id;
        }
    }

    // 2. Xác định nhãn hiệu mới (nếu có sửa nhãn)
    let maNhanHieuMoi = payload.maNhanHieu || duLieu.maNhanHieu || gcnCu.maNhanHieu;
    const nhanHieuMoiObj = payload.nhanHieu || duLieu.nhanHieu;
    if (!payload.maNhanHieu && !duLieu.maNhanHieu && suaNhan && (nhanHieuMoiObj?.tenNhanHieu || nhanHieuMoiObj?.linkAnh)) {
        const nhCu = await NhanHieu.findByPk(gcnCu.maNhanHieu, { transaction });
        const createdNH = await NhanHieu.create(
            {
                tenNhanHieu: nhanHieuMoiObj?.tenNhanHieu || nhCu?.tenNhanHieu || ndSuaNhan || "Nhãn hiệu sửa đổi",
                linkAnh: nhanHieuMoiObj?.linkAnh || nhCu?.linkAnh || null,
            },
            { transaction }
        );
        maNhanHieuMoi = createdNH.maNhanHieu;
    }

    // 3. Đóng băng GCN cha: bangGoc = 1, giữ nguyên loaiBang của GCN cha
    await gcnCu.update({ bangGoc: 1 }, { transaction });

    // 4. Tạo GCN_NH mới kế thừa GCN cha
    const { id: _ignoreId, createdAt: _c, updatedAt: _u, ...gcnCuPlain } = gcnCu.get({ plain: true });
    const gcnMoi = await GCN_NH.create(
        {
            ...gcnCuPlain,
            soBang: payload.soBang || duLieu.soBang || gcnCuPlain.soBang,
            maHoSo: payload.maHoSo || duLieu.maHoSo || gcnCuPlain.maHoSo,
            loaiBang: 2, // 2 = Đã sửa đổi / Sau sửa đổi
            bangGoc: 0,
            idGCN_NH_Goc: gcnCu.id,
            idKhachHang: idKhachHangMoi,
            maNhanHieu: maNhanHieuMoi,
            idDoiTac: payload.idDoiTac ?? duLieu.idDoiTac ?? gcnCuPlain.idDoiTac,
            idGUQ: payload.idGUQ ?? duLieu.idGUQ ?? gcnCuPlain.idGUQ,
            daiDienSHTT:
                suaDoiDaiDien && ndSuaDoiDaiDien
                    ? ndSuaDoiDaiDien
                    : payload.daiDienSHTT ?? duLieu.daiDienSHTT ?? gcnCuPlain.daiDienSHTT,
            dsNhomSPDV:
                suaNhomSPDV && ndSuaNhomSPDV
                    ? ndSuaNhomSPDV
                    : payload.dsNhomSPDV ?? duLieu.dsNhomSPDV ?? gcnCuPlain.dsNhomSPDV,
            chiTietNhomSPDV: payload.chiTietNhomSPDV ?? duLieu.chiTietNhomSPDV ?? gcnCuPlain.chiTietNhomSPDV,
            mauSacNH: payload.mauSacNH ?? duLieu.mauSacNH ?? gcnCuPlain.mauSacNH,
            anhBang: payload.anhBang ?? duLieu.anhBang ?? gcnCuPlain.anhBang,
        },
        { transaction }
    );

    // 5. Cập nhật idGCN_NH mới và trạng thái duyệt vào bản ghi tờ khai
    await record.update(
        {
            idGCN_NH: gcnMoi.id,
            trangThaiDuyet: 1,
            ngayChapThuan,
            ngayGhiNhanSuaDoi: payload.ngayGhiNhanSuaDoi || ngayChapThuan,
            duocGhiNhanSuaDoi: true,
            ngayTuChoi: null,
            lyDoTuChoi: null,
            duLieuThayDoi: duLieu,
        },
        { transaction }
    );

    return { gcnMoi, record };
};

/**
 * =========================================================================
 * 1. TẠO MỚI TỜ KHAI SỬA ĐỔI GCN NHÃN HIỆU VN
 * Endpoint: POST /api/gcn_nh_sd_vn/add (và /api/application_sd_gcn_nh_vn/add)
 * =========================================================================
 */
export const addApplicationSD_GCN_NHVN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            maHoSo,
            idGCN_NH_Cu,
            idGCN_NH_Goc: reqIdGCNGoc,
            soDonSD,
            soDon,
            ngayYeuCau,
            lanSuaDoi,
            ngayGhiNhanSuaDoi,
            duocGhiNhanSuaDoi,
            moTaSuaDoi,
            moTa,
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
            suaDoiNoiDungKhac,
            trangThaiDuyet = 0,
            ngayChapThuan,
            ngayTuChoi,
            lyDoTuChoi,
            duLieuThayDoi,
            idKhachHangMoi,
            idKhachHang,
            idDoiTac,
            daiDienSHTT,
            maNhanHieu,
            nhanHieu,
            dsNhomSPDV,
            chiTietNhomSPDV,
            mauSacNH,
            anhBang,
            soBang,
            maNhanSuCapNhap,
        } = req.body;

        const targetIdGCNGoc = idGCN_NH_Cu || reqIdGCNGoc || req.body.idGCN_NH;
        if (!targetIdGCNGoc) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc: ID Giấy chứng nhận gốc (idGCN_NH_Cu / idGCN_NH_Goc)." });
        }

        const gcnCu = await GCN_NH.findOne({ where: { id: targetIdGCNGoc }, transaction });
        if (!gcnCu) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy giấy chứng nhận gốc." });
        }
        if (Number(gcnCu.bangGoc) === 1 || gcnCu.bangGoc === true) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Giấy chứng nhận gốc này đã bị đóng băng (đã sửa đổi / chuyển nhượng), vui lòng thực hiện trên văn bằng kế thừa hiện hành.",
            });
        }

        const countSD = await DonSuaDoiGCN_NH_VN.count({
            where: { idGCN_NH_Goc: targetIdGCNGoc },
            transaction,
        });
        const actualLanSuaDoi = lanSuaDoi ?? countSD + 1;
        const actualMaHoSo = maHoSo || gcnCu.maHoSo;
        const targetSoDon = soDonSD || soDon || gcnCu.soDon || null;

        const mergedDuLieuThayDoi = {
            ...(typeof duLieuThayDoi === "object" && duLieuThayDoi !== null ? duLieuThayDoi : {}),
            maHoSo: actualMaHoSo,
            soBang: soBang || gcnCu.soBang,
            soDon: targetSoDon,
            idKhachHangMoi: idKhachHangMoi || idKhachHang || undefined,
            idDoiTac: idDoiTac ?? undefined,
            daiDienSHTT: daiDienSHTT ?? ndSuaDoiDaiDien ?? undefined,
            maNhanHieu: maNhanHieu ?? undefined,
            nhanHieu: nhanHieu ?? undefined,
            dsNhomSPDV: dsNhomSPDV ?? ndSuaNhomSPDV ?? undefined,
            chiTietNhomSPDV: chiTietNhomSPDV ?? undefined,
            mauSacNH: mauSacNH ?? undefined,
            anhBang: anhBang ?? undefined,
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
            suaDoiNoiDungKhac,
            moTa: moTaSuaDoi || moTa || null,
        };

        const parsedTrangThaiDuyet = Number(trangThaiDuyet) || 0;

        const newSD = await DonSuaDoiGCN_NH_VN.create(
            {
                idGCN_NH: null,
                idGCN_NH_Goc: gcnCu.id,
                soDon: targetSoDon,
                ngayYeuCau: ngayYeuCau || new Date().toISOString().split("T")[0],
                lanSuaDoi: actualLanSuaDoi,
                ngayGhiNhanSuaDoi: ngayGhiNhanSuaDoi || null,
                duocGhiNhanSuaDoi: Boolean(duocGhiNhanSuaDoi),
                moTa: moTaSuaDoi || moTa || null,
                suaDoiDaiDien: Boolean(suaDoiDaiDien),
                ndSuaDoiDaiDien: ndSuaDoiDaiDien || null,
                suaDoiTenChuBang: Boolean(suaDoiTenChuBang),
                ndSuaDoiTenChuBang: ndSuaDoiTenChuBang || null,
                suaDoiDiaChi: Boolean(suaDoiDiaChi),
                ndSuaDoiDiaChi: ndSuaDoiDiaChi || null,
                suaNhan: Boolean(suaNhan),
                ndSuaNhan: ndSuaNhan || null,
                suaNhomSPDV: Boolean(suaNhomSPDV),
                ndSuaNhomSPDV: ndSuaNhomSPDV || null,
                suaDoiNoiDungKhac: Boolean(suaDoiNoiDungKhac),
                trangThaiDuyet: parsedTrangThaiDuyet === 2 ? 2 : 0,
                ngayChapThuan: null,
                ngayTuChoi: parsedTrangThaiDuyet === 2 ? ngayTuChoi || new Date().toISOString().split("T")[0] : null,
                lyDoTuChoi: parsedTrangThaiDuyet === 2 ? lyDoTuChoi || null : null,
                duLieuThayDoi: mergedDuLieuThayDoi,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || null,
            },
            { transaction }
        );

        let gcnMoi = null;
        if (parsedTrangThaiDuyet === 1) {
            const approved = await approveDonSuaDoiGCN_NH_VN(newSD, req.body, transaction);
            gcnMoi = approved.gcnMoi;
        }

        await transaction.commit();

        return res.status(201).json({
            message:
                parsedTrangThaiDuyet === 1
                    ? "Thêm và chấp thuận tờ khai sửa đổi GCN thành công!"
                    : "Tiếp nhận tờ khai sửa đổi GCN thành công (Trạng thái: Chưa chấp thuận)!",
            gcnMoi,
            newSD,
            data: newSD,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi thêm đơn sửa đổi GCN:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 2. CẬP NHẬT / DUYỆT TỜ KHAI SỬA ĐỔI GCN NHÃN HIỆU VN
 * Endpoint: PUT/POST /api/gcn_nh_sd_vn/update (và /api/application_sd_gcn_nh_vn/update)
 * =========================================================================
 */
export const updateApplication_SD_GCN_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            id,
            idDonSuaDoiGCN,
            idGCN_NH,
            idGCN_NH_Goc,
            soDonSD,
            soDon,
            ngayYeuCau,
            lanSuaDoi,
            ngayGhiNhanSuaDoi,
            duocGhiNhanSuaDoi,
            moTaSuaDoi,
            moTa,
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
            suaDoiNoiDungKhac,
            trangThaiDuyet,
            ngayChapThuan,
            ngayTuChoi,
            lyDoTuChoi,
            duLieuThayDoi,
            maNhanSuCapNhap,
        } = req.body;

        const targetId = id || idDonSuaDoiGCN;
        let record = null;
        if (targetId) {
            record = await DonSuaDoiGCN_NH_VN.findByPk(targetId, { transaction });
        } else if (idGCN_NH) {
            record = await DonSuaDoiGCN_NH_VN.findOne({ where: { idGCN_NH }, transaction });
        } else if (idGCN_NH_Goc) {
            record = await DonSuaDoiGCN_NH_VN.findOne({
                where: { idGCN_NH_Goc },
                order: [["createdAt", "DESC"]],
                transaction,
            });
        }

        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi GCN nhãn hiệu!" });
        }

        const existingDuLieu =
            typeof record.duLieuThayDoi === "string"
                ? (() => {
                      try {
                          return JSON.parse(record.duLieuThayDoi);
                      } catch {
                          return {};
                      }
                  })()
                : record.duLieuThayDoi || {};

        const updatedDuLieu =
            duLieuThayDoi !== undefined
                ? { ...existingDuLieu, ...(typeof duLieuThayDoi === "object" ? duLieuThayDoi : {}) }
                : existingDuLieu;

        await record.update(
            {
                soDon: soDonSD ?? soDon ?? record.soDon,
                ngayYeuCau: ngayYeuCau ?? record.ngayYeuCau,
                lanSuaDoi: lanSuaDoi ?? record.lanSuaDoi,
                ngayGhiNhanSuaDoi: ngayGhiNhanSuaDoi ?? record.ngayGhiNhanSuaDoi,
                duocGhiNhanSuaDoi: duocGhiNhanSuaDoi ?? record.duocGhiNhanSuaDoi,
                moTa: moTaSuaDoi ?? moTa ?? record.moTa,
                suaDoiDaiDien: suaDoiDaiDien ?? record.suaDoiDaiDien,
                ndSuaDoiDaiDien: ndSuaDoiDaiDien ?? record.ndSuaDoiDaiDien,
                suaDoiTenChuBang: suaDoiTenChuBang ?? record.suaDoiTenChuBang,
                ndSuaDoiTenChuBang: ndSuaDoiTenChuBang ?? record.ndSuaDoiTenChuBang,
                suaDoiDiaChi: suaDoiDiaChi ?? record.suaDoiDiaChi,
                ndSuaDoiDiaChi: ndSuaDoiDiaChi ?? record.ndSuaDoiDiaChi,
                suaNhan: suaNhan ?? record.suaNhan,
                ndSuaNhan: ndSuaNhan ?? record.ndSuaNhan,
                suaNhomSPDV: suaNhomSPDV ?? record.suaNhomSPDV,
                ndSuaNhomSPDV: ndSuaNhomSPDV ?? record.ndSuaNhomSPDV,
                suaDoiNoiDungKhac: suaDoiNoiDungKhac ?? record.suaDoiNoiDungKhac,
                duLieuThayDoi: updatedDuLieu,
                maNhanSuCapNhap: req.user?.maNhanSu || maNhanSuCapNhap || record.maNhanSuCapNhap,
            },
            { transaction }
        );

        let gcnMoi = null;
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null) {
            const nextStatus = Number(trangThaiDuyet);
            if (nextStatus === 1) {
                const approved = await approveDonSuaDoiGCN_NH_VN(record, req.body, transaction);
                gcnMoi = approved.gcnMoi;
            } else if (nextStatus === 2) {
                await rollbackSpawnedChildGCN(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 2,
                        idGCN_NH: null,
                        ngayChapThuan: null,
                        ngayTuChoi: ngayTuChoi || record.ngayTuChoi || new Date().toISOString().split("T")[0],
                        lyDoTuChoi: lyDoTuChoi !== undefined ? lyDoTuChoi : record.lyDoTuChoi,
                        duocGhiNhanSuaDoi: false,
                    },
                    { transaction }
                );
            } else if (nextStatus === 0) {
                await rollbackSpawnedChildGCN(record, transaction);
                await record.update(
                    {
                        trangThaiDuyet: 0,
                        idGCN_NH: null,
                        ngayChapThuan: null,
                        ngayTuChoi: null,
                        lyDoTuChoi: null,
                        duocGhiNhanSuaDoi: false,
                    },
                    { transaction }
                );
            }
        }

        await transaction.commit();

        return res.status(200).json({
            message: "Cập nhật tờ khai sửa đổi GCN nhãn hiệu thành công!",
            data: record,
            donSuaDoiGCN: record,
            gcnMoi,
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error("❌ Lỗi cập nhật đơn sửa đổi GCN:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 3. CHI TIẾT TỜ KHAI SỬA ĐỔI GCN NHÃN HIỆU VN
 * Endpoint: POST /api/gcn_nh_sd_vn/detail (và /api/application_sd_gcn_nh_vn/detail)
 * =========================================================================
 */
export const getApplication_SD_GCN_VNDetail = async (req, res) => {
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonSuaDoiGCN;
        const { idGCN_NH, idGCN_NH_Goc } = req.body || {};

        const whereCondition = {};
        if (id) whereCondition.id = id;
        else if (idGCN_NH) whereCondition.idGCN_NH = idGCN_NH;
        else if (idGCN_NH_Goc) whereCondition.idGCN_NH_Goc = idGCN_NH_Goc;
        else {
            return res.status(400).json({ message: "Thiếu id hoặc idGCN_NH / idGCN_NH_Goc!" });
        }

        const record = await DonSuaDoiGCN_NH_VN.findOne({
            where: whereCondition,
            include: [
                {
                    model: GCN_NH,
                    as: "gcnMoi",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "NhanHieu" },
                        { model: KhachHangCuoi, as: "KhachHangCuoi" },
                        { model: DoiTac, as: "DoiTac" },
                    ],
                },
                {
                    model: GCN_NH,
                    as: "gcnGoc",
                    required: false,
                    include: [
                        { model: NhanHieu, as: "NhanHieu" },
                        { model: KhachHangCuoi, as: "KhachHangCuoi" },
                        { model: DoiTac, as: "DoiTac" },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi GCN nhãn hiệu!" });
        }

        const plain = record.toJSON();
        plain.gcn = plain.gcnMoi || plain.gcnGoc || null;
        plain.soBangGoc = plain.gcnGoc?.soBang || null;
        plain.ngayCapBangGoc = plain.gcnGoc?.ngayCapBang || null;

        return res.status(200).json(plain);
    } catch (error) {
        console.error("❌ Lỗi lấy chi tiết đơn sửa đổi GCN:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * =========================================================================
 * 4. DANH SÁCH TỜ KHAI SỬA ĐỔI GCN NHÃN HIỆU VN
 * Endpoint: POST /api/gcn_nh_sd_vn/list (và /api/application_sd_gcn_nh_vn/list)
 * =========================================================================
 */
export const getAllApplication_SD_GCN_VN = async (req, res) => {
    try {
        const {
            soBang,
            soDon,
            searchText,
            trangThaiDuyet,
            customerName,
            partnerName,
            brandName,
            pageIndex = 1,
            pageSize = 20,
        } = req.body || {};
        const offset = (pageIndex - 1) * pageSize;

        const searchTerm = String(searchText || soBang || soDon || "").trim();
        const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
        const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
        const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

        const whereCondition = {};
        if (trangThaiDuyet !== undefined && trangThaiDuyet !== null && trangThaiDuyet !== "") {
            whereCondition.trangThaiDuyet = Number(trangThaiDuyet);
        }

        const gcnAttributes = [
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
            "loaiBang",
            "bangGoc",
            "idGCN_NH_Goc",
        ];

        const buildGcnIncludes = () => [
            {
                model: NhanHieu,
                as: "NhanHieu",
                attributes: ["tenNhanHieu", "linkAnh"],
                required: false,
            },
            {
                model: KhachHangCuoi,
                as: "KhachHangCuoi",
                attributes: ["tenKhachHang", "maKhachHang"],
                required: false,
            },
            {
                model: DoiTac,
                as: "DoiTac",
                attributes: ["tenDoiTac", "maDoiTac"],
                required: false,
            },
        ];

        const allRows = await DonSuaDoiGCN_NH_VN.findAll({
            where: whereCondition,
            include: [
                {
                    model: GCN_NH,
                    as: "gcnMoi",
                    required: false,
                    attributes: gcnAttributes,
                    include: buildGcnIncludes(),
                },
                {
                    model: GCN_NH,
                    as: "gcnGoc",
                    required: false,
                    attributes: gcnAttributes,
                    include: buildGcnIncludes(),
                },
            ],
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
        });

        const matchTokens = (textVal, query) => {
            if (!query) return true;
            const hay = String(textVal || "").toLowerCase();
            const hayNorm = hay.replace(/-/g, "");
            const tokens = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
            return tokens.every((tok) => hay.includes(tok) || hayNorm.includes(tok.replace(/-/g, "")));
        };

        const filtered = allRows.filter((row) => {
            const activeGCN = row.gcnMoi || row.gcnGoc;
            const rootGCN = row.gcnGoc || row.gcnMoi;
            if (!activeGCN && !rootGCN) return false;

            if (effectiveBrandName) {
                const b = `${activeGCN?.NhanHieu?.tenNhanHieu || ""} ${rootGCN?.NhanHieu?.tenNhanHieu || ""}`;
                if (!matchTokens(b, effectiveBrandName)) return false;
            }
            if (effectiveCustomerName) {
                const c = `${activeGCN?.KhachHangCuoi?.tenKhachHang || ""} ${activeGCN?.KhachHangCuoi?.maKhachHang || ""} ${rootGCN?.KhachHangCuoi?.tenKhachHang || ""} ${row.ndSuaDoiTenChuBang || ""}`;
                if (!matchTokens(c, effectiveCustomerName)) return false;
            }
            if (effectivePartnerName) {
                const p = `${activeGCN?.DoiTac?.tenDoiTac || ""} ${activeGCN?.DoiTac?.maDoiTac || ""} ${rootGCN?.DoiTac?.tenDoiTac || ""}`;
                if (!matchTokens(p, effectivePartnerName)) return false;
            }
            if (searchTerm) {
                const combined = [
                    row.soDon,
                    activeGCN?.soBang,
                    activeGCN?.soDon,
                    activeGCN?.maHoSo,
                    rootGCN?.soBang,
                    rootGCN?.soDon,
                    rootGCN?.maHoSo,
                ].join(" ");
                if (!matchTokens(combined, searchTerm)) return false;
            }
            return true;
        });

        const totalItems = filtered.length;
        const pagedRows = filtered.slice(offset, offset + Number(pageSize)).map((r) => {
            const plain = r.toJSON();
            plain.gcn = plain.gcnMoi || plain.gcnGoc || null;
            plain.soBangGoc = plain.gcnGoc?.soBang || null;
            plain.ngayCapBangGoc = plain.gcnGoc?.ngayCapBang || null;
            return plain;
        });

        return res.status(200).json({
            data: pagedRows,
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

/**
 * =========================================================================
 * 5. XÓA TỜ KHAI SỬA ĐỔI GCN NHÃN HIỆU VN
 * Endpoint: POST /api/gcn_nh_sd_vn/delete (hoặc DELETE .../delete/:id)
 * =========================================================================
 */
export const deleteApplication_SD_GCN_VN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const id = req.params?.id || req.body?.id || req.body?.idDonSuaDoiGCN;
        if (!id) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu ID tờ khai sửa đổi GCN cần xóa!" });
        }

        const record = await DonSuaDoiGCN_NH_VN.findByPk(id, { transaction });
        if (!record) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy tờ khai sửa đổi GCN!" });
        }

        await rollbackSpawnedChildGCN(record, transaction);
        await record.destroy({ transaction });
        await transaction.commit();

        return res.status(200).json({
            message: "Đã xóa tờ khai sửa đổi GCN thành công!",
            data: { id },
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        return res.status(500).json({ message: error.message });
    }
};
