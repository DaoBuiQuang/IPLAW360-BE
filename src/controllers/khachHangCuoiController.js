import { Op } from "sequelize";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";
import { DoiTac } from "../models/doiTacModel.js";
import { QuocGia } from "../models/quocGiaModel.js";
import { NganhNghe } from "../models/nganhNgheModel.js";
import { sendGenericNotification } from "../utils/notificationHelper.js";
import { HoSo_VuViec } from "../models/hoSoVuViecModel.js";
import { Sequelize } from "sequelize";
import { NhomKhachHang } from "../models/nhomKhachHangModel.js";
import { NhanSu } from "../models/nhanSuModel.js";

const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D");
};

export const generateCustomerCode = async (req, res) => {
  try {
    const { tenVietTatKH } = req.body;

    if (!tenVietTatKH) {
      return res.status(400).json({ message: "Vui lòng nhập tên viết tắt khách hàng" });
    }

    const prefix = removeVietnameseTones(tenVietTatKH.trim().charAt(0)).toUpperCase();

    const maxCustomer = await KhachHangCuoi.findOne({
      where: {
        [Op.and]: [
          { maKhachHang: { [Op.like]: `${prefix}%` } },   // bắt đầu bằng prefix (I, C, T...)
          { maKhachHang: { [Op.notLike]: 'IPAC%' } }      // loại tất cả mã IPAC...
        ]
      },
      order: [['maKhachHang', 'DESC']]
    });

    let nextNumber = 1;
    if (maxCustomer) {
      const currentNumber = parseInt(maxCustomer.maKhachHang.substring(1));
      nextNumber = currentNumber + 1;
    }

    const maKhachHang = `${prefix}${String(nextNumber).padStart(5, '0')}`;

    res.status(200).json({ maKhachHang });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerNamesAndCodes = async (req, res) => {
  try {
    const { tenKhachHang } = req.body;
    const whereCondition = { daXoa: false };
    if (tenKhachHang) {
      whereCondition.tenKhachHang = { [Op.like]: `%${tenKhachHang}%` };
    }

    const customers = await KhachHangCuoi.findAll({
      where: whereCondition,
      attributes: ["id", 'maKhachHang', 'tenKhachHang'],
    });

    if (!customers.length) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng nào" });
    }

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getCustomers = async (req, res) => {
  try {
    const {
      tenKhachHang,
      maDoiTac,
      maQuocGia,
      maNganhNghe,
      maNhanSu,
      fields = [],
      pageIndex = 1,
      pageSize = 20
    } = req.body;

    const offset = (pageIndex - 1) * pageSize;

    const whereCondition = { daXoa: false };
    if (tenKhachHang) {
      whereCondition[Op.or] = [
        { tenKhachHang: { [Op.like]: `%${tenKhachHang}%` } },
        { maKhachHang: { [Op.like]: `%${tenKhachHang}%` } }
      ];
    }
    if (maDoiTac) whereCondition.maDoiTac = maDoiTac;
    if (maQuocGia) whereCondition.maQuocGia = maQuocGia;
    if (maNganhNghe) whereCondition.maNganhNghe = maNganhNghe;
    if (maNhanSu) whereCondition.maNhanSu = maNhanSu;

    const totalItems = await KhachHangCuoi.count({ where: whereCondition });

    const customers = await KhachHangCuoi.findAll({
      where: whereCondition,
      include: [
        { model: DoiTac, as: "doiTac", attributes: ["tenDoiTac"] },
        { model: QuocGia, as: "quocGia", attributes: ["tenQuocGia"] },
        { model: NganhNghe, as: "nganhNghe", attributes: ["tenNganhNghe"] },
        { model: NhomKhachHang, as: "nhomKhachHang", attributes: ["tenNhom"] },
        { model: NhanSu, as: "nhanSu", attributes: ["hoTen"] }
      ],
      limit: pageSize,
      offset: offset
    });

    if (!customers.length) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng nào" });
    }

    const fieldMap = {
      maKhachHang: cus => cus.maKhachHang,
      tenKhachHang: cus => cus.tenKhachHang,
      nguoiLienHe: cus => cus.nguoiLienHe,
      moTa: cus => cus.moTa,
      diaChi: cus => cus.diaChi,
      sdt: cus => cus.sdt,
      ngayTao: cus => cus.ngayTao,
      ghiChu: cus => cus.ghiChu,
      trangThai: cus => cus.trangThai,
      ngayCapNhap: cus => cus.ngayCapNhap,
      maKhachHangCu: cus => cus.maKhachHangCu,
      tenDoiTac: cus => cus.doiTac?.tenDoiTac || null,
      tenQuocGia: cus => cus.quocGia?.tenQuocGia || null,
      tenNganhNghe: cus => cus.nganhNghe?.tenNganhNghe || null,
      tenNhom: cus => cus.nhomKhachHang?.tenNhom || null,
      tenNhanSu: cus => cus.nhanSu?.hoTen || null,
    };

    const result = customers.map(cus => {
      const row = { id: cus.id };
      fields.forEach(field => {
        if (fieldMap[field]) {
          row[field] = fieldMap[field](cus);
        }
      });
      return row;
    });
    res.status(200).json({
      data: result,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        pageIndex: Number(pageIndex),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Lấy khách hàng theo ID
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Thiếu id khách hàng" });
    }

    const customer = await KhachHangCuoi.findByPk(id, {
      include: [
        { model: DoiTac, as: "doiTac" },
        { model: QuocGia, as: "quocGia" },
        { model: NganhNghe, as: "nganhNghe" }
      ]
    });

    if (!customer) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Thêm khách hàng
export const addCustomer = async (req, res) => {
  try {
    const {
      maKhachHang, tenKhachHang, maDoiTac, moTa, nguoiLienHe,
      diaChi, sdt, ghiChu, maQuocGia, trangThai,
      maKhachHangCu, maNganhNghe, tenVietTatKH, idNhomKhachHang, maNhanSu
    } = req.body;

    if (!maKhachHang || !tenKhachHang || !tenVietTatKH) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ mã và tên khách hàng" });
    }
    //  const existingCustomer = await KhachHangCuoi.findOne({
    //     where: { tenKhachHang: tenKhachHang }
    // });
    // if (existingCustomer) {
    //     return res.status(409).json({ message: "Tên khách hàng đã tồn tại" });
    // }
    const newCustomer = await KhachHangCuoi.create({
      maKhachHang, tenKhachHang, maDoiTac, moTa, nguoiLienHe,
      diaChi, sdt, ghiChu, maQuocGia, trangThai,
      maKhachHangCu, maNganhNghe, tenVietTatKH, idNhomKhachHang, maNhanSu
    });

    res.status(201).json(newCustomer);
  } catch (error) {
    if (error instanceof Sequelize.UniqueConstraintError) {
      let message = "Dữ liệu đã tồn tại";
      const field = error.errors[0].path;

      if (field === "tenKhachHang") message = "Tên khách hàng đã tồn tại.";
      if (field === "tenVietTatKH") message = "Tên viết tắt khách hàng đã tồn tại.";

      return res.status(409).json({ message });
    }
    res.status(500).json({ message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const {
      id,
      maKhachHang,
      tenVietTatKH,
      tenKhachHang,
      maDoiTac,
      nguoiLienHe,
      moTa,
      diaChi,
      sdt,
      ghiChu,
      maQuocGia,
      trangThai,
      maKhachHangCu,
      maNganhNghe,
      idNhomKhachHang,
      maNhanSu,
      maNhanSuCapNhap,
    } = req.body;

    const customer = await KhachHangCuoi.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }

    const changedFields = [];
    const updates = {
      maKhachHang,
      tenVietTatKH,
      tenKhachHang,
      maDoiTac,
      nguoiLienHe,
      moTa,
      diaChi,
      sdt,
      ghiChu,
      maQuocGia,
      trangThai,
      maKhachHangCu,
      idNhomKhachHang,
      maNganhNghe,
      maNhanSuCapNhap,
      maNhanSu
    };

    for (const key in updates) {
      if (
        updates[key] !== undefined &&
        updates[key] !== customer[key]
      ) {
        changedFields.push({
          field: key,
          oldValue: customer[key],
          newValue: updates[key],
        });
        customer[key] = updates[key];
      }
    }

    customer.ngayCapNhap = new Date();
    await customer.save();

    if (changedFields.length > 0) {
      await sendGenericNotification({
        maNhanSuCapNhap,
        title: "Cập nhật khách hàng",
        bodyTemplate: (tenNhanSu) =>
          `${tenNhanSu} đã cập nhật khách hàng '${customer.tenKhachHang}'`,
        data: {
          id: id,
          maKhachHang: customer.maKhachHang,
          changes: changedFields,
        },
      });
    }

    res.status(200).json({
      message: "Cập nhật khách hàng thành công",
      customer,
      changes: changedFields,
    });
  } catch (error) {
    console.error("Lỗi updateCustomer:", error.message);
    if (error instanceof Sequelize.UniqueConstraintError) {
      let message = "Dữ liệu đã tồn tại";
      const field = error.errors[0].path;

      if (field === "tenKhachHang") message = "Tên khách hàng đã tồn tại.";
      if (field === "tenVietTatKH") message = "Tên viết tắt khách hàng đã tồn tại.";

      return res.status(409).json({ message });
    }
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


export const deleteCustomer = async (req, res) => {
  try {
    const { id, maNhanSuCapNhap } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Thiếu id khách hàng" });
    }
    const customer = await KhachHangCuoi.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }
    await customer.destroy();
    await sendGenericNotification({
      maNhanSuCapNhap,
      title: "Xóa khách hàng",
      bodyTemplate: (tenNhanSu) =>
        `${tenNhanSu} đã xóa đối tác '${customer.tenKhachHang}'`,
      data: { id: id, maKhachHang: customer.maKhachHang },
    });
    res.status(200).json({ message: "Xóa khách hàng thành công" });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({ message: "Khách hàng đang được sử dụng, không thể xóa." });
    }
    res.status(500).json({ message: error.message });
  }
};

// export const deleteCustomer = async (req, res) => {
//   try {
//     const { maKhachHang, maNhanSuCapNhap } = req.body;

//     if (!maKhachHang) {
//       return res.status(400).json({ message: "Thiếu mã khách hàng" });
//     }

//     const customer = await KhachHangCuoi.findByPk(maKhachHang);
//     if (!customer) {
//       return res.status(404).json({ message: "Khách hàng không tồn tại" });
//     }

//     // Kiểm tra xem có HoSoVuViec nào đang dùng khách hàng này không
//     const hoSoLienQuan = await HoSo_VuViec.findOne({
//       where: { maKhachHang: maKhachHang }
//     });

//     if (hoSoLienQuan) {
//       return res.status(400).json({ message: "Khách hàng đang được sử dụng, không thể xóa." });
//     }

//     // Đánh dấu là đã xóa (xóa mềm)
//     customer.daXoa = true;
//     customer.maNhanSuCapNhap = maNhanSuCapNhap;
//     customer.ngayCapNhap = new Date();
//     await customer.save();

//     await sendGenericNotification({
//       maNhanSuCapNhap,
//       title: "Xóa khách hàng",
//       bodyTemplate: (tenNhanSu) =>
//         `${tenNhanSu} đã xóa khách hàng '${customer.tenKhachHang}'`,
//       data: { maKhachHang, action: "delete" },
//     });

//     res.status(200).json({
//       message: "Xóa khach hàng thành công",
//       deletedCustomer: customer,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const restoreCustomer = async (req, res) => {
  try {
    const { maKhachHang, maNhanSuCapNhap } = req.body;

    if (!maKhachHang) {
      return res.status(400).json({ message: "Thiếu mã khách hàng" });
    }

    const customer = await KhachHangCuoi.findByPk(maKhachHang);

    if (!customer) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }

    if (!customer.daXoa) {
      return res.status(400).json({ message: "Khách hàng chưa bị xóa" });
    }

    // Phục hồi khách hàng
    customer.daXoa = false;
    customer.maNhanSuCapNhap = maNhanSuCapNhap;
    customer.ngayCapNhap = new Date();
    await customer.save();

    // Gửi thông báo
    await sendGenericNotification({
      maNhanSuCapNhap,
      title: "Khôi phục khách hàng",
      bodyTemplate: (tenNhanSu) =>
        `${tenNhanSu} đã khôi phục khách hàng '${customer.tenKhachHang}'`,
      data: {},
    });

    res.status(200).json({ message: "Khôi phục khách hàng thành công", customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
