import { Op, Sequelize } from "sequelize";

import { DonDangKyNhanHieu_KH } from "../models/KH/donDangKyNhanHieu_KHModel.js";
import { GCN_NH } from "../models/GCN_NHModel.js";
import { GCN_NH_KH } from "../models/GCN_NH_KHModel.js";
import { GiayUyQuyen } from "../models/GiayUyQuyenModel.js";
import { DonDangKy } from "../models/donDangKyModel.js";
import { VuViec } from "../models/vuViecModel.js";
import { NhanSu } from "../models/nhanSuModel.js";

const buildDateRanges = () => {
  const now = new Date();
  const d7 = new Date(now); d7.setDate(d7.getDate() + 7);
  const d15 = new Date(now); d15.setDate(d15.getDate() + 15);
  const d30 = new Date(now); d30.setDate(d30.getDate() + 30);
  return { now, d7, d15, d30 };
};

const countByDate = async (Model, field, extraWhere = {}) => {
  const { now, d7, d15, d30 } = buildDateRanges();

  return {
    overdue: await Model.count({ where: { ...extraWhere, [field]: { [Op.lt]: now } } }),
    d7: await Model.count({ where: { ...extraWhere, [field]: { [Op.between]: [now, d7] } } }),
    d15: await Model.count({ where: { ...extraWhere, [field]: { [Op.between]: [now, d15] } } }),
    d30: await Model.count({ where: { ...extraWhere, [field]: { [Op.between]: [now, d30] } } }),
  };
};

const getLast3MonthKeys = () => {
  const now = new Date();
  const keys = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
};

const getStartOf3MonthsAgo = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
};

const countMonthlyTotalAndIncompleteLast3 = async (
  Model,
  dateField,
  countField,
  extraWhere = {}
) => {
  const months = getLast3MonthKeys();
  const from = getStartOf3MonthsAgo();
  const now = new Date();

  const monthExpr = Sequelize.fn("DATE_FORMAT", Sequelize.col(dateField), "%Y-%m");

  const totalRows = await Model.findAll({
    attributes: [
      [monthExpr, "month"],
      [Sequelize.fn("COUNT", Sequelize.col(countField)), "count"],
    ],
    where: { ...extraWhere, [dateField]: { [Op.between]: [from, now] } },
    group: [Sequelize.literal("month")],
    order: [[Sequelize.literal("month"), "ASC"]],
    raw: true,
  });

  const incompleteRows = await Model.findAll({
    attributes: [
      [monthExpr, "month"],
      [Sequelize.fn("COUNT", Sequelize.col(countField)), "count"],
    ],
    where: {
      ...extraWhere,
      [dateField]: { [Op.between]: [from, now] },
      ngayHoanThanhHoSoTaiLieu: null,
    },
    group: [Sequelize.literal("month")],
    order: [[Sequelize.literal("month"), "ASC"]],
    raw: true,
  });

  const totalMap = new Map(totalRows.map((r) => [r.month, Number(r.count)]));
  const incMap = new Map(incompleteRows.map((r) => [r.month, Number(r.count)]));

  return months.map((m) => ({
    month: m,
    total: totalMap.get(m) ?? 0,
    chuaHoanThanhTaiLieu: incMap.get(m) ?? 0,
  }));
};

const countVuViecByTrangThaiYCTT = async (extraWhere = {}) => {
  const rows = await VuViec.findAll({
    attributes: ["trangThaiYCTT", [Sequelize.fn("COUNT", Sequelize.literal("*")), "count"]],
    where: { ...extraWhere },
    group: ["trangThaiYCTT"],
    raw: true,
  });

  const base = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const r of rows) {
    const code = Number(r.trangThaiYCTT);
    if (base[code] !== undefined) base[code] = Number(r.count);
  }

  return {
    byCode: base,
    byLabel: [
      { code: 0, label: "Chưa đề nghị", count: base[0] },
      { code: 1, label: "Chờ duyệt", count: base[1] },
      { code: 2, label: "Từ chối", count: base[2] },
      { code: 3, label: "Đã duyệt", count: base[3] },
    ],
  };
};
const getYearMonthKeys = () => {
  const now = new Date();
  const y = now.getFullYear();
  const keys = [];
  for (let m = 1; m <= 12; m++) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return keys;
};

