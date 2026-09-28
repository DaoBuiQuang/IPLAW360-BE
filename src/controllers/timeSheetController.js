import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import { TimeSheet } from "../models/timeSheetModel.js";
import { NhanSu } from "../models/nhanSuModel.js";
import { DonDangKy } from "../models/donDangKyModel.js";
import { DonDangKyNhanHieu_KH } from "../models/KH/donDangKyNhanHieu_KHModel.js";
import { GCN_NH } from "../models/GCN_NHModel.js";
import { GCN_NH_KH } from "../models/GCN_NH_KHModel.js";
import { TuVanChung_VN } from "../models/tuVanChung_VNModel.js";
import { TuVanChung_KH } from "../models/tuVanChung_KHModel.js";
import { DonDKBanQuyenTG_VH } from "../models/DonDKBanQuyenTG_VH.js";
import { VuViec } from "../models/vuViecModel.js";
import { HoSo_VuViec } from "../models/hoSoVuViecModel.js";
import { QuocGia } from "../models/quocGiaModel.js";
import { DoiTac } from "../models/doiTacModel.js";
import { KhachHangCuoi } from "../models/khanhHangCuoiModel.js";

export const roundDecimal = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(Number(num))) return 0;
    return Number(Math.round(Number(num) + "e" + decimals) + "e-" + decimals);
};

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

    const safeHours = roundDecimal(hours, 2);
    const safeHourlyRate = roundDecimal(hourlyRate, 2);

    return {
        hours: safeHours,
        hourlyRate: safeHourlyRate,
        totalAmount: roundDecimal(safeHours * safeHourlyRate, 2),
    };
};

