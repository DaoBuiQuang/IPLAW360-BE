import { sequelize } from "../../config/db.js";
import { DonDangKy } from "../../models/donDangKyModel.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { DonSuaDoi_NH_VN } from "../../models/VN_SuaDoi_NH/donSuaDoiNH_VNModel.js";
import { DonDK_SPDV } from "../../models/donDK_SPDVMolel.js";
import crypto from "crypto";
import { TaiLieu } from "../../models/taiLieuModel.js";
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

const generateMaDonDangKy = (maHoSo) => {
    const randomStr = crypto.randomBytes(3).toString("hex"); // 6 ký tự hex
    return `${maHoSo}_${randomStr}`;
};

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

export const addApplicationSDNHVN = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            maHoSo,
            maDonDangKyCu,
            soDonSD,
            ngayYeuCau,
            lanSuaDoi,
            ngayGhiNhanSuaDoi,
            duocGhiNhanSuaDoi,
            moTaSuaDoi,
            suaDoiDaiDien,
            ndSuaDoiDaiDien,
            suaDoiTenChuDon,
            ndSuaDoiTenChuDon,
            suaDoiDiaChi,
            ndSuaDoiDiaChi,
            suaNhan,
            ndSuaNhan,
            suaNhomSPDV,
            ndSuaNhomSPDV,
        } = req.body;

        // ====== VALIDATE INPUT ======
        if (!maHoSo || !maDonDangKyCu || !soDonSD) {
            return res
                .status(400)
                .json({ message: "Thiếu thông tin bắt buộc (mã hồ sơ, mã đơn, số đơn)." });
        }

        // ====== TÌM ĐƠN ĐĂNG KÝ CŨ ======
        const donCu = await DonDangKy.findOne({ where: { maDonDangKy: maDonDangKyCu } });
        if (!donCu) {
            return res.status(404).json({ message: "Không tìm thấy đơn đăng ký gốc." });
        }
        if (donCu.trangThaiVuViec !== "1") {
            return res.status(400).json({
                message: "Trạng thái đơn phải là đang giải quyết mới được lập đơn sửa đổi."
            });
        }
        if (donCu.ngayThongBaoCapBang) {
            return res.status(400).json({
                message: "Đơn đăng ký này đã có ngày thông báo cấp bằng, không được phép lập đơn sửa đổi."
            });
        }

        let idKhachHangMoi = donCu.idKhachHang;

        // ====== XỬ LÝ SỬA ĐỔI KHÁCH HÀNG ======
        if (suaDoiTenChuDon || suaDoiDiaChi) {
            const khachCu = await KhachHangCuoi.findByPk(donCu.idKhachHang);

            if (!khachCu) {
                return res.status(404).json({ message: "Không tìm thấy khách hàng của đơn gốc." });
            }
            const maKhachHangMoi = generateNewMaKhachHang(khachCu.maKhachHang);
            const khachMoi = await KhachHangCuoi.create(
                {
                    tenKhachHang: suaDoiTenChuDon ? ndSuaDoiTenChuDon : khachCu.tenKhachHang,
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
        const maDonDangKyMoi = generateMaDonDangKy(maHoSo);
        // ====== TẠO BẢN GHI ĐƠN MỚI ======
        const donMoi = await DonDangKy.create(
            {
                ...donCu.toJSON(),
                id: undefined,
                maDonDangKy: maDonDangKyMoi,
                loaiDon: 2, // đơn sửa đổi
                idKhachHang: idKhachHangMoi,
                donGoc: 0, // đơn sửa đổi mới giữ 0
                trangThai: "MOI",
                ngayNop: ngayYeuCau,
            },
            { transaction }
        );

        await donCu.update({ donGoc: 1 }, { transaction });
        const newSD = await DonSuaDoi_NH_VN.create(
            {
                maHoSo,
                maDonDangKyCu,
                maDonDangKy: donMoi.maDonDangKy,
                soDonSD,
                maDonDangKyGoc: maDonDangKyCu,
                ngayYeuCau,
                lanSuaDoi,
                ngayGhiNhanSuaDoi,
                duocGhiNhanSuaDoi,
                moTaSuaDoi,
                suaDoiDaiDien,
                ndSuaDoiDaiDien,
                suaDoiTenChuDon,
                ndSuaDoiTenChuDon,
                suaDoiDiaChi,
                ndSuaDoiDiaChi,
                suaNhan,
                ndSuaNhan,
                suaNhomSPDV,
                ndSuaNhomSPDV,
            },
            { transaction }
        );
        const spdvCuList = await DonDK_SPDV.findAll({
            where: { maDonDangKy: maDonDangKyCu }
        });

        if (spdvCuList && spdvCuList.length > 0) {
            const spdvMoiList = spdvCuList.map(spdvCu => ({
                maDonDangKy: maDonDangKyMoi,
                maSPDV: spdvCu.maSPDV,
                isAutoImport: spdvCu.isAutoImport,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));

            await DonDK_SPDV.bulkCreate(spdvMoiList, { transaction });
        }
        await transaction.commit();

        res.status(201).json({
            message: "Thêm đơn sửa đổi thành công!",
            donMoi,
            newSD,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi thêm đơn sửa đổi:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllApplicationSD_VN = async (req, res) => {
  try {
    const {
      maSPDVList,
      trangThaiDon,
      searchText,
      fields = [],
      filterCondition = {},
      customerName,
      partnerName,
      brandName,
      pageIndex = 1,
      pageSize = 20
    } = req.body;

    const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
    const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
    const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

    // luôn đảm bảo có các field tối thiểu
    if (!fields.includes("maDonDangKy")) fields.push("maDonDangKy");
    if (!fields.includes("donGoc")) fields.push("donGoc");

    const offset = (pageIndex - 1) * pageSize;
    const {
      selectedField,
      fromDate,
      toDate,
      hanXuLyFilter,
      hanTraLoiFilter,
      sortByHanXuLy,
      sortByHanTraLoi
    } = filterCondition;

    const whereCondition = { loaiDon: 2 };

    // ====== Lọc cơ bản ======
    if (trangThaiDon) whereCondition.trangThaiDon = trangThaiDon;

    // ====== Tìm kiếm (soDon, maHoSoVuViec, clientsRef, tenNhanHieu) ======
    if (searchText) {
      const raw = String(searchText).trim();
      const tokens = raw.split(/\s+/).filter(Boolean);
      const normalizedSearch = raw.replace(/-/g, "");

      if (tokens.length <= 1) {
        whereCondition[Op.or] = [
          { '$DonDangKy.soDon$': { [Op.like]: `%${raw}%` } },
          literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normalizedSearch}%'`),
          { '$DonDangKy.maHoSoVuViec$': { [Op.like]: `%${raw}%` } },
          literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normalizedSearch}%'`),
          { '$DonDangKy.clientsRef$': { [Op.like]: `%${raw}%` } },
          literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normalizedSearch}%'`),
          { '$nhanHieu.tenNhanHieu$': { [Op.like]: `%${raw}%` } },
        ];
      } else {
        whereCondition[Op.and] = whereCondition[Op.and] || [];
        tokens.forEach((tok) => {
          const normTok = tok.replace(/-/g, "");
          whereCondition[Op.and].push({
            [Op.or]: [
              { '$DonDangKy.soDon$': { [Op.like]: `%${tok}%` } },
              literal(`REPLACE(\`DonDangKy\`.\`soDon\`, '-', '') LIKE '%${normTok}%'`),
              { '$DonDangKy.maHoSoVuViec$': { [Op.like]: `%${tok}%` } },
              literal(`REPLACE(\`DonDangKy\`.\`maHoSoVuViec\`, '-', '') LIKE '%${normTok}%'`),
              { '$DonDangKy.clientsRef$': { [Op.like]: `%${tok}%` } },
              literal(`REPLACE(\`DonDangKy\`.\`clientsRef\`, '-', '') LIKE '%${normTok}%'`),
              { '$nhanHieu.tenNhanHieu$': { [Op.like]: `%${tok}%` } },
            ],
          });
        });
      }
    }

    // ====== Lọc theo ngày (selectedField) ======
    if (selectedField && fromDate && toDate) {
      whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
    }

    // ====== Lọc theo hạn trả lời ======
    if (hanTraLoiFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let from = null, to = null;

      switch (hanTraLoiFilter) {
        case "<3":
          from = today;
          to = new Date(today);
          to.setDate(today.getDate() + 3);
          break;
        case "<7":
          from = today;
          to = new Date(today);
          to.setDate(today.getDate() + 7);
          break;
        case "overdue":
          to = today;
          break;
      }

      if (from && to)
        whereCondition.hanTraLoi = { [Op.between]: [from, to] };
      else if (to)
        whereCondition.hanTraLoi = { [Op.lt]: to };
    }

    // ====== Lọc theo hạn xử lý ======
    if (hanXuLyFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let from = null, to = null;

      switch (hanXuLyFilter) {
        case "<3":
          from = today;
          to = new Date(today);
          to.setDate(today.getDate() + 3);
          break;
        case "<7":
          from = today;
          to = new Date(today);
          to.setDate(today.getDate() + 7);
          break;
        case "overdue":
          to = today;
          break;
      }

      if (from && to)
        whereCondition.hanXuLy = { [Op.between]: [from, to] };
      else if (to)
        whereCondition.hanXuLy = { [Op.lt]: to };
    }

    // ====== Bổ sung field liên quan tài liệu chưa nộp ======
    if (fields.includes("trangThaiHoanThienHoSoTaiLieu")) {
      if (!fields.includes("taiLieuChuaNop"))
        fields.push("taiLieuChuaNop");
      if (!fields.includes("ngayHoanThanhHoSoTaiLieu_DuKien"))
        fields.push("ngayHoanThanhHoSoTaiLieu_DuKien");
    }

    if (!fields.includes("hanXuLy"))
      fields.push("hanXuLy");

    // ====== ORDER ======
    const order = [];
    if (sortByHanTraLoi) {
      order.push([Sequelize.literal("hanTraLoi IS NULL"), "ASC"]);
      order.push(["hanTraLoi", "ASC"]);
    }
    if (sortByHanXuLy) {
      order.push([Sequelize.literal("hanXuLy IS NULL"), "ASC"]);
      order.push(["hanXuLy", "ASC"]);
    }

    // ====== Query chính ======
    const { count: totalItems, rows: applications } =
      await DonDangKy.findAndCountAll({
        where: whereCondition,
        distinct: true,
        col: "maDonDangKy",
        include: [
          {
            model: DonDK_SPDV,
            where:
              maSPDVList && maSPDVList.length > 0
                ? { maSPDV: { [Op.in]: maSPDVList } }
                : undefined,
            required: maSPDVList && maSPDVList.length > 0,
            attributes: ["maSPDV"],
          },
          {
            model: TaiLieu,
            where: { trangThai: "Chưa nộp" },
            required: false,
            as: "taiLieuChuaNop",
            attributes: ["tenTaiLieu"],
          },
          {
            model: NhanHieu,
            as: "nhanHieu",
            attributes: ["tenNhanHieu", "linkAnh"],
            required: !!effectiveBrandName,
            where: buildTokensSearch(effectiveBrandName, "tenNhanHieu"),
          },
          {
            model: KhachHangCuoi,
            as: "khachHang",
            attributes: ["tenKhachHang", "maKhachHang"],
            required: !!effectiveCustomerName,
            where: buildCustomerSearch(effectiveCustomerName),
          },
          {
            model: DoiTac,
            as: "doitac",
            attributes: ["tenDoiTac", "maDoiTac"],
            required: !!effectivePartnerName,
            where: buildPartnerSearch(effectivePartnerName),
          },
          // ====== include thêm thông tin ĐƠN SỬA ĐỔI ======
          {
            model: DonSuaDoi_NH_VN,
            as: "donSuaDoi",
            required: false,
            attributes: [
              "soDon",
              "ngayYeuCau",
              "lanSuaDoi",
              "ngayGhiNhanSuaDoi",
              "duocGhiNhanSuaDoi",
              "moTa",
              "suaDoiDaiDien",
              "ndSuaDoiDaiDien",
              "suaDoiTenChuDon",
              "ndSuaDoiTenChuDon",
              "suaDoiDiaChi",
              "ndSuaDoiDiaChi",
              "suaNhan",
              "ndSuaNhan",
              "suaNhomSPDV",
              "ndSuaNhomSPDV",
            ],
          },
        ],
        subQuery: false,
        limit: pageSize,
        offset,
        order,
      });

    if (!applications.length) {
      return res.status(200).json({
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          pageIndex: Number(pageIndex),
          pageSize: Number(pageSize),
        },
      });
    }

    // ====== Map kết quả ======
    const fieldMap = {
      maDonDangKy: (app) => app.maDonDangKy,
      loaiDon: (app) => app.loaiDon,
      maHoSoVuViec: (app) => app.maHoSoVuViec,
      soDon: (app) => app.soDon,
      tenNhanHieu: (app) => app.nhanHieu?.tenNhanHieu || null,
      tenKhachHang: (app) => app.khachHang?.tenKhachHang || null,
      tenDoiTac: (app) => app.doitac?.tenDoiTac || null,
      tinhTrangDon: (app) => app.trangThaiDon,
      trangThaiVuViec: (app) => app.trangThaiVuViec,
      ngayNopDon: (app) => app.ngayNopDon,
      ngayHoanThanhHoSoTaiLieu: (app) => app.ngayHoanThanhHoSoTaiLieu,
      ngayKQThamDinhHinhThuc: (app) => app.ngayKQThamDinhHinhThuc,
      ngayCongBoDon: (app) => app.ngayCongBoDon,
      ngayKQThamDinhND: (app) => app.ngayKQThamDinhND,
      ngayTraLoiKQThamDinhND: (app) => app.ngayTraLoiKQThamDinhND,
      ngayThongBaoCapBang: (app) => app.ngayThongBaoCapBang,
      hanNopPhiCapBang: (app) => app.hanNopPhiCapBang,
      ngayNopPhiCapBang: (app) => app.ngayNopPhiCapBang,
      ngayNhanBang: (app) => app.ngayNhanBang,
      soBang: (app) => app.soBang,
      ngayCapBang: (app) => app.ngayCapBang,
      ngayHetHanBang: (app) => app.ngayHetHanBang,
      ngayGuiBangChoKhachHang: (app) => app.ngayGuiBangChoKhachHang,
      trangThaiHoanThienHoSoTaiLieu: (app) => {
        if (app.ngayHoanThanhHoSoTaiLieu) return "Hoàn thành";
        return app.trangThaiHoanThienHoSoTaiLieu || "Chưa hoàn thành";
      },
      ngayHoanThanhHoSoTaiLieu_DuKien: (app) =>
        app.ngayHoanThanhHoSoTaiLieu_DuKien,
      taiLieuChuaNop: (app) =>
        app.taiLieuChuaNop?.map((tl) => ({ tenTaiLieu: tl.tenTaiLieu })) ||
        [],
      dsSPDV: (app) =>
        app.DonDK_SPDVs?.map((sp) => ({ maSPDV: sp.maSPDV })) || [],
      hanXuLy: (app) => app.hanXuLy,
      hanTraLoi: (app) => app.hanTraLoi,
      linkAnh: (app) => app.nhanHieu?.linkAnh || null,
      donGoc: (app) => app.donGoc,

      // ====== Các field lấy từ DonSuaDoi_NH_VN (donSuaDoi) ======
      soDonSD: (app) => app.donSuaDoi?.soDon || null,
      ngayYeuCau: (app) => app.donSuaDoi?.ngayYeuCau || null,
      lanSuaDoi: (app) => app.donSuaDoi?.lanSuaDoi || null,
      ngayGhiNhanSuaDoi: (app) => app.donSuaDoi?.ngayGhiNhanSuaDoi || null,
      duocGhiNhanSuaDoi: (app) => app.donSuaDoi?.duocGhiNhanSuaDoi || null,
      moTaSuaDoi: (app) => app.donSuaDoi?.moTa || null,
      moTa: (app) => app.donSuaDoi?.moTa || null,
      suaDoiDaiDien: (app) => app.donSuaDoi?.suaDoiDaiDien || null,
      ndSuaDoiDaiDien: (app) => app.donSuaDoi?.ndSuaDoiDaiDien || null,
      suaDoiTenChuDon: (app) => app.donSuaDoi?.suaDoiTenChuDon || null,
      ndSuaDoiTenChuDon: (app) => app.donSuaDoi?.ndSuaDoiTenChuDon || null,
      suaDoiDiaChi: (app) => app.donSuaDoi?.suaDoiDiaChi || null,
      ndSuaDoiDiaChi: (app) => app.donSuaDoi?.ndSuaDoiDiaChi || null,
      suaNhan: (app) => app.donSuaDoi?.suaNhan || null,
      ndSuaNhan: (app) => app.donSuaDoi?.ndSuaNhan || null,
      suaNhomSPDV: (app) => app.donSuaDoi?.suaNhomSPDV || null,
      ndSuaNhomSPDV: (app) => app.donSuaDoi?.ndSuaNhomSPDV || null,
    };

    const result = applications.map((app) => {
      const row = {};
      fields.forEach((field) => {
        if (fieldMap[field]) row[field] = fieldMap[field](app);
      });
      return row;
    });

    res.status(200).json({
      data: result,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        pageIndex: Number(pageIndex),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    console.error("Lỗi getAllApplicationSD_VN:", error);
    res.status(500).json({ message: error.message });
  }
};

