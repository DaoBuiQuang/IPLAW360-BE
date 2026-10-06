import { NhanHieu } from "../../models/nhanHieuModel.js";
// import { TaiLieu } from "../../models/taiLieuModel.js";
import { Op, literal } from "sequelize";
import dayjs from "dayjs";
import { sendGenericNotification } from "../../utils/notificationHelper.js";
import { SanPham_DichVu } from "../../models/sanPham_DichVuModel.js";
import cron from 'node-cron';
import { Sequelize } from "sequelize";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { TaiLieu_KH } from "../../models/KH/taiLieuKH_Model.js";
import { LichSuGiaHan_KH } from "../../models/KH/lichSuGiaHan_KH.js";
import { DonGiaHan_NH_VN } from "../../models/VN_GiaHan_NH/donGiaHanNH_VNModel.js";
import { TaiLieuGH_NH_VN } from "../../models/VN_GiaHan_NH/taiLieuGH_NH_VN_Model.js";
import { VuViec } from "../../models/vuViecModel.js";
import crypto from "crypto";
import { GCN_NH } from "../../models/GCN_NHModel.js";
import { DoiTac } from "../../models/doiTacModel.js";

// export const getAllApplication_GH_VN = async (req, res) => {
//     try {
//         const {
//             tenNhanHieu,
//             trangThaiDon,
//             searchText,
//             fields = [],
//             filterCondition = {},
//             pageIndex = 1,
//             pageSize = 20
//         } = req.body;

//         if (!fields.includes("maDonDangKy")) {
//             fields.push("maDonDangKy");
//         }

//         const offset = (pageIndex - 1) * pageSize;
//         const {
//             selectedField,
//             fromDate,
//             toDate,
//             sortByHanXuLy,
//             sortByHanTraLoi
//         } = filterCondition;

//         const whereCondition = {};

//         //if (maNhanHieu) whereCondition.maNhanHieu = maNhanHieu;
//         if (trangThaiDon) whereCondition.trangThaiDon = trangThaiDon;

//         if (searchText) {
//             const cleanText = searchText.replace(/-/g, '');
//             whereCondition[Op.or] = [
//                 { soDon: { [Op.like]: `%${searchText}%` } },
//                 literal(`REPLACE(soDon, '-', '') LIKE '%${cleanText}%'`),
//                 { maHoSoVuViec: { [Op.like]: `%${searchText}%` } },
//                 literal(`REPLACE(maHoSoVuViec, '-', '') LIKE '%${cleanText}%'`)
//             ];
//         }

//         if (selectedField && fromDate && toDate) {
//             whereCondition[selectedField] = { [Op.between]: [fromDate, toDate] };
//         }

//         if (fields.includes("trangThaiHoanThienHoSoTaiLieu")) {
//             fields.push("taiLieuChuaNop", "ngayHoanThanhHoSoTaiLieu_DuKien");
//         }
//         if (!fields.includes("hanXuLy")) {
//             fields.push("hanXuLy");
//         }

//         // ORDER theo sortBy...
//         // const order = [];
//         // if (sortByHanTraLoi) {
//         //     order.push([Sequelize.literal('"hanTraLoi" IS NULL'), 'ASC']); // NULL xuống cuối
//         //     order.push(['hanTraLoi', 'ASC']);
//         // }
//         // if (sortByHanXuLy) {
//         //     order.push([Sequelize.literal('"hanXuLy" IS NULL'), 'ASC']);
//         //     order.push(['hanXuLy', 'ASC']);
//         // }

//         const order = [];

//         if (sortByHanTraLoi) {
//             order.push([Sequelize.literal('hanTraLoi IS NULL'), 'ASC']); // NULL = TRUE (1), ASC đẩy xuống cuối
//             order.push(['hanTraLoi', 'ASC']); // sắp xếp ngày tăng dần
//         }

//         if (sortByHanXuLy) {
//             order.push([Sequelize.literal('hanXuLy IS NULL'), 'ASC']);
//             order.push(['hanXuLy', 'ASC']);
//         }


