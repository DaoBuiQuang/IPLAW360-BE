import { Op } from "sequelize";
import dayjs from "dayjs";
import { Affidavit } from "../../models/affidavitModel.js";
import { GCN_NH_KH } from "../../models/GCN_NH_KHModel.js";
import { NhanHieu } from "../../models/nhanHieuModel.js";
import { KhachHangCuoi } from "../../models/khanhHangCuoiModel.js";
import { DoiTac } from "../../models/doiTacModel.js";
import { TaiLieuAffidavit } from "../../models/KH/taiLieuAffidavitModel.js";
export const addAffidavit = async (req, res) => {
    const transaction = await Affidavit.sequelize.transaction();
    try {
        const {
            soAffidavit,
            idGCN_NH,
            lanNop,
            ngayNop,
            ngayGhiNhan,
            loaiTuyenThe,
            ghiChu,
            isAutoImport,
            taiLieus
        } = req.body;

        // ✅ 1. Kiểm tra đầu vào
        if (!idGCN_NH) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Thiếu idGCN_NH — cần liên kết tới văn bằng!",
            });
        }

        // ✅ 2. Kiểm tra văn bằng tồn tại
        const gcn = await GCN_NH_KH.findByPk(idGCN_NH, { transaction });
        if (!gcn) {
            await transaction.rollback();
            return res.status(404).json({
                message: "Không tìm thấy văn bằng (GCN_NH) tương ứng!",
            });
        }

        // ✅ 3. Kiểm tra xem đã tồn tại các lần nộp trước chưa
        const existingAffidavits = await Affidavit.findAll({
            where: { idGCN_NH },
            order: [["lanNop", "ASC"]],
            transaction,
        });

        if (existingAffidavits.length > 0) {
            const maxLanNop = Math.max(...existingAffidavits.map(a => a.lanNop || 1));
            if (!lanNop || lanNop <= maxLanNop) {
                await transaction.rollback();
                return res.status(400).json({
                    message: `Bạn đã nộp tuyên thệ lần ${maxLanNop}. Vui lòng chọn lần ${maxLanNop + 1}.`,
                });
            }
        } else {
            // Nếu chưa có lần nào => lần đầu tiên phải là 1
            if (!lanNop || lanNop !== 1) {
                await transaction.rollback();
                return res.status(400).json({
                    message: "Lần nộp đầu tiên phải là lần 1.",
                });
            }
        }

        // ✅ 4. Tạo mới Affidavit
        const newAffidavit = await Affidavit.create(
            {
                soAffidavit,
                idGCN_NH,
                lanNop,
                ngayNop: ngayNop || null,
                ngayGhiNhan: ngayGhiNhan || null,
                loaiTuyenThe: loaiTuyenThe || null,
                ghiChu: ghiChu || null,
                isAutoImport: isAutoImport || false,
            },
            { transaction }
        );
        if (Array.isArray(taiLieus)) {
            for (const tl of taiLieus) {
                await TaiLieuAffidavit.create(
                    {
                        idAffidavit: newAffidavit.id,
                        tenTaiLieu: tl.tenTaiLieu,
                        trangThai: tl.trangThai,
                        linkTaiLieu: tl.linkTaiLieu || null,
                    },
                    { transaction }
                );
            }
        }

        // ✅ 5. Cập nhật thông tin tuyên thệ & hạn nộp tuyên thệ (+5 năm) lên GCN_NH_KH
        const gcnUpdateData = {};
        if (ngayNop !== undefined) gcnUpdateData.ngayNopYCTuyenThe = ngayNop || null;
        if (loaiTuyenThe !== undefined) gcnUpdateData.loaiTuyenThe = loaiTuyenThe || null;
        if (ngayGhiNhan !== undefined) gcnUpdateData.ngayGhiNhanTuyenThe = ngayGhiNhan || null;
        if (ngayGhiNhan) {
            const newHanNopTuyenThe = dayjs(ngayGhiNhan)
                .add(5, "year")
                .format("YYYY-MM-DD");
            gcnUpdateData.hanNopTuyenThe = newHanNopTuyenThe;

            console.log(
                `🔁 Cập nhật hạn nộp tuyên thệ = ${newHanNopTuyenThe} cho GCN_NH id=${idGCN_NH}`
            );
        }
        if (Object.keys(gcnUpdateData).length > 0) {
            await gcn.update(gcnUpdateData, { transaction });
        }

        await transaction.commit();

        // ✅ 6. Trả kết quả
        return res.status(201).json({
            message: "Thêm mới Affidavit thành công!",
            data: newAffidavit,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("❌ Lỗi khi thêm Affidavit:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi thêm mới Affidavit!",
            error: error.message,
        });
    }
};

