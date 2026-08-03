import { Op } from "sequelize";
import { sequelize } from "../config/db.js";   // 👈 thêm dòng này
import { DeNghiThanhToan_VuViec } from "../models/DeNghiThanhToan_VuViecModel.js";
import { DeNghiThanhToan } from "../models/DeNghiThanhToanModel.js";
import { VuViec } from "../models/vuViecModel.js";

export const addDeNghiThanhToan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      idDoiTac,
      idKhachHang,
      maHoSo,
      matterName,
      yourRef,
      contactInfo,
      maQuocGia,
      cases,
      subtotal,
      vat,
      total,
      maNhanSuCapNhap,
      deBitNoteNo,
      ngayGui,
      ngayThanhToan,
      ngayGuiHoaDon,
      ngayXuat,
      ghiChu,
      nguoiNhan
    } = req.body;

    // auto gen số debit note
    // const deBitNoteNo = `DN-${Date.now()}`;

    // tạo bản ghi đề nghị thanh toán
    if (!deBitNoteNo) {
      return res.status(400).json({ message: "Thiếu DeBit Note No" });
    }

    if (!nguoiNhan || !nguoiNhan.toString().trim()) {
      return res.status(400).json({ message: "Thiếu người nhận (No)" });
    }
    const newRecord = await DeNghiThanhToan.create(
      {
        deBitNoteNo,
        maQuocGia: maQuocGia,
        idDoiTac,
        idKhachHang,
        maHoSo,
        yourRef,
        nguoiNhan: nguoiNhan,
        tenKhachHang: contactInfo?.ten,
        diaChiNguoiNhan: contactInfo?.diaChi,
        email: contactInfo?.email,
        thue: vat || 0,
        tongTien: subtotal || 0,
        tongTienSauThue: total || 0,
        loaiTienTe: "VND", // tạm default, có thể cho client truyền vào
        isAutoImport: false,
        maNhanSuCapNhap,
        ngayGui,
        ngayThanhToan,
        ngayGuiHoaDon,
        ngayXuat,
        ghiChu,
      },
      { transaction: t }
    );

    // thêm các vụ việc vào bảng liên kết
    if (cases && cases.length > 0) {
      const caseLinks = cases.map((c) => ({
        idDeNghiThanhToan: newRecord.id,
        idVuViec: c.id,
        isAutoImport: false,
      }));
      await DeNghiThanhToan_VuViec.bulkCreate(caseLinks, { transaction: t });
    }

    await t.commit();

    return res.status(201).json({
      message: "Tạo đề nghị thanh toán thành công",
      data: newRecord,
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Lỗi khi tạo đề nghị thanh toán:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const getDeNghiThanhToansVN = async (req, res) => {
  try {
    const {
      fields = [],
      pageIndex = 1,
      pageSize = 20,
      idKhachHang,
      idDoiTac,
    } = req.body;

    const offset = (pageIndex - 1) * pageSize;

    // 🔒 Cố định VN
    const whereCondition = { maQuocGia: "VN" };
    if (idDoiTac) whereCondition.idDoiTac = idDoiTac;
    if (idKhachHang) whereCondition.idKhachHang = idKhachHang;

    const totalItems = await DeNghiThanhToan.count({ where: whereCondition });

    const deNghiThanhToans = await DeNghiThanhToan.findAll({
      where: whereCondition,
      // include: [
      //   { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
      //   { model: QuocGia, as: "QuocGia", attributes: ["tenQuocGia"] },
      //   { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["tenKhachHang"] },
      // ],
      limit: pageSize,
      offset,
      order: [["id", "DESC"]],
    });

    if (!deNghiThanhToans.length) {
      return res.status(404).json({ message: "Không tìm thấy đề nghị thanh toán (VN)" });
    }

    const fieldMap = {
      id: dn => dn.id,
      maHoSo: dn => dn.maHoSo,
      deBitNoteNo: dn => dn.deBitNoteNo,
      nguoiNhan: dn => dn.nguoiNhan,
      tenKhachHang: dn => dn.tenKhachHang,
      diaChiNguoiNhan: dn => dn.diaChiNguoiNhan,
      email: dn => dn.email,
      tongTien: dn => dn.tongTien,
      tongTienSauThue: dn => dn.tongTienSauThue,
      ngayGui: dn => dn.ngayGui,
      ngayThanhToan: dn => dn.ngayThanhToan,
      ngayGuiHoaDon: dn => dn.ngayGuiHoaDon,
      ngayXuat: dn => dn.ngayXuat,
      ghiChu: dn => dn.ghiChu,
    };

    const result = deNghiThanhToans.map(dn => {
      const row = { id: dn.id };
      fields.forEach(f => {
        if (fieldMap[f]) row[f] = fieldMap[f](dn);
      });
      row.loaiTienTe = dn.loaiTienTe; // luôn đẩy ra
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

export const getDeNghiThanhToansKH = async (req, res) => {
  try {
    const {
      fields = [],
      pageIndex = 1,
      pageSize = 20,
      idKhachHang,
      idDoiTac,
    } = req.body;

    const offset = (pageIndex - 1) * pageSize;

    // 🔒 Cố định KH
    const whereCondition = { maQuocGia: "KH" };
    if (idDoiTac) whereCondition.idDoiTac = idDoiTac;
    if (idKhachHang) whereCondition.idKhachHang = idKhachHang;

    const totalItems = await DeNghiThanhToan.count({ where: whereCondition });

    const deNghiThanhToans = await DeNghiThanhToan.findAll({
      where: whereCondition,
      // include: [... như trên nếu cần ...],
      limit: pageSize,
      offset,
      order: [["id", "DESC"]],
    });

    if (!deNghiThanhToans.length) {
      return res.status(404).json({ message: "Không tìm thấy đề nghị thanh toán (KH)" });
    }

    const fieldMap = {
      id: dn => dn.id,
      maHoSo: dn => dn.maHoSo,
      deBitNoteNo: dn => dn.deBitNoteNo,
      nguoiNhan: dn => dn.nguoiNhan,
      tenKhachHang: dn => dn.tenKhachHang,
      diaChiNguoiNhan: dn => dn.diaChiNguoiNhan,
      email: dn => dn.email,
      tongTien: dn => dn.tongTien,
      tongTienSauThue: dn => dn.tongTienSauThue,
      ngayGui: dn => dn.ngayGui,
      ngayThanhToan: dn => dn.ngayThanhToan,
      ngayGuiHoaDon: dn => dn.ngayGuiHoaDon,
      ngayXuat: dn => dn.ngayXuat,
      ghiChu: dn => dn.ghiChu,
    };

    const result = deNghiThanhToans.map(dn => {
      const row = { id: dn.id };
      fields.forEach(f => {
        if (fieldMap[f]) row[f] = fieldMap[f](dn);
      });
      row.loaiTienTe = dn.loaiTienTe;
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

export const getDeNghiThanhToans = async (req, res) => {
  try {
    const {
      fields = [],
      pageIndex = 1,
      pageSize = 20,
      idKhachHang,
      idDoiTac,
    } = req.body;

    const offset = (pageIndex - 1) * pageSize;

    // 🔒 Cố định KH
    const whereCondition = { };
    if (idDoiTac) whereCondition.idDoiTac = idDoiTac;
    if (idKhachHang) whereCondition.idKhachHang = idKhachHang;

    const totalItems = await DeNghiThanhToan.count({ where: whereCondition });

    const deNghiThanhToans = await DeNghiThanhToan.findAll({
      where: whereCondition,
      // include: [... như trên nếu cần ...],
      limit: pageSize,
      offset,
      order: [["id", "DESC"]],
    });

    if (!deNghiThanhToans.length) {
      return res.status(404).json({ message: "Không tìm thấy đề nghị thanh toán (KH)" });
    }

    const fieldMap = {
      id: dn => dn.id,
      maHoSo: dn => dn.maHoSo,
      deBitNoteNo: dn => dn.deBitNoteNo,
      nguoiNhan: dn => dn.nguoiNhan,
      tenKhachHang: dn => dn.tenKhachHang,
      diaChiNguoiNhan: dn => dn.diaChiNguoiNhan,
      email: dn => dn.email,
      tongTien: dn => dn.tongTien,
      tongTienSauThue: dn => dn.tongTienSauThue,
      ngayGui: dn => dn.ngayGui,
      ngayThanhToan: dn => dn.ngayThanhToan,
      ngayGuiHoaDon: dn => dn.ngayGuiHoaDon,
      ngayXuat: dn => dn.ngayXuat,
      ghiChu: dn => dn.ghiChu,
    };

    const result = deNghiThanhToans.map(dn => {
      const row = { id: dn.id };
      fields.forEach(f => {
        if (fieldMap[f]) row[f] = fieldMap[f](dn);
      });
      row.loaiTienTe = dn.loaiTienTe;
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

export const getDeNghiThanhToanDetail = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Thiếu id đề nghị thanh toán" });
    }

    const deNghiThanhToan = await DeNghiThanhToan.findOne({
      where: { id },
      include: [
        {
          model: DeNghiThanhToan_VuViec,
          as: "DeNghiThanhToan_VuViec",
          attributes: ["idVuViec", "isAutoImport"],
          include: [
            {
              model: VuViec,
              as: "VuViec", // phải trùng alias khi define association
              attributes: ["moTa", "tenVuViec", "soTien"],
            },
          ],
        },
      ],
    });


    if (!deNghiThanhToan) {
      return res.status(404).json({ message: "Không tìm thấy đề nghị thanh toán" });
    }

    return res.status(200).json({
      data: deNghiThanhToan,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết đề nghị thanh toán:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const editDeNghiThanhToan = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      id,
      idDoiTac,
      idKhachHang,
      maHoSo,
      matterName,
      yourRef,
      contactInfo,
      cases,
      subtotal,
      vat,
      total,
      maNhanSuCapNhap,
      deBitNoteNo,
      ngayGui,
      ngayThanhToan,
      ngayGuiHoaDon,
      ngayXuat,
      ghiChu,
      nguoiNhan
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Thiếu id đề nghị thanh toán" });
    }
    if (!deBitNoteNo) {
      return res.status(400).json({ message: "Thiếu DeBit Note No" });
    }

    if (!nguoiNhan || !nguoiNhan.toString().trim()) {
      return res.status(400).json({ message: "Thiếu người nhận (No)" });
    }
    // Tìm bản ghi cần update
    const existingRecord = await DeNghiThanhToan.findOne({ where: { id } });
    if (!existingRecord) {
      return res.status(404).json({ message: "Không tìm thấy đề nghị thanh toán" });
    }

    // Cập nhật dữ liệu
    await existingRecord.update(
      {
        deBitNoteNo: deBitNoteNo || existingRecord.deBitNoteNo,
        maQuocGia: contactInfo?.maQuocGia || existingRecord.maQuocGia,
        idDoiTac,
        idKhachHang,
        maHoSo,
        yourRef,
        nguoiNhan: contactInfo?.nguoiLienHe,
        tenKhachHang: contactInfo?.ten,
        diaChiNguoiNhan: contactInfo?.diaChi,
        email: contactInfo?.email,
        thue: vat ?? existingRecord.thue,
        tongTien: subtotal ?? existingRecord.tongTien,
        tongTienSauThue: total ?? existingRecord.tongTienSauThue,
        loaiTienTe: "VND", // vẫn default
        maNhanSuCapNhap,
        ngayGui,
        ngayThanhToan,
        ngayGuiHoaDon,
        ngayXuat,
        ghiChu,
        nguoiNhan
      },
      { transaction: t }
    );

    // Cập nhật lại danh sách vụ việc
    if (cases && Array.isArray(cases)) {
      // Xóa các liên kết cũ
      await DeNghiThanhToan_VuViec.destroy({
        where: { idDeNghiThanhToan: id },
        transaction: t,
      });

      // Thêm liên kết mới
      if (cases.length > 0) {
        const caseLinks = cases.map((c) => ({
          idDeNghiThanhToan: id,
          idVuViec: c.id,
          isAutoImport: false,
        }));
        await DeNghiThanhToan_VuViec.bulkCreate(caseLinks, { transaction: t });
      }
    }

    await t.commit();

    return res.status(200).json({
      message: "Cập nhật đề nghị thanh toán thành công",
      data: existingRecord,
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Lỗi khi cập nhật đề nghị thanh toán:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
