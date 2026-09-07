import { Op } from "sequelize";
import { TimeSheet } from "../models/timeSheetModel.js";
import { NhanSu } from "../models/nhanSuModel.js";
import { DonDangKy } from "../models/donDangKyModel.js";
import { DonDangKyNhanHieu_KH } from "../models/KH/donDangKyNhanHieu_KHModel.js";
import { GCN_NH } from "../models/GCN_NHModel.js";
import { GCN_NH_KH } from "../models/GCN_NH_KHModel.js";
import { TuVanChung_VN } from "../models/tuVanChung_VNModel.js";
import { TuVanChung_KH } from "../models/tuVanChung_KHModel.js";
import { DonDKBanQuyenTG_VH } from "../models/DonDKBanQuyenTG_VH.js";

const getEmployee = async (employeeCode) => {
    if (!employeeCode) return null;
    return NhanSu.findByPk(employeeCode);
};

const parseWorkData = (body, employee) => {
    const hours = Number(body.hours);
    const hourlyRate = Number(employee.hourlyRate || 0);

    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        return { error: "Số giờ làm việc phải lớn hơn 0 và không vượt quá 24 giờ" };
    }

    return {
        hours,
        hourlyRate,
        totalAmount: hours * hourlyRate,
    };
};

const enrichTimeSheets = async (timeSheets) => {
    const employeeCodes = [...new Set(timeSheets.map(item => item.employeeCode))];
    const employees = await NhanSu.findAll({
        where: { maNhanSu: { [Op.in]: employeeCodes } },
        attributes: ["maNhanSu", "hoTen", "phongBan"],
    });
    const employeeMap = new Map(employees.map(employee => [employee.maNhanSu, employee.toJSON()]));

    return timeSheets.map(item => ({
        ...item.toJSON(),
        employee: employeeMap.get(item.employeeCode) || null,
    }));
};

