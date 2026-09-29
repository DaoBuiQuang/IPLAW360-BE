import { Op } from "sequelize";
import { DanhSachCongViec, capitalizeFirstLetter } from "../models/dsCongViecModel.js";
import { NhanSu } from "../models/nhanSuModel.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const normalize = (maVietTat, moTa) => ({
  maVietTatNorm: maVietTat ? maVietTat.trim().toUpperCase() : undefined,
  moTaNorm: moTa ? capitalizeFirstLetter(moTa) : undefined,
});

const isUserAdminOrCeo = (userRole) => {
  const role = String(userRole || "").toLowerCase();
  return role === "admin" || role === "ceo";
};

const formatItem = (item) => {
  if (!item) return null;
  const json = typeof item.toJSON === "function" ? item.toJSON() : item;
  const isSys = json.isSystem === true || json.isSystem === 1 || (json.isSystem == null && json.maNhanSu === null);
  return {
    ...json,
    isSystem: Boolean(isSys),
  };
};

// ---------------------------------------------------------------------------
// CREATE — Thêm một công việc vào Danh sách công việc thường nhật
// ---------------------------------------------------------------------------
export const createDanhSachCongViec = async (req, res) => {
  let maVietTatNorm = "";
  try {
    const { maVietTat, moTa, isSystem: bodyIsSystem, maNhanSu: bodyMaNhanSu } = req.body;

    if (!maVietTat) {
      return res.status(400).json({
        message: "Mã viết tắt công việc là bắt buộc",
      });
    }

    const norm = normalize(maVietTat, moTa);
    maVietTatNorm = norm.maVietTatNorm;

    const userRole = String(req.user?.role || "").toLowerCase();
    const currentUserMaNhanSu = req.user?.maNhanSu || req.user?.employeeCode;
    const isAdminOrCeo = isUserAdminOrCeo(userRole);

    let isSystem = false;
    let maNhanSu = null;

    if (isAdminOrCeo) {
      // Admin / CEO: mặc định là Hệ thống (true), hoặc theo body nếu truyền vào
      if (bodyIsSystem !== undefined && bodyIsSystem !== null && bodyIsSystem !== "") {
        isSystem = bodyIsSystem === true || bodyIsSystem === "true" || bodyIsSystem === 1 || bodyIsSystem === "1";
      } else {
        isSystem = true;
      }

      if (isSystem) {
        // Công việc Hệ thống: maNhanSu có thể là NULL hoặc mã admin
        maNhanSu = bodyMaNhanSu !== undefined ? bodyMaNhanSu : (currentUserMaNhanSu || null);
      } else {
        // Công việc Cá nhân do admin tạo
        maNhanSu = bodyMaNhanSu || currentUserMaNhanSu || null;
      }
    } else {
      // Staff hoặc Manager: Bắt buộc isSystem = false và maNhanSu = currentUserMaNhanSu (công việc Cá nhân)
      if (!currentUserMaNhanSu) {
        return res.status(401).json({
          message: "Không xác định được mã nhân sự từ tài khoản đăng nhập",
        });
      }
      isSystem = false;
      maNhanSu = currentUserMaNhanSu;
    }

    // Kiểm tra trùng lặp theo loại công việc (Hệ thống hoặc Cá nhân)
    const dupWhere = {
      maVietTat: maVietTatNorm,
    };
    if (isSystem) {
      dupWhere[Op.or] = [
        { isSystem: true },
        { maNhanSu: null },
      ];
    } else {
      dupWhere.maNhanSu = maNhanSu;
      dupWhere.isSystem = false;
    }

    const existing = await DanhSachCongViec.findOne({
      where: dupWhere,
      paranoid: false,
    });

    if (existing) {
      if (existing.deletedAt) {
        // Đã từng tồn tại nhưng bị xóa mềm -> Khôi phục và cập nhật
        await existing.restore();
        existing.moTa = capitalizeFirstLetter(moTa);
        existing.isSystem = isSystem;
        existing.maNhanSu = maNhanSu;
        await existing.save();
        return res.status(200).json({
          message: `Mã công việc "${maVietTatNorm}" đã từng tồn tại và vừa được khôi phục thành công!`,
          data: formatItem(existing),
        });
      } else {
        const typeLabel = isSystem ? "danh mục Hệ thống" : "danh sách cá nhân của bạn";
        return res.status(409).json({
          message: `Mã viết tắt "${maVietTatNorm}" đã tồn tại trong ${typeLabel}. Vui lòng chọn mã khác.`,
        });
      }
    }

    const newItem = await DanhSachCongViec.create({
      maVietTat: maVietTatNorm,
      moTa: capitalizeFirstLetter(moTa),
      maNhanSu,
      isSystem,
    });

    return res.status(201).json({
      message: "Thêm công việc vào danh sách thành công",
      data: formatItem(newItem),
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: `Mã viết tắt "${maVietTatNorm || "này"}" đã tồn tại. Vui lòng chọn mã khác.`,
      });
    }
    if (error.name === "SequelizeValidationError") {
      const msg = error.errors?.[0]?.message || "Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại.";
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: error.message || "Lỗi xử lý thêm công việc trên máy chủ" });
  }
};

