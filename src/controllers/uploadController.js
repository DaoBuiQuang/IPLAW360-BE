import multer from "multer";
import xlsx from "xlsx";
import { sequelize } from "../config/db.js";
import fs from "fs";
import path from "path";
// Cấu hình multer để nhận file excel từ client
const storage = multer.memoryStorage();
const upload = multer({ storage });

// export const uploadExcel = [
//   upload.single("excel"),
//   async (req, res) => {
//     try {
//       // Đọc dữ liệu từ file Excel
//       const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
//       const sheet = workbook.Sheets[workbook.SheetNames[0]];
//       const rows = xlsx.utils.sheet_to_json(sheet);

//       let insertedCount = 0;
//       let skippedCount = 0;

//       for (const row of rows) {
//         const {
//           maKhachHang,
//           tenVietTatKH,
//           tenKhachHang,
//           maQuocGia,
//           maDoiTac,
//           nguoiLienHe,
//           moTa,
//           ghiChu,
//           daXoa,
//         } = row;

//         // Kiểm tra các trường bắt buộc
//         if (!maKhachHang || !tenKhachHang) {
//           skippedCount++;
//           console.warn("⚠️ Bỏ qua dòng thiếu mã KH hoặc tên KH:", row);
//           continue;
//         }

//         try {
//           await sequelize.query(
//             `
//             INSERT INTO khachhangcuoi
//             (maKhachHang, tenVietTatKH, tenKhachHang, maQuocGia, maDoiTac, nguoiLienHe, moTa, ghiChu, daXoa)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//             `,
//             {
//               replacements: [
//                 maKhachHang ?? null,
//                 tenVietTatKH ?? null,
//                 tenKhachHang ?? null,
//                 maQuocGia ?? null,
//                 maDoiTac ?? null,
//                 nguoiLienHe ?? null,
//                 moTa ?? null,
//                 ghiChu ?? null,
//                 daXoa ?? 0,
//               ],
//             }
//           );

//           insertedCount++;
//         } catch (err) {
//           if (err.original?.code === "ER_DUP_ENTRY") {
//             console.warn("⚠️ Dòng bị trùng mã KH, bỏ qua:", maKhachHang);
//             skippedCount++;
//             continue;
//           } else {
//             throw err; // Lỗi khác thì ném ra ngoài
//           }
//         }
//       }

//       res.status(200).json({
//         message: `✅ Đã import xong Excel. Dòng thành công: ${insertedCount}, bị bỏ qua: ${skippedCount}`,
//       });
//     } catch (err) {
//       console.error("❌ Lỗi import Excel:", err);
//       res.status(500).json({ error: "Import thất bại." });
//     }
//   },
// ];
function excelDateToMySQLDate(value) {
  if (value == null || value === "") return null;

  // Trường hợp là số (Excel serial)
  if (typeof value === "number") {
    const utc_days  = Math.floor(value - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // Trường hợp là chuỗi: check regex YYYY-MM-DD
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(trimmed) && !isNaN(new Date(trimmed).getTime())) {
      return trimmed;
    }
    return null; // không đúng định dạng date
  }

  // Nếu là kiểu khác → null
  return null;
}

