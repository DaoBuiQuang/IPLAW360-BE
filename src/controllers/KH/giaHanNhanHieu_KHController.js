import { NhanHieu } from "../../models/nhanHieuModel.js";
// import { TaiLieu } from "../../models/taiLieuModel.js";
import { Op, literal } from "sequelize";
import dayjs from "dayjs";
import { sendGenericNotification } from "../../utils/notificationHelper.js";
import { SanPham_DichVu } from "../../models/sanPham_DichVuModel.js";
import cron from 'node-cron';
import { Sequelize } from "sequelize";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { TaiLieuGH_NH_KH } from "../../models/KH_GiaHan/taiLieuGH_NH_KHModel.js";
import { VuViec } from "../../models/vuViecModel.js";
import crypto from "crypto";
import { DoiTac } from "../../models/doiTacModel.js";
import { DonGiaHan_NH_KH } from "../../models/KH_GiaHan/DonGiaHan_NH_KHModel.js";
import { GCN_NH_KH } from "../../models/GCN_NH_KHModel.js";

const buildTokensSearchCondition = (value, fieldName) => {
    if (!value) return undefined;
    const tokens = String(value).trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return undefined;
    if (tokens.length === 1) return { [fieldName]: { [Op.like]: `%${tokens[0]}%` } };
    return {
        [Op.and]: tokens.map((tok) => ({ [fieldName]: { [Op.like]: `%${tok}%` } })),
    };
};

export const getAllApplication_GH_KH = async (req, res) => {
    try {
        const {
            soBang,
            searchTerm,
            customerName,
            partnerName,
            brandName,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const limit = Number(pageSize) || 20;
        const offset = ((Number(pageIndex) || 1) - 1) * limit;

        const whereCondition = {};
        const searchKeyword = String(soBang || searchTerm || "").trim();

        // ✅ Tìm theo số đơn gia hạn hoặc số bằng / số đơn / mã hồ sơ của GCN
        if (searchKeyword) {
            whereCondition[Op.or] = [
                { soDon: { [Op.like]: `%${searchKeyword}%` } },
                { "$gcn.soBang$": { [Op.like]: `%${searchKeyword}%` } },
                { "$gcn.soDon$": { [Op.like]: `%${searchKeyword}%` } },
                { "$gcn.maHoSo$": { [Op.like]: `%${searchKeyword}%` } },
            ];
        }

        const hasGcnNestedFilter = Boolean(
            String(customerName || "").trim() ||
            String(partnerName || "").trim() ||
            String(brandName || "").trim()
        );

        const { count: totalItems, rows } = await DonGiaHan_NH_KH.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: GCN_NH_KH,
                    as: "gcn",
                    required: hasGcnNestedFilter,
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
                            required: Boolean(String(brandName || "").trim()),
                            where: buildTokensSearchCondition(brandName, "tenNhanHieu"),
                        },
                        {
                            model: KhachHangCuoi,
                            as: "KhachHangCuoi",
                            attributes: ["tenKhachHang"],
                            required: Boolean(String(customerName || "").trim()),
                            where: buildTokensSearchCondition(customerName, "tenKhachHang"),
                        },
                        {
                            model: DoiTac,
                            as: "DoiTac",
                            attributes: ["tenDoiTac"],
                            required: Boolean(String(partnerName || "").trim()),
                            where: buildTokensSearchCondition(partnerName, "tenDoiTac"),
                        },
                    ],
                },
            ],
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]],
            limit,
            offset,
            subQuery: false,
            distinct: true,
        });

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

