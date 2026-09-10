import { literal, Op } from "sequelize";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";
import { QuocGia } from "../models/quocGiaModel.js";
import { VuViec } from "../models/vuViecModel.js";
import { NhanSu } from "../models/nhanSuModel.js";
import { DoiTac } from "../models/doiTacModel.js";

/**
 * VIỆT NAM (giữ nguyên, chỉ bổ sung if cần)
 */
export const getVuViecs = async (req, res) => {
  try {
    const {
      fields = [],
      pageIndex = 1,
      pageSize = 20,
      maQuocGia, // nếu muốn cứng VN thì có thể bỏ param này
      idKhachHang,
      idDoiTac,
    } = req.body;

    const offset = (pageIndex - 1) * pageSize;

    const whereCondition = {};

    // Nếu bạn muốn API VN **chỉ** trả VN: đặt mặc định 'VN'
    // Hoặc nếu phía client truyền maQuocGia thì ưu tiên giá trị truyền vào.
    whereCondition.maQuocGiaVuViec = maQuocGia || "VN";

    if (idDoiTac) whereCondition.idDoiTac = idDoiTac;
    if (idKhachHang) whereCondition.idKhachHang = idKhachHang;

    const totalItems = await VuViec.count({ where: whereCondition });

    const vuViecs = await VuViec.findAll({
      where: whereCondition,
      include: [
        { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
        { model: QuocGia, as: "QuocGia", attributes: ["tenQuocGia"] },
        {
          model: KhachHangCuoi,
          as: "KhachHangCuoi",
          attributes: ["tenKhachHang"],
        },
      ],
      limit: pageSize,
      offset,
    });

    if (!vuViecs.length) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng nào" });
    }

    const fieldMap = {
      id: (vv) => vv.id,
      maHoSo: (vv) => vv.maHoSo,
      tenVuViec: (vv) => vv.tenVuViec,
      tenKhachHang: (vv) => vv.KhachHangCuoi?.tenKhachHang,
      tenDoiTac: (vv) => vv.DoiTac?.tenDoiTac,
      soDon: (vv) => vv.soDon,
      tenQuocGia: (vv) => vv.QuocGia?.tenQuocGia,
      moTa: (vv) => vv.moTa,
      ngayTaoVV: (vv) => vv.ngayTaoVV,
      deadline: (vv) => vv.deadline,
      softDeadline: (vv) => vv.softDeadline,
      soTien: (vv) => vv.soTien,
      loaiTienTe: (vv) => vv.loaiTienTe,
      xuatBill: (vv) => vv.xuatBill,
      maDon: (vv) => vv.maDon,
      trangThaiYCTT: (vv) => vv.trangThaiYCTT,
    };

    const result = vuViecs.map((vv) => {
      const row = { id: vv.id };
      fields.forEach((f) => {
        if (fieldMap[f]) row[f] = fieldMap[f](vv);
      });
      row.loaiTienTe = vv.loaiTienTe; // đảm bảo luôn có
      row.maDon = vv.maDon;
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
    res.status(500).json({ message: error.message });
  }
};

/**
 * CAMPHUCHIA (maQuocGia = 'KH')
 * — Vụ việc chính (isMainCase = true)
 */
export const getVuViecsKH = async (req, res) => {
  try {
    const {
      fields = [],
      pageIndex = 1,
      pageSize = 20,
      idKhachHang,
      idDoiTac,
      // maQuocGia không nhận từ client; cứng 'KH'
    } = req.body;

    const offset = (pageIndex - 1) * pageSize;

    const whereCondition = {
      // isMainCase: true,
      maQuocGiaVuViec: "KH",
    };
    if (idDoiTac) whereCondition.idDoiTac = idDoiTac;
    if (idKhachHang) whereCondition.idKhachHang = idKhachHang;

    const totalItems = await VuViec.count({ where: whereCondition });

    const vuViecs = await VuViec.findAll({
      where: whereCondition,
      include: [
        { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
        { model: QuocGia, as: "QuocGia", attributes: ["tenQuocGia"] },
        {
          model: KhachHangCuoi,
          as: "KhachHangCuoi",
          attributes: ["tenKhachHang"],
        },
      ],
      limit: pageSize,
      offset,
    });

    if (!vuViecs.length) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy vụ việc chính (KH)" });
    }

    const fieldMap = {
      id: (vv) => vv.id,
      maHoSo: (vv) => vv.maHoSo,
      tenVuViec: (vv) => vv.tenVuViec,
      tenKhachHang: (vv) => vv.KhachHangCuoi?.tenKhachHang,
      tenDoiTac: (vv) => vv.DoiTac?.tenDoiTac,
      soDon: (vv) => vv.soDon,
      tenQuocGia: (vv) => vv.QuocGia?.tenQuocGia,
      moTa: (vv) => vv.moTa,
      ngayTaoVV: (vv) => vv.ngayTaoVV,
      deadline: (vv) => vv.deadline,
      softDeadline: (vv) => vv.softDeadline,
      soTien: (vv) => vv.soTien,
      loaiTienTe: (vv) => vv.loaiTienTe,
      xuatBill: (vv) => vv.xuatBill,
      maDon: (vv) => vv.maDon,
      trangThaiYCTT: (vv) => vv.trangThaiYCTT,
    };

    const result = vuViecs.map((vv) => {
      const row = { id: vv.id };
      fields.forEach((f) => {
        if (fieldMap[f]) row[f] = fieldMap[f](vv);
      });
      row.loaiTienTe = vv.loaiTienTe;
      row.maDon = vv.maDon;

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
    res.status(500).json({ message: error.message });
  }
};

/**
 * CAMPHUCHIA (maQuocGia = 'KH')
 * — ĐÃ XUẤT BILL
 */
const fieldMap = {
  id: (vv) => vv.id,
  maHoSo: (vv) => vv.maHoSo,
  tenVuViec: (vv) => vv.tenVuViec,
  tenKhachHang: (vv) => vv.KhachHangCuoi?.tenKhachHang,
  idKhachHang: (vv) => vv.idKhachHang,
  tenDoiTac: (vv) => vv.DoiTac?.tenDoiTac,
  idDoiTac: (vv) => vv.idDoiTac,
  soDon: (vv) => vv.soDon,
  tenQuocGia: (vv) => vv.QuocGia?.tenQuocGia,
  moTa: (vv) => vv.moTa,
  ngayTaoVV: (vv) => vv.ngayTaoVV,
  deadline: (vv) => vv.deadline,
  softDeadline: (vv) => vv.softDeadline,
  soTien: (vv) => vv.soTien,
  loaiTienTe: (vv) => vv.loaiTienTe,
  xuatBill: (vv) => vv.xuatBill,
  ngayXuatBill: (vv) => vv.ngayXuatBill,
  nguoiXuatBill: (vv) => vv.NhanSu?.hoTen,
  maDon: (vv) => vv.maDon,
  trangThaiYCTT: (vv) => vv.trangThaiYCTT,
  ghiChuTuChoi: (vv) => vv.ghiChuTuChoi,
};

// approved: true -> chỉ 3 (Đã duyệt)
// approved: false -> 0,1,2 (Chưa đề nghị / Chờ duyệt / Từ chối)
function buildGetVuViecsDaXuatBill({
  countryFixed,
  defaultCountryIfMissing,
  statusFilter,
}) {
  return async (req, res) => {
    try {
      const {
        fields = [],
        pageIndex = 1,
        pageSize = 20,
        maQuocGia, // chỉ dùng khi không khóa cứng
        idKhachHang,
        idDoiTac,
      } = req.body;

      const offset = (pageIndex - 1) * pageSize;

      const whereCondition = {
        xuatBill: true, // luôn true
        maQuocGiaVuViec: countryFixed
          ? countryFixed
          : maQuocGia || defaultCountryIfMissing || "VN",
        trangThaiYCTT: Array.isArray(statusFilter)
          ? { [Op.in]: statusFilter }
          : statusFilter, // cho phép truyền trực tiếp 1 số (vd: 3)
      };

      if (idDoiTac) whereCondition.idDoiTac = idDoiTac;
      if (idKhachHang) whereCondition.idKhachHang = idKhachHang;

      const totalItems = await VuViec.count({ where: whereCondition });

      const vuViecs = await VuViec.findAll({
        where: whereCondition,
        include: [
          { model: QuocGia, as: "QuocGia", attributes: ["tenQuocGia"] },
          {
            model: KhachHangCuoi,
            as: "KhachHangCuoi",
            attributes: ["tenKhachHang"],
          },
          { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
          { model: NhanSu, as: "NhanSu", attributes: ["hoTen"] },
        ],
        order: [
          [literal(`CASE WHEN ngayXuatBill IS NULL THEN 1 ELSE 0 END`), "ASC"],
          ["ngayXuatBill", "DESC"],
          ["id", "DESC"],
        ],
        limit: Number(pageSize),
        offset: Number(offset),
      });

      if (!vuViecs.length) {
        // Note: whereCondition gồm xuatBill=true, maQuocGiaVuViec, trangThaiYCTT
        return res.status(404).json({
          message: "Không tìm thấy vụ việc phù hợp điều kiện.",
        });
      }

      const result = vuViecs.map((vv) => {
        const row = { id: vv.id };
        fields.forEach((f) => {
          if (fieldMap[f]) row[f] = fieldMap[f](vv);
        });
        row.loaiTienTe = vv.loaiTienTe;
        row.idKhachHang = vv.idKhachHang;
        row.idDoiTac = vv.idDoiTac;
        row.trangThaiYCTT = vv.trangThaiYCTT;
        row.ngayXuatBill = vv.ngayXuatBill;
        row.maDon = vv.maDon;
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
      res.status(500).json({ message: error.message });
    }
  };
}

/** VN, CHƯA DUYỆT: chỉ 0 hoặc 1 */
export const getVuViecsDaXuatBill_ChuaDuyet = buildGetVuViecsDaXuatBill({
  countryFixed: null,
  defaultCountryIfMissing: "VN",
  statusFilter: [0, 1],
});

/** KH (cứng "KH"), CHƯA DUYỆT: chỉ 0 hoặc 1 */
export const getVuViecsDaXuatBillKH_ChuaDuyet = buildGetVuViecsDaXuatBill({
  countryFixed: "KH",
  statusFilter: [0, 1],
});

/** VN, ĐÃ DUYỆT: đúng trạng thái 3 */
export const getVuViecsDaXuatBill_DaDuyet = buildGetVuViecsDaXuatBill({
  countryFixed: null,
  defaultCountryIfMissing: "VN",
  statusFilter: 3,
});

/** KH (cứng "KH"), ĐÃ DUYỆT: đúng trạng thái 3 */
export const getVuViecsDaXuatBillKH_DaDuyet = buildGetVuViecsDaXuatBill({
  countryFixed: "KH",
  statusFilter: [3],
});

export const getVuViecsDaXuatBill_Full = buildGetVuViecsDaXuatBill({
  countryFixed: null,
  defaultCountryIfMissing: "VN",
  statusFilter: [0, 1, 2, 3],
});
export const getVuViecsDaXuatBill_BiTuChoi = buildGetVuViecsDaXuatBill({
  countryFixed: null,
  defaultCountryIfMissing: "VN",
  statusFilter: [2],
});

export const getVuViecsDaXuatBill_KH_FULL = buildGetVuViecsDaXuatBill({
  countryFixed: null,
  defaultCountryIfMissing: "KH",
  statusFilter: [0, 1, 2, 3],
});
export const getVuViecsDaXuatBill_KH_BiTuChoi = buildGetVuViecsDaXuatBill({
  countryFixed: null,
  defaultCountryIfMissing: "KH",
  statusFilter: [2],
});

export const getVuViecsDaXuatBill_DaDuyet_ALL = buildGetVuViecsDaXuatBill({
  statusFilter: [3],
});

export const getVuViecsDaXuatBill_Full_ALL = buildGetVuViecsDaXuatBill({
  countryFixed: null,
  statusFilter: [0, 1, 2, 3],
});

export const getVuViecsDaXuatBill_ChuaDuyet_ALL = buildGetVuViecsDaXuatBill({
  statusFilter: [0, 1],
});

export const getCaseById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Thiếu id vụ việc" });
    }

    const customer = await VuViec.findByPk(id, {
      include: [],
    });

    if (!customer) {
      return res.status(404).json({ message: "Vụ việc không tồn tại" });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCasesByMaHoSo = async (req, res) => {
  try {
    const { maHoSo, idKhachHang, idDoiTac } = req.body;

    if (!maHoSo && !idKhachHang && !idDoiTac) {
      return res.status(400).json({ message: "Thiếu dữ liệu lọc" });
    }

    const cases = await VuViec.findAll({
      where: {
        [Op.or]: [
          maHoSo ? { maHoSo } : null,
          idKhachHang ? { idKhachHang } : null,
          idDoiTac ? { idDoiTac } : null,
        ].filter(Boolean),
      },
      attributes: ["id", "maHoSo", "tenVuViec", "moTa", "soTien"],
    });

    if (!cases || cases.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy vụ việc phù hợp" });
    }

    res.status(200).json(cases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveYCTT = async (req, res) => {
  const { ids, id, requireXuatBill = true } = req.body || {};
  const idList = Array.isArray(ids) ? ids : id ? [id] : [];

  if (!idList.length) {
    return res.status(400).json({ message: "Thiếu id/ids để duyệt." });
  }

  // 🔧 dùng instance từ model thay vì biến 'sequelize'
  const t = await VuViec.sequelize.transaction();
  try {
    const whereEligible = {
      id: { [Op.in]: idList },
      trangThaiYCTT: { [Op.ne]: 3 },
      ...(requireXuatBill ? { xuatBill: true } : {}),
    };

    // khoá để tránh race condition
    const rows = await VuViec.findAll({
      where: whereEligible,
      attributes: ["id"],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const eligibleIds = rows.map((r) => r.id);
    if (eligibleIds.length === 0) {
      await t.rollback();
      return res.status(404).json({
        message:
          "Không tìm thấy vụ việc hợp lệ để duyệt (có thể đã duyệt hoặc chưa xuất bill).",
        updatedCount: 0,
        updatedIds: [],
        skippedIds: idList,
      });
    }

    const now = new Date();
    const auditPayload = { ngayDuyet: now };
    if (req.user?.id) auditPayload.nguoiDuyetId = req.user.id;

    await VuViec.update(
      { trangThaiYCTT: 3, ghiChuTuChoi: null, ...auditPayload },
      { where: { id: { [Op.in]: eligibleIds } }, transaction: t },
    );

    const updatedRows = await VuViec.findAll({
      where: { id: { [Op.in]: eligibleIds } },
      attributes: ["id", "trangThaiYCTT"],
      transaction: t,
    });

    const updatedIds = updatedRows.map((r) => r.id);
    const skippedIds = idList.filter((x) => !updatedIds.includes(x));

    await t.commit();
    return res.status(200).json({
      status: true,
      message: `Duyệt thành công ${updatedIds.length} bản ghi.`,
      updatedCount: updatedIds.length,
      updated: updatedRows,
      updatedIds,
      skippedIds,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ message: error.message });
  }
};

export const rejectYCTT = async (req, res) => {
  const { ids, id, reason, requireXuatBill = true } = req.body || {};
  const idList = Array.isArray(ids) ? ids : id ? [id] : [];

  if (!idList.length) {
    return res.status(400).json({ message: "Thiếu id/ids để từ chối." });
  }
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ message: "Thiếu lý do từ chối (reason)." });
  }

  const t = await VuViec.sequelize.transaction();
  try {
    // đủ điều kiện: thuộc idList, chưa DUYỆT (≠3), và (tuỳ chọn) xuatBill=true
    // (ta cũng loại luôn bản ghi đã từ chối 2 để tránh update vô ích)
    const whereEligible = {
      id: { [Op.in]: idList },
      trangThaiYCTT: { [Op.notIn]: [2, 3] }, // không cập nhật lại nếu đã từ chối(2) hoặc đã duyệt(3)
      ...(requireXuatBill ? { xuatBill: true } : {}),
    };

    // khóa để tránh race-condition
    const rows = await VuViec.findAll({
      where: whereEligible,
      attributes: ["id"],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const eligibleIds = rows.map((r) => r.id);
    if (eligibleIds.length === 0) {
      await t.rollback();
      return res.status(404).json({
        message:
          "Không có bản ghi hợp lệ để từ chối (có thể đã duyệt hoặc đã từ chối).",
        updatedCount: 0,
        updatedIds: [],
        skippedIds: idList,
      });
    }

    const audit = {
      ngayTuChoi: new Date(),
      ghiChuTuChoi: String(reason).trim(),
    };
    if (req.user?.id) audit.nguoiTuChoiId = req.user.id;

    await VuViec.update(
      { trangThaiYCTT: 2, ...audit },
      { where: { id: { [Op.in]: eligibleIds } }, transaction: t },
    );

    const updatedRows = await VuViec.findAll({
      where: { id: { [Op.in]: eligibleIds } },
      attributes: ["id", "trangThaiYCTT", "ghiChuTuChoi"],
      transaction: t,
    });

    const updatedIds = updatedRows.map((r) => r.id);
    const skippedIds = idList.filter((x) => !updatedIds.includes(x));

    await t.commit();
    return res.status(200).json({
      status: true,
      message: `Đã từ chối ${updatedIds.length} bản ghi.`,
      updatedCount: updatedIds.length,
      updated: updatedRows, // [{id, trangThaiYCTT, ghiChuTuChoi}]
      updatedIds,
      skippedIds,
    });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: err.message });
  }
};

export const updateVuViec = async (req, res) => {
  const transaction = await VuViec.sequelize.transaction();
  try {
    const {
      id,
      tenVuViec,
      moTa,
      trangThai,
      deadline,
      softDeadline,
      xuatBill,
      soTien,
      loaiTienTe,
      maNguoiXuLy,
      isMainCase,
    } = req.body;

    // Tìm vụ việc theo id
    const vuViec = await VuViec.findByPk(id);
    if (!vuViec) {
      await transaction.rollback();
      return res.status(404).json({ message: "Không tìm thấy vụ việc" });
    }

    // Nếu bật xuất bill thì cập nhật ngày + người xuất bill
    let ngayXuatBill = vuViec.ngayXuatBill;
    let maNguoiXuatBill = vuViec.maNguoiXuatBill;

    if (xuatBill === true && !vuViec.xuatBill) {
      ngayXuatBill = new Date();
      maNguoiXuatBill = req.body.maNhanSuCapNhap; // truyền từ FE
    }

    // Update dữ liệu
    await vuViec.update(
      {
        tenVuViec,
        moTa,
        trangThai,
        deadline,
        softDeadline,
        xuatBill,
        ngayXuatBill,
        maNguoiXuatBill,
        soTien,
        loaiTienTe,
        maNguoiXuLy,
        isMainCase,
      },
      { transaction },
    );

    await transaction.commit();
    return res.status(200).json({
      message: "Cập nhật vụ việc thành công",
      vuViec,
    });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