const buildTokensSearchCondition = (value, fieldName) => {
    if (!value) return undefined;
    const tokens = String(value).trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return undefined;
    if (tokens.length === 1) return { [fieldName]: { [Op.like]: `%${tokens[0]}%` } };
    return {
        [Op.and]: tokens.map((tok) => ({ [fieldName]: { [Op.like]: `%${tok}%` } })),
    };
};

export const getAffidavitList = async (req, res) => {
    try {
        const {
            soBang,
            searchTerm,
            customerName,
            partnerName,
            brandName,
            loaiTuyenThe,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const limit = Number(pageSize) || 20;
        const offset = ((Number(pageIndex) || 1) - 1) * limit;

        const whereCondition = {};
        const searchKeyword = String(soBang || searchTerm || "").trim();

        // ✅ Tìm theo số Affidavit hoặc số bằng / số đơn / mã hồ sơ của GCN
        if (searchKeyword) {
            whereCondition[Op.or] = [
                { soAffidavit: { [Op.like]: `%${searchKeyword}%` } },
                { "$gcn.soBang$": { [Op.like]: `%${searchKeyword}%` } },
                { "$gcn.soDon$": { [Op.like]: `%${searchKeyword}%` } },
                { "$gcn.maHoSo$": { [Op.like]: `%${searchKeyword}%` } },
            ];
        }

        if (loaiTuyenThe) {
            whereCondition.loaiTuyenThe = loaiTuyenThe;
        }

        const hasGcnNestedFilter = Boolean(
            String(customerName || "").trim() ||
            String(partnerName || "").trim() ||
            String(brandName || "").trim()
        );

        const { count, rows } = await Affidavit.findAndCountAll({
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
                        "hanNopTuyenThe",
                        "ngayNopYCTuyenThe",
                        "loaiTuyenThe",
                        "ngayGhiNhanTuyenThe",
                        "trangThaiBang",
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
            total: count,
            data: rows,
        });
    } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách Affidavit:", error);
        return res.status(500).json({
            message: "Lỗi khi lấy danh sách Affidavit",
            error: error.message,
        });
    }
};