//         const { count: totalItems, rows: applications } = await DonGiaHan_NH_VN.findAndCountAll({
//             where: whereCondition,
//             distinct: true,
//             col: 'maDonGiaHan',
//             include: [

//                 {
//                     model: NhanHieu,
//                     as: 'NhanHieu',
//                     attributes: ['tenNhanHieu'],
//                     required: !!tenNhanHieu,
//                     where: tenNhanHieu ? { tenNhanHieu: { [Op.like]: `%${tenNhanHieu}%` } } : undefined
//                 }
//             ],
//             limit: pageSize,
//             offset: offset,
//             order
//         });

//         if (!applications || applications.length === 0) {
//             return res.status(404).json({ message: "Không có đơn đăng ký nào" });
//         }

//         const fieldMap = {
//             maHoSoVuViec: app => app.maHoSoVuViec,
//             soDon: app => app.soDon,
//             tenNhanHieu: app => app.NhanHieu?.tenNhanHieu || null,
//             trangThaiDon: app => app.trangThaiDon,
//             ngayNopDon: app => app.ngayNopDon,

//             ngayNhanBang: app => app.ngayNhanBang,
//             soBang: app => app.soBang,
//             ngayCapBang: app => app.ngayCapBang,
//             ngayHetHanBang: app => app.ngayHetHanBang,
//             ngayGuiBangChoKhachHang: app => app.ngayGuiBangChoKhachHang,
//             trangThaiHoanThienHoSoTaiLieu: app => {
//                 if (app.ngayHoanThanhHoSoTaiLieu) return "Hoàn thành";
//                 return app.trangThaiHoanThienHoSoTaiLieu || "Chưa hoàn thành";
//             },

//             // dsSPDV: app => app.DonGH_NH_VN_SPDV?.map(sp => ({ maSPDV: sp.maSPDV })) || [],
//             hanXuLy: app => app.hanXuLy,
//             hanTraLoi: app => app.hanTraLoi,
//         };

//         const result = applications.map(app => {
//             const row = {};
//             fields.forEach(field => {
//                 if (fieldMap[field]) {
//                     row[field] = fieldMap[field](app);
//                 }
//             });
//             return row;
//         });

//         res.status(200).json({
//             data: result,
//             pagination: {
//                 totalItems,
//                 totalPages: Math.ceil(totalItems / pageSize),
//                 pageIndex: Number(pageIndex),
//                 pageSize: Number(pageSize)
//             }
//         });
//     } catch (error) {
//         console.error("Lỗi getAllApplication:", error);
//         res.status(500).json({ message: error.message });
//     }
// };

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

export const getAllApplication_GH_VN = async (req, res) => {
    try {
        const {
            soBang,
            searchText,
            customerName,
            partnerName,
            brandName,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const offset = (pageIndex - 1) * pageSize;

        const searchTerm = String(searchText || soBang || "").trim();
        const effectiveCustomerName = customerName || req.body?.tenKhachHang || req.body?.maKhachHang;
        const effectivePartnerName = partnerName || req.body?.tenDoiTac || req.body?.maDoiTac;
        const effectiveBrandName = brandName || req.body?.tenNhanHieu || req.body?.maNhanHieu;

        const whereCondition = {};

        // ✅ Nếu người dùng nhập "searchText" hoặc "soBang", sẽ tìm trong số đơn gia hạn soDon, số bằng GCN.soBang, số đơn gốc GCN.soDon, mã hồ sơ GCN.maHoSo
        if (searchTerm) {
            whereCondition[Op.or] = [
                { "$DonGiaHan_NH_VN.soDon$": { [Op.like]: `%${searchTerm}%` } },
                { "$gcn.soBang$": { [Op.like]: `%${searchTerm}%` } },
                { "$gcn.soDon$": { [Op.like]: `%${searchTerm}%` } },
                { "$gcn.maHoSo$": { [Op.like]: `%${searchTerm}%` } },
            ];
        }

        const { count: totalItems, rows } = await DonGiaHan_NH_VN.findAndCountAll({
            where: whereCondition,
            distinct: true,
            col: "id",
            include: [
                {
                    model: GCN_NH,
                    as: "gcn",
                    required: !!(effectiveBrandName || effectiveCustomerName || effectivePartnerName),
                    attributes: [
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
                    ],
                    include: [
                        {
                            model: NhanHieu,
                            as: "NhanHieu",
                            attributes: ["tenNhanHieu"],
                            required: !!effectiveBrandName,
                            where: buildTokensSearch(effectiveBrandName, "tenNhanHieu"),
                        },
                        {
                            model: KhachHangCuoi,
                            as: "KhachHangCuoi",
                            attributes: ["tenKhachHang", "maKhachHang"],
                            required: !!effectiveCustomerName,
                            where: buildCustomerSearch(effectiveCustomerName),
                        },
                        {
                            model: DoiTac,
                            as: "DoiTac",
                            attributes: ["tenDoiTac", "maDoiTac"],
                            required: !!effectivePartnerName,
                            where: buildPartnerSearch(effectivePartnerName),
                        },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: pageSize,
            offset,
        });

        // ✅ Trả về dữ liệu + pagination
        return res.status(200).json({
            data: rows,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize),
                pageIndex: Number(pageIndex),
                pageSize: Number(pageSize),
            },
        });
    } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách đơn gia hạn:", error);
        return res.status(500).json({
            message: "Lỗi khi lấy danh sách đơn gia hạn",
            error: error.message,
        });
    }
};



// export const getApplicationById_GH_VN = async (req, res) => {
//     try {
//         const { maDonGiaHan } = req.body;
//         if (!maDonGiaHan) return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });

//         const don = await DonGiaHan_NH_VN.findOne({
//             where: { maDonGiaHan },
//             include: [
//                 {
//                     model: TaiLieuGH_NH_VN,
//                     as: "TaiLieuGH_NH_VN",
//                     attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"]
//                 },
//                 {
//                     model: NhanHieu,
//                     as: "NhanHieu",
//                     attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh"]
//                 }
//             ]
//         });


//         if (!don) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });

//         const plainDon = don.toJSON();
//         const vuViecs = await VuViec.findAll({
//             where: { maHoSo: plainDon.maHoSo },
//             attributes: ["id", "maHoSo", "tenVuViec", "soDon", "idKhachHang", "ngayTaoVV", "deadline", "softDeadline", "soTien", "loaiTienTe", "xuatBill", "isMainCase", "maNguoiXuLy"],
//             order: [["createdAt", "DESC"]]
//         });

//         // gắn vào kết quả trả về (dạng mảng)
//         plainDon.vuViec = vuViecs.map(v => v.toJSON());
//         console.log("Plain Don:", plainDon);
//         // plainDon.lichSuThamDinh = [];

//         // if (Array.isArray(plainDon.lichSuThamDinh)) {
//         //     for (const item of plainDon.lichSuThamDinh) {
//         //         plainDon.lichSuThamDinh.push(item);
//         //         // if (item.loaiThamDinh === "HinhThuc") {
//         //         //     plainDon.lichSuThamDinhHT.push(item);
//         //         // }
//         //         // else if (item.loaiThamDinh === "NoiDung") {
//         //         //     plainDon.lichSuThamDinhND.push(item);
//         //         // }
//         //     }
//         // }
//         // delete plainDon.lichSuThamDinh;


//         res.json(plainDon);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

export const getApplicationById_GH_VN = async (req, res) => {
    try {
        const { id } = req.body; // hoặc req.params nếu bạn dùng theo URL param

        if (!id) {
            return res.status(400).json({
                message: "Thiếu id đơn gia hạn!",
            });
        }

        const donGiaHan_NH_VN = await DonGiaHan_NH_VN.findByPk(id, {
            include: [
                {
                    model: TaiLieuGH_NH_VN,
                    as: "TaiLieuGH_NH_VN",
                    attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"],
                },
                {
                    model: GCN_NH,
                    as: "gcn",
                    attributes: [
                        "id",
                        "soBang",
                        "soDon",
                        "maHoSo",
                        "maNhanHieu",
                        "ngayCapBang",
                        "ngayHetHanBang",
                        "hanGiaHan",
                        "idKhachHang",
                        "idDoiTac",
                        "ngayNopDon",
                        "ghiChu",
                        "dsNhomSPDV",
                    ],
                    include: [
                        { model: NhanHieu, as: "NhanHieu", attributes: ["tenNhanHieu", "linkAnh"] },
                        { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["tenKhachHang"] },
                        { model: DoiTac, as: "DoiTac", attributes: ["tenDoiTac"] },
                    ],
                },
            ],
        });

        if (!donGiaHan_NH_VN) {
            return res.status(404).json({
                message: "Không tìm thấy đơn gia hạn!",
            });
        }

        // 👉 Chuyển sang object thường để dễ xử lý
        const data = donGiaHan_NH_VN.toJSON();

        if (data.gcn) {
            data.gcn.tenNhanHieu = data.gcn.NhanHieu?.tenNhanHieu || null;
            data.gcn.linkAnh = data.gcn.NhanHieu?.linkAnh || null;
            data.gcn.tenKhachHang = data.gcn.KhachHangCuoi?.tenKhachHang || null;
            data.gcn.tenDoiTac = data.gcn.DoiTac?.tenDoiTac || null;

            // Xoá các object lồng bên trong
            delete data.gcn.NhanHieu;
            delete data.gcn.KhachHangCuoi;
            delete data.gcn.DoiTac;
        }

        return res.status(200).json({
            message: "Lấy chi tiết đơn gia hạn thành công!",
            data,
        });
    } catch (error) {
        console.error("❌ Lỗi khi lấy chi tiết đơn gia hạn:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy chi tiết đơn gia hạn!",
            error: error.message,
        });
    }
};

export const createApplication_GH_VN = async (req, res) => {
    const transaction = await DonGiaHan_NH_VN.sequelize.transaction();
    try {
        const { maHoSo, taiLieus, ...donData } = req.body;

        const newDon = await DonGiaHan_NH_VN.create({
            ...donData,
        }, { transaction });

        if (Array.isArray(taiLieus)) {
            for (const tl of taiLieus) {
                await TaiLieuGH_NH_VN.create({
                    idDonGiaHan: newDon.id,
                    tenTaiLieu: tl.tenTaiLieu,
                    trangThai: tl.trangThai,
                    linkTaiLieu: tl.linkTaiLieu || null,
                }, { transaction });
            }
        }

        await transaction.commit();
        res.status(201).json({
            message: "Tạo đơn gia hạn và tài liệu thành công",
            don: newDon
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Sequelize error:", JSON.stringify(error, null, 2));
        res.status(400).json({ message: error.message, errors: error.errors });
    }
};


// export const updateApplication_GH_VN = async (req, res) => {
//     const t = await DonGiaHan_NH_VN.sequelize.transaction();
//     try {
//         const { maDonGiaHan, maHoSo, taiLieus, vuViecs, maSPDVList, maNhanHieu, maNhanSuCapNhap, nhanHieu, ...updateData } = req.body;

//         if (!maDonGiaHan) {
//             return res.status(400).json({ message: "Thiếu mã đơn đăng ký" });
//         }

//         const don = await DonGiaHan_NH_VN.findOne({
//             where: { maDonGiaHan }
//         });

//         if (!don) {
//             return res.status(404).json({ message: "Không tìm thấy đơn đăng ký ....." });
//         }
//         const changedFields = [];
//         if (maNhanSuCapNhap) {
//             updateData.maNhanSuCapNhap = maNhanSuCapNhap;
//         }
//         for (const key in updateData) {
//             if (
//                 updateData[key] !== undefined &&
//                 updateData[key] !== don[key]
//             ) {
//                 changedFields.push({
//                     field: key,
//                     oldValue: don[key],
//                     newValue: updateData[key],
//                 });
//                 don[key] = updateData[key];
//             }
//         }
//         if (nhanHieu && maNhanHieu) {
//             const nhanHieuInstance = await NhanHieu.findByPk(maNhanHieu, { transaction: t });
//             if (nhanHieuInstance) {
//                 if (nhanHieu.tenNhanHieu !== undefined) nhanHieuInstance.tenNhanHieu = nhanHieu.tenNhanHieu;
//                 if (nhanHieu.linkAnh !== undefined) nhanHieuInstance.linkAnh = nhanHieu.linkAnh;
//                 await nhanHieuInstance.save({ transaction: t });
//             }
//         }

//         await don.update({
//             ...updateData, maNhanHieu, maHoSoVuViec: maHoSo,
//             maHoSo: maHoSo,
//         }, { transaction: t });

//         if (Array.isArray(taiLieus)) {
//             for (const taiLieu of taiLieus) {
//                 if (taiLieu.maTaiLieu) {
//                     await TaiLieuGH_NH_VN.update({
//                         tenTaiLieu: taiLieu.tenTaiLieu,
//                         linkTaiLieu: taiLieu.linkTaiLieu,
//                         trangThai: taiLieu.trangThai,
//                     }, {
//                         where: { maTaiLieu: taiLieu.maTaiLieu },
//                         transaction: t
//                     });
//                 } else {
//                     await TaiLieuGH_NH_VN.create({
//                         tenTaiLieu: taiLieu.tenTaiLieu,
//                         linkTaiLieu: taiLieu.linkTaiLieu,
//                         trangThai: taiLieu.trangThai,
//                         maDonGiaHan: maDonGiaHan
//                     }, { transaction: t });
//                 }
//             }
//         }

//         if (Array.isArray(vuViecs)) {
//             const vuViecsHienTai = await VuViec.findAll({
//                 where: { maHoSo },
//                 transaction: t
//             });

//             const idVuViecsTruyenLen = vuViecs
//                 .filter(vv => vv.id) // hoặc vv.maVuViec tuỳ bạn chuẩn hoá
//                 .map(vv => vv.id);

//             // Xoá vụ việc không còn trong request
//             for (const vuViecCu of vuViecsHienTai) {
//                 if (!idVuViecsTruyenLen.includes(vuViecCu.id)) {
//                     await vuViecCu.destroy({ transaction: t });
//                 }
//             }

//             // Thêm mới hoặc cập nhật vụ việc
//             for (const vuViec of vuViecs) {
//                 let ngayXuatBill = null;
//                 let maNguoiXuatBill = null;
//                 if (vuViec.xuatBill === true) {
//                     ngayXuatBill = new Date();
//                     maNguoiXuatBill = maNhanSuCapNhap
//                 }
//                 if (vuViec.id) {
//                     // ✅ chỉ update các field có thể thay đổi
//                     await VuViec.update(
//                         {
//                             tenVuViec: vuViec.tenVuViec,
//                             moTa: vuViec.moTa,
//                             trangThai: vuViec.trangThai,
//                             maHoSo: maHoSo,
//                             soDon: don.soDon,
//                             idKhachHang: don.idKhachHang,
//                             idDoiTac: don.idDoiTac,
//                             maQuocGiaVuViec: "VN",
//                             ngayTaoVV: new Date(),
//                             maNguoiXuLy: vuViec.maNguoiXuLy,
//                             clientsRef: don.clientsRef,
//                             tenBang: "DonGiaHan_NH_VN",
//                             deadline: vuViec.deadline,
//                             softDeadline: vuViec.softDeadline,
//                             xuatBill: vuViec.xuatBill,
//                             ngayXuatBill: ngayXuatBill,
//                             maNguoiXuatBill: maNguoiXuatBill,
//                             soTien: vuViec.soTien,
//                             loaiTienTe: vuViec.loaiTienTe,
//                             isMainCase: vuViec.isMainCase,
//                         },
//                         {
//                             where: { id: vuViec.id },
//                             transaction: t
//                         }
//                     );
//                 } else {
//                     // ✅ create thì set đầy đủ
//                     await VuViec.create(
//                         {
//                             tenVuViec: vuViec.tenVuViec,
//                             moTa: vuViec.moTa,
//                             trangThai: vuViec.trangThai,
//                             maHoSo: maHoSo,
//                             soDon: don.soDon,
//                             idKhachHang: don.idKhachHang,
//                             maQuocGiaVuViec: "VN",
//                             ngayTaoVV: new Date(),
//                             maNguoiXuLy: vuViec.maNguoiXuLy,
//                             clientsRef: don.clientsRef,
//                             tenBang: "DonGiaHan_NH_VN",
//                             deadline: vuViec.deadline,
//                             softDeadline: vuViec.softDeadline,
//                             xuatBill: vuViec.xuatBill,
//                             ngayXuatBill: ngayXuatBill,
//                             maNguoiXuatBill: maNguoiXuatBill,
//                             soTien: vuViec.soTien,
//                             loaiTienTe: vuViec.loaiTienTe,
//                             isMainCase: vuViec.isMainCase,
//                         },
//                         { transaction: t }
//                     );
//                 }
//             }
//         }
//         if (changedFields.length > 0) {
//             await sendGenericNotification({
//                 maNhanSuCapNhap,
//                 title: "Cập nhập đơn đăng ký",
//                 bodyTemplate: (tenNhanSu) =>
//                     `${tenNhanSu} đã cập nhập đơn gia hạn nhãn hiệu Việt Nam'${don.soDon || don.maDonGiaHan}'`,
//                 data: {
//                     maDonGiaHan,
//                     changes: changedFields,
//                 },
//             });

//         }
//         await t.commit();
//         res.json({ message: "Cập nhật đơn thành công", data: don });
//     } catch (error) {
//         await t.rollback();
//         res.status(400).json({ message: error.message });
//     }
// };

export const updateApplication_GH_VN = async (req, res) => {
    const transaction = await DonGiaHan_NH_VN.sequelize.transaction();
    try {
        const {
            id,
            idGCN_NH,
            soDon,
            ngayNopYCGiaHan,
            donGoc,
            ngayKQThamDinh_DuKien,
            trangThaiThamDinh,
            ngayThongBaoTuChoiGiaHan,
            hanTraLoiTuChoiGiaHan,
            ngayTraLoiThongBaoTuChoiGiaHan,
            trangThaiTuChoiGiaHan,
            ngayQuyetDinhTuChoiGiaHan,
            ngayQuyetDinhGiaHan_DuKien,
            ngayQuyetDinhGiaHan,
            ngayDangBa,
            taiLieus
        } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Thiếu ID đơn gia hạn cần cập nhật!" });
        }

        // 🔹 1. Lấy đơn gia hạn
        const donGiaHan = await DonGiaHan_NH_VN.findByPk(id, { transaction });
        if (!donGiaHan) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn gia hạn tương ứng!" });
        }

        // 🔹 2. Lấy văn bằng GCN_NH (nếu có)
        const gcn = idGCN_NH
            ? await GCN_NH.findByPk(idGCN_NH, { transaction })
            : await GCN_NH.findByPk(donGiaHan.idGCN_NH, { transaction });

        if (!gcn) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy GCN Nhãn hiệu tương ứng!" });
        }

        // 🔹 3. Cập nhật thông tin đơn gia hạn
        await donGiaHan.update({
            idGCN_NH,
            soDon,
            ngayNopYCGiaHan,
            donGoc,
            ngayKQThamDinh_DuKien,
            trangThaiThamDinh,
            ngayThongBaoTuChoiGiaHan,
            hanTraLoiTuChoiGiaHan,
            ngayTraLoiThongBaoTuChoiGiaHan,
            trangThaiTuChoiGiaHan,
            ngayQuyetDinhTuChoiGiaHan,
            ngayQuyetDinhGiaHan_DuKien,
            ngayQuyetDinhGiaHan,
            ngayDangBa
        }, { transaction });

        // 🔹 4. Tính hạn gia hạn tiếp theo = ngày đăng bạ + 9.5 năm
        if (ngayDangBa) {
            const baseDate = dayjs(ngayDangBa);

            const hanGiaHanTiepTheo = baseDate
                .add(9, "year")
                .add(6, "month")
                .format("YYYY-MM-DD");

            const ngayHetHanBang = baseDate
                .add(10, "year")
                .format("YYYY-MM-DD");

            await gcn.update(
                {
                    hanGiaHan: hanGiaHanTiepTheo,
                    ngayHetHanBang: ngayHetHanBang,
                },
                { transaction }
            );
        }


        // 🔹 5. Cập nhật danh sách tài liệu
        const taiLieusHienTai = await TaiLieuGH_NH_VN.findAll({
            where: { idDonGiaHan: id },
            transaction
        });

        const maTaiLieusTruyenLen = taiLieus?.filter(tl => tl.maTaiLieu)?.map(tl => tl.maTaiLieu) || [];

        // Xóa tài liệu cũ không còn trong danh sách
        for (const tlCu of taiLieusHienTai) {
            if (!maTaiLieusTruyenLen.includes(tlCu.maTaiLieu)) {
                await tlCu.destroy({ transaction });
            }
        }

        // Thêm hoặc cập nhật tài liệu mới
        if (Array.isArray(taiLieus)) {
            for (const tl of taiLieus) {
                if (tl.maTaiLieu) {
                    await TaiLieuGH_NH_VN.update({
                        tenTaiLieu: tl.tenTaiLieu,
                        linkTaiLieu: tl.linkTaiLieu,
                        trangThai: tl.trangThai
                    }, {
                        where: { maTaiLieu: tl.maTaiLieu },
                        transaction
                    });
                } else {
                    await TaiLieuGH_NH_VN.create({
                        tenTaiLieu: tl.tenTaiLieu,
                        linkTaiLieu: tl.linkTaiLieu,
                        trangThai: tl.trangThai,
                        idDonGiaHan: id
                    }, { transaction });
                }
            }
        }

        // 🔹 6. Commit transaction
        await transaction.commit();

        // 🔹 7. Trả lại đơn gia hạn cập nhật
        // const updated = await DonGiaHan_NH_VN.findByPk(id, {
        //     include: [
        //         {
        //             model: GCN_NH,
        //             as: "gcn",
        //             include: ["NhanHieu", "KhachHangCuoi", "DoiTac"]
        //         },
        //         {
        //             model: TaiLieuGH_NH_VN,
        //             as: "taiLieus"
        //         }
        //     ]
        // });

        return res.status(200).json({
            message: "Cập nhật đơn gia hạn thành công!",

        });

    } catch (error) {
        console.error("❌ Lỗi khi cập nhật đơn gia hạn:", error);
        await transaction.rollback();
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi cập nhật đơn gia hạn!",
            error: error.message
        });
    }
};

