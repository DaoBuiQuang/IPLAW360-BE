import { Staff_CaseFile } from "../model/staff_caseFileModel.js";
import { Staff } from "../model/staffModel.js";
import { CaseFile } from "../model/caseFileModel.js";

export const getAllStaffCaseFiles = async (req, res) => {
    try {
        const staffCaseFiles = await Staff_CaseFile.findAll();
        if (staffCaseFiles.length === 0) {
            return res.status(404).json({ message: "Không có bản ghi nào" });
        }
        res.status(200).json(staffCaseFiles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCaseFilesByStaffId = async (req, res) => {
    try {
        const { staffId } = req.params;

        const caseFiles = await Staff_CaseFile.findAll({
            where: { staffId },
            include: [{ model: CaseFile }],
        });

        if (caseFiles.length === 0) {
            return res.status(404).json({ message: "Nhân viên chưa được phân công vào hồ sơ nào" });
        }

        res.status(200).json(caseFiles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách nhân viên theo caseFileId
export const getStaffByCaseFileId = async (req, res) => {
    try {
        const { caseFileId } = req.params;

        const staffList = await Staff_CaseFile.findAll({
            where: { caseFileId },
            include: [{ model: Staff, attributes: ["staffId", "staffName", "role"] }],
        });

        if (staffList.length === 0) {
            return res.status(404).json({ message: "Hồ sơ chưa có nhân viên nào được phân công" });
        }

        res.status(200).json(staffList);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const assignStaffToCaseFile = async (req, res) => {
    try {
        const { caseFileId, staffId } = req.body;

        if (!caseFileId || !staffId) {
            return res.status(400).json({ message: "Cần nhập caseFileId và staffId" });
        }
        const caseFile = await CaseFile.findByPk(caseFileId);
        const staff = await Staff.findByPk(staffId);

        if (!caseFile || !staff) {
            return res.status(404).json({ message: "Hồ sơ hoặc nhân viên không tồn tại" });
        }
        await Staff_CaseFile.create({ caseFileId, staffId });

        res.status(201).json({ message: "Phân công nhân viên vào hồ sơ thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const removeStaffFromCaseFile = async (req, res) => {
    try {
        const { caseFileId, staffId } = req.params;

        const record = await Staff_CaseFile.findOne({ where: { caseFileId, staffId } });

        if (!record) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi phù hợp" });
        }

        await record.destroy();

        res.status(200).json({ message: "Xóa nhân viên khỏi hồ sơ thành công" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