export const getAffidavitDetail = async (req, res) => {
    try {
        const { id } = req.body; // hoặc req.params nếu dùng URL param

        if (!id) {
            return res.status(400).json({
                message: "Thiếu id Affidavit!",
            });
        }

        const affidavit = await Affidavit.findByPk(id, {
            include: [
                {
                    model: TaiLieuAffidavit,
                    as: "taiLieu",
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
                        "hanNopTuyenThe",
                        "ngayNopYCTuyenThe",
                        "loaiTuyenThe",
                        "ngayGhiNhanTuyenThe",
                        "trangThaiBang",
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

        if (!affidavit) {
            return res.status(404).json({
                message: "Không tìm thấy Affidavit!",
            });
        }

        // 👉 Chuyển sang object thuần để dễ thao tác
        const data = affidavit.toJSON();

        // 👉 Gộp các trường con vào gcn
        if (data.gcn) {
            data.gcn.tenNhanHieu = data.gcn.NhanHieu?.tenNhanHieu || null;
            data.gcn.linkAnh = data.gcn.NhanHieu?.linkAnh || null;
            data.gcn.tenKhachHang = data.gcn.KhachHangCuoi?.tenKhachHang || null;
            data.gcn.tenDoiTac = data.gcn.DoiTac?.tenDoiTac || null;

            // Xóa các object lồng
            delete data.gcn.NhanHieu;
            delete data.gcn.KhachHangCuoi;
            delete data.gcn.DoiTac;
        }

        return res.status(200).json({
            message: "Lấy chi tiết Affidavit thành công!",
            data,
        });
    } catch (error) {
        console.error("❌ Lỗi khi lấy chi tiết Affidavit:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy chi tiết Affidavit!",
            error: error.message,
        });
    }
};

export const editAffidavit = async (req, res) => {
    const transaction = await Affidavit.sequelize.transaction(); // ✅ Khai báo transaction ở đầu
    try {
        const {
            id,
            soAffidavit,
            idGCN_NH,
            lanNop,
            ngayNop,
            ngayGhiNhan,
            loaiTuyenThe,
            ghiChu,
            isAutoImport,
            taiLieus
        } = req.body;

        if (!id) {
            await transaction.rollback();
            return res.status(400).json({ message: "Thiếu ID Affidavit cần cập nhật!" });
        }

        const affidavit = await Affidavit.findByPk(id, { transaction });
        if (!affidavit) {
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy Affidavit tương ứng!" });
        }

        let gcn = null;
        if (idGCN_NH) {
            gcn = await GCN_NH_KH.findByPk(idGCN_NH, { transaction });
            if (!gcn) {
                await transaction.rollback();
                return res.status(404).json({
                    message: "Không tìm thấy văn bằng (GCN_NH) tương ứng!",
                });
            }
        }

        // ✅ 4. Cập nhật thông tin affidavit
        await affidavit.update({
            soAffidavit: soAffidavit ?? affidavit.soAffidavit,
            idGCN_NH: idGCN_NH ?? affidavit.idGCN_NH,
            lanNop: lanNop ?? affidavit.lanNop,
            ngayNop: ngayNop ?? affidavit.ngayNop,
            ngayGhiNhan: ngayGhiNhan ?? affidavit.ngayGhiNhan,
            loaiTuyenThe: loaiTuyenThe ?? affidavit.loaiTuyenThe,
            ghiChu: ghiChu ?? affidavit.ghiChu,
            isAutoImport: isAutoImport ?? affidavit.isAutoImport,
        }, { transaction });

        // ✅ 5. Cập nhật danh sách tài liệu
        const taiLieusHienTai = await TaiLieuAffidavit.findAll({
            where: { idAffidavit: id },
            transaction
        });

        const maTaiLieusTruyenLen = taiLieus?.filter(tl => tl.maTaiLieu).map(tl => tl.maTaiLieu) || [];

        // Xóa tài liệu cũ không còn trong danh sách
        for (const taiLieuCu of taiLieusHienTai) {
            if (!maTaiLieusTruyenLen.includes(taiLieuCu.maTaiLieu)) {
                await taiLieuCu.destroy({ transaction });
            }
        }

        // Thêm hoặc cập nhật tài liệu mới
        if (Array.isArray(taiLieus)) {
            for (const taiLieu of taiLieus) {
                if (taiLieu.maTaiLieu) {
                    await TaiLieuAffidavit.update({
                        tenTaiLieu: taiLieu.tenTaiLieu,
                        linkTaiLieu: taiLieu.linkTaiLieu,
                        trangThai: taiLieu.trangThai,
                    }, {
                        where: { maTaiLieu: taiLieu.maTaiLieu },
                        transaction
                    });
                } else {
                    await TaiLieuAffidavit.create({
                        tenTaiLieu: taiLieu.tenTaiLieu,
                        linkTaiLieu: taiLieu.linkTaiLieu,
                        trangThai: taiLieu.trangThai,
                        idAffidavit: id
                    }, { transaction });
                }
            }
        }

        // ✅ 6. Cập nhật thông tin tuyên thệ & hạn nộp tuyên thệ trên văn bằng
        const gcnUpdateData = {};
        if (ngayNop !== undefined) gcnUpdateData.ngayNopYCTuyenThe = ngayNop || null;
        if (loaiTuyenThe !== undefined) gcnUpdateData.loaiTuyenThe = loaiTuyenThe || null;
        if (ngayGhiNhan !== undefined) gcnUpdateData.ngayGhiNhanTuyenThe = ngayGhiNhan || null;
        if (ngayGhiNhan) {
            gcnUpdateData.hanNopTuyenThe = dayjs(ngayGhiNhan)
                .add(5, "year")
                .format("YYYY-MM-DD");
        }
        if (Object.keys(gcnUpdateData).length > 0) {
            const gcnUpdateTarget = gcn || (await GCN_NH_KH.findByPk(affidavit.idGCN_NH, { transaction }));
            if (gcnUpdateTarget) {
                await gcnUpdateTarget.update(gcnUpdateData, { transaction });
            }
        }

        // ✅ 7. Commit transaction
        await transaction.commit();

        // ✅ 8. Trả lại affidavit cập nhật
        const updatedAffidavit = await Affidavit.findByPk(id, {
            include: [
                {
                    model: GCN_NH_KH,
                    as: "gcn",
                    include: ["NhanHieu", "KhachHangCuoi", "DoiTac"],
                },
            ],
        });

        return res.status(200).json({
            message: "Cập nhật Affidavit thành công!",
            data: updatedAffidavit,
        });

    } catch (error) {
        console.error("❌ Lỗi khi cập nhật Affidavit:", error);
        await transaction.rollback(); // ✅ rollback khi có lỗi
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi cập nhật Affidavit!",
            error: error.message,
        });
    }
};
