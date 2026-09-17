import { Op } from "sequelize";
import { DanhSachCongViec, capitalizeFirstLetter } from "../models/dsCongViecModel.js";
import { NhanSu } from "../models/nhanSuModel.js";

// ---------------------------------------------------------------------------
// Helper: Chuẩn hóa đầu vào (trim + UPPER cho maVietTat, trim + viết hoa chữ cái đầu cho moTa)
// (Hooks trong model đã xử lý khi save; hàm này dùng để kiểm tra trùng lặp)
// ---------------------------------------------------------------------------
const normalize = (maVietTat, moTa) => ({
  maVietTatNorm: maVietTat ? maVietTat.trim().toUpperCase() : undefined,
  moTaNorm: moTa ? capitalizeFirstLetter(moTa) : undefined,
});

// ---------------------------------------------------------------------------
// CREATE — Thêm một công việc vào Danh sách công việc thường nhật
// ---------------------------------------------------------------------------
export const createDanhSachCongViec = async (req, res) => {
  let maVietTatNorm = '';
  try {
    const { maVietTat, moTa, maNhanSu: bodyMaNhanSu } = req.body;

    if (!maVietTat || !moTa) {
      return res.status(400).json({
        message: "Mã viết tắt và mô tả công việc là bắt buộc",
      });
    }

    const maNhanSu = req.user?.maNhanSu ?? bodyMaNhanSu ?? null;
    const norm = normalize(maVietTat, moTa);
    maVietTatNorm = norm.maVietTatNorm;

    // Tìm kiếm cả bản ghi đang hoạt động và bản ghi đã xóa mềm (paranoid: false)
    const existing = await DanhSachCongViec.findOne({
      where: {
        maNhanSu: maNhanSu ?? null,
        maVietTat: maVietTatNorm,
      },
      paranoid: false,
    });

    if (existing) {
      if (existing.deletedAt) {
        // Đã từng tồn tại nhưng bị xóa mềm -> Khôi phục và cập nhật mô tả mới
        await existing.restore();
        existing.moTa = capitalizeFirstLetter(moTa);
        await existing.save();
        return res.status(200).json({
          message: `Mã công việc "${maVietTatNorm}" đã từng tồn tại và vừa được khôi phục thành công!`,
          data: existing,
        });
      } else {
        return res.status(409).json({
          message: `Mã viết tắt "${maVietTatNorm}" đã tồn tại trong danh sách của bạn. Vui lòng chọn mã khác.`,
        });
      }
    }

    const newItem = await DanhSachCongViec.create({
      maVietTat: maVietTatNorm,
      moTa: capitalizeFirstLetter(moTa),
      maNhanSu,
    });

    return res.status(201).json({
      message: "Thêm công việc vào danh sách thành công",
      data: newItem,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        message: `Mã viết tắt "${maVietTatNorm || 'này'}" đã tồn tại trong danh sách của bạn. Vui lòng chọn mã khác.`,
      });
    }
    if (error.name === 'SequelizeValidationError') {
      const msg = error.errors?.[0]?.message || 'Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại.';
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: error.message || 'Lỗi xử lý thêm công việc trên máy chủ' });
  }
};

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
  let maVietTatNorm = '';
  try {
    const { id, maVietTat, moTa } = req.body;

    const item = await DanhSachCongViec.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    if (maVietTat) {
      const norm = normalize(maVietTat);
      maVietTatNorm = norm.maVietTatNorm;
      const duplicate = await DanhSachCongViec.findOne({
        where: {
          maNhanSu: item.maNhanSu ?? null,
          maVietTat: maVietTatNorm,
          id: { [Op.ne]: id },
        },
        paranoid: false,
      });

      if (duplicate) {
        return res.status(409).json({
          message: `Mã viết tắt "${maVietTatNorm}" đã tồn tại trong danh sách của bạn. Vui lòng chọn mã khác.`,
        });
      }

      item.maVietTat = maVietTatNorm;
    }

    if (moTa !== undefined) item.moTa = capitalizeFirstLetter(moTa);

    await item.save();

    return res.status(200).json({
      message: "Cập nhật công việc thành công",
      data: item,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        message: `Mã viết tắt "${maVietTatNorm || 'này'}" đã tồn tại trong danh sách của bạn. Vui lòng chọn mã khác.`,
      });
    }
    if (error.name === 'SequelizeValidationError') {
      const msg = error.errors?.[0]?.message || 'Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại.';
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: error.message || 'Lỗi xử lý cập nhật công việc trên máy chủ' });
  }
};

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
