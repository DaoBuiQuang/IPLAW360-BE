import { Op, Sequelize } from "sequelize";
import { sendGenericNotification } from "../utils/notificationHelper.js";
import { NguoiLienHe } from "../models/nguoiLienHeModal.js";

/**
 * Lấy danh sách người liên hệ (có tìm kiếm & phân trang tùy chọn)
 * Body:
 *  - search?: string (tìm theo tên/sđt/địa chỉ/ghi chú)
 *  - page?: number (>=1)
 *  - limit?: number (1..200, mặc định 50)
 */
export const getContacts = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.body || {};
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

        const where = {};
        if (search) {
            // Tìm theo nhiều trường
            const like = `%${search}%`;
            where[Op.or] = [
                { tenNguoiLienHe: { [Op.like]: like } },
                { sdt: { [Op.like]: like } },
                { diaChi: { [Op.like]: like } },
                { ghiChu: { [Op.like]: like } },
            ];
        }

        const { rows, count } = await NguoiLienHe.findAndCountAll({
            where,
            limit: safeLimit,
            offset,
            order: [["createdAt", "DESC"]],
        });

        if (!rows.length) {
            return res.status(404).json({ message: "Không có người liên hệ nào" });
        }

        return res.status(200).json({
            items: rows,
            pagination: {
                page: Math.floor(offset / safeLimit) + 1,
                limit: safeLimit,
                total: count,
                totalPages: Math.ceil(count / safeLimit),
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Lấy người liên hệ theo id
 * Body:
 *  - id: number (bắt buộc)
 */
export const getContactById = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: "Thiếu id người liên hệ" });
        }

        const contact = await NguoiLienHe.findByPk(id);
        if (!contact) {
            return res.status(404).json({ message: "Người liên hệ không tồn tại" });
        }

        return res.status(200).json(contact);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Thêm người liên hệ
 * Body:
 *  - tenNguoiLienHe: string (bắt buộc)
 *  - sdt?: string
 *  - diaChi?: string
 *  - ghiChu?: string
 *  - maNhanSuCapNhap?: string | number (để ghi log/thông báo)
 */

export const addContact = async (req, res) => {
    try {
        const { tenNguoiLienHe, sdt, diaChi, ghiChu, maNhanSuCapNhap } = req.body || {};
        if (!tenNguoiLienHe || !tenNguoiLienHe.trim()) {
            return res.status(400).json({ message: "Vui lòng nhập tên người liên hệ" });
        }

        const normalizedName = tenNguoiLienHe.trim().replace(/\s+/g, " ");

        const existed = await NguoiLienHe.findOne({
            where: Sequelize.where(
                Sequelize.fn("lower", Sequelize.col("tenNguoiLienHe")),
                normalizedName.toLowerCase()
            ),
        });

        if (existed) {
            return res.status(409).json({ message: "Tên người liên hệ đã tồn tại" });
        }

        const newContact = await NguoiLienHe.create({
            tenNguoiLienHe: normalizedName,
            sdt: sdt?.trim() || null,
            diaChi: diaChi?.trim() || null,
            ghiChu: ghiChu?.trim() || null,
            // Nếu model không có cột này thì bỏ đi:
            // maNhanSuCapNhap: maNhanSuCapNhap || null,
        });

        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Thêm người liên hệ",
            bodyTemplate: (tenNhanSu) => `${tenNhanSu} đã thêm người liên hệ '${newContact.tenNguoiLienHe}'`,
            data: { id: newContact.id },
        });

        return res.status(201).json(newContact);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            return res.status(409).json({ message: "Tên người liên hệ đã tồn tại" });
        }
        return res.status(500).json({ message: error.message });
    }
};
/**
 * Cập nhật người liên hệ
 * Body:
 *  - id: number (bắt buộc)
 *  - tenNguoiLienHe?: string
 *  - sdt?: string
 *  - diaChi?: string
 *  - ghiChu?: string
 *  - maNhanSuCapNhap?: string | number
 */
export const updateContact = async (req, res) => {
    try {
        const { id, tenNguoiLienHe, sdt, diaChi, ghiChu, maNhanSuCapNhap } = req.body || {};
        if (!id) {
            return res.status(400).json({ message: "Thiếu id người liên hệ" });
        }

        const contact = await NguoiLienHe.findByPk(id);
        if (!contact) {
            return res.status(404).json({ message: "Người liên hệ không tồn tại" });
        }

        const changedFields = [];

        if (typeof tenNguoiLienHe !== "undefined" && tenNguoiLienHe !== contact.tenNguoiLienHe) {
            changedFields.push({
                field: "tenNguoiLienHe",
                oldValue: contact.tenNguoiLienHe,
                newValue: tenNguoiLienHe,
            });
            contact.tenNguoiLienHe = tenNguoiLienHe;
        }

        if (typeof sdt !== "undefined" && sdt !== contact.sdt) {
            changedFields.push({
                field: "sdt",
                oldValue: contact.sdt,
                newValue: sdt,
            });
            contact.sdt = sdt;
        }

        if (typeof diaChi !== "undefined" && diaChi !== contact.diaChi) {
            changedFields.push({
                field: "diaChi",
                oldValue: contact.diaChi,
                newValue: diaChi,
            });
            contact.diaChi = diaChi;
        }

        if (typeof ghiChu !== "undefined" && ghiChu !== contact.ghiChu) {
            changedFields.push({
                field: "ghiChu",
                oldValue: contact.ghiChu,
                newValue: ghiChu,
            });
            contact.ghiChu = ghiChu;
        }
        contact.maNhanSuCapNhap = maNhanSuCapNhap || contact.maNhanSuCapNhap;
        await contact.save();

        if (changedFields.length > 0) {
            await sendGenericNotification({
                maNhanSuCapNhap,
                title: "Cập nhật người liên hệ",
                bodyTemplate: (tenNhanSu) =>
                    `${tenNhanSu} đã cập nhật người liên hệ '${contact.tenNguoiLienHe}'`,
                data: {
                    id: contact.id,
                    changes: changedFields,
                },
            });
        }

        return res.status(200).json({
            message: "Cập nhật người liên hệ thành công",
            contact,
        });
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            return res.status(409).json({ message: "Dữ liệu đã tồn tại" });
        }
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Xóa người liên hệ
 * Body:
 *  - id: number (bắt buộc)
 *  - maNhanSuCapNhap?: string | number
 */
export const deleteContact = async (req, res) => {
    try {
        const { id, maNhanSuCapNhap } = req.body || {};
        if (!id) {
            return res.status(400).json({ message: "Thiếu id người liên hệ" });
        }

        const contact = await NguoiLienHe.findByPk(id);
        if (!contact) {
            return res.status(404).json({ message: "Người liên hệ không tồn tại" });
        }

        await contact.destroy();

        await sendGenericNotification({
            maNhanSuCapNhap,
            title: "Xóa người liên hệ",
            bodyTemplate: (tenNhanSu) =>
                `${tenNhanSu} đã xóa người liên hệ '${contact.tenNguoiLienHe}'`,
            data: { id },
        });

        return res.status(200).json({ message: "Xóa người liên hệ thành công" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