export const uploadExcel = [
  upload.single("excel"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Không có file Excel nào được tải lên" });
      }

      // Đọc dữ liệu từ file Excel
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, {
        raw: false, // ép các ô date thành string
        dateNF: "yyyy-mm-dd" // format mong muốn
      });
      let insertedCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const {
          Error,
          MaBanGhi,
          instructingFirm,
          maDoiTac,
          clientName,
          nguoiXuLyChinh,
          maKhachHang,
          "Matter Code": MatterCode,
          noiDungVuViec,
          nhomSPDV,
          tenNhanHieu,
          maQuocGiaVuViec,
          soDon,
          ngayNopDon,
          soBang,
          "Reg Date": RegDate,
          ghiChu,
          "Actions Awaited": ActionsAwaited,
          Note,
          hanTraLoi,
          hanXuLy,
          Overdue,
          maHoSoVuViec,
        } = row;

        // Nếu MaBanGhi trống => bỏ qua
        if (!MaBanGhi) {
          skippedCount++;
          continue;
        }

        try {
          await sequelize.query(
            `INSERT INTO dataHSVVExcel_ChuanHoa_KH_DonMoi
  (Error, MaBanGhi, instructingFirm, maDoiTac, clientName, nguoiXuLyChinh, maKhachHang, \`Matter Code\`, noiDungVuViec, nhomSPDV, tenNhanHieu, maQuocGiaVuViec, soDon, ngayNopDon, soBang, \`Reg Date\`, ghiChu, \`Actions Awaited\`, Note, hanTraLoi, hanXuLy, Overdue, maHoSoVuViec, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
              replacements: [
                Error ?? null,
                MaBanGhi ?? null,
                instructingFirm ?? null,
                maDoiTac ?? null,
                clientName ?? null,
                nguoiXuLyChinh ?? null,
                maKhachHang ?? null,
                MatterCode ?? null,
                noiDungVuViec ?? null,
                nhomSPDV ?? null,
                tenNhanHieu ?? null,
                maQuocGiaVuViec ?? null,
                soDon ?? null,
                 excelDateToMySQLDate(ngayNopDon),
                soBang ?? null,
                RegDate ?? null,
                ghiChu ?? null,
                ActionsAwaited ?? null,
                Note ?? null,
                hanTraLoi ?? null,
                hanXuLy ?? null,
                Overdue ?? null,
                maHoSoVuViec ?? null,
                new Date(), // createdAt
                new Date()  // updatedAt
              ]
            }
          );
          insertedCount++;
        } catch (err) {
          if (err.original?.code === "ER_DUP_ENTRY") {
            console.warn(`⚠️ Bỏ qua bản ghi trùng MaBanGhi: ${MaBanGhi}`);
            skippedCount++;
            continue;
          } else {
            throw err;
          }
        }
      }

      res.status(200).json({
        message: `✅ Import Excel hoàn tất. Thành công: ${insertedCount}, Bỏ qua: ${skippedCount}`,
      });
    } catch (err) {
      console.error("❌ Lỗi import Excel:", err);
      res.status(500).json({ error: "Import thất bại." });
    }
  },
];

export const uploadExcelDoiTac = [
  upload.single("excel"),
  async (req, res) => {
    try {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet);

      let insertedCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const {
          maDoiTac,
          tenDoiTac,
          maQuocGia,
        } = row;

        // Kiểm tra các trường bắt buộc
        if (!maDoiTac || !tenDoiTac) {
          skippedCount++;
          console.warn("⚠️ Bỏ qua dòng thiếu thông tin bắt buộc:", row);
          continue;
        }

        try {
          await sequelize.query(
            `
            INSERT INTO doitac
            (maDoiTac, tenDoiTac, maQuocGia, createdAt, updatedAt)
            VALUES (?, ?, ?, NOW(), NOW())
            `,
            {
              replacements: [
                maDoiTac ?? null,
                tenDoiTac ?? null,
                maQuocGia ?? null,
              ],
            }
          );

          insertedCount++;
        } catch (err) {
          if (err.original?.code === "ER_DUP_ENTRY") {
            console.warn("⚠️ Dòng bị trùng mã đối tác, bỏ qua:", maDoiTac);
            skippedCount++;
            continue;
          } else {
            throw err;
          }
        }
      }

      res.status(200).json({
        message: `✅ Đã import xong Excel. Dòng thành công: ${insertedCount}, bị bỏ qua: ${skippedCount}`,
      });
    } catch (err) {
      console.error("❌ Lỗi import Excel (Đối tác):", err);
      res.status(500).json({ error: "Import đối tác thất bại." });
    }
  },
];
function parseDate(input) {
  if (!input || typeof input !== "string") return null;

  const parts = input.split("/");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export const uploadExcelHoSoVuViec = [
  upload.single("excel"),
  async (req, res) => {
    try {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { raw: false });

      let insertedCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const {
          maHoSoVuViec,
          maKhachHang,
          noiDungVuViec,
          ngayTiepNhan,
          maLoaiVuViec,
          maLoaiDon,
          maQuocGiaVuViec,
          trangThaiVuViec,
          buocXuLyHienTai,
          tenNhanHieu,
          soDon,
          ngayNopDon,
          ghiChu,
          soBang,
          // hanTraLoi,
          // hanXuLy,
          buocXuLy,
          trangThaiDon,
          nhomSPDV
        } = row;

        if (!maHoSoVuViec || !maKhachHang || !maQuocGiaVuViec) {
          skippedCount++;
          console.warn("⚠️ Bỏ qua do thiếu trường bắt buộc:", {
            maHoSoVuViec,
            maKhachHang,
            maQuocGiaVuViec
          });
          continue;
        }
        // **Bỏ qua nếu soDon không bắt đầu bằng "4-"**
        if (!soDon || !soDon.startsWith("4-")) {
          skippedCount++;
          console.warn("⚠️ Bỏ qua do soDon không bắt đầu bằng '4-':", soDon);
          continue;
        }
        const transaction = await sequelize.transaction();
        try {
          await sequelize.query(`
            INSERT INTO hoso_vuviec (
              maHoSoVuViec, maKhachHang,
              noiDungVuViec, ngayTiepNhan, maLoaiVuViec, maLoaiDon,
              maQuocGiaVuViec, trangThaiVuViec, buocXuLyHienTai,
              createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, {
            replacements: [
              maHoSoVuViec,
              maKhachHang,
              noiDungVuViec ?? null,
              parseDate(ngayTiepNhan),
              maLoaiVuViec ?? 'TM',
              maLoaiDon ?? '1',
              maQuocGiaVuViec,
              trangThaiVuViec ?? null,
              buocXuLyHienTai ?? null,
              new Date(),
              new Date()
            ],
            transaction
          });

          let maNhanHieu = null;
          let maDonDangKy = null;

          if (tenNhanHieu) {
            const nhanHieuResult = await sequelize.query(`
              INSERT INTO nhanhieu (tenNhanHieu, createdAt, updatedAt)
              VALUES (?, NOW(), NOW())
            `, {
              replacements: [tenNhanHieu],
              transaction,
              type: sequelize.QueryTypes.INSERT
            });

            maNhanHieu = nhanHieuResult[0]; // ✅ insertId trả về tại index 0

            if (!maNhanHieu) {
              console.warn("⚠️ Không lấy được maNhanHieu, bỏ qua hồ sơ:", maHoSoVuViec);
              await transaction.rollback();
              skippedCount++;
              continue;
            }

            maDonDangKy = maHoSoVuViec;

            await sequelize.query(`
              INSERT INTO dondangkynhanhieu (
                maDonDangKy, soDon, maHoSoVuViec, maNhanHieu, trangThaiDon,
               buocXuLy, ghiChu, ngayNopDon,
                soBang, 
                createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, {
              replacements: [
                maDonDangKy,
                soDon ?? null,
                maHoSoVuViec,
                maNhanHieu,
                trangThaiDon ?? null,
                // parseDate(hanTraLoi),
                // parseDate(hanXuLy),
                buocXuLy ?? null,
                ghiChu ?? null,
                parseDate(ngayNopDon),
                soBang ?? null,
                new Date(),
                new Date()
              ],
              transaction
            });

            if (nhomSPDV) {
              const maSPDVList = nhomSPDV.split(",").map(n => n.trim());

              for (const maSPDV of maSPDVList) {
                if (maSPDV) {
                  await sequelize.query(`
        INSERT INTO dondk_spdv (maDonDangKy, maSPDV, createdAt, updatedAt)
        VALUES (?, ?, NOW(), NOW())
      `, {
                    replacements: [maDonDangKy, maSPDV],
                    transaction
                  });
                } else {
                  console.warn(`⚠️ Dòng maSPDV rỗng bị bỏ qua`);
                }
              }
            }
          }

          await transaction.commit();
          insertedCount++;
        } catch (err) {
          await transaction.rollback();
          if (err.original?.code === "ER_DUP_ENTRY") {
            console.warn("⚠️ Hồ sơ bị trùng mã, bỏ qua:", maHoSoVuViec);
            skippedCount++;
          } else {
            console.error("❌ Lỗi khi insert:", err);
            throw err;
          }
        }
      }

      res.status(200).json({
        message: `✅ Đã import hồ sơ: Thành công ${insertedCount}, Bỏ qua ${skippedCount}`
      });
    } catch (err) {
      console.error("❌ Lỗi tổng quát import:", err);
      res.status(500).json({ error: "Import hồ sơ thất bại." });
    }
  }
];


export const importHSVVFromDB = async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT
        MaBanGhi,
        maHoSoVuViec,
        maKhachHang,
        noiDungVuViec,
        maQuocGiaVuViec,
        tenNhanHieu,
        soDon,
        ngayNopDon,
        hanExcel,
        ghiChu,
        soBang,
        trangThaiDon,
        ngayCapBang,
        hanExcel,
        nhomSPDV
      FROM datahsvvexcel_chuanhoa_vn
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    let insertedCount = 0;
    let skippedCount = 0;
    let skippedRecords = []; // Lưu danh sách bị bỏ qua

    for (const row of rows) {
      const {
        MaBanGhi,
        maHoSoVuViec,
        maKhachHang,
        noiDungVuViec,
        ngayTiepNhan,
        maLoaiVuViec,
        ngayCapBang,
        maLoaiDon,
        maQuocGiaVuViec,
        trangThaiVuViec,
        buocXuLyHienTai,
        tenNhanHieu,
        hanExcel,
        soDon,
        ngayNopDon,
        ghiChu,
        soBang,
        buocXuLy,
        trangThaiDon,
        nhomSPDV
      } = row;

      if (!maHoSoVuViec || !maKhachHang || !maQuocGiaVuViec) {
        skippedCount++;
        skippedRecords.push({
          MaBanGhi,
          reason: "Thiếu thông tin bắt buộc (maHoSoVuViec, maKhachHang, maQuocGiaVuViec)"
        });
        continue;
      }

      if (!soDon || !soDon.startsWith("4-")) {
        skippedCount++;
        skippedRecords.push({
          MaBanGhi,
          reason: "Số đơn không hợp lệ hoặc không bắt đầu bằng '4-'"
        });
        continue;
      }

      const transaction = await sequelize.transaction();
      try {
        await sequelize.query(`
          INSERT INTO hoso_vuviec (
            maHoSoVuViec, maKhachHang,
            noiDungVuViec, ngayTiepNhan, maLoaiVuViec, maLoaiDon,
            maQuocGiaVuViec, trangThaiVuViec, buocXuLyHienTai, isAutoImport,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            maHoSoVuViec,
            maKhachHang,
            noiDungVuViec ?? null,
            null,
            maLoaiVuViec ?? 'TM',
            maLoaiDon ?? '1',
            
            maQuocGiaVuViec,
            trangThaiVuViec ?? null,
            buocXuLyHienTai ?? null,
            true,
            new Date(),
            new Date()
          ],
          transaction
        });

        let maNhanHieu = null;
        let maDonDangKy = null;

        if (tenNhanHieu) {
          const nhanHieuResult = await sequelize.query(`
            INSERT INTO nhanhieu (tenNhanHieu, isAutoImport, createdAt, updatedAt)
            VALUES (?, true, NOW(), NOW())
          `, {
            replacements: [tenNhanHieu],
            transaction,
            type: sequelize.QueryTypes.INSERT
          });

          maNhanHieu = nhanHieuResult[0];
          if (!maNhanHieu) {
            await transaction.rollback();
            skippedCount++;
            skippedRecords.push({
              MaBanGhi,
              reason: "Không thể tạo mã nhãn hiệu"
            });
            continue;
          }

          maDonDangKy = maHoSoVuViec;
          await sequelize.query(`
            INSERT INTO dondangkynhanhieu (
              maDonDangKy, soDon, maHoSoVuViec, maNhanHieu, trangThaiDon,
              buocXuLy, ghiChu, ngayNopDon, ngayCapBang, soBang, isAutoImport,hanExcel, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, {
            replacements: [
              maDonDangKy,
              soDon ?? null,
              maHoSoVuViec,
              maNhanHieu,
              trangThaiDon ?? null,
              buocXuLy ?? null,
              ghiChu ?? null,
              ngayNopDon ?? null,
              ngayCapBang ?? null,
              soBang ?? null,
              true,
              hanExcel ?? null,
              new Date(),
              new Date()
            ],
            transaction
          });

          if (nhomSPDV) {
            const maSPDVList = nhomSPDV.split(",").map(n => n.trim());
            for (const maSPDV of maSPDVList) {
              if (maSPDV) {
                await sequelize.query(`
                  INSERT INTO dondk_spdv (maDonDangKy, maSPDV, isAutoImport, createdAt, updatedAt)
                  VALUES (?, ?, true, NOW(), NOW())
                `, {
                  replacements: [maDonDangKy, maSPDV],
                  transaction
                });
              }
            }
          }
        }

        await transaction.commit();
        insertedCount++;
      } catch (err) {
        await transaction.rollback();
        skippedCount++;
        skippedRecords.push({
          MaBanGhi,
          reason: err.original?.code === "ER_DUP_ENTRY" ? "Bị trùng dữ liệu" : err.message
        });
      }
    }

    res.status(200).json({
      message: `✅ Đã import hồ sơ từ DB: Thành công ${insertedCount}, Bỏ qua ${skippedCount}`,
      skippedRecords // Trả thêm danh sách mã bị bỏ qua
    });
  } catch (err) {
    console.error("❌ Lỗi import từ DB:", err);
    res.status(500).json({ error: "Import hồ sơ thất bại." });
  }
};

export const importHSVVCamFromDB = async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT
        MaBanGhi,
        maHoSoVuViec,
        maKhachHang,
        noiDungVuViec,
        maQuocGiaVuViec,
        tenNhanHieu,
        soDon,
        ngayNopDon,
        ghiChu,
        soBang,
        trangThaiDon,
        ngayCapBang,
        nhomSPDV
      FROM datahsvvexcel_chuanhoa_kh_donmoi
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    let insertedCount = 0;
    let skippedCount = 0;
    let skippedRecords = []; // Lưu danh sách bị bỏ qua

    for (const row of rows) {
      const {
        MaBanGhi,
        maHoSoVuViec,
        maKhachHang,
        noiDungVuViec,
        ngayTiepNhan,
        maLoaiVuViec,
        ngayCapBang,
        maLoaiDon,
        maQuocGiaVuViec,
        trangThaiVuViec,
        buocXuLyHienTai,
        tenNhanHieu,
        soDon,
        ngayNopDon,
        ghiChu,
        soBang,
        buocXuLy,
        trangThaiDon,
        nhomSPDV
      } = row;

      if (!maHoSoVuViec || !maKhachHang || !maQuocGiaVuViec) {
        skippedCount++;
        skippedRecords.push({
          MaBanGhi,
          reason: "Thiếu thông tin bắt buộc (maHoSoVuViec, maKhachHang, maQuocGiaVuViec)"
        });
        continue;
      }

      // if (!soDon || !soDon.startsWith("4-")) {
      //   skippedCount++;
      //   skippedRecords.push({
      //     MaBanGhi,
      //     reason: "Số đơn không hợp lệ hoặc không bắt đầu bằng '4-'"
      //   });
      //   continue;
      // }

      const transaction = await sequelize.transaction();
      try {
        await sequelize.query(`
          INSERT INTO hoso_vuviec (
            maHoSoVuViec, maKhachHang,
            noiDungVuViec, ngayTiepNhan, maLoaiVuViec, maLoaiDon,
            maQuocGiaVuViec, trangThaiVuViec, buocXuLyHienTai, isAutoImport,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, {
          replacements: [
            maHoSoVuViec,
            maKhachHang,
            noiDungVuViec ?? null,
            null,
            maLoaiVuViec ?? 'TM',
            maLoaiDon ?? '1',
            
            maQuocGiaVuViec,
            trangThaiVuViec ?? null,
            buocXuLyHienTai ?? null,
            true,
            new Date(),
            new Date()
          ],
          transaction
        });

        let maNhanHieu = null;
        let maDonDangKy = null;

        if (tenNhanHieu) {
          const nhanHieuResult = await sequelize.query(`
            INSERT INTO nhanhieu (tenNhanHieu, isAutoImport, moTa, linkAnh, createdAt, updatedAt)
            VALUES (?, true, 'KH', 'KH', NOW(), NOW())
          `, {
            replacements: [tenNhanHieu],
            transaction,
            type: sequelize.QueryTypes.INSERT
          });

          maNhanHieu = nhanHieuResult[0];
          if (!maNhanHieu) {
            await transaction.rollback();
            skippedCount++;
            skippedRecords.push({
              MaBanGhi,
              reason: "Không thể tạo mã nhãn hiệu"
            });
            continue;
          }

          maDonDangKy = maHoSoVuViec;
          await sequelize.query(`
            INSERT INTO dondangkynhanhieu_kh (
              maDonDangKy, soDon, maHoSoVuViec, maNhanHieu, trangThaiDon,
              buocXuLy, ghiChu, ngayNopDon, ngayCapBang, soBang, isAutoImport, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, {
            replacements: [
              maDonDangKy,
              soDon ?? null,
              maHoSoVuViec,
              maNhanHieu,
              trangThaiDon ?? null,
              buocXuLy ?? null,
              ghiChu ?? null,
              ngayNopDon ?? null,
              ngayCapBang ?? null,
              soBang ?? null,
              true,
              new Date(),
              new Date()
            ],
            transaction
          });

          if (nhomSPDV) {
            const maSPDVList = nhomSPDV.split(",").map(n => n.trim());
            for (const maSPDV of maSPDVList) {
              if (maSPDV) {
                await sequelize.query(`
                  INSERT INTO dondk_spdv_kh (maDonDangKy, maSPDV, isAutoImport, createdAt, updatedAt)
                  VALUES (?, ?, true, NOW(), NOW())
                `, {
                  replacements: [maDonDangKy, maSPDV],
                  transaction
                });
              }
            }
          }
        }

        await transaction.commit();
        insertedCount++;
      } catch (err) {
        await transaction.rollback();
        skippedCount++;
        skippedRecords.push({
          MaBanGhi,
          reason: err.original?.code === "ER_DUP_ENTRY" ? "Bị trùng dữ liệu" : err.message
        });
      }
    }

    res.status(200).json({
      message: `✅ Đã import hồ sơ từ DB: Thành công ${insertedCount}, Bỏ qua ${skippedCount}`,
      skippedRecords // Trả thêm danh sách mã bị bỏ qua
    });
  } catch (err) {
    console.error("❌ Lỗi import từ DB:", err);
    res.status(500).json({ error: "Import hồ sơ thất bại." });
  }
};
const uploadDir = process.env.UPLOAD_DIR || "uploads";

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Không có file được upload",
            });
        }

        return res.status(200).json({
            message: "Upload thành công",
            fileName: req.file.filename,        // 👉 lưu DB
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            url: `/uploads/${req.file.filename}`, // FE dùng nếu cần
        });
    } catch (error) {
        return res.status(500).json({
            message: "Upload thất bại",
            error: error.message,
        });
    }
};

export const viewFile = (req, res) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({ message: "Thiếu tên file" });
        }

        const filePath = path.join(uploadDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File không tồn tại" });
        }

        // Trình duyệt tự quyết định view hay download
        return res.sendFile(path.resolve(filePath));
    } catch (error) {
        return res.status(500).json({
            message: "Không thể xem file",
            error: error.message,
        });
    }
};


/**
 * DOWNLOAD file
 * GET /api/files/download/:filename
 */
export const downloadFile = (req, res) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({ message: "Thiếu tên file" });
        }

        const filePath = path.join(uploadDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File không tồn tại" });
        }

        return res.download(filePath, filename);
    } catch (error) {
        return res.status(500).json({
            message: "Không thể tải file",
            error: error.message,
        });
    }
};