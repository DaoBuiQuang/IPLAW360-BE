import { NhomNhanSu } from "../models/nhomNhanSuModel.js";
import { NhanSu } from "../models/nhanSuModel.js";
import { Auth } from "../models/authModel.js";
import { Op } from "sequelize";

// ============================================================
// Helper: build danh sách thành viên đầy đủ của 1 manager
// ============================================================
// Helper: tự động thăng cấp role lên "manager" nếu đang là "staff" hoặc "trainee"
export const ensureManagerRole = async (managerCode) => {
    try {
        if (!managerCode) return;
        const managerAuth = await Auth.findOne({ where: { maNhanSu: managerCode } });
        if (!managerAuth) return;

        const currentRole = String(managerAuth.Role || "").toLowerCase();
        // TUYỆT ĐỐI KHÔNG thay đổi role nếu tài khoản này là admin hoặc ceo
        if (currentRole === "admin" || currentRole === "ceo") {
            return;
        }

        // Chỉ tự động nâng role thành manager nếu đang là staff hoặc trainee
        if (currentRole === "staff" || currentRole === "trainee") {
            managerAuth.Role = "manager";
            await managerAuth.save();
        }
    } catch (err) {
        console.error("Lỗi khi tự động nâng role cho manager:", err);
    }
};

const buildTeamResponse = async (managerCode) => {
    const records = await NhomNhanSu.findAll({
        where: { managerCode },
        include: [
            {
                model: NhanSu,
                as: "manager",
                attributes: ["maNhanSu", "hoTen", "chucVu", "email"],
                include: [
                    {
                        model: Auth,
                        as: "Auth",
                        attributes: ["Username", "Role"],
                        required: false,
                    },
                ],
            },
            {
                model: NhanSu,
                as: "thanhVien",
                attributes: ["maNhanSu", "hoTen", "chucVu", "phongBan", "email", "sdt"],
                include: [
                    {
                        model: Auth,
                        as: "Auth",
                        attributes: ["Username", "Role"],
                        required: false,
                    },
                ],
            },
        ],
        order: [["createdAt", "ASC"]],
    });

    let managerInfo = null;
    if (records.length > 0 && records[0].manager) {
        const m = records[0].manager.toJSON();
        managerInfo = {
            maNhanSu: m.maNhanSu,
            hoTen: m.hoTen,
            chucVu: m.chucVu,
            email: m.email,
            username: m.Auth?.Username || null,
            role: m.Auth?.Role || null,
        };
    } else if (managerCode) {
        const m = await NhanSu.findByPk(managerCode, {
            attributes: ["maNhanSu", "hoTen", "chucVu", "email"],
            include: [{ model: Auth, as: "Auth", attributes: ["Username", "Role"], required: false }],
        });
        if (m) {
            managerInfo = {
                maNhanSu: m.maNhanSu,
                hoTen: m.hoTen,
                chucVu: m.chucVu,
                email: m.email,
                username: m.Auth?.Username || null,
                role: m.Auth?.Role || null,
            };
        }
    }

    const members = records.map((r) => {
        const tv = r.thanhVien?.toJSON() || {};
        return {
            nhomId: r.id,
            tenNhom: r.tenNhom || null,
            maNhanSu: tv.maNhanSu,
            hoTen: tv.hoTen,
            chucVu: tv.chucVu,
            phongBan: tv.phongBan,
            email: tv.email,
            sdt: tv.sdt,
            username: tv.Auth?.Username || null,
            role: tv.Auth?.Role || null,
        };
    });

    return { manager: managerInfo, members };
};