export const getApplicationById_GH_KH = async (req, res) => {
    try {
        const { id } = req.body; // hoặc req.params nếu bạn dùng theo URL param

        if (!id) {
            return res.status(400).json({
                message: "Thiếu id đơn gia hạn!",
            });
        }

        const donGiaHan_NH_KH = await DonGiaHan_NH_KH.findByPk(id, {
            include: [
                {
                    model: TaiLieuGH_NH_KH,
                    as: "TaiLieuGH_NH_KH",
                    attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"],
                },
                {
                    model: GCN_NH_KH,
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

        if (!donGiaHan_NH_KH) {
            return res.status(404).json({
                message: "Không tìm thấy đơn gia hạn!",
            });
        }

        // 👉 Chuyển sang object thường để dễ xử lý
        const data = donGiaHan_NH_KH.toJSON();

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

export const createApplication_GH_KH = async (req, res) => {
    const transaction = await DonGiaHan_NH_KH.sequelize.transaction();
    try {
        const { maHoSo, taiLieus, ...donData } = req.body;

        const newDon = await DonGiaHan_NH_KH.create({
            ...donData,
        }, { transaction });

        if (Array.isArray(taiLieus)) {
            for (const tl of taiLieus) {
                await TaiLieuGH_NH_KH.create({
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

export const updateApplication_GH_KH = async (req, res) => {
    const transaction = await DonGiaHan_NH_KH.sequelize.transaction();
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
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu ID đơn gia hạn cần cập nhật!" });
        }

        // 🔹 1. Lấy đơn gia hạn
        const donGiaHan = await DonGiaHan_NH_KH.findByPk(id, { transaction });
        if (!donGiaHan) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn gia hạn tương ứng!" });
        }

        // 🔹 2. Lấy văn bằng GCN_NH (nếu có)
        const gcn = idGCN_NH
            ? await GCN_NH_KH.findByPk(idGCN_NH, { transaction })
            : await GCN_NH_KH.findByPk(donGiaHan.idGCN_NH, { transaction });

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
        const taiLieusHienTai = await TaiLieuGH_NH_KH.findAll({
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
                    await TaiLieuGH_NH_KH.update({
                        tenTaiLieu: tl.tenTaiLieu,
                        linkTaiLieu: tl.linkTaiLieu,
                        trangThai: tl.trangThai
                    }, {
                        where: { maTaiLieu: tl.maTaiLieu },
                        transaction
                    });
                } else {
                    await TaiLieuGH_NH_KH.create({
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

// export const deleteApplication_GH_KH = async (req, res) => {
//     try {
//         const { maDonGiaHan, maNhanSuCapNhap } = req.body;

//         if (!maDonGiaHan) {
//             return res.status(400).json({ message: "Thiếu mã đơn gia hạn" });
//         }

//         const don = await DonGiaHan_NH_KH.findByPk(maDonGiaHan);
//         if (!don) {
//             return res.status(404).json({ message: "Không tìm thấy đơn gia hạn" });
//         }
//         await TaiLieu_KH.destroy({ where: { maDonGiaHan: maDonGiaHan } });
//         await don.destroy();
//         await sendGenericNotification({
//             maNhanSuCapNhap,
//             title: "Xóa đơn gia hạn",
//             bodyTemplate: (tenNhanSu) =>
//                 `${tenNhanSu} đã xóa đơn đăng ký '${don.soDon}'`,
//             data: {
//                 maDonGiaHan,
//             },
//         });
//         res.status(200).json({ message: "Đã xoá đơn đăng ký và tài liệu liên quan" });
//     } catch (error) {
//         if (error.name === "SequelizeForeignKeyConstraintError") {
//             return res.status(400).json({ message: "Đơn đăng ký đang được sử dụng, không thể xóa." });
//         }

//         res.status(500).json({ message: error.message });
//     }
// };


export const getFullApplicationDetail_GH_KH = async (req, res) => {
    try {
        const targetId = req.body.id || req.body.maDonGiaHan;
        if (!targetId) return res.status(400).json({ message: "Thiếu mã đơn gia hạn" });

        const don = await DonGiaHan_NH_KH.findByPk(targetId, {
            include: [
                {
                    model: TaiLieuGH_NH_KH,
                    as: "TaiLieuGH_NH_KH",
                    attributes: ["maTaiLieu", "tenTaiLieu", "linkTaiLieu", "trangThai"]
                },
                {
                    model: GCN_NH_KH,
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
                        {
                            model: NhanHieu,
                            as: "NhanHieu",
                            attributes: ["maNhanHieu", "tenNhanHieu", "linkAnh"]
                        },
                        {
                            model: KhachHangCuoi,
                            as: "KhachHangCuoi",
                            attributes: ["id", "maKhachHang", "tenKhachHang", "diaChi", "sdt"]
                        },
                        {
                            model: DoiTac,
                            as: "DoiTac",
                            attributes: ["tenDoiTac"]
                        }
                    ]
                }
            ]
        });

        if (!don) return res.status(404).json({ message: "Không tìm thấy đơn gia hạn" });

        const plainDon = don.toJSON();

        if (plainDon.gcn?.KhachHangCuoi) {
            plainDon.maKhachHang = plainDon.gcn.KhachHangCuoi.maKhachHang;
            plainDon.tenKhachHang = plainDon.gcn.KhachHangCuoi.tenKhachHang;
            plainDon.diaChi = plainDon.gcn.KhachHangCuoi.diaChi;
            plainDon.sdt = plainDon.gcn.KhachHangCuoi.sdt;
        }

        res.json(plainDon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

