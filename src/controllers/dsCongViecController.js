import { Op } from "sequelize";
import { DanhSachCongViec } from "../models/dsCongViecModel.js";
import { NhanSu } from "../models/nhanSuModel.js";

// ---------------------------------------------------------------------------
// Helper: Chuẩn hóa đầu vào (trim + UPPER cho maVietTat, trim cho moTa)
// (Hooks trong model đã xử lý khi save; hàm này dùng để kiểm tra trùng lặp)
// ---------------------------------------------------------------------------
const normalize = (maVietTat, moTa) => ({
  maVietTatNorm: maVietTat ? maVietTat.trim().toUpperCase() : undefined,
  moTaNorm: moTa ? moTa.trim() : undefined,
});

// ---------------------------------------------------------------------------
// CREATE — Thêm một công việc vào Danh sách công việc thường nhật
// ---------------------------------------------------------------------------
export const createDanhSachCongViec = async (req, res) => {
  try {
    const { maVietTat, moTa, maNhanSu: bodyMaNhanSu } = req.body;

    if (!maVietTat || !moTa) {
      return res.status(400).json({
        message: "Mã viết tắt và mô tả công việc là bắt buộc",
      });
    }

    // Ưu tiên maNhanSu từ token đăng nhập; fallback sang body nếu không có
    const maNhanSu = req.user?.maNhanSu ?? bodyMaNhanSu ?? null;

    const { maVietTatNorm } = normalize(maVietTat);

    // Kiểm tra trùng lặp: cùng maNhanSu + maVietTat (bỏ qua bản ghi đã xóa mềm)
    const duplicate = await DanhSachCongViec.findOne({
      where: {
        maNhanSu: maNhanSu ?? null,
        maVietTat: maVietTatNorm,
      },
      paranoid: true, // chỉ tìm trong bản ghi chưa xóa
    });

    if (duplicate) {
      return res.status(409).json({
        message: `Mã viết tắt "${maVietTatNorm}" đã tồn tại trong danh sách của bạn`,
      });
    }

    const newItem = await DanhSachCongViec.create({
      maVietTat,  // hook beforeCreate sẽ tự chuẩn hóa
      moTa,
      maNhanSu,
    });

    return res.status(201).json({
      message: "Thêm công việc vào danh sách thành công",
      data: newItem,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// READ — Lấy toàn bộ danh sách (có phân trang, lọc, tìm kiếm)
// ---------------------------------------------------------------------------
export const listDanhSachCongViec = async (req, res) => {
  try {
    const {
      maNhanSu,
      keyword = "",
      pageIndex = 1,
      pageSize = 50,
    } = req.body;

    const page = Math.max(Number(pageIndex), 1);
    const size = Math.min(Math.max(Number(pageSize), 1), 200);
    const search = String(keyword).trim();

    const where = {};
    if (maNhanSu !== undefined) where.maNhanSu = maNhanSu;

    if (search) {
      where[Op.or] = [
        { maVietTat: { [Op.like]: `%${search.toUpperCase()}%` } },
        { moTa: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await DanhSachCongViec.findAndCountAll({
      where,
      limit: size,
      offset: (page - 1) * size,
      order: [["maVietTat", "ASC"]],
      include: [
        {
          model: NhanSu,
          as: "nhanSu",
          attributes: ["maNhanSu", "hoTen"],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / size),
        pageIndex: page,
        pageSize: size,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// READ ONE — Lấy chi tiết một công việc theo id
// ---------------------------------------------------------------------------
export const getDanhSachCongViecById = async (req, res) => {
  try {
    const { id } = req.body;

    const item = await DanhSachCongViec.findByPk(id, {
      include: [
        {
          model: NhanSu,
          as: "nhanSu",
          attributes: ["maNhanSu", "hoTen"],
          required: false,
        },
      ],
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    return res.status(200).json({ data: item });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// UPDATE — Cập nhật mã viết tắt hoặc mô tả công việc
// ---------------------------------------------------------------------------
export const updateDanhSachCongViec = async (req, res) => {
  try {
    const { id, maVietTat, moTa } = req.body;

    const item = await DanhSachCongViec.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    // Nếu maVietTat thay đổi → kiểm tra trùng lặp
    if (maVietTat) {
      const { maVietTatNorm } = normalize(maVietTat);
      const duplicate = await DanhSachCongViec.findOne({
        where: {
          maNhanSu: item.maNhanSu ?? null,
          maVietTat: maVietTatNorm,
          id: { [Op.ne]: id }, // bỏ qua chính bản ghi đang sửa
        },
        paranoid: true,
      });

      if (duplicate) {
        return res.status(409).json({
          message: `Mã viết tắt "${maVietTatNorm}" đã tồn tại trong danh sách của bạn`,
        });
      }

      item.maVietTat = maVietTat; // hook beforeUpdate sẽ tự chuẩn hóa
    }

    if (moTa !== undefined) item.moTa = moTa;

    await item.save();

    return res.status(200).json({
      message: "Cập nhật công việc thành công",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// SOFT DELETE — Xóa mềm (paranoid: true), bản ghi vẫn còn trong DB
// Các TimeSheet đã dùng mã này sẽ không bị lỗi truy xuất
// ---------------------------------------------------------------------------
export const deleteDanhSachCongViec = async (req, res) => {
  try {
    const { id } = req.body;

    const item = await DanhSachCongViec.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    await item.destroy(); // soft delete — Sequelize set deletedAt, KHÔNG xóa row

    return res.status(200).json({
      message: "Xóa công việc thành công",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// RESTORE — Khôi phục bản ghi đã xóa mềm
// ---------------------------------------------------------------------------
export const restoreDanhSachCongViec = async (req, res) => {
  try {
    const { id } = req.body;

    // paranoid: false để tìm cả bản ghi đã xóa mềm
    const item = await DanhSachCongViec.findByPk(id, { paranoid: false });
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    if (!item.deletedAt) {
      return res.status(400).json({ message: "Công việc này chưa bị xóa" });
    }

    await item.restore();

    return res.status(200).json({
      message: "Khôi phục công việc thành công",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// SEARCH (dùng cho dropdown/autocomplete ở màn hình Log Time)
// Trả về danh sách gợi ý khi nhân viên gõ từ khóa trong ô tìm kiếm
// ---------------------------------------------------------------------------
export const searchDanhSachCongViec = async (req, res) => {
  try {
    const { keyword = "", maNhanSu: bodyMaNhanSu } = req.body;

    const maNhanSu = req.user?.maNhanSu ?? bodyMaNhanSu ?? null;
    const search = String(keyword).trim();

    if (!search) {
      return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });
    }

    const upperSearch = search.toUpperCase();

    // Tìm theo maNhanSu của người đang đăng nhập (ưu tiên) hoặc tất cả
    const whereConditions = [
      // Gợi ý mã viết tắt khớp (VD: gõ "nđ" → tìm "NĐ")
      { maVietTat: { [Op.like]: `%${upperSearch}%` } },
      // Gợi ý mô tả khớp
      { moTa: { [Op.like]: `%${search}%` } },
    ];

    const items = await DanhSachCongViec.findAll({
      where: {
        maNhanSu: maNhanSu ? { [Op.in]: [maNhanSu, null] } : { [Op.is]: null },
        [Op.or]: whereConditions,
      },
      attributes: ["id", "maVietTat", "moTa"],
      limit: 20,
      order: [["maVietTat", "ASC"]],
    });

    return res.status(200).json({ data: items });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