const getStartOfYear = () => {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
};

const getEndOfYear = () => {
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
};

/**
 * Tổng số đơn đã nộp theo từng tháng của năm hiện tại (12 tháng).
 * dateField: field ngày nộp (vd: "ngayNopDon")
 * countField: PK để COUNT (vd: "maDonDangKy")
 */
const countMonthlyTotalCurrentYear = async (
  Model,
  dateField,
  countField,
  extraWhere = {}
) => {
  const months = getYearMonthKeys();
  const from = getStartOfYear();
  const to = getEndOfYear();

  // MySQL/MariaDB: DATE_FORMAT
  const monthExpr = Sequelize.fn("DATE_FORMAT", Sequelize.col(dateField), "%Y-%m");

  const rows = await Model.findAll({
    attributes: [
      [monthExpr, "month"],
      [Sequelize.fn("COUNT", Sequelize.col(countField)), "count"],
    ],
    where: { ...extraWhere, [dateField]: { [Op.between]: [from, to] } },
    group: [Sequelize.literal("month")],
    order: [[Sequelize.literal("month"), "ASC"]],
    raw: true,
  });

  const map = new Map(rows.map((r) => [r.month, Number(r.count)]));

  return months.map((m) => ({
    month: m,
    total: map.get(m) ?? 0,
  }));
};
/* ===================== HELPERS: STAT BY ASSIGNEE (maNguoiXuLy1) ===================== */
/**
 * Thống kê theo maNguoiXuLy1:
 * - tongDon
 * - chuaNopTaiLieu (ngayHoanThanhHoSoTaiLieu IS NULL)
 * - hanTraLoiDuoi15Ngay: hanTraLoi trong [now, now+15] (không tính quá hạn)
 *
 * countField: PK (maDonDangKy)
 */
const countByAssignee = async (Model, countField, extraWhere = {}) => {
  const { now, d15 } = (() => {
    const n = new Date();
    const d = new Date(n); d.setDate(d.getDate() + 15);
    return { now: n, d15: d };
  })();

  // Tổng đơn theo người
  const totalRows = await Model.findAll({
    attributes: [
      "maNguoiXuLy1",
      [Sequelize.fn("COUNT", Sequelize.col(countField)), "tongDon"],
    ],
    where: {
      ...extraWhere,
      maNguoiXuLy1: { [Op.ne]: null },
    },
    group: ["maNguoiXuLy1"],
    raw: true,
  });

  // Chưa nộp tài liệu theo người
  const incompleteRows = await Model.findAll({
    attributes: [
      "maNguoiXuLy1",
      [Sequelize.fn("COUNT", Sequelize.col(countField)), "chuaNopTaiLieu"],
    ],
    where: {
      ...extraWhere,
      maNguoiXuLy1: { [Op.ne]: null },
      ngayHoanThanhHoSoTaiLieu: null,
    },
    group: ["maNguoiXuLy1"],
    raw: true,
  });

  // Hạn trả lời <= 15 ngày theo người (từ hôm nay tới 15 ngày)
  const hanTraLoi15Rows = await Model.findAll({
    attributes: [
      "maNguoiXuLy1",
      [Sequelize.fn("COUNT", Sequelize.col(countField)), "hanTraLoiDuoi15Ngay"],
    ],
    where: {
      ...extraWhere,
      maNguoiXuLy1: { [Op.ne]: null },
      hanTraLoi: { [Op.between]: [now, d15] }, // ✅ không tính quá hạn
    },
    group: ["maNguoiXuLy1"],
    raw: true,
  });

  const totalMap = new Map(totalRows.map((r) => [r.maNguoiXuLy1, Number(r.tongDon)]));
  const incMap = new Map(incompleteRows.map((r) => [r.maNguoiXuLy1, Number(r.chuaNopTaiLieu)]));
  const han15Map = new Map(hanTraLoi15Rows.map((r) => [r.maNguoiXuLy1, Number(r.hanTraLoiDuoi15Ngay)]));

  const allMa = Array.from(new Set([...totalMap.keys(), ...incMap.keys(), ...han15Map.keys()]));
  if (allMa.length === 0) return [];

  // Lấy info nhân sự
  const nhanSuRows = await NhanSu.findAll({
    attributes: ["maNhanSu", "hoTen", "phongBan", "chucVu", "email"],
    where: { maNhanSu: { [Op.in]: allMa } },
    raw: true,
  });
  const nsMap = new Map(nhanSuRows.map((x) => [x.maNhanSu, x]));

  // Merge + sort theo tongDon desc
  const merged = allMa.map((ma) => {
    const ns = nsMap.get(ma);
    return {
      maNhanSu: ma,
      hoTen: ns?.hoTen ?? "(Không tìm thấy nhân sự)",
      phongBan: ns?.phongBan ?? null,
      chucVu: ns?.chucVu ?? null,
      email: ns?.email ?? null,
      tongDon: totalMap.get(ma) ?? 0,
      chuaNopTaiLieu: incMap.get(ma) ?? 0,
      hanTraLoiDuoi15Ngay: han15Map.get(ma) ?? 0,
    };
  });

  merged.sort((a, b) => b.tongDon - a.tongDon);
  return merged;
};
const getLast3Years = () => {
  const now = new Date();
  const y = now.getFullYear();
  return [y - 2, y - 1, y];
};