const enrichTimeSheets = async (timeSheets) => {
    const employeeCodes = [...new Set(timeSheets.map(item => item.employeeCode))];
    const countryCodes = [...new Set(timeSheets.map(item => item.countryCode).filter(Boolean))];
    const partnerCodes = [...new Set(timeSheets.map(item => item.partnerCode).filter(Boolean))];
    const customerCodes = [...new Set(timeSheets.map(item => item.customerCode).filter(Boolean))];
    const [employees, countries, partners, customers] = await Promise.all([
        NhanSu.findAll({ where: { maNhanSu: { [Op.in]: employeeCodes } }, attributes: ["maNhanSu", "hoTen", "phongBan"] }),
        countryCodes.length ? QuocGia.findAll({ where: { maQuocGia: { [Op.in]: countryCodes } }, attributes: ["maQuocGia", "tenQuocGia"] }) : [],
        partnerCodes.length ? DoiTac.findAll({ where: { maDoiTac: { [Op.in]: partnerCodes } }, attributes: ["maDoiTac", "tenDoiTac"] }) : [],
        customerCodes.length ? KhachHangCuoi.findAll({ where: { maKhachHang: { [Op.in]: customerCodes } }, attributes: ["maKhachHang", "tenKhachHang"] }) : [],
    ]);
    const employeeMap = new Map(employees.map(employee => [employee.maNhanSu, employee.toJSON()]));
    const countryMap = new Map(countries.map(item => [item.maQuocGia, item.tenQuocGia]));
    const partnerMap = new Map(partners.map(item => [item.maDoiTac, item.tenDoiTac]));
    const customerMap = new Map(customers.map(item => [item.maKhachHang, item.tenKhachHang]));

    return timeSheets.map(item => {
        const json = item.toJSON();
        const contributionPercentage = json.contributionPercentage != null ? Number(json.contributionPercentage) : 100;
        return {
            ...json,
            contributionPercentage,
            contributionRate: contributionPercentage,
            employee: employeeMap.get(item.employeeCode) || null,
            countryName: countryMap.get(item.countryCode) || null,
            partnerName: partnerMap.get(item.partnerCode) || null,
            customerName: customerMap.get(item.customerCode) || null,
        };
    });
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
        const search = String(searchText).trim();
        const searchTokens = search ? search.split(/\s+/).filter(Boolean) : [];

        const queryConfigs = [
            { model: DonDangKy, field: "maHoSo" },
            { model: DonDangKyNhanHieu_KH, field: "maHoSo" },
            { model: GCN_NH, field: "maHoSo" },
            { model: GCN_NH_KH, field: "maHoSo" },
            { model: TuVanChung_VN, field: "maHoSo" },
            { model: TuVanChung_KH, field: "maHoSo" },
            { model: DonDKBanQuyenTG_VH, field: "maHoSo" },
            { model: VuViec, field: "maHoSo" },
            { model: HoSo_VuViec, field: "maHoSoVuViec" },
            { model: TimeSheet, field: "caseCode" },
        ];

        const caseRows = await Promise.all(
            queryConfigs.map(({ model, field }) => {
                const where = {
                    [field]: {
                        [Op.and]: [
                            { [Op.ne]: null },
                            { [Op.ne]: "" },
                        ]
                    }
                };
                if (searchTokens.length > 0) {
                    searchTokens.forEach(tok => {
                        where[field][Op.and].push({ [Op.like]: `%${tok}%` });
                    });
                }
                return model.findAll({
                    attributes: [[field, "caseCode"]],
                    where,
                    raw: true,
                }).catch(err => {
                    console.error(`Lỗi khi lấy caseCode từ ${model?.name || field}:`, err?.message);
                    return [];
                });
            })
        );

        let caseCodes = [...new Set(
            caseRows
                .flat()
                .map(item => (typeof item?.caseCode === "string" ? item.caseCode.trim() : ""))
                .filter(Boolean)
        )];

        if (searchTokens.length > 0) {
            caseCodes = caseCodes.filter(code => {
                const lower = code.toLowerCase();
                return searchTokens.every(tok => lower.includes(tok.toLowerCase()));
            });
        }

        caseCodes.sort((first, second) => first.localeCompare(second));

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
            employeeCode: requestedEmployeeCode,
            caseCode,
            countryCode,
            partnerCode,
            customerCode,
            workDate,
            hours,
            activity,
            description,
            notes,
        } = req.body;
        const employeeCode = req.user?.maNhanSu || req.user?.employeeCode;

        if (!employeeCode) {
            return res.status(401).json({
                message: "Không xác định được nhân sự từ tài khoản đăng nhập",
            });
        }

        if (requestedEmployeeCode && requestedEmployeeCode !== employeeCode) {
            return res.status(403).json({
                message: "Bạn chỉ được tạo logtime cho tài khoản của mình",
            });
        }

        const finalEmployeeCode = employeeCode;

        if (!workDate || !activity) {
            return res.status(400).json({
                message: "Ngày làm việc và hoạt động là bắt buộc",
            });
        }

        const employee = await getEmployee(finalEmployeeCode);
        if (!employee) return res.status(404).json({ message: "Nhân sự không tồn tại" });

        const workData = parseWorkData(req.body, employee);
        if (workData.error) return res.status(400).json({ message: workData.error });

        const rawContribution = req.body.contributionPercentage ?? req.body.contributionRate;
        let contributionPercentage = 100.00;
        if (rawContribution !== undefined && rawContribution !== null && rawContribution !== "") {
            const parsed = Number(rawContribution);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
                return res.status(400).json({
                    message: "Tỉ lệ đóng góp (contributionPercentage) phải là số từ 0 đến 100",
                });
            }
            contributionPercentage = Math.round(parsed * 100) / 100;
        }

        const timeSheet = await TimeSheet.create({
            employeeCode: finalEmployeeCode,
            caseCode: caseCode || null,
            countryCode: countryCode || null,
            partnerCode: partnerCode || null,
            customerCode: customerCode || null,
            workDate,
            activity,
            description,
            contributionPercentage,
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
        const id = req.body?.id || req.query?.id;
        const timeSheet = await TimeSheet.findByPk(id);
        if (!timeSheet) return res.status(404).json({ message: "Timesheet không tồn tại" });

        const currentUserId = req.user?.maNhanSu || req.user?.employeeCode;
        if (!currentUserId || timeSheet.employeeCode !== currentUserId) {
            return res.status(403).json({ message: "Bạn chỉ có quyền chỉnh sửa Time Record của chính mình." });
        }

        const employeeCode = currentUserId;
        const caseCode = req.body.caseCode ?? timeSheet.caseCode;
        const employee = await getEmployee(employeeCode);
        if (!employee) return res.status(404).json({ message: "Nhân sự không tồn tại" });

        const workData = parseWorkData({
            hours: req.body.hours ?? timeSheet.hours,
        }, employee);
        if (workData.error) return res.status(400).json({ message: workData.error });

        const rawContribution = req.body.contributionPercentage ?? req.body.contributionRate;
        if (rawContribution !== undefined) {
            if (rawContribution === null || rawContribution === "") {
                timeSheet.contributionPercentage = 100.00;
            } else {
                const parsed = Number(rawContribution);
                if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
                    return res.status(400).json({
                        message: "Tỉ lệ đóng góp (contributionPercentage) phải là số từ 0 đến 100",
                    });
                }
                timeSheet.contributionPercentage = Math.round(parsed * 100) / 100;
            }
        }

        const fields = ["employeeCode", "caseCode", "countryCode", "partnerCode", "customerCode", "workDate", "activity", "description", "notes"];
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
            maNhanSu,
            caseCode,
            maVuViec,
            status,
            trangThai,
            activity,
            hoatDong,
            searchText,
            description,
            moTa,
            fromDate,
            toDate,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const page = Math.max(Number(pageIndex), 1);
        const size = Math.min(Math.max(Number(pageSize), 1), 100);
        const where = {};

        const targetEmployee = employeeCode || maNhanSu;
        if (req.user?.role === "staff") where.employeeCode = req.user.maNhanSu;
        else if (targetEmployee) where.employeeCode = targetEmployee;

        const targetCaseCode = caseCode || maVuViec;
        if (targetCaseCode) {
            const caseTokens = String(targetCaseCode).trim().split(/\s+/).filter(Boolean);
            if (caseTokens.length === 1) {
                where.caseCode = { [Op.like]: `%${caseTokens[0]}%` };
            } else if (caseTokens.length > 1) {
                where.caseCode = {
                    [Op.and]: caseTokens.map(tok => ({ [Op.like]: `%${tok}%` }))
                };
            }
        }

        const targetStatus = status || trangThai;
        if (targetStatus) where.status = targetStatus;

        const targetActivity = activity || hoatDong;
        if (targetActivity) {
            const actTokens = String(targetActivity).trim().split(/\s+/).filter(Boolean);
            if (actTokens.length === 1) {
                where.activity = { [Op.like]: `%${actTokens[0]}%` };
            } else if (actTokens.length > 1) {
                where.activity = {
                    [Op.and]: actTokens.map(tok => ({ [Op.like]: `%${tok}%` }))
                };
            }
        }

        const targetSearch = searchText || description || moTa;
        if (targetSearch) {
            const searchTokens = String(targetSearch).trim().split(/\s+/).filter(Boolean);
            if (searchTokens.length > 0) {
                where[Op.and] = where[Op.and] || [];
                searchTokens.forEach(tok => {
                    where[Op.and].push({
                        [Op.or]: [
                            { description: { [Op.like]: `%${tok}%` } },
                            { activity: { [Op.like]: `%${tok}%` } },
                            { caseCode: { [Op.like]: `%${tok}%` } },
                            { notes: { [Op.like]: `%${tok}%` } },
                        ]
                    });
                });
            }
        }

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
        const id = req.body?.id || req.query?.id;
        const timeSheet = await TimeSheet.findByPk(id);
        if (!timeSheet) return res.status(404).json({ message: "Timesheet không tồn tại" });

        const currentUserId = req.user?.maNhanSu || req.user?.employeeCode;
        if (!currentUserId || timeSheet.employeeCode !== currentUserId) {
            return res.status(403).json({ message: "Bạn chỉ có quyền xóa Time Record của chính mình." });
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
            result.totalHours += Number(item.hours) || 0;
            result.totalAmount += Number(item.totalAmount) || 0;
            return result;
        }, { totalHours: 0, totalAmount: 0 });

        summary.totalHours = roundDecimal(summary.totalHours, 2);
        summary.totalAmount = roundDecimal(summary.totalAmount, 2);

        return res.status(200).json({ data, summary });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getTimeSheetSummary = async (req, res) => {
    try {
        const { employeeCode, caseCode, fromDate, toDate, status } = req.body;
        const where = {};
        if (req.user?.role === "staff") where.employeeCode = req.user.maNhanSu;
        else if (employeeCode) where.employeeCode = employeeCode;
        if (caseCode) where.caseCode = caseCode;
        if (status) where.status = status;
        if (fromDate || toDate) {
            where.workDate = {};
            if (fromDate) where.workDate[Op.gte] = fromDate;
            if (toDate) where.workDate[Op.lte] = toDate;
        }

        const rows = await TimeSheet.findAll({
            where,
            attributes: ["hours", "totalAmount", "caseCode", "contributionPercentage", "employeeCode"],
        });

        const caseContributions = {};
        const summary = rows.reduce((result, item) => {
            result.totalHours += Number(item.hours) || 0;
            result.totalAmount += Number(item.totalAmount) || 0;
            result.totalItems += 1;

            if (item.caseCode) {
                const rate = item.contributionPercentage != null ? (Number(item.contributionPercentage) || 0) : 100;
                if (!caseContributions[item.caseCode]) {
                    caseContributions[item.caseCode] = {
                        caseCode: item.caseCode,
                        totalContribution: 0,
                        employees: new Set(),
                    };
                }
                caseContributions[item.caseCode].totalContribution += rate;
                if (item.employeeCode) {
                    caseContributions[item.caseCode].employees.add(item.employeeCode);
                }
            }
            return result;
        }, { totalItems: 0, totalHours: 0, totalAmount: 0 });

        summary.totalHours = roundDecimal(summary.totalHours, 2);
        summary.totalAmount = roundDecimal(summary.totalAmount, 2);

        const overContributedCases = Object.values(caseContributions)
            .filter(item => item.totalContribution > 100)
            .map(item => ({
                caseCode: item.caseCode,
                totalContribution: roundDecimal(item.totalContribution, 2),
                employees: Array.from(item.employees),
            }));

        summary.overContributedCases = overContributedCases;

        return res.status(200).json({ summary });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const checkCaseContributions = async (req, res) => {
    try {
        const { caseCode, fromDate, toDate } = req.body;
        const where = {
            caseCode: caseCode ? caseCode : { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] },
        };
        if (fromDate || toDate) {
            where.workDate = {};
            if (fromDate) where.workDate[Op.gte] = fromDate;
            if (toDate) where.workDate[Op.lte] = toDate;
        }

        const rows = await TimeSheet.findAll({
            where,
            attributes: ["caseCode", "employeeCode", "contributionPercentage", "workDate", "id"],
            raw: true,
        });

        const caseMap = {};
        for (const row of rows) {
            const code = row.caseCode;
            if (!caseMap[code]) {
                caseMap[code] = {
                    caseCode: code,
                    totalContribution: 0,
                    recordsCount: 0,
                    employees: new Set(),
                };
            }
            const rate = row.contributionPercentage != null ? (Number(row.contributionPercentage) || 0) : 100;
            caseMap[code].totalContribution += rate;
            caseMap[code].recordsCount += 1;
            if (row.employeeCode) caseMap[code].employees.add(row.employeeCode);
        }

        const overContributedCases = Object.values(caseMap)
            .filter(item => item.totalContribution > 100)
            .map(item => ({
                caseCode: item.caseCode,
                totalContribution: Math.round(item.totalContribution * 100) / 100,
                recordsCount: item.recordsCount,
                employees: Array.from(item.employees),
            }));

        return res.status(200).json({
            data: overContributedCases,
            totalOverContributedCases: overContributedCases.length,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
