import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import { TimeSheet } from "../models/timeSheetModel.js";
import { NhanSu } from "../models/nhanSuModel.js";
import { NhomNhanSu } from "../models/nhomNhanSuModel.js";
import { Auth } from "../models/authModel.js";
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
        const contributionPercentage = json.contributionPercentage !== undefined && json.contributionPercentage !== null ? Number(json.contributionPercentage) : 0;
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

export const getCaseInfo = async (req, res) => {
    try {
        const { caseCode } = req.body || {};
        if (!caseCode || typeof caseCode !== "string" || !caseCode.trim()) {
            return res.status(200).json({
                caseCode: caseCode || null,
                customerCode: null,
                partnerCode: null,
                countryCode: null,
            });
        }

        const code = caseCode.trim();

        // 1. HoSo_VuViec: maHoSoVuViec = caseCode -> Lấy maKhachHang, maDoiTac, maQuocGiaVuViec
        try {
            const hsvv = await HoSo_VuViec.findOne({
                where: { maHoSoVuViec: code },
                attributes: ["maKhachHang", "maDoiTac", "maQuocGiaVuViec"],
                raw: true,
            });
            if (hsvv) {
                return res.status(200).json({
                    caseCode: code,
                    customerCode: hsvv.maKhachHang || null,
                    partnerCode: hsvv.maDoiTac || null,
                    countryCode: hsvv.maQuocGiaVuViec || null,
                });
            }
        } catch (err) {
            console.error("Lỗi tra cứu HoSo_VuViec:", err?.message);
        }

        // 2. DonDangKy: maHoSo = caseCode -> Join KhachHangCuoi lấy maKhachHang, Join DoiTac lấy maDoiTac
        try {
            const don = await DonDangKy.findOne({
                where: { maHoSo: code },
                include: [
                    {
                        model: KhachHangCuoi,
                        as: "khachHang",
                        attributes: ["maKhachHang", "maQuocGia"],
                        required: false,
                    },
                    {
                        model: DoiTac,
                        as: "doitac",
                        attributes: ["maDoiTac", "maQuocGia"],
                        required: false,
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
            if (don) {
                let customerCode = don.khachHang?.maKhachHang || null;
                let partnerCode = don.doitac?.maDoiTac || null;
                let countryCode = don.khachHang?.maQuocGia || don.doitac?.maQuocGia || "VN";

                if (!customerCode && don.idKhachHang) {
                    const kh = await KhachHangCuoi.findByPk(don.idKhachHang, { attributes: ["maKhachHang", "maQuocGia"], raw: true }).catch(() => null);
                    if (kh?.maKhachHang) {
                        customerCode = kh.maKhachHang;
                        if (!countryCode && kh.maQuocGia) countryCode = kh.maQuocGia;
                    }
                }
                if (!partnerCode && don.idDoiTac) {
                    const dt = await DoiTac.findByPk(don.idDoiTac, { attributes: ["maDoiTac", "maQuocGia"], raw: true }).catch(() => null);
                    if (dt?.maDoiTac) partnerCode = dt.maDoiTac;
                }

                return res.status(200).json({
                    caseCode: code,
                    customerCode: customerCode || null,
                    partnerCode: partnerCode || null,
                    countryCode: countryCode || null,
                });
            }
        } catch (err) {
            console.error("Lỗi tra cứu DonDangKy:", err?.message);
        }

        // 3. VuViec: maHoSo = caseCode -> Lấy idKhachHang -> maKhachHang, idDoiTac -> maDoiTac, maQuocGiaVuViec
        try {
            const vuViec = await VuViec.findOne({
                where: { maHoSo: code },
                include: [
                    {
                        model: KhachHangCuoi,
                        as: "KhachHangCuoi",
                        attributes: ["maKhachHang", "maQuocGia"],
                        required: false,
                    },
                    {
                        model: DoiTac,
                        as: "DoiTac",
                        attributes: ["maDoiTac", "maQuocGia"],
                        required: false,
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
            if (vuViec) {
                let customerCode = vuViec.KhachHangCuoi?.maKhachHang || null;
                let partnerCode = vuViec.DoiTac?.maDoiTac || null;
                let countryCode = vuViec.maQuocGiaVuViec || vuViec.KhachHangCuoi?.maQuocGia || null;

                if (!customerCode && vuViec.idKhachHang) {
                    const kh = await KhachHangCuoi.findByPk(vuViec.idKhachHang, { attributes: ["maKhachHang", "maQuocGia"], raw: true }).catch(() => null);
                    if (kh?.maKhachHang) {
                        customerCode = kh.maKhachHang;
                        if (!countryCode && kh.maQuocGia) countryCode = kh.maQuocGia;
                    }
                }
                if (!partnerCode && vuViec.idDoiTac) {
                    const dt = await DoiTac.findByPk(vuViec.idDoiTac, { attributes: ["maDoiTac", "maQuocGia"], raw: true }).catch(() => null);
                    if (dt?.maDoiTac) partnerCode = dt.maDoiTac;
                }

                return res.status(200).json({
                    caseCode: code,
                    customerCode: customerCode || null,
                    partnerCode: partnerCode || null,
                    countryCode: countryCode || null,
                });
            }
        } catch (err) {
            console.error("Lỗi tra cứu VuViec:", err?.message);
        }

        // 4. GCN_NH: maHoSo = caseCode -> Lấy tương tự
        try {
            const gcn = await GCN_NH.findOne({
                where: { maHoSo: code },
                include: [
                    {
                        model: KhachHangCuoi,
                        as: "KhachHangCuoi",
                        attributes: ["maKhachHang", "maQuocGia"],
                        required: false,
                    },
                    {
                        model: DoiTac,
                        as: "DoiTac",
                        attributes: ["maDoiTac"],
                        required: false,
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
            if (gcn) {
                let customerCode = gcn.KhachHangCuoi?.maKhachHang || null;
                let partnerCode = gcn.DoiTac?.maDoiTac || null;
                let countryCode = gcn.maQuocGia || gcn.KhachHangCuoi?.maQuocGia || "VN";

                if (!customerCode && gcn.idKhachHang) {
                    const kh = await KhachHangCuoi.findByPk(gcn.idKhachHang, { attributes: ["maKhachHang", "maQuocGia"], raw: true }).catch(() => null);
                    if (kh?.maKhachHang) {
                        customerCode = kh.maKhachHang;
                        if (!countryCode && kh.maQuocGia) countryCode = kh.maQuocGia;
                    }
                }
                if (!partnerCode && gcn.idDoiTac) {
                    const dt = await DoiTac.findByPk(gcn.idDoiTac, { attributes: ["maDoiTac"], raw: true }).catch(() => null);
                    if (dt?.maDoiTac) partnerCode = dt.maDoiTac;
                }

                return res.status(200).json({
                    caseCode: code,
                    customerCode: customerCode || null,
                    partnerCode: partnerCode || null,
                    countryCode: countryCode || null,
                });
            }
        } catch (err) {
            console.error("Lỗi tra cứu GCN_NH:", err?.message);
        }

        // Bổ sung: Tra cứu thêm các bảng đơn khác (DonDangKyNhanHieu_KH, TuVanChung_VN, GCN_NH_KH, TuVanChung_KH)
        try {
            const donKH = await DonDangKyNhanHieu_KH.findOne({
                where: { maHoSo: code },
                include: [
                    { model: KhachHangCuoi, as: "khachHang", attributes: ["maKhachHang", "maQuocGia"], required: false },
                    { model: DoiTac, as: "doitac", attributes: ["maDoiTac", "maQuocGia"], required: false },
                ],
                order: [["createdAt", "DESC"]],
            });
            if (donKH) {
                return res.status(200).json({
                    caseCode: code,
                    customerCode: donKH.khachHang?.maKhachHang || null,
                    partnerCode: donKH.doitac?.maDoiTac || null,
                    countryCode: donKH.khachHang?.maQuocGia || donKH.doitac?.maQuocGia || null,
                });
            }

            const tvcVn = await TuVanChung_VN.findOne({
                where: { maHoSo: code },
                include: [
                    { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["maKhachHang", "maQuocGia"], required: false },
                    { model: DoiTac, as: "DoiTac", attributes: ["maDoiTac"], required: false },
                ],
                order: [["createdAt", "DESC"]],
            });
            if (tvcVn) {
                return res.status(200).json({
                    caseCode: code,
                    customerCode: tvcVn.KhachHangCuoi?.maKhachHang || null,
                    partnerCode: tvcVn.DoiTac?.maDoiTac || null,
                    countryCode: tvcVn.KhachHangCuoi?.maQuocGia || "VN",
                });
            }

            const gcnKh = await GCN_NH_KH.findOne({
                where: { maHoSo: code },
                include: [
                    { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["maKhachHang", "maQuocGia"], required: false },
                    { model: DoiTac, as: "DoiTac", attributes: ["maDoiTac"], required: false },
                ],
                order: [["createdAt", "DESC"]],
            });
            if (gcnKh) {
                return res.status(200).json({
                    caseCode: code,
                    customerCode: gcnKh.KhachHangCuoi?.maKhachHang || null,
                    partnerCode: gcnKh.DoiTac?.maDoiTac || null,
                    countryCode: gcnKh.KhachHangCuoi?.maQuocGia || null,
                });
            }

            const tvcKh = await TuVanChung_KH.findOne({
                where: { maHoSo: code },
                include: [
                    { model: KhachHangCuoi, as: "KhachHangCuoi", attributes: ["maKhachHang", "maQuocGia"], required: false },
                    { model: DoiTac, as: "DoiTac", attributes: ["maDoiTac"], required: false },
                ],
                order: [["createdAt", "DESC"]],
            });
            if (tvcKh) {
                return res.status(200).json({
                    caseCode: code,
                    customerCode: tvcKh.KhachHangCuoi?.maKhachHang || null,
                    partnerCode: tvcKh.DoiTac?.maDoiTac || null,
                    countryCode: tvcKh.KhachHangCuoi?.maQuocGia || null,
                });
            }
        } catch (err) {
            console.error("Lỗi tra cứu bổ sung bảng đơn:", err?.message);
        }

        // 5. TimeSheet: caseCode = caseCode (lấy bản ghi gần nhất có đầy đủ customerCode, partnerCode nếu hồ sơ này từng được log time trước đó)
        try {
            let tsRecord = await TimeSheet.findOne({
                where: {
                    caseCode: code,
                    customerCode: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] },
                    partnerCode: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] },
                },
                order: [["createdAt", "DESC"]],
                raw: true,
            });

            if (!tsRecord) {
                tsRecord = await TimeSheet.findOne({
                    where: {
                        caseCode: code,
                        [Op.or]: [
                            { customerCode: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] } },
                            { partnerCode: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] } },
                        ],
                    },
                    order: [["createdAt", "DESC"]],
                    raw: true,
                });
            }

            if (tsRecord) {
                return res.status(200).json({
                    caseCode: code,
                    customerCode: tsRecord.customerCode || null,
                    partnerCode: tsRecord.partnerCode || null,
                    countryCode: tsRecord.countryCode || null,
                });
            }
        } catch (err) {
            console.error("Lỗi tra cứu TimeSheet:", err?.message);
        }

        // Không tìm thấy trong bất kỳ nguồn nào
        return res.status(200).json({
            caseCode: code,
            customerCode: null,
            partnerCode: null,
            countryCode: null,
        });
    } catch (error) {
        console.error("Lỗi tổng quát getCaseInfo:", error?.message);
        return res.status(200).json({
            caseCode: req.body?.caseCode || null,
            customerCode: null,
            partnerCode: null,
            countryCode: null,
        });
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

        if (req.body.description && req.body.description.length > 10000) {
            return res.status(400).json({ message: "Nội dung công việc không được vượt quá 10.000 ký tự" });
        }

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
        let contributionPercentage = 0;
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

        if (req.body.description && req.body.description.length > 10000) {
            return res.status(400).json({ message: "Nội dung công việc không được vượt quá 10.000 ký tự" });
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
                timeSheet.contributionPercentage = 0;
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

/**
 * Helper: Xác định điều kiện lọc employeeCode dựa trên vai trò của người dùng và các tham số lọc
 */
const resolveEmployeeCodeCondition = async (reqUser, targetEmployee, teamManagerCode) => {
    const userRole = String(reqUser?.role || "").toLowerCase();
    const userCode = reqUser?.maNhanSu || reqUser?.employeeCode;

    // Nhân viên / Thực tập sinh chỉ xem data của chính mình
    if (userRole === "staff" || userRole === "trainee") {
        return userCode;
    }

    // Trưởng nhóm (Manager): chỉ xem data của team mình quản lý
    if (userRole === "manager") {
        if (targetEmployee) {
            if (targetEmployee === userCode) return userCode;
            const isInTeam = await NhomNhanSu.findOne({
                where: { managerCode: userCode, maNhanSu: targetEmployee },
            });
            // Nếu thuộc team thì cho xem, nếu không thuộc team thì chỉ xem bản thân
            return isInTeam ? targetEmployee : userCode;
        }

        // Nếu không truyền employeeCode cụ thể -> lấy toàn bộ team của Manager
        const teamMembers = await NhomNhanSu.findAll({
            where: { managerCode: userCode },
            attributes: ["maNhanSu"],
            raw: true,
        });
        const teamCodes = [...new Set([userCode, ...teamMembers.map((m) => m.maNhanSu)])];
        return { [Op.in]: teamCodes };
    }

    // Admin / CEO: có quyền xem tất cả
    if (userRole === "admin" || userRole === "ceo") {
        if (targetEmployee) {
            return targetEmployee;
        }
        if (teamManagerCode) {
            const teamMembers = await NhomNhanSu.findAll({
                where: { managerCode: teamManagerCode },
                attributes: ["maNhanSu"],
                raw: true,
            });
            const teamCodes = [...new Set([teamManagerCode, ...teamMembers.map((m) => m.maNhanSu)])];
            return { [Op.in]: teamCodes };
        }
        return null; // Không giới hạn nhân sự (xem toàn bộ công ty)
    }

    return userCode || null;
};

/**
 * Helper: Tra cứu điều kiện lọc customerCode và partnerCode theo cả mã hoặc tên
 */
const resolveCustomerPartnerConditions = async (customerInput, partnerInput) => {
    const conditions = {};
    if (customerInput && String(customerInput).trim()) {
        const custTrim = String(customerInput).trim();
        try {
            const matchedKh = await KhachHangCuoi.findAll({
                where: {
                    [Op.or]: [
                        { maKhachHang: { [Op.like]: "%" + custTrim + "%" } },
                        { tenKhachHang: { [Op.like]: "%" + custTrim + "%" } },
                    ],
                },
                attributes: ["maKhachHang"],
                raw: true,
            });
            const foundCodes = [...new Set(matchedKh.map(k => k.maKhachHang).filter(Boolean))];
            if (foundCodes.length > 0) {
                conditions.customerCode = {
                    [Op.or]: [
                        { [Op.in]: foundCodes },
                        { [Op.like]: "%" + custTrim + "%" },
                    ],
                };
            } else {
                conditions.customerCode = { [Op.like]: "%" + custTrim + "%" };
            }
        } catch {
            conditions.customerCode = { [Op.like]: "%" + custTrim + "%" };
        }
    }

    if (partnerInput && String(partnerInput).trim()) {
        const partTrim = String(partnerInput).trim();
        try {
            const matchedDt = await DoiTac.findAll({
                where: {
                    [Op.or]: [
                        { maDoiTac: { [Op.like]: "%" + partTrim + "%" } },
                        { tenDoiTac: { [Op.like]: "%" + partTrim + "%" } },
                    ],
                },
                attributes: ["maDoiTac"],
                raw: true,
            });
            const foundCodes = [...new Set(matchedDt.map(d => d.maDoiTac).filter(Boolean))];
            if (foundCodes.length > 0) {
                conditions.partnerCode = {
                    [Op.or]: [
                        { [Op.in]: foundCodes },
                        { [Op.like]: "%" + partTrim + "%" },
                    ],
                };
            } else {
                conditions.partnerCode = { [Op.like]: "%" + partTrim + "%" };
            }
        } catch {
            conditions.partnerCode = { [Op.like]: "%" + partTrim + "%" };
        }
    }
    return conditions;
};

export const listTimeSheets = async (req, res) => {
    try {
        const {
            employeeCode,
            maNhanSu,
            teamManagerCode,
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
            customerCode,
            partnerCode,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;
        const page = Math.max(Number(pageIndex), 1);
        const size = Math.min(Math.max(Number(pageSize), 1), 100);
        const where = {};

        const targetEmployee = employeeCode || maNhanSu;
        const empCondition = await resolveEmployeeCodeCondition(req.user, targetEmployee, teamManagerCode);
        if (empCondition) {
            where.employeeCode = empCondition;
        }

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
        if (targetStatus && String(targetStatus).toUpperCase() !== "ALL") where.status = targetStatus;

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

        // Filter customerCode, partnerCode
        if (customerCode) where.customerCode = customerCode;
        if (partnerCode) where.partnerCode = partnerCode;

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
        const {
            employeeCode,
            maNhanSu,
            caseCode,
            maVuViec,
            fromDate,
            toDate,
            status,
            trangThai,
            customerCode,
            partnerCode,
            teamManagerCode,
        } = req.body;
        const where = {};

        const targetEmployee = employeeCode || maNhanSu;
        const empCondition = await resolveEmployeeCodeCondition(req.user, targetEmployee, teamManagerCode);
        if (empCondition) {
            where.employeeCode = empCondition;
        }

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
        if (targetStatus && String(targetStatus).toUpperCase() !== "ALL") where.status = targetStatus;

        if (fromDate || toDate) {
            where.workDate = {};
            if (fromDate) where.workDate[Op.gte] = fromDate;
            if (toDate) where.workDate[Op.lte] = toDate;
        }

        if (customerCode) where.customerCode = customerCode;
        if (partnerCode) where.partnerCode = partnerCode;

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
                const rate = item.contributionPercentage !== undefined && item.contributionPercentage !== null ? (Number(item.contributionPercentage) || 0) : 0;
                if (!caseContributions[item.caseCode]) {
                    caseContributions[item.caseCode] = {
                        caseCode: item.caseCode,
                        totalContribution: 0,
                        recordsCount: 0,
                        employees: new Set(),
                    };
                }
                caseContributions[item.caseCode].totalContribution += rate;
                caseContributions[item.caseCode].recordsCount += 1;
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
                recordsCount: item.recordsCount,
                employees: Array.from(item.employees),
            }))
            .sort((a, b) => b.totalContribution - a.totalContribution);

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
            const rate = row.contributionPercentage !== undefined && row.contributionPercentage !== null ? (Number(row.contributionPercentage) || 0) : 0;
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

// ============================================================
// Utility: tính khoảng ngày theo period
// ============================================================
const getPeriodDateRange = ({ period, year, month, week, quarter }) => {
    const y = Number(year);
    let fromDate, toDate, workingDays;

    if (period === "week") {
        // Tuần thứ N trong tháng (1-indexed)
        const m = Number(month) - 1; // 0-indexed
        const w = Number(week) || 1;
        const firstDay = new Date(y, m, 1);
        const dayOfWeek = firstDay.getDay() || 7; // Mon=1
        const startOffset = (w - 1) * 7 - (dayOfWeek - 1);
        const startDate = new Date(y, m, 1 + startOffset);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        // Clamp to month
        const monthStart = new Date(y, m, 1);
        const monthEnd = new Date(y, m + 1, 0);
        fromDate = startDate < monthStart ? monthStart : startDate;
        toDate = endDate > monthEnd ? monthEnd : endDate;

        // Đếm ngày làm việc (T2-T6)
        workingDays = 0;
        const cursor = new Date(fromDate);
        while (cursor <= toDate) {
            const d = cursor.getDay();
            if (d !== 0 && d !== 6) workingDays++;
            cursor.setDate(cursor.getDate() + 1);
        }
    } else if (period === "month") {
        const m = Number(month) - 1;
        fromDate = new Date(y, m, 1);
        toDate = new Date(y, m + 1, 0);
        workingDays = 0;
        const cursor = new Date(fromDate);
        while (cursor <= toDate) {
            const d = cursor.getDay();
            if (d !== 0 && d !== 6) workingDays++;
            cursor.setDate(cursor.getDate() + 1);
        }
    } else if (period === "quarter") {
        const q = Number(quarter) || 1;
        const startMonth = (q - 1) * 3;
        fromDate = new Date(y, startMonth, 1);
        toDate = new Date(y, startMonth + 3, 0);
        workingDays = 0;
        const cursor = new Date(fromDate);
        while (cursor <= toDate) {
            const d = cursor.getDay();
            if (d !== 0 && d !== 6) workingDays++;
            cursor.setDate(cursor.getDate() + 1);
        }
    } else {
        // year
        fromDate = new Date(y, 0, 1);
        toDate = new Date(y, 11, 31);
        workingDays = 0;
        const cursor = new Date(fromDate);
        while (cursor <= toDate) {
            const d = cursor.getDay();
            if (d !== 0 && d !== 6) workingDays++;
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    const fmt = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const date = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${date}`;
    };
    return { fromDate: fmt(fromDate), toDate: fmt(toDate), workingDays };
};

// ============================================================
// POST /timesheet/kpi
// ============================================================
export const getTimesheetKPI = async (req, res) => {
    try {
        const {
            employeeCode: reqEmployeeCode,
            teamManagerCode,
            period = "month",
            year = new Date().getFullYear(),
            month,
            week,
            quarter,
        } = req.body;

        const userRole = req.user?.role;
        const userCode = req.user?.maNhanSu;

        // Xác định danh sách employee codes được phép xem
        let employeeCodes = [];
        let resolvedManagerCode = null;

        if (userRole === "staff" || userRole === "trainee") {
            // NV chỉ xem bản thân
            employeeCodes = [userCode];
        } else if (userRole === "manager") {
            // Manager: xem team mình
            const teamMembers = await NhomNhanSu.findAll({
                where: { managerCode: userCode },
                attributes: ["maNhanSu"],
                raw: true,
            });
            employeeCodes = [userCode, ...teamMembers.map((m) => m.maNhanSu)];
            resolvedManagerCode = userCode;

            // Nếu filter 1 NV cụ thể trong team
            if (reqEmployeeCode) {
                if (!employeeCodes.includes(reqEmployeeCode)) {
                    return res.status(403).json({ message: "Bạn không có quyền xem dữ liệu nhân viên này" });
                }
                employeeCodes = [reqEmployeeCode];
            }
        } else {
            // admin/CEO: xem tất cả
            if (reqEmployeeCode) {
                employeeCodes = [reqEmployeeCode];
            } else if (teamManagerCode) {
                const teamMembers = await NhomNhanSu.findAll({
                    where: { managerCode: teamManagerCode },
                    attributes: ["maNhanSu"],
                    raw: true,
                });
                employeeCodes = [teamManagerCode, ...teamMembers.map((m) => m.maNhanSu)];
                resolvedManagerCode = teamManagerCode;
            }
            // Nếu không filter gì → lấy tất cả (employeeCodes rỗng = no filter)
        }

        const { fromDate, toDate, workingDays } = getPeriodDateRange({ period, year, month, week, quarter });
        const targetHours = workingDays * 8;

        const where = { workDate: { [Op.between]: [fromDate, toDate] } };
        if (employeeCodes.length > 0) where.employeeCode = { [Op.in]: employeeCodes };

        const rows = await TimeSheet.findAll({
            where,
            attributes: ["employeeCode", "hours", "totalAmount"],
            raw: true,
        });

        // Tổng hợp overall
        const totalHours = rows.reduce((s, r) => s + Number(r.hours), 0);
        const totalAmount = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
        const recordCount = rows.length;

        // Tính targetHours cho từng NV (nếu có nhiều NV → nhân bộ)
        const uniqueEmployees = [...new Set(rows.map((r) => r.employeeCode))];
        const overallTargetHours = uniqueEmployees.length > 0 ? uniqueEmployees.length * targetHours : targetHours;
        const completionRate = overallTargetHours > 0
            ? Math.round((totalHours / overallTargetHours) * 10000) / 100
            : 0;

        // Breakdown theo NV
        const breakdownMap = {};
        for (const row of rows) {
            if (!breakdownMap[row.employeeCode]) {
                breakdownMap[row.employeeCode] = { totalHours: 0, totalAmount: 0 };
            }
            breakdownMap[row.employeeCode].totalHours += Number(row.hours);
            breakdownMap[row.employeeCode].totalAmount += Number(row.totalAmount);
        }

        // Lấy thông tin nhân sự
        const nhanSuList = uniqueEmployees.length > 0
            ? await NhanSu.findAll({
                where: { maNhanSu: { [Op.in]: uniqueEmployees } },
                attributes: ["maNhanSu", "hoTen"],
                raw: true,
            })
            : [];
        const nhanSuMap = new Map(nhanSuList.map((n) => [n.maNhanSu, n.hoTen]));

        const breakdown = uniqueEmployees.map((code) => {
            const data = breakdownMap[code];
            const empTarget = targetHours;
            return {
                employeeCode: code,
                hoTen: nhanSuMap.get(code) || code,
                totalHours: Math.round(data.totalHours * 100) / 100,
                completionRate: empTarget > 0
                    ? Math.round((data.totalHours / empTarget) * 10000) / 100
                    : 0,
                totalAmount: Math.round(data.totalAmount * 100) / 100,
            };
        });

        return res.status(200).json({
            success: true,
            kpi: {
                period,
                fromDate,
                toDate,
                workingDays,
                totalHours: Math.round(totalHours * 100) / 100,
                targetHours: overallTargetHours,
                completionRate,
                totalAmount: Math.round(totalAmount * 100) / 100,
                recordCount,
                breakdown,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ============================================================
// POST /timesheet/office-summary  (CEO only → admin)
// ============================================================
export const getOfficeSummary = async (req, res) => {
    try {
        const {
            period = "month",
            year = new Date().getFullYear(),
            month,
            week,
            quarter,
        } = req.body;

        const { fromDate, toDate, workingDays } = getPeriodDateRange({ period, year, month, week, quarter });
        const targetHoursPerPerson = workingDays * 8;

        // 1. Lấy tất cả nhân sự đang hoạt động kèm Role từ Auth
        const allEmployees = await NhanSu.findAll({
            attributes: ["maNhanSu", "hoTen", "chucVu", "phongBan"],
            include: [
                {
                    model: Auth,
                    as: "Auth",
                    attributes: ["Role"],
                    required: false,
                },
            ],
            raw: true,
            nest: true,
        });

        // 2. Lấy tất cả nhóm manager
        const allGroups = await NhomNhanSu.findAll({
            include: [
                { model: NhanSu, as: "manager", attributes: ["maNhanSu", "hoTen"] },
                { model: NhanSu, as: "thanhVien", attributes: ["maNhanSu", "hoTen"] },
            ],
        });

        const managerCodesSet = new Set(allGroups.map((g) => g.managerCode).filter(Boolean));

        // 3. Lấy tất cả timesheet trong kỳ
        const allRows = await TimeSheet.findAll({
            where: { workDate: { [Op.between]: [fromDate, toDate] } },
            attributes: ["employeeCode", "hours", "totalAmount"],
            raw: true,
        });

        // Map timesheet theo employeeCode
        const tsMap = {};
        for (const row of allRows) {
            const code = row.employeeCode;
            if (!tsMap[code]) {
                tsMap[code] = { totalHours: 0, totalAmount: 0, recordCount: 0 };
            }
            tsMap[code].totalHours += Number(row.hours || 0);
            tsMap[code].totalAmount += Number(row.totalAmount || 0);
            tsMap[code].recordCount += 1;
        }

        // 4. TỔNG TOÀN CÔNG TY (Tính trực tiếp từ allRows & allEmployees)
        const companyTotalHours = allRows.reduce((s, r) => s + Number(r.hours || 0), 0);
        const companyTotalAmount = allRows.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
        const companyRecordCount = allRows.length;
        const companyTargetHours = allEmployees.length * targetHoursPerPerson;
        const companyCompletionRate = companyTargetHours > 0
            ? Math.round((companyTotalHours / companyTargetHours) * 10000) / 100
            : 0;

        // 5. Build danh sách allStaff
        const allStaff = allEmployees.map((emp) => {
            const data = tsMap[emp.maNhanSu] || { totalHours: 0, totalAmount: 0, recordCount: 0 };
            const authRole = emp.Auth?.Role || emp["Auth.Role"] || emp.Role || null;
            const isManager = managerCodesSet.has(emp.maNhanSu) || String(authRole || "").toLowerCase() === "manager";
            const role = authRole || (isManager ? "manager" : "staff");

            return {
                employeeCode: emp.maNhanSu,
                hoTen: emp.hoTen,
                chucVu: emp.chucVu,
                phongBan: emp.phongBan,
                Role: role,
                role: role,
                isManager,
                totalHours: Math.round(data.totalHours * 100) / 100,
                targetHours: targetHoursPerPerson,
                completionRate: targetHoursPerPerson > 0
                    ? Math.round((data.totalHours / targetHoursPerPerson) * 10000) / 100
                    : 0,
                totalAmount: Math.round(data.totalAmount * 100) / 100,
                recordCount: data.recordCount,
            };
        }).sort((a, b) => b.totalHours - a.totalHours);

        // 6. Gom nhóm theo team (nếu có)
        const teamMap = {};
        for (const rec of allGroups) {
            const mgCode = rec.managerCode;
            if (!teamMap[mgCode]) {
                teamMap[mgCode] = {
                    managerCode: mgCode,
                    managerName: rec.manager?.hoTen || mgCode,
                    members: [],
                };
            }
            if (rec.thanhVien) {
                teamMap[mgCode].members.push({
                    maNhanSu: rec.thanhVien.maNhanSu,
                    hoTen: rec.thanhVien.hoTen,
                });
            }
        }

        const teams = Object.values(teamMap).map((team) => {
            const allMemberCodes = [team.managerCode, ...team.members.map((m) => m.maNhanSu)];
            const uniqueCodes = [...new Set(allMemberCodes)];
            const memberDetails = uniqueCodes.map((code) => {
                const data = tsMap[code] || { totalHours: 0, totalAmount: 0, recordCount: 0 };
                return {
                    employeeCode: code,
                    hoTen: team.members.find((m) => m.maNhanSu === code)?.hoTen
                        || (code === team.managerCode ? team.managerName : code),
                    totalHours: Math.round(data.totalHours * 100) / 100,
                    completionRate: targetHoursPerPerson > 0
                        ? Math.round((data.totalHours / targetHoursPerPerson) * 10000) / 100
                        : 0,
                    totalAmount: Math.round(data.totalAmount * 100) / 100,
                    recordCount: data.recordCount,
                };
            });

            const teamTotalHours = memberDetails.reduce((s, m) => s + m.totalHours, 0);
            const teamTotalAmount = memberDetails.reduce((s, m) => s + m.totalAmount, 0);
            const teamTargetHours = uniqueCodes.length * targetHoursPerPerson;
            const teamCompletionRate = teamTargetHours > 0
                ? Math.round((teamTotalHours / teamTargetHours) * 10000) / 100
                : 0;

            return {
                managerCode: team.managerCode,
                managerName: team.managerName,
                teamTotalHours: Math.round(teamTotalHours * 100) / 100,
                teamTargetHours,
                teamCompletionRate,
                teamTotalAmount: Math.round(teamTotalAmount * 100) / 100,
                members: memberDetails,
            };
        });

        return res.status(200).json({
            success: true,
            officeSummary: {
                period,
                fromDate,
                toDate,
                workingDays,
                totalHours: Math.round(companyTotalHours * 100) / 100,
                targetHours: companyTargetHours,
                completionRate: companyCompletionRate,
                totalAmount: Math.round(companyTotalAmount * 100) / 100,
                recordCount: companyRecordCount,
                hasTeams: teams.length > 0,
                teams,
                allStaff,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ============================================================
// MATTER MODULE — view/aggregation over TimeSheets table only
// ============================================================

/**
 * POST /timesheet/matter/list
 */
export const getMatterList = async (req, res) => {
    try {
        const {
            caseCode,
            customerCode,
            partnerCode,
            fromDate,
            toDate,
            employeeCode: reqEmployee,
            teamManagerCode,
            pageIndex = 1,
            pageSize = 20,
        } = req.body;

        const page = Math.max(Number(pageIndex), 1);
        const size = Math.min(Math.max(Number(pageSize), 1), 100);

        const empCondition = await resolveEmployeeCodeCondition(req.user, reqEmployee, teamManagerCode);
        const where = {};
        if (empCondition) where.employeeCode = empCondition;

        where.caseCode = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] };
        if (caseCode) {
            where.caseCode = {
                [Op.and]: [
                    { [Op.ne]: null }, { [Op.ne]: "" },
                    { [Op.like]: `%${String(caseCode).trim()}%` },
                ],
            };
        }
        if (customerCode) where.customerCode = customerCode;
        if (partnerCode) where.partnerCode = partnerCode;
        if (fromDate || toDate) {
            where.workDate = {};
            if (fromDate) where.workDate[Op.gte] = fromDate;
            if (toDate) where.workDate[Op.lte] = toDate;
        }

        const rows = await TimeSheet.findAll({
            where,
            attributes: [
                "caseCode", "customerCode", "partnerCode", "countryCode",
                "employeeCode", "activity", "hours", "contributionPercentage", "workDate",
            ],
            raw: true,
        });

        const matterMap = new Map();
        for (const row of rows) {
            const code = row.caseCode;
            if (!code) continue;
            if (!matterMap.has(code)) {
                matterMap.set(code, {
                    caseCode: code,
                    customerCode: null,
                    partnerCode: null,
                    countryCode: null,
                    totalHours: 0,
                    totalContributionPercentage: 0,
                    activities: new Set(),
                    employees: new Set(),
                    latestWorkDate: null,
                    earliestWorkDate: null,
                });
            }
            const m = matterMap.get(code);
            if (!m.customerCode && row.customerCode) m.customerCode = row.customerCode;
            if (!m.partnerCode && row.partnerCode) m.partnerCode = row.partnerCode;
            if (!m.countryCode && row.countryCode) m.countryCode = row.countryCode;
            m.totalHours = roundDecimal(m.totalHours + Number(row.hours || 0), 2);
            m.totalContributionPercentage = roundDecimal(
                m.totalContributionPercentage + Number(row.contributionPercentage || 0), 2
            );
            if (row.activity) m.activities.add(row.activity);
            if (row.employeeCode) m.employees.add(row.employeeCode);
            const wd = row.workDate ? String(row.workDate).slice(0, 10) : null;
            if (wd) {
                if (!m.latestWorkDate || wd > m.latestWorkDate) m.latestWorkDate = wd;
                if (!m.earliestWorkDate || wd < m.earliestWorkDate) m.earliestWorkDate = wd;
            }
        }

        const matters = Array.from(matterMap.values()).sort((a, b) => {
            if (a.latestWorkDate && b.latestWorkDate) return b.latestWorkDate.localeCompare(a.latestWorkDate);
            if (a.latestWorkDate) return -1;
            if (b.latestWorkDate) return 1;
            return 0;
        });

        const totalItems = matters.length;
        const totalPages = Math.ceil(totalItems / size);
        const paginated = matters.slice((page - 1) * size, (page - 1) * size + size);

        const custCodes = [...new Set(paginated.map(m => m.customerCode).filter(Boolean))];
        const partCodes = [...new Set(paginated.map(m => m.partnerCode).filter(Boolean))];
        const cntryCodes = [...new Set(paginated.map(m => m.countryCode).filter(Boolean))];

        const [customers, partners, countries] = await Promise.all([
            custCodes.length ? KhachHangCuoi.findAll({ where: { maKhachHang: { [Op.in]: custCodes } }, attributes: ["maKhachHang", "tenKhachHang"], raw: true }) : [],
            partCodes.length ? DoiTac.findAll({ where: { maDoiTac: { [Op.in]: partCodes } }, attributes: ["maDoiTac", "tenDoiTac"], raw: true }) : [],
            cntryCodes.length ? QuocGia.findAll({ where: { maQuocGia: { [Op.in]: cntryCodes } }, attributes: ["maQuocGia", "tenQuocGia"], raw: true }) : [],
        ]);

        const customerMap = new Map(customers.map(c => [c.maKhachHang, c.tenKhachHang]));
        const partnerMap = new Map(partners.map(p => [p.maDoiTac, p.tenDoiTac]));
        const countryMap = new Map(countries.map(q => [q.maQuocGia, q.tenQuocGia]));

        const data = paginated.map(m => ({
            caseCode: m.caseCode,
            customerCode: m.customerCode,
            customerName: customerMap.get(m.customerCode) || null,
            partnerCode: m.partnerCode,
            partnerName: partnerMap.get(m.partnerCode) || null,
            countryCode: m.countryCode,
            countryName: countryMap.get(m.countryCode) || null,
            totalHours: m.totalHours,
            totalContributionPercentage: m.totalContributionPercentage,
            activityCount: m.activities.size,
            employeeCount: m.employees.size,
            earliestWorkDate: m.earliestWorkDate,
            latestWorkDate: m.latestWorkDate,
        }));

        return res.status(200).json({
            data,
            pagination: { totalItems, totalPages, pageIndex: page, pageSize: size },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * POST /timesheet/matter/activities
 */
export const getMatterActivities = async (req, res) => {
    try {
        const { caseCode, fromDate, toDate } = req.body;
        if (!caseCode) return res.status(400).json({ message: "caseCode la bat buoc" });

        const empCondition = await resolveEmployeeCodeCondition(req.user, null, null);
        const where = { caseCode };
        if (empCondition) where.employeeCode = empCondition;
        if (fromDate || toDate) {
            where.workDate = {};
            if (fromDate) where.workDate[Op.gte] = fromDate;
            if (toDate) where.workDate[Op.lte] = toDate;
        }

        const rows = await TimeSheet.findAll({
            where,
            attributes: ["id", "caseCode", "activity", "employeeCode", "hours", "contributionPercentage", "description", "notes", "workDate"],
            order: [["workDate", "DESC"], ["id", "DESC"]],
            raw: true,
        });

        const allCaseRows = await TimeSheet.findAll({
            where: { caseCode },
            attributes: ["activity", "employeeCode"],
            raw: true,
        });

        const groupMap = new Map();
        for (const row of rows) {
            const key = `${row.activity}|||${row.employeeCode}`;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    activity: row.activity,
                    employeeCode: row.employeeCode,
                    totalHours: 0,
                    contributionPercentage: 0,
                    latestDescription: null,
                    latestNotes: null,
                    latestWorkDate: null,
                    earliestWorkDate: null,
                    recordCount: 0,
                    latestRecordId: null,
                });
            }
            const g = groupMap.get(key);
            g.totalHours = roundDecimal(g.totalHours + Number(row.hours || 0), 2);
            g.contributionPercentage = roundDecimal(g.contributionPercentage + Number(row.contributionPercentage || 0), 2);
            g.recordCount += 1;
            const wd = row.workDate ? String(row.workDate).slice(0, 10) : null;
            if (wd) {
                if (!g.latestWorkDate || wd > g.latestWorkDate) {
                    g.latestWorkDate = wd;
                    g.latestDescription = row.description || null;
                    g.latestNotes = row.notes || null;
                    g.latestRecordId = row.id;
                }
                if (!g.earliestWorkDate || wd < g.earliestWorkDate) g.earliestWorkDate = wd;
            }
        }

        const colleagueMap = new Map();
        for (const row of allCaseRows) {
            if (!row.activity || !row.employeeCode) continue;
            if (!colleagueMap.has(row.activity)) colleagueMap.set(row.activity, new Set());
            colleagueMap.get(row.activity).add(row.employeeCode);
        }

        const allEmpCodes = new Set();
        for (const g of groupMap.values()) allEmpCodes.add(g.employeeCode);
        for (const codes of colleagueMap.values()) codes.forEach(c => allEmpCodes.add(c));

        const nhanSuList = allEmpCodes.size > 0
            ? await NhanSu.findAll({ where: { maNhanSu: { [Op.in]: Array.from(allEmpCodes) } }, attributes: ["maNhanSu", "hoTen"], raw: true })
            : [];
        const nameMap = new Map(nhanSuList.map(n => [n.maNhanSu, n.hoTen]));

        const activities = Array.from(groupMap.values()).map(g => {
            const colleagueCodes = Array.from(colleagueMap.get(g.activity) || []).filter(c => c !== g.employeeCode);
            return {
                activity: g.activity,
                employeeCode: g.employeeCode,
                employeeName: nameMap.get(g.employeeCode) || null,
                totalHours: g.totalHours,
                contributionPercentage: g.contributionPercentage,
                latestDescription: g.latestDescription,
                latestNotes: g.latestNotes,
                latestWorkDate: g.latestWorkDate,
                earliestWorkDate: g.earliestWorkDate,
                recordCount: g.recordCount,
                latestRecordId: g.latestRecordId,
                colleagues: colleagueCodes.map(code => ({ employeeCode: code, employeeName: nameMap.get(code) || null })),
            };
        });

        return res.status(200).json({ caseCode, activities });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * POST /timesheet/matter/activity-detail
 */
export const getMatterActivityDetail = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ message: "id la bat buoc" });

        const timeSheet = await TimeSheet.findByPk(id, { raw: true });
        if (!timeSheet) return res.status(404).json({ message: "Khong tim thay time record" });

        const userRole = String(req.user?.role || "").toLowerCase();
        const userCode = req.user?.maNhanSu || req.user?.employeeCode;

        if (userRole === "staff" || userRole === "trainee") {
            if (timeSheet.employeeCode !== userCode) {
                return res.status(403).json({ message: "Ban chi duoc xem time record cua chinh minh" });
            }
        } else if (userRole === "manager") {
            if (timeSheet.employeeCode !== userCode) {
                const inTeam = await NhomNhanSu.findOne({ where: { managerCode: userCode, maNhanSu: timeSheet.employeeCode } });
                if (!inTeam) return res.status(403).json({ message: "Ban khong co quyen xem time record nay" });
            }
        }

        const [empList, custList, partList] = await Promise.all([
            NhanSu.findAll({ where: { maNhanSu: timeSheet.employeeCode }, attributes: ["maNhanSu", "hoTen"], raw: true }),
            timeSheet.customerCode ? KhachHangCuoi.findAll({ where: { maKhachHang: timeSheet.customerCode }, attributes: ["maKhachHang", "tenKhachHang"], raw: true }) : [],
            timeSheet.partnerCode ? DoiTac.findAll({ where: { maDoiTac: timeSheet.partnerCode }, attributes: ["maDoiTac", "tenDoiTac"], raw: true }) : [],
        ]);

        return res.status(200).json({
            id: timeSheet.id,
            caseCode: timeSheet.caseCode,
            activity: timeSheet.activity,
            description: timeSheet.description,
            contributionPercentage: Number(timeSheet.contributionPercentage || 0),
            notes: timeSheet.notes,
            employeeCode: timeSheet.employeeCode,
            employeeName: empList[0]?.hoTen || null,
            workDate: timeSheet.workDate ? String(timeSheet.workDate).slice(0, 10) : null,
            hours: Number(timeSheet.hours || 0),
            customerCode: timeSheet.customerCode,
            customerName: custList[0]?.tenKhachHang || null,
            partnerCode: timeSheet.partnerCode,
            partnerName: partList[0]?.tenDoiTac || null,
            countryCode: timeSheet.countryCode,
            status: timeSheet.status,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * PUT /timesheet/matter/activity-edit
 * Only owner can edit; only contributionPercentage, description, notes are writable.
 */
export const updateMatterActivity = async (req, res) => {
    try {
        const { id, contributionPercentage, description, notes } = req.body;
        if (!id) return res.status(400).json({ message: "id la bat buoc" });

        const timeSheet = await TimeSheet.findByPk(id);
        if (!timeSheet) return res.status(404).json({ message: "Khong tim thay time record" });

        const userCode = req.user?.maNhanSu || req.user?.employeeCode;
        if (timeSheet.employeeCode !== userCode) {
            return res.status(403).json({ message: "Ban chi duoc chinh sua time record cua chinh minh" });
        }

        if (contributionPercentage !== undefined && contributionPercentage !== null && contributionPercentage !== "") {
            const parsed = Number(contributionPercentage);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
                return res.status(400).json({ message: "contributionPercentage phai la so tu 0 den 100" });
            }
            timeSheet.contributionPercentage = roundDecimal(parsed, 2);
        }
        if (description !== undefined) timeSheet.description = description;
        if (notes !== undefined) timeSheet.notes = notes;

        await timeSheet.save();
        return res.status(200).json({ message: "Cap nhat thanh cong", timeSheet: timeSheet.toJSON() });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * DELETE /timesheet/matter/activity-delete
 * Deletes the caller's own record by id. Other employees' records are not affected.
 */
export const deleteMatterActivity = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ message: "id la bat buoc" });

        const timeSheet = await TimeSheet.findByPk(id);
        if (!timeSheet) return res.status(404).json({ message: "Khong tim thay time record" });

        const userCode = req.user?.maNhanSu || req.user?.employeeCode;
        if (timeSheet.employeeCode !== userCode) {
            return res.status(403).json({ message: "Ban chi duoc xoa time record cua chinh minh" });
        }

        await timeSheet.destroy();
        return res.status(200).json({ message: "Xoa thanh cong" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * POST /timesheet/matter/check-can-edit-matter
 * canDeleteMatter = true when all records in this caseCode belong to the caller.
 */
export const checkMatterCanEdit = async (req, res) => {
    try {
        const { caseCode } = req.body;
        if (!caseCode) return res.status(400).json({ message: "caseCode la bat buoc" });

        const userCode = req.user?.maNhanSu || req.user?.employeeCode;

        const [totalRecords, myRecords] = await Promise.all([
            TimeSheet.count({ where: { caseCode } }),
            TimeSheet.count({ where: { caseCode, employeeCode: userCode } }),
        ]);

        return res.status(200).json({
            caseCode,
            totalRecords,
            myRecords,
            canDeleteMatter: totalRecords > 0 && totalRecords === myRecords,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};