// ---------------------------------------------------------------------------
// READ — Lấy toàn bộ danh sách (có phân trang, phân quyền, lọc, tìm kiếm)
// ---------------------------------------------------------------------------
export const listDanhSachCongViec = async (req, res) => {
  try {
    const {
      maNhanSu: requestedMaNhanSu,
      isSystem: requestedIsSystem,
      keyword = "",
      pageIndex = 1,
      pageSize = 50,
    } = req.body;

    const page = Math.max(Number(pageIndex), 1);
    const size = Math.min(Math.max(Number(pageSize), 1), 200);
    const search = String(keyword).trim();

    const currentUserMaNhanSu = req.user?.maNhanSu || req.user?.employeeCode;

    const andConditions = [];

    // Phân quyền dữ liệu (áp dụng cho mọi tài khoản kể cả Admin, CEO, Manager, Staff):
    // 1. Chỉ hiển thị công việc Hệ thống (isSystem = true hoặc maNhanSu IS NULL)
    // 2. Và công việc Cá nhân của CHÍNH MÌNH (isSystem = false và maNhanSu = currentUserMaNhanSu).
    // TUYỆT ĐỐI không hiển thị công việc cá nhân của các nhân sự khác!
    if (requestedIsSystem === true || requestedIsSystem === "true" || requestedIsSystem === 1 || requestedIsSystem === "1") {
      // Bộ lọc: Chỉ lấy công việc Hệ thống
      andConditions.push({
        [Op.or]: [
          { isSystem: true },
          { maNhanSu: null },
        ],
      });
    } else if (requestedIsSystem === false || requestedIsSystem === "false" || requestedIsSystem === 0 || requestedIsSystem === "0") {
      // Bộ lọc: Chỉ lấy công việc Cá nhân của chính mình (Admin cũng có cấp cá nhân)
      andConditions.push({
        isSystem: false,
        maNhanSu: currentUserMaNhanSu,
      });
    } else {
      // Mặc định (Tất cả): Lấy toàn bộ công việc Hệ thống + công việc Cá nhân của chính tài khoản đang đăng nhập
      andConditions.push({
        [Op.or]: [
          { isSystem: true },
          { maNhanSu: null },
          {
            [Op.and]: [
              { isSystem: false },
              { maNhanSu: currentUserMaNhanSu },
            ],
          },
        ],
      });
    }

    if (search) {
      andConditions.push({
        [Op.or]: [
          { maVietTat: { [Op.like]: `%${search.toUpperCase()}%` } },
          { moTa: { [Op.like]: `%${search}%` } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

    const { count, rows } = await DanhSachCongViec.findAndCountAll({
      where,
      limit: size,
      offset: (page - 1) * size,
      order: [
        ["isSystem", "DESC"],
        ["maVietTat", "ASC"],
      ],
      include: [
        {
          model: NhanSu,
          as: "nhanSu",
          attributes: ["maNhanSu", "hoTen"],
          required: false,
        },
      ],
    });

    const formattedRows = rows.map(formatItem);

    return res.status(200).json({
      data: formattedRows,
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

    const userRole = String(req.user?.role || "").toLowerCase();
    const currentUserMaNhanSu = req.user?.maNhanSu || req.user?.employeeCode;
    const isAdminOrCeo = isUserAdminOrCeo(userRole);
    const isRecordSystem = Boolean(item.isSystem) || item.maNhanSu === null;

    // Phân quyền: Nếu không phải admin/ceo và không phải công việc hệ thống, chỉ người tạo mới được xem
    if (!isAdminOrCeo && !isRecordSystem && item.maNhanSu !== currentUserMaNhanSu) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập công việc cá nhân này" });
    }

    return res.status(200).json({ data: formatItem(item) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// UPDATE — Cập nhật mã viết tắt hoặc mô tả công việc
// ---------------------------------------------------------------------------
export const updateDanhSachCongViec = async (req, res) => {
  let maVietTatNorm = "";
  try {
    const { id, maVietTat, moTa, isSystem: bodyIsSystem } = req.body;

    const item = await DanhSachCongViec.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    const userRole = String(req.user?.role || "").toLowerCase();
    const currentUserMaNhanSu = req.user?.maNhanSu || req.user?.employeeCode;
    const isAdminOrCeo = isUserAdminOrCeo(userRole);
    const isRecordSystem = Boolean(item.isSystem) || item.maNhanSu === null;

    // Kiểm tra quyền thao tác chặt chẽ:
    // Bản ghi Hệ thống (isSystem = true hoặc maNhanSu IS NULL): Chỉ admin / ceo mới được sửa
    // Bản ghi Cá nhân: Chỉ chính người tạo hoặc admin / ceo mới được sửa
    if (isRecordSystem) {
      if (!isAdminOrCeo) {
        return res.status(403).json({
          message: "Bạn không có quyền chỉnh sửa công việc Hệ thống. Chỉ Admin hoặc Ban giám đốc mới được phép.",
        });
      }
    } else {
      if (!isAdminOrCeo && item.maNhanSu !== currentUserMaNhanSu) {
        return res.status(403).json({
          message: "Bạn không có quyền chỉnh sửa công việc cá nhân của nhân sự khác.",
        });
      }
    }

    // Nếu là admin/ceo, có thể cập nhật trạng thái isSystem nếu truyền vào
    if (isAdminOrCeo && bodyIsSystem !== undefined && bodyIsSystem !== null && bodyIsSystem !== "") {
      item.isSystem = bodyIsSystem === true || bodyIsSystem === "true" || bodyIsSystem === 1 || bodyIsSystem === "1";
    }

    if (maVietTat) {
      const norm = normalize(maVietTat);
      maVietTatNorm = norm.maVietTatNorm;

      const dupWhere = {
        maVietTat: maVietTatNorm,
        id: { [Op.ne]: id },
      };

      if (item.isSystem) {
        dupWhere[Op.or] = [
          { isSystem: true },
          { maNhanSu: null },
        ];
      } else {
        dupWhere.maNhanSu = item.maNhanSu ?? null;
        dupWhere.isSystem = false;
      }

      const duplicate = await DanhSachCongViec.findOne({
        where: dupWhere,
        paranoid: false,
      });

      if (duplicate) {
        const typeLabel = item.isSystem ? "danh mục Hệ thống" : "danh sách cá nhân";
        return res.status(409).json({
          message: `Mã viết tắt "${maVietTatNorm}" đã tồn tại trong ${typeLabel}. Vui lòng chọn mã khác.`,
        });
      }

      item.maVietTat = maVietTatNorm;
    }

    if (moTa !== undefined) item.moTa = capitalizeFirstLetter(moTa);

    await item.save();

    return res.status(200).json({
      message: "Cập nhật công việc thành công",
      data: formatItem(item),
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: `Mã viết tắt "${maVietTatNorm || "này"}" đã tồn tại. Vui lòng chọn mã khác.`,
      });
    }
    if (error.name === "SequelizeValidationError") {
      const msg = error.errors?.[0]?.message || "Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại.";
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: error.message || "Lỗi xử lý cập nhật công việc trên máy chủ" });
  }
};

// ---------------------------------------------------------------------------
// SOFT DELETE — Xóa mềm (paranoid: true), bản ghi vẫn còn trong DB
// ---------------------------------------------------------------------------
export const deleteDanhSachCongViec = async (req, res) => {
  try {
    const { id } = req.body;

    const item = await DanhSachCongViec.findByPk(id);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    const userRole = String(req.user?.role || "").toLowerCase();
    const currentUserMaNhanSu = req.user?.maNhanSu || req.user?.employeeCode;
    const isAdminOrCeo = isUserAdminOrCeo(userRole);
    const isRecordSystem = Boolean(item.isSystem) || item.maNhanSu === null;

    // Kiểm tra quyền xóa chặt chẽ:
    // Bản ghi Hệ thống: Chỉ admin / ceo mới được xóa
    // Bản ghi Cá nhân: Chỉ chính người tạo hoặc admin / ceo mới được xóa
    if (isRecordSystem) {
      if (!isAdminOrCeo) {
        return res.status(403).json({
          message: "Bạn không có quyền xóa công việc Hệ thống. Chỉ Admin hoặc Ban giám đốc mới được phép.",
        });
      }
    } else {
      if (!isAdminOrCeo && item.maNhanSu !== currentUserMaNhanSu) {
        return res.status(403).json({
          message: "Bạn không có quyền xóa công việc cá nhân của nhân sự khác.",
        });
      }
    }

    await item.destroy(); // soft delete

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

    const item = await DanhSachCongViec.findByPk(id, { paranoid: false });
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    if (!item.deletedAt) {
      return res.status(400).json({ message: "Công việc này chưa bị xóa" });
    }

    const userRole = String(req.user?.role || "").toLowerCase();
    const currentUserMaNhanSu = req.user?.maNhanSu || req.user?.employeeCode;
    const isAdminOrCeo = isUserAdminOrCeo(userRole);
    const isRecordSystem = Boolean(item.isSystem) || item.maNhanSu === null;

    // Kiểm tra quyền khôi phục chặt chẽ
    if (isRecordSystem) {
      if (!isAdminOrCeo) {
        return res.status(403).json({
          message: "Bạn không có quyền khôi phục công việc Hệ thống. Chỉ Admin hoặc Ban giám đốc mới được phép.",
        });
      }
    } else {
      if (!isAdminOrCeo && item.maNhanSu !== currentUserMaNhanSu) {
        return res.status(403).json({
          message: "Bạn không có quyền khôi phục công việc cá nhân của nhân sự khác.",
        });
      }
    }

    await item.restore();

    return res.status(200).json({
      message: "Khôi phục công việc thành công",
      data: formatItem(item),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// SEARCH (dùng cho dropdown/autocomplete ở màn hình Log Time)
// ---------------------------------------------------------------------------
export const searchDanhSachCongViec = async (req, res) => {
  try {
    const { keyword = "", limit = 20 } = req.body;

    const userRole = String(req.user?.role || "").toLowerCase();
    const currentUserMaNhanSu = req.user?.maNhanSu || req.user?.employeeCode;
    const isAdminOrCeo = isUserAdminOrCeo(userRole);

    const search = String(keyword).trim();

    if (!search) {
      return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });
    }

    const upperSearch = search.toUpperCase();

    const textMatch = [
      { maVietTat: { [Op.like]: `%${upperSearch}%` } },
      { moTa: { [Op.like]: `%${search}%` } },
    ];

    const andConditions = [{ [Op.or]: textMatch }];

    // Áp dụng cho mọi tài khoản (kể cả Admin): Chỉ tìm công việc Hệ thống hoặc công việc Cá nhân của chính mình
    andConditions.push({
      [Op.or]: [
        { isSystem: true },
        { maNhanSu: null },
        {
          [Op.and]: [
            { isSystem: false },
            { maNhanSu: currentUserMaNhanSu },
          ],
        },
      ],
    });

    const items = await DanhSachCongViec.findAll({
      where: { [Op.and]: andConditions },
      attributes: ["id", "maVietTat", "moTa", "maNhanSu", "isSystem"],
      limit: Math.min(Math.max(Number(limit) || 20, 1), 100),
      order: [
        ["isSystem", "DESC"],
        ["maVietTat", "ASC"],
      ],
    });

    return res.status(200).json({ data: items.map(formatItem) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