const getStartOfYearN = (year) => new Date(year, 0, 1, 0, 0, 0, 0);
const getEndOfYearN = (year) => new Date(year, 11, 31, 23, 59, 59, 999);

/**
 * Tổng số đơn đã nộp theo từng năm trong 3 năm gần nhất (gồm năm hiện tại)
 * Trả về dạng:
 * [
 *   { year: 2024, total: 123 },
 *   { year: 2025, total: 456 },
 *   { year: 2026, total: 789 }
 * ]
 */
const countYearlyTotalLast3Years = async (
  Model,
  dateField,
  countField,
  extraWhere = {}
) => {
  const years = getLast3Years();
  const from = getStartOfYearN(years[0]);
  const to = getEndOfYearN(years[2]);

  // MySQL/MariaDB: YEAR(dateField)
  const yearExpr = Sequelize.fn("YEAR", Sequelize.col(dateField));

  const rows = await Model.findAll({
    attributes: [
      [yearExpr, "year"],
      [Sequelize.fn("COUNT", Sequelize.col(countField)), "count"],
    ],
    where: { ...extraWhere, [dateField]: { [Op.between]: [from, to] } },
    group: [Sequelize.literal("year")],
    order: [[Sequelize.literal("year"), "ASC"]],
    raw: true,
  });

  const map = new Map(rows.map((r) => [Number(r.year), Number(r.count)]));

  return years.map((y) => ({
    year: y,
    total: map.get(y) ?? 0,
  }));
};
/* ===================== CONTROLLER ===================== */
export const getDeadlineDashboard = async (req, res) => {
  try {
    const result = {
      donDangKy: { VN: {}, KH: {} },
      vanBang: { VN: {}, KH: {} },
      giayUyQuyen: {},
      vuViec: {},
      nhanSuPhuTrach: { VN: [], KH: [] },
    };

    // ✅ chỉ lấy đơn có trangThaiVuViec != 5 cho hạn trả lời/xử lý
    const whereTrangThaiVuViecNot5 = { trangThaiVuViec: { [Op.ne]: 5 } };

    const extraWhereVN_deadline = { ...whereTrangThaiVuViecNot5 };
    const extraWhereKH_deadline = { ...whereTrangThaiVuViecNot5 };

    // monthly mặc định tính tất cả
    const extraWhereVN_monthly = {};
    const extraWhereKH_monthly = {};

    // assignee: nếu muốn theo hạn/HTTL cũng loại trạng thái 5 -> dùng whereTrangThaiVuViecNot5
    // mình để theo yêu cầu hiện tại: chỉ hạn trong bảng assignee cũng nên loại 5 cho đồng nhất:
    const extraWhereVN_assignee = { ...whereTrangThaiVuViecNot5 };
    const extraWhereKH_assignee = { ...whereTrangThaiVuViecNot5 };

    const extraWhereVBVN = {};
    const extraWhereVBKH = {};
    const extraWherePOA = {};
    const extraWhereVuViec = {};

    /* ================== ĐƠN VN ================== */
    result.donDangKy.VN.hanTraLoi = await countByDate(DonDangKy, "hanTraLoi", extraWhereVN_deadline);
    result.donDangKy.VN.hanXuLy = await countByDate(DonDangKy, "hanXuLy", extraWhereVN_deadline);

    result.donDangKy.VN.chuaHoanThanhTaiLieu = await DonDangKy.count({
      where: { ...extraWhereVN_monthly, ngayHoanThanhHoSoTaiLieu: null },
    });

    result.donDangKy.VN.thongKe3Thang = await countMonthlyTotalAndIncompleteLast3(
      DonDangKy,
      "ngayNopDon",
      "maDonDangKy",
      extraWhereVN_monthly
    );
    // ✅ NEW: Tổng số đơn đã nộp theo từng tháng của năm hiện tại
    result.donDangKy.VN.tongDonTheoThangNamNay = await countMonthlyTotalCurrentYear(
      DonDangKy,
      "ngayNopDon",
      "maDonDangKy",
      extraWhereVN_monthly
    );
    result.donDangKy.VN.tongDonTheoNam3NamGanNhat = await countYearlyTotalLast3Years(
      DonDangKy,
      "ngayNopDon",
      "maDonDangKy",
      extraWhereVN_monthly
    );
    /* ================== ĐƠN KH ================== */
    result.donDangKy.KH.hanTraLoi = await countByDate(DonDangKyNhanHieu_KH, "hanTraLoi", extraWhereKH_deadline);
    result.donDangKy.KH.hanXuLy = await countByDate(DonDangKyNhanHieu_KH, "hanXuLy", extraWhereKH_deadline);

    result.donDangKy.KH.chuaHoanThanhTaiLieu = await DonDangKyNhanHieu_KH.count({
      where: { ...extraWhereKH_monthly, ngayHoanThanhHoSoTaiLieu: null },
    });

    result.donDangKy.KH.thongKe3Thang = await countMonthlyTotalAndIncompleteLast3(
      DonDangKyNhanHieu_KH,
      "ngayNopDon",
      "maDonDangKy",
      extraWhereKH_monthly
    );
    // ✅ NEW: Tổng số đơn đã nộp theo từng tháng của năm hiện tại
    result.donDangKy.KH.tongDonTheoThangNamNay = await countMonthlyTotalCurrentYear(
      DonDangKyNhanHieu_KH,
      "ngayNopDon",
      "maDonDangKy",
      extraWhereKH_monthly
    );
    // ✅ NEW: Tổng số đơn đã nộp theo năm trong 3 năm gần nhất (gồm năm nay)
    result.donDangKy.KH.tongDonTheoNam3NamGanNhat = await countYearlyTotalLast3Years(
      DonDangKyNhanHieu_KH,
      "ngayNopDon",
      "maDonDangKy",
      extraWhereKH_monthly
    );
    /* ================== VĂN BẰNG VN ================== */
    result.vanBang.VN.hanGiaHan = await countByDate(GCN_NH, "hanGiaHan", extraWhereVBVN);

    /* ================== VĂN BẰNG KH ================== */
    result.vanBang.KH.hanNopTuyenThe = await countByDate(GCN_NH_KH, "hanNopTuyenThe", extraWhereVBKH);
    result.vanBang.KH.hanGiaHan = await countByDate(GCN_NH_KH, "hanGiaHan", extraWhereVBKH);

    /* ================== GIẤY ỦY QUYỀN ================== */
    result.giayUyQuyen.ngayHetHan = await countByDate(GiayUyQuyen, "ngayHetHan", extraWherePOA);

    /* ================== VỤ VIỆC ================== */
    result.vuViec.trangThaiYCTT = await countVuViecByTrangThaiYCTT(extraWhereVuViec);

    /* ================== NHÂN SỰ PHỤ TRÁCH (NEW + hanTraLoiDuoi15Ngay) ================== */
    result.nhanSuPhuTrach.VN = await countByAssignee(
      DonDangKy,
      "maDonDangKy",
      extraWhereVN_assignee
    );

    result.nhanSuPhuTrach.KH = await countByAssignee(
      DonDangKyNhanHieu_KH,
      "maDonDangKy",
      extraWhereKH_assignee
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("getDeadlineDashboard error:", error);
    return res.status(500).json({ message: error.message });
  }
};