export const getCaseCodeOptions = async (req, res) => {
    try {
        const {
            searchText = "",
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const page = Math.max(Number(pageIndex), 1);
        const size = Math.min(Math.max(Number(pageSize), 1), 100);
        const search = String(searchText).trim().toLowerCase();

        const caseModels = [
            DonDangKy,
            DonDangKyNhanHieu_KH,
            GCN_NH,
            GCN_NH_KH,
            TuVanChung_VN,
            TuVanChung_KH,
            DonDKBanQuyenTG_VH,
        ];
        const caseRows = await Promise.all(caseModels.map(model => model.findAll({
            attributes: ["maHoSo"],
            where: search ? { maHoSo: { [Op.like]: `%${search}%` } } : undefined,
            raw: true,
        })));

        const caseCodes = [...new Set(
            caseRows
                .flat()
                .map(item => item.maHoSo)
                .filter(Boolean)
        )].sort((first, second) => first.localeCompare(second));

        const offset = (page - 1) * size;
        return res.status(200).json({
            data: caseCodes.slice(offset, offset + size).map(caseCode => ({ caseCode })),
            pagination: {
                totalItems: caseCodes.length,
                totalPages: Math.ceil(caseCodes.length / size),
                pageIndex: page,
                pageSize: size,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createTimeSheet = async (req, res) => {
    try {
        const {
            employeeCode,
            caseCode,
            workDate,
            hours,
            activity,
            description,
            notes,
        } = req.body;

        if (!employeeCode || !caseCode || !workDate || !activity) {
            return res.status(400).json({
                message: "Nhân sự, mã hồ sơ, ngày làm việc và hoạt động là bắt buộc",
            });
        }

        const employee = await getEmployee(employeeCode);
        if (!employee) return res.status(404).json({ message: "Nhân sự không tồn tại" });

        const workData = parseWorkData(req.body, employee);
        if (workData.error) return res.status(400).json({ message: workData.error });

        const timeSheet = await TimeSheet.create({
            employeeCode,
            caseCode,
            workDate,
            activity,
            description,
            status: "APPROVED",
            approvedBy: req.user?.maNhanSu || null,
            approvedAt: new Date(),
            notes,
            ...workData,
        });

        return res.status(201).json({
            message: "Thêm timesheet thành công",
            timeSheet,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateTimeSheet = async (req, res) => {
    try {
        const { id } = req.body;
        const timeSheet = await TimeSheet.findByPk(id);
        if (!timeSheet) return res.status(404).json({ message: "Timesheet không tồn tại" });
        if (["APPROVED", "LOCKED"].includes(timeSheet.status)) {
            return res.status(400).json({ message: "Timesheet đã duyệt hoặc chốt, không thể chỉnh sửa" });
        }

        const employeeCode = req.body.employeeCode ?? timeSheet.employeeCode;
        const caseCode = req.body.caseCode ?? timeSheet.caseCode;
        const employee = await getEmployee(employeeCode);
        if (!employee) return res.status(404).json({ message: "Nhân sự không tồn tại" });

        const workData = parseWorkData({
            hours: req.body.hours ?? timeSheet.hours,
        }, employee);
        if (workData.error) return res.status(400).json({ message: workData.error });

        const fields = ["employeeCode", "caseCode", "workDate", "activity", "description", "notes"];
        for (const field of fields) {
            if (req.body[field] !== undefined) timeSheet[field] = req.body[field];
        }
        Object.assign(timeSheet, workData);
        timeSheet.status = "APPROVED";
        timeSheet.approvedBy = req.user?.maNhanSu || timeSheet.approvedBy;
        timeSheet.approvedAt = timeSheet.approvedAt || new Date();
        await timeSheet.save();

        return res.status(200).json({
            message: "Cập nhật timesheet thành công",
            timeSheet,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getTimeSheetById = async (req, res) => {
    try {
        const { id } = req.body;
        const timeSheet = await TimeSheet.findByPk(id);
        if (!timeSheet) return res.status(404).json({ message: "Timesheet không tồn tại" });

        const [result] = await enrichTimeSheets([timeSheet]);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const listTimeSheets = async (req, res) => {
    try {
        const {
            employeeCode,
            caseCode,
            status,
            activity,
            fromDate,
            toDate,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const page = Math.max(Number(pageIndex), 1);
        const size = Math.min(Math.max(Number(pageSize), 1), 100);
        const where = {};

        if (employeeCode) where.employeeCode = employeeCode;
        if (caseCode) where.caseCode = caseCode;
        if (status) where.status = status;
        if (activity) where.activity = { [Op.like]: `%${activity}%` };
        if (fromDate || toDate) {
            where.workDate = {};
            if (fromDate) where.workDate[Op.gte] = fromDate;
            if (toDate) where.workDate[Op.lte] = toDate;
        }

        const { count, rows } = await TimeSheet.findAndCountAll({
            where,
            limit: size,
            offset: (page - 1) * size,
            order: [["workDate", "DESC"], ["id", "DESC"]],
        });

        return res.status(200).json({
            data: await enrichTimeSheets(rows),
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

export const deleteTimeSheet = async (req, res) => {
    try {
        const { id } = req.body;
        const timeSheet = await TimeSheet.findByPk(id);
        if (!timeSheet) return res.status(404).json({ message: "Timesheet không tồn tại" });
        if (["APPROVED", "LOCKED"].includes(timeSheet.status)) {
            return res.status(400).json({ message: "Timesheet đã duyệt hoặc chốt, không thể xóa" });
        }

        await timeSheet.destroy();
        return res.status(200).json({ message: "Xóa timesheet thành công" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getTimeSheetsByCase = async (req, res) => {
    try {
        const { caseCode } = req.body;
        if (!caseCode) return res.status(400).json({ message: "Mã hồ sơ là bắt buộc" });

        const timeSheets = await TimeSheet.findAll({
            where: { caseCode },
            order: [["workDate", "DESC"], ["id", "DESC"]],
        });
        const data = await enrichTimeSheets(timeSheets);
        const summary = data.reduce((result, item) => {
            result.totalHours += Number(item.hours);
            result.totalAmount += Number(item.totalAmount);
            return result;
        }, { totalHours: 0, totalAmount: 0 });

        return res.status(200).json({ data, summary });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getTimeSheetSummary = async (req, res) => {
    try {
        const { employeeCode, caseCode, fromDate, toDate, status } = req.body;
        const where = {};
        if (employeeCode) where.employeeCode = employeeCode;
        if (caseCode) where.caseCode = caseCode;
        if (status) where.status = status;
        if (fromDate || toDate) {
            where.workDate = {};
            if (fromDate) where.workDate[Op.gte] = fromDate;
            if (toDate) where.workDate[Op.lte] = toDate;
        }

        const rows = await TimeSheet.findAll({ where, attributes: ["hours", "totalAmount"] });
        const summary = rows.reduce((result, item) => {
            result.totalHours += Number(item.hours);
            result.totalAmount += Number(item.totalAmount);
            result.totalItems += 1;
            return result;
        }, { totalItems: 0, totalHours: 0, totalAmount: 0 });

        return res.status(200).json({ summary });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