export const deleteApplication_GH_VN = async (req, res) => {
    try {
        const { maDonGiaHan, maNhanSuCapNhap } = req.body;

        if (!maDonGiaHan) {
            return res.status(400).json({ message: "Thiếu mã đơn gia hạn" });
        }

        const don = await DonGiaHan_NH_VN.findByPk(maDonGiaHan);
        if (!don) {
            return res.status(404).json({ message: "Không tìm thấy đơn gia hạn" });
        }
        await TaiLieu_KH.destroy({ where: { maDonGiaHan: maDonGiaHan } });
        await don.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa đơn gia hạn",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa đơn đăng ký '${don.soDon}'`,
            data: {
                maDonGiaHan,
            },
        });
        res.status(200).json({ message: "Đã xoá đơn đăng ký và tài liệu liên quan" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Đơn đăng ký đang được sử dụng, không thể xóa." });
        }

        res.status(500).json({ message: error.message });
    }
};


export const getFullApplicationDetail_GH_VN = async (req, res) => {
    try {
        const { maDonGiaHan } = req.body;
        if (!maDonGiaHan) return res.status(400).json({ message: "Thiếu mã đơn gia hạn" });

        const don = await DonGiaHan_NH_VN.findOne({
            where: { maDonGiaHan },
            include: [
                {
                    model: TaiLieuGH_NH_VN,
                    as: "TaiLieuGH_NH_VN",
                    attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"]
                },
                {
                    model: NhanHieu,
                    as: "NhanHieu",
                    attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh"]
                },
                {
                    model: KhachHangCuoi,
                    as: "khachHang",
                    attributes: ["id", "maKhachHang", "tenKhachHang", "diaChi", "sdt"]
                }
            ]
        });

        if (!don) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký" });

        const plainDon = don.toJSON();
        // plainDon.lichSuThamDinhHT = [];
        // plainDon.lichSuThamDinhND = [];

        // if (Array.isArray(plainDon.lichSuThamDinh)) {
        //     for (const item of plainDon.lichSuThamDinh) {
        //         if (item.loaiThamDinh === "HinhThuc") {
        //             plainDon.lichSuThamDinhHT.push(item);
        //         } else if (item.loaiThamDinh === "NoiDung") {
        //             plainDon.lichSuThamDinhND.push(item);
        //         }
        //     }
        // }

        // delete plainDon.lichSuThamDinh;

        if (plainDon.khachHang) {
            plainDon.maKhachHang = plainDon.khachHang.maKhachHang;
            plainDon.tenKhachHang = plainDon.khachHang.tenKhachHang;
            plainDon.diaChi = plainDon.khachHang.diaChi;
            plainDon.sdt = plainDon.khachHang.sdt;
        }

        res.json(plainDon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// export const getApplicationsByMaKhachHang_KH = async (req, res) => {
//     try {
//         const { maKhachHang } = req.body;

//         if (!maKhachHang) {
//             return res.status(400).json({ message: "Thiếu mã khách hàng" });
//         }

//         const applications = await DonDangKyNhanHieu_KH.findAll({
//             attributes: ['maDonDangKy', 'soDon'],
//             where: {
//                 giayUyQuyenGoc: true
//             },
//             include: [
//                 {
//                     model: HoSo_VuViec,
//                     as: 'hoSoVuViec',
//                     required: true,
//                     attributes: [],
//                     on: {
//                         '$hoSoVuViec.maHoSoVuViec$': { [Op.eq]: Sequelize.col('DonDangKyNhanHieu_KH.maHoSoVuViec') },
//                         '$hoSoVuViec.maKhachHang$': maKhachHang
//                     }
//                 }
//             ]

//         });
//         if (!applications || applications.length === 0) {
//             // return res.status(404).json({ message: "Không tìm thấy đơn nào" });
//         }

//         res.status(200).json(applications);
//     } catch (error) {
//         console.error("Lỗi getApplicationsByMaKhachHang:", error);
//         res.status(500).json({ message: error.message });
//     }
// };

// export const getMaKhachHangByMaHoSoVuViec_KH = async (req, res) => {
//     try {
//         const { maHoSoVuViec } = req.body;

//         if (!maHoSoVuViec) {
//             return res.status(400).json({ message: "Thiếu mã hồ sơ vụ việc" });
//         }

//         const hoSo = await HoSo_VuViec.findOne({
//             where: { maHoSoVuViec },
//             attributes: ['maKhachHang'],
//         });

//         if (!hoSo) {
//             return res.status(404).json({ message: "Không tìm thấy hồ sơ vụ việc" });
//         }

//         res.status(200).json({ maKhachHang: hoSo.maKhachHang });
//     } catch (error) {
//         console.error("Lỗi getMaKhachHangByMaHoSoVuViec:", error);
//         res.status(500).json({ message: error.message });
//     }
// };
