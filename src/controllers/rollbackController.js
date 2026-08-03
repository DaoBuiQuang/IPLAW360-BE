import { AuditLog } from "../models/auditLogModel.js";
import * as models from "../models/index.js"; // Import tất cả models trong thư mục models
import { Op } from "sequelize";
export const rollbackByLogId = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await AuditLog.findByPk(logId);
    if (!log) {
      return res.status(404).json({ message: "Không tìm thấy lịch sử thay đổi" });
    }

    const model = models[log.tableName];
    if (!model) {
      return res.status(400).json({ message: `Không tìm thấy model cho bảng ${log.tableName}` });
    }

    let restoredRecord;

    if (log.action === "DELETE") {
      // Bản ghi đã bị xóa, khôi phục lại
      restoredRecord = await model.create(log.oldData);

      // Xóa bản ghi log sau khi rollback thành công
      await log.destroy();

      return res.status(200).json({
        message: "Rollback thành công - bản ghi đã được khôi phục và log đã bị xóa",
        tableName: log.tableName,
        restoredData: restoredRecord
      });
    }

    // Với UPDATE hoặc CREATE, rollback theo kiểu update lại dữ liệu
    const record = await model.findByPk(log.recordId);
    if (!record) {
      return res.status(404).json({ message: "Bản ghi gốc không tồn tại" });
    }

    await record.update(log.oldData);

    res.status(200).json({
      message: "Rollback thành công",
      tableName: log.tableName,
      restoredData: log.oldData
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const getHistoryByNotification = async (req, res) => {
  try {
    const { title, ma } = req.body; 
    if (!title || !ma) {
      return res.status(400).json({ message: "Thiếu title hoặc mã đối tượng" });
    }

    let tableName;
    if (title.includes("đối tác") || title.includes("Đối tác")) {
      tableName = "DoiTac";
    } else if (title.includes("khách hàng") || title.includes("Khách hàng")) {
      tableName = "KhachHang";
    } else {
      return res.status(400).json({ message: "Không xác định được loại đối tượng từ title" });
    }

    const logs = await AuditLog.findAll({
      where: {
        tableName,
        [Op.or]: [
          { oldData: { maDoiTac: ma } },
          { newData: { maDoiTac: ma } },
          { oldData: { maKhachHang: ma } },
          { newData: { maKhachHang: ma } }
        ]
      },
      order: [["timestamp", "DESC"]],
      attributes: ["id", "tableName", "timestamp", "changedBy", "action"]
    });

    res.status(200).json(
      logs.map(log => ({
        id: log.id,
        tableName: log.tableName,
        timestamp: log.timestamp,
        changedBy: log.changedBy,
        action: log.action
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