// ============================================================
// POST /team/list  — Danh sach tat ca nhom (Admin)
// ============================================================
export const listAllTeams = async (req, res) => {
    try {
        const {
            managerCode,
            searchText,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;

        const page = Math.max(Number(pageIndex), 1);
        const size = Math.min(Math.max(Number(pageSize), 1), 100);

        const where = {};
        if (managerCode) where.managerCode = managerCode;

        const { count, rows } = await NhomNhanSu.findAndCountAll({
            where,
            include: [
                {
                    model: NhanSu,
                    as: "manager",
                    attributes: ["maNhanSu", "hoTen", "chucVu"],
                    where: searchText
                        ? { hoTen: { [Op.like]: `%${searchText}%` } }
                        : undefined,
                    required: !!searchText,
                },
                {
                    model: NhanSu,
                    as: "thanhVien",
                    attributes: ["maNhanSu", "hoTen", "chucVu", "email"],
                },
            ],
            limit: size,
            offset: (page - 1) * size,
            order: [["managerCode", "ASC"], ["createdAt", "ASC"]],
        });

        // Gom theo managerCode
        const teamMap = {};
        for (const rec of rows) {
            const mgCode = rec.managerCode;
            if (!teamMap[mgCode]) {
                teamMap[mgCode] = {
                    managerCode: mgCode,
                    managerName: rec.manager?.hoTen || mgCode,
                    managerChucVu: rec.manager?.chucVu || null,
                    members: [],
                };
            }
            if (rec.thanhVien) {
                teamMap[mgCode].members.push({
                    nhomId: rec.id,
                    tenNhom: rec.tenNhom || null,
                    maNhanSu: rec.thanhVien.maNhanSu,
                    hoTen: rec.thanhVien.hoTen,
                    chucVu: rec.thanhVien.chucVu,
                    email: rec.thanhVien.email,
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách nhóm thành công",
            teams: Object.values(teamMap),
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

// ============================================================
// POST /team/detail  — Chi tiết nhóm của 1 manager
// ============================================================
export const getTeamDetail = async (req, res) => {
    try {
        const callerRole = String(req.user?.role || "").toLowerCase();
        const callerCode = req.user?.maNhanSu;

        let managerCode;
        if (callerRole === "manager") {
            managerCode = callerCode;
        } else if (callerRole === "admin" || callerRole === "ceo") {
            managerCode = req.body?.managerCode || callerCode;
        } else {
            managerCode = callerCode;
        }

        if (!managerCode) {
            return res.status(400).json({ message: "Thiếu mã trưởng nhóm (managerCode)" });
        }

        const { manager, members } = await buildTeamResponse(managerCode);

        return res.status(200).json({
            success: true,
            message: "Lấy chi tiết nhóm thành công",
            manager,
            members,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ============================================================
// POST /team/add-member  — Thêm 1 thành viên
// ============================================================
export const addTeamMember = async (req, res) => {
    try {
        const callerRole = String(req.user?.role || "").toLowerCase();
        const callerCode = req.user?.maNhanSu;

        const { managerCode: bodyManagerCode, maNhanSu, tenNhom } = req.body;

        if (!maNhanSu) {
            return res.status(400).json({ message: "Mã nhân sự (maNhanSu) là bắt buộc" });
        }

        let managerCode;
        if (callerRole === "manager") {
            managerCode = callerCode;
        } else if (callerRole === "admin" || callerRole === "ceo") {
            managerCode = bodyManagerCode || callerCode;
        } else {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
        }

        if (!managerCode) {
            return res.status(400).json({ message: "Thiếu mã trưởng nhóm (managerCode)" });
        }

        const managerExists = await NhanSu.findByPk(managerCode);
        if (!managerExists) return res.status(404).json({ message: "Trưởng nhóm không tồn tại trong hệ thống" });

        // Tự động thăng cấp role lên "manager" nếu đang là "staff"
        await ensureManagerRole(managerCode);

        const memberExists = await NhanSu.findByPk(maNhanSu);
        if (!memberExists) return res.status(404).json({ message: "Nhân viên không tồn tại trong hệ thống" });

        if (managerCode === maNhanSu) {
            return res.status(400).json({ message: "Trưởng nhóm không thể tự thêm chính mình vào nhóm" });
        }

        const existing = await NhomNhanSu.findOne({ where: { managerCode, maNhanSu } });
        if (existing) {
            return res.status(409).json({ message: "Nhân viên này đã là thành viên của nhóm" });
        }

        const newRecord = await NhomNhanSu.create({ managerCode, maNhanSu, tenNhom });
        const { manager, members } = await buildTeamResponse(managerCode);

        return res.status(201).json({
            success: true,
            message: `Đã thêm nhân viên ${memberExists.hoTen} vào nhóm của ${managerExists.hoTen} thành công`,
            newMemberId: newRecord.id,
            manager,
            members,
        });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ message: "Nhân viên này đã là thành viên của nhóm" });
        }
        return res.status(500).json({ message: error.message });
    }
};

// ============================================================
// POST /team/remove-member  — Xóa thành viên
// ============================================================
export const removeTeamMember = async (req, res) => {
    try {
        const callerRole = String(req.user?.role || "").toLowerCase();
        const callerCode = req.user?.maNhanSu;

        const { nhomId, maNhanSu, managerCode: bodyManagerCode } = req.body;

        if (!nhomId && !maNhanSu) {
            return res.status(400).json({ message: "Cần cung cấp mã nhóm (nhomId) hoặc mã nhân sự (maNhanSu) để xóa" });
        }

        let record;
        if (nhomId) {
            record = await NhomNhanSu.findByPk(nhomId);
        } else {
            const managerCode = callerRole === "manager" ? callerCode : bodyManagerCode;
            record = await NhomNhanSu.findOne({ where: { managerCode, maNhanSu } });
        }

        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy thông tin thành viên trong nhóm" });
        }

        if (callerRole === "manager" && record.managerCode !== callerCode) {
            return res.status(403).json({ message: "Bạn không có quyền xóa thành viên của nhóm khác" });
        }

        const managerCode = record.managerCode;
        const removedMaNhanSu = record.maNhanSu;
        const removedNhanSu = await NhanSu.findByPk(removedMaNhanSu, { attributes: ["hoTen"] });

        await record.destroy();

        const { manager, members } = await buildTeamResponse(managerCode);

        return res.status(200).json({
            success: true,
            message: `Đã xóa nhân sự ${removedNhanSu?.hoTen || removedMaNhanSu} khỏi nhóm thành công`,
            manager,
            members,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ============================================================
// POST /team/bulk-add  — Thêm nhiều thành viên cùng lúc
// ============================================================
export const bulkAddTeamMembers = async (req, res) => {
    try {
        const callerRole = String(req.user?.role || "").toLowerCase();
        const callerCode = req.user?.maNhanSu;

        const { managerCode: bodyManagerCode, members, tenNhom } = req.body;

        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ message: "Cần cung cấp danh sách thành viên (mảng mã nhân sự)" });
        }

        let managerCode;
        if (callerRole === "manager") {
            managerCode = callerCode;
        } else if (callerRole === "admin" || callerRole === "ceo") {
            managerCode = bodyManagerCode;
        } else {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
        }

        if (!managerCode) return res.status(400).json({ message: "Thiếu mã trưởng nhóm (managerCode)" });

        const managerExists = await NhanSu.findByPk(managerCode);
        if (!managerExists) return res.status(404).json({ message: "Trưởng nhóm không tồn tại trong hệ thống" });

        // Tự động thăng cấp role lên "manager" nếu đang là "staff"
        await ensureManagerRole(managerCode);

        const uniqueMembers = [...new Set(members)].filter((m) => m !== managerCode);
        const results = { added: [], skipped: [], errors: [] };

        for (const maNhanSu of uniqueMembers) {
            try {
                const memberExists = await NhanSu.findByPk(maNhanSu);
                if (!memberExists) {
                    results.errors.push({ maNhanSu, reason: "Nhân viên không tồn tại trong hệ thống" });
                    continue;
                }
                const existing = await NhomNhanSu.findOne({ where: { managerCode, maNhanSu } });
                if (existing) {
                    results.skipped.push({ maNhanSu, hoTen: memberExists.hoTen, reason: "Đã là thành viên của nhóm" });
                    continue;
                }
                await NhomNhanSu.create({ managerCode, maNhanSu, tenNhom });
                results.added.push({ maNhanSu, hoTen: memberExists.hoTen });
            } catch (err) {
                results.errors.push({ maNhanSu, reason: err.message });
            }
        }

        const { manager, members: currentMembers } = await buildTeamResponse(managerCode);

        return res.status(200).json({
            success: true,
            message: `Đã thêm ${results.added.length} thành viên, bỏ qua ${results.skipped.length} thành viên`,
            results,
            manager,
            members: currentMembers,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ============================================================
// POST /team/set-team  — Thiết lập lại toàn bộ nhóm (thay thế)
// ============================================================
export const setTeamMembers = async (req, res) => {
    try {
        const callerRole = String(req.user?.role || "").toLowerCase();
        const callerCode = req.user?.maNhanSu;

        const { managerCode: bodyManagerCode, members, tenNhom } = req.body;

        if (!Array.isArray(members)) {
            return res.status(400).json({ message: "Danh sách thành viên (members) phải là một mảng mã nhân sự" });
        }

        let managerCode;
        if (callerRole === "manager") {
            managerCode = callerCode;
        } else if (callerRole === "admin" || callerRole === "ceo") {
            managerCode = bodyManagerCode;
        } else {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
        }

        if (!managerCode) return res.status(400).json({ message: "Thiếu mã trưởng nhóm (managerCode)" });

        const managerExists = await NhanSu.findByPk(managerCode);
        if (!managerExists) return res.status(404).json({ message: "Trưởng nhóm không tồn tại trong hệ thống" });

        // Tự động thăng cấp role lên "manager" nếu đang là "staff"
        await ensureManagerRole(managerCode);

        // Xóa toàn bộ nhóm cũ
        await NhomNhanSu.destroy({ where: { managerCode } });

        // Thêm lại nhóm mới
        const uniqueMembers = [...new Set(members)].filter((m) => m !== managerCode);
        const toCreate = uniqueMembers.map((maNhanSu) => ({
            managerCode,
            maNhanSu,
            tenNhom: tenNhom || null,
        }));

        if (toCreate.length > 0) {
            await NhomNhanSu.bulkCreate(toCreate, { ignoreDuplicates: true });
        }

        const { manager, members: currentMembers } = await buildTeamResponse(managerCode);

        return res.status(200).json({
            success: true,
            message: `Đã thiết lập nhóm với ${currentMembers.length} thành viên thành công`,
            manager,
            members: currentMembers,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

