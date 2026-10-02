import { Sequelize, Op } from "sequelize";

import { HoSo_VuViec } from "../models/hoSoVuViecModel.js";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";
import { DoiTac } from "../models/doiTacModel.js";
import { QuocGia } from "../models/quocGiaModel.js";
import { LoaiVuViec } from "../models/loaiVuViecModel.js";
import { NhanSu_VuViec } from "../models/nhanSu_VuViecModel.js";
import { NhanSu } from "../models/nhanSuModel.js";
import { LoaiDon } from "../models/loaiDonModel.js";
import { DonDangKy } from "../models/donDangKyModel.js";
import { sendGenericNotification } from "../utils/notificationHelper.js";
import { DonDangKyNhanHieu_KH } from "../models/KH/donDangKyNhanHieu_KHModel.js";
import { DonGiaHan_NH_VN } from "../models/VN_GiaHan_NH/donGiaHanNH_VNModel.js";

export const searchCases = async (req, res) => {
    try {
        const { maKhachHang, maDoiTac, maLoaiVuViec, maQuocGia, maLoaiDon, maNhanSu, searchText, fields = [], pageIndex = 1, pageSize = 20 } = req.body;
        const offset = (pageIndex - 1) * pageSize;
        const whereCondition = {};
        if (maLoaiVuViec) whereCondition.maLoaiVuViec = maLoaiVuViec;
        if (maQuocGia) whereCondition.maQuocGiaVuViec = maQuocGia;
        if (maKhachHang) whereCondition.maKhachHang = maKhachHang;
        if (maDoiTac) whereCondition.maDoiTac = maDoiTac;
        if (maLoaiDon) whereCondition.maLoaiDon = maLoaiDon;
        if (searchText) {
            whereCondition[Op.or] = [
                { noiDungVuViec: { [Op.like]: `%${searchText}%` } },
                { maHoSoVuViec: { [Op.like]: `%${searchText}%` } }
            ];
        }
        const totalItems = await HoSo_VuViec.count({
            where: whereCondition,
            include: maNhanSu
                ? [{
                    model: NhanSu_VuViec,
                    as: "nhanSuXuLy",
                    required: true,
                    where: {
                        maNhanSu,
                        vaiTro: "Chính"
                    }
                }]
                : []
        });

        const cases = await HoSo_VuViec.findAll({
            where: whereCondition,
            attributes: [
                "id",
                "maHoSoVuViec",
                "noiDungVuViec",
                "trangThaiVuViec",
                "buocXuLyHienTai",
                "ngayTiepNhan",
                "createdAt",
                "updatedAt"
            ],
            include: [
                { model: KhachHangCuoi, as: "khachHang", attributes: ["tenKhachHang"] },
                { model: DoiTac, as: "doiTac", attributes: ["tenDoiTac"] },
                { model: QuocGia, as: "quocGia", attributes: ["tenQuocGia", "maQuocGia"] },
                { model: LoaiVuViec, as: "loaiVuViec", attributes: ["tenLoaiVuViec", "maLoaiVuViec"] },
                { model: LoaiDon, as: "loaiDon", attributes: ["tenLoaiDon", "maLoaiDon"] },
                {
                    model: NhanSu_VuViec,
                    as: "nhanSuXuLy",
                    attributes: ["vaiTro", "ngayGiaoVuViec", "maNhanSu"],
                    required: !!maNhanSu, // Chỉ bắt buộc join khi filter
                    where: maNhanSu ? {
                        maNhanSu,
                        vaiTro: { [Op.eq]: "Chính" } // so sánh đúng chính tả
                    } : undefined,
                    include: [
                        { model: NhanSu, as: "nhanSu", attributes: ["hoTen"] }
                    ]
                },

                {
                    model: DonDangKy,
                    as: "donDangKy",
                    required: false,
                    on: {
                        '$HoSo_VuViec.maHoSoVuViec$': { [Op.eq]: Sequelize.col('donDangKy.maHoSoVuViec') }
                    }
                },
                {
                    model: DonDangKyNhanHieu_KH,
                    as: "donDangKynhanhieuKH",
                    required: false,
                    on: {
                        '$HoSo_VuViec.maHoSoVuViec$': { [Op.eq]: Sequelize.col('donDangKynhanhieuKH.maHoSoVuViec') }
                    }
                },
                {
                    model: DonGiaHan_NH_VN,
                    as: "DonGiaHan_NH_VN",
                    required: false,
                    on: {
                        '$HoSo_VuViec.maHoSoVuViec$': { [Op.eq]: Sequelize.col('DonGiaHan_NH_VN.maHoSoVuViec') }
                    }
                }
            ],
            limit: pageSize,
            offset: offset,
            order: [["maHoSoVuViec", "ASC"]]
        });
        if (!cases.length) {
            return res.status(404).json({ message: "Không tìm thấy vụ việc nào" });
        }
        const fieldMap = {
            maHoSoVuViec: hoSo => hoSo.maHoSoVuViec,
            noiDungVuViec: hoSo => hoSo.noiDungVuViec,
            trangThaiVuViec: hoSo => hoSo.trangThaiVuViec,
            buocXuLyHienTai: hoSo => hoSo.buocXuLyHienTai,
            ngayTiepNhan: hoSo => hoSo.ngayTiepNhan,
            ngayTao: hoSo => hoSo.createdAt,
            ngayCapNhap: hoSo => hoSo.updatedAt,
            tenKhachHang: hoSo => hoSo.khachHang?.tenKhachHang || null,
            tenDoiTac: hoSo => hoSo.doiTac?.tenDoiTac || null,
            tenQuocGia: hoSo => hoSo.quocGia?.tenQuocGia || null,
            maQuocGia: hoSo => hoSo.quocGia?.maQuocGia || null,
            tenLoaiVuViec: hoSo => hoSo.loaiVuViec?.tenLoaiVuViec || null,
            maLoaiVuViec: hoSo => hoSo.loaiVuViec?.maLoaiVuViec || null,
            tenLoaiDon: hoSo => hoSo.loaiDon?.tenLoaiDon || null,
            maLoaiDon: hoSo => hoSo.loaiDon?.maLoaiDon || null,
            maDonDangKy: hoSo => hoSo.donDangKy?.maDonDangKy || null,
            soDon: hoSo => hoSo.donDangKy?.soDon || null,
            maDonDangKyKH: hoSo => hoSo.donDangKynhanhieuKH?.maDonDangKy || null,
            soDonKH: hoSo => hoSo.donDangKynhanhieuKH?.soDon || null,
            maDonGiaHan: hoSo => hoSo.DonGiaHan_NH_VN?.maDonGiaHan || null,
            soDonGiaHan: hoSo => hoSo.DonGiaHan_NH_VN?.soDon || null,
            nguoiXuLyChinh: hoSo => {
                const chinh = hoSo.nhanSuXuLy?.find(ns => ns.vaiTro === "Chính");
                return chinh
                    ? {
                        tenNhanSu: chinh.nhanSu?.hoTen || "Không xác định",
                        vaiTro: chinh.vaiTro,
                        ngayGiaoVuViec: chinh.ngayGiaoVuViec
                    }
                    : null;
            },

            nhanSuKhac: hoSo => hoSo.nhanSuXuLy
                ?.filter(ns => ns.vaiTro !== "Chính")
                ?.map(ns => ({
                    tenNhanSu: ns.nhanSu?.hoTen || "Không xác định",
                    vaiTro: ns.vaiTro,
                    ngayGiaoVuViec: ns.ngayGiaoVuViec
                })) || []
        };
        const defaultFields = ["maHoSoVuViec", "maDonDangKy", "tenLoaiVuViec", "tenLoaiDon", "soDon", "maDonDangKyKH", "soDonKH", "maQuocGia", "maLoaiDon", "maLoaiVuViec", "maDonGiaHan", "soDonGiaHan"];
        defaultFields.forEach(f => {
            if (!fields.includes(f)) {
                fields.push(f);
            }
        });
        const result = cases.map(hoSo => {
            const row = { id: hoSo.id };
            fields.forEach(field => {
                if (fieldMap[field]) {
                    row[field] = fieldMap[field](hoSo);
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


export const generateCaseCode = async (req, res) => {
    try {
        const { maKhachHang } = req.body;

        if (!maKhachHang) {
            return res.status(400).json({ message: "Thiếu mã khách hàng" });
        }

        // 🔎 Kiểm tra khách hàng tồn tại trong DB
        const khachHang = await KhachHangCuoi.findOne({
            where: { maKhachHang }
        });

        if (!khachHang) {
            return res.status(404).json({ message: `Không tìm thấy khách hàng với mã "${maKhachHang}"` });
        }

        // ✅ Tìm số thứ tự lớn nhất hiện có của KH này trong bảng HoSo_VuViec
        // maHoSoVuViec có dạng: "J00025-00003" → lấy phần số sau dấu "-" cuối
        const existingCases = await HoSo_VuViec.findAll({
            where: { maKhachHang },
            attributes: ["maHoSoVuViec"],
            order: [["maHoSoVuViec", "DESC"]],
        });

        let maxStt = 0;
        for (const hoSo of existingCases) {
            const parts = hoSo.maHoSoVuViec.split("-");
            const sttPart = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(sttPart) && sttPart > maxStt) {
                maxStt = sttPart;
            }
        }

        const nextStt = (maxStt + 1).toString().padStart(5, "0");
        const maHoSoVuViec = `${maKhachHang}-${nextStt}`;

        res.status(200).json({
            message: "Tạo mã hồ sơ vụ việc thành công",
            maHoSoVuViec,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// export const addCase = async (req, res) => {
//     try {
//         const { nhanSuVuViec, ...caseData } = req.body;

//         // Gán ngày tạo nếu chưa có
//         caseData.ngayTao = caseData.ngayTao || new Date();

//         // Tạo mới hồ sơ
//         const newCase = await HoSo_VuViec.create(caseData);
//         if (nhanSuVuViec && nhanSuVuViec.length > 0) {
//             const rolesMap = new Map();
//             for (const ns of nhanSuVuViec) {
//                 if (rolesMap.has(ns.maNhanSu)) {
//                     return res.status(400).json({
//                         message: `Nhân sự mã ${ns.maNhanSu} đã được phân công nhiều vai trò khác nhau.`,
//                     });
//                 }
//                 rolesMap.set(ns.maNhanSu, ns.vaiTro);
//             }
//             const nhanSuData = nhanSuVuViec.map((ns) => ({
//                 maHoSoVuViec: newCase.maHoSoVuViec,
//                 maNhanSu: ns.maNhanSu,
//                 vaiTro: ns.vaiTro,
//                 ngayGiaoVuViec: ns.ngayGiaoVuViec || new Date(),
//             }));

//             await NhanSu_VuViec.bulkCreate(nhanSuData);
//         }

//         res.status(201).json({ message: "Thêm hồ sơ vụ việc thành công", newCase });
//     } catch (error) {
//         if (error.name === "SequelizeValidationError") {
//             return res.status(400).json({ message: error.errors.map(e => e.message) });
//         }
//         res.status(500).json({ message: error.message });
//     }
// };

export const addCase = async (req, res) => {
    const t = await HoSo_VuViec.sequelize.transaction();
    try {
        const { nhanSuVuViec, ...caseData } = req.body;
        caseData.ngayTao = caseData.ngayTao || new Date();

        const newCase = await HoSo_VuViec.create(caseData, { transaction: t });

        if (nhanSuVuViec && nhanSuVuViec.length > 0) {
            const rolesMap = new Map();
            for (const ns of nhanSuVuViec) {
                if (rolesMap.has(ns.maNhanSu)) {
                    await t.rollback();
                    return res.status(400).json({
                        message: `Người xử lý chính và phụ phải khác nhau.`,
                    });
                }
                rolesMap.set(ns.maNhanSu, ns.vaiTro);
            }

            const nhanSuData = nhanSuVuViec.map((ns) => ({
                maHoSoVuViec: newCase.maHoSoVuViec,
                maNhanSu: ns.maNhanSu,
                vaiTro: ns.vaiTro,
                ngayGiaoVuViec: ns.ngayGiaoVuViec || new Date(),
            }));

            await NhanSu_VuViec.bulkCreate(nhanSuData, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ message: "Thêm hồ sơ vụ việc thành công", newCase });

    } catch (error) {
        await t.rollback();
        if (error instanceof Sequelize.UniqueConstraintError) {
            const errorField = error.errors?.[0]?.path || "unknown";
            const errorValue = error.errors?.[0]?.value || "";

            let message = "Dữ liệu đã tồn tại.";

            if (errorField === "maHoSoVuViec" || errorField === "PRIMARY") {
                message = `Mã hồ sơ vụ việc "${errorValue}" đã tồn tại.`;
            } else {
                message = `Trường "${errorField}" với giá trị "${errorValue}" đã bị trùng.`;
            }

            return res.status(409).json({ message });
        }

        if (error.name === "SequelizeValidationError") {
            return res.status(400).json({ message: error.errors.map(e => e.message) });
        }
        res.status(500).json({ message: error.message });
    }
};
export const updateCase = async (req, res) => {
    const t = await HoSo_VuViec.sequelize.transaction();
    try {
        const { id, maHoSoVuViec, nhanSuVuViec, maNhanSuCapNhap, ...updateData } = req.body;

        const caseToUpdate = await HoSo_VuViec.findByPk(id, {
            transaction: t
        });

        if (!caseToUpdate) {
            await t.rollback();
            return res.status(404).json({ message: "Hồ sơ vụ việc không tồn tại" });
        }

        const changedFields = [];

        if (maNhanSuCapNhap) {
            updateData.maNhanSuCapNhap = maNhanSuCapNhap;
        }

        for (const key in updateData) {
            if (
                updateData[key] !== undefined &&
                updateData[key] !== caseToUpdate[key]
            ) {
                changedFields.push({
                    field: key,
                    oldValue: caseToUpdate[key],
                    newValue: updateData[key],
                });
                caseToUpdate[key] = updateData[key];
            }
        }

        await caseToUpdate.update(updateData, { transaction: t });

        if (nhanSuVuViec && nhanSuVuViec.length > 0) {
            const roleTracker = new Map();

            for (const ns of nhanSuVuViec) {
                const existingRole = roleTracker.get(ns.maNhanSu);

                if (existingRole) {
                    // Nếu vai trò mới và vai trò cũ cùng là "Chính" hoặc "Phụ" → lỗi
                    if (
                        (existingRole === "Chính" && ns.vaiTro === "Phụ") ||
                        (existingRole === "Phụ" && ns.vaiTro === "Chính") ||
                        (existingRole === ns.vaiTro)
                    ) {
                        await t.rollback();
                        return res.status(400).json({
                            message: `Người xử lý chính và phụ phải khác nhau.`,
                        });
                    }
                }

                roleTracker.set(ns.maNhanSu, ns.vaiTro);
            }
            for (const ns of nhanSuVuViec) {
                await NhanSu_VuViec.destroy({
                    where: {
                        maHoSoVuViec,
                        maNhanSu: ns.maNhanSu,
                        vaiTro: 'Thay thế'
                    },
                    transaction: t
                });
            }
            for (const ns of nhanSuVuViec) {
                await NhanSu_VuViec.update(
                    { vaiTro: 'Thay thế' },
                    {
                        where: {
                            maHoSoVuViec,
                            vaiTro: ns.vaiTro,
                            maNhanSu: { [Op.ne]: ns.maNhanSu }
                        },
                        transaction: t
                    }
                );

                // Kiểm tra nếu đã tồn tại => cập nhật
                const existing = await NhanSu_VuViec.findOne({
                    where: {
                        maHoSoVuViec,
                        maNhanSu: ns.maNhanSu
                    },
                    transaction: t
                });

                if (existing) {
                    await existing.update({
                        vaiTro: ns.vaiTro,
                        ngayGiaoVuViec: ns.ngayGiaoVuViec || new Date()
                    }, { transaction: t });
                } else {
                    await NhanSu_VuViec.create({
                        maHoSoVuViec,
                        maNhanSu: ns.maNhanSu,
                        vaiTro: ns.vaiTro,
                        ngayGiaoVuViec: ns.ngayGiaoVuViec || new Date()
                    }, { transaction: t });
                }
            }
        }


        await t.commit();

        // Gửi thông báo nếu có cập nhật trường
        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật hồ sơ vụ việc",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật hồ sơ vụ việc '${caseToUpdate.tenVuViec || caseToUpdate.maHoSoVuViec}'`,
                data: {
                    maHoSoVuViec,
                    changes: changedFields,
                },
            });
        }

        res.status(200).json({ message: "Cập nhật hồ sơ vụ việc thành công", caseToUpdate });

    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteCase = async (req, res) => {
    try {
        const { id, maHoSoVuViec, maNhanSuCapNhap } = req.body;
        if (!id) {
            return res.status(400).json({ message: "Thiếu id hồ sơ vụ việc" });
        }
        const caseToDelete = await HoSo_VuViec.findByPk(id, {
        });
        if (!caseToDelete) {
            return res.status(404).json({ message: "Hồ sơ vụ việc không tồn tại" });
        }
        await NhanSu_VuViec.destroy({
            where: { maHoSoVuViec }
        });

        await caseToDelete.destroy();
        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa hồ sơ vụ việc",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa hồ sơ vụ việc'${caseToDelete.noiDungVuViec || caseToDelete.maHoSoVuViec}'`,
            data: { maHoSoVuViec },
        });
        res.status(200).json({ message: "Xóa hồ sơ vụ việc thành công" });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).json({ message: "Hồ sơ vụ việc đang được sử dụng, không thể xóa." });
        }

        res.status(500).json({ message: error.message });
    }
};




export const getCaseDetail = async (req, res) => {
    try {
        const { id } = req.body;
        const caseDetail = await HoSo_VuViec.findByPk(id, {
            // where: { maHoSoVuViec },
            include: [
                {
                    model: NhanSu_VuViec,
                    as: "nhanSuXuLy",
                    attributes: ["maNhanSu", "vaiTro"],
                    include: [
                        { model: NhanSu, as: "nhanSu", attributes: [] }
                    ]
                },
                {
                    model: DonDangKy,
                    as: "donDangKy",
                    attributes: ["maDonDangKy"]
                },
                {
                    model: DonDangKyNhanHieu_KH,
                    as: "donDangKynhanhieuKH",
                    attributes: ["maDonDangKy"]
                },
                {
                    model: DonGiaHan_NH_VN,
                    as: "DonGiaHan_NH_VN",
                    attributes: ["maDonGiaHan"],
                }
            ],
        });
        if (!caseDetail) {
            return res.status(404).json({ message: "Hồ sơ vụ việc không tồn tại" });
        }
        const nhanSuXuLy = caseDetail.nhanSuXuLy?.map(ns => ({
            maNhanSu: ns.maNhanSu,
            vaiTro: ns.vaiTro
        })) || [];
        const result = caseDetail.toJSON();
        delete result.donDangKy;
        res.status(200).json({
            ...result,
            nhanSuXuLy,
            maDonDangKy: caseDetail.donDangKy?.maDonDangKy || null,
            maDonDangKyKH: caseDetail.donDangKynhanhieuKH?.maDonDangKy || null,
            maDonGiaHan: caseDetail.DonGiaHan_NH_VN?.maDonGiaHan || null,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};