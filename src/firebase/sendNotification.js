// sendNotification.js
// Tạm thời vô hiệu hóa Firebase Admin notification.
// import admin from "./firebaseAdmin.js";
import { FCMToken } from "../models/fcmTokenModel.js";
import { Notification } from "../models/notificationModel.js"; // ✅ import bảng notification
import { Op } from "sequelize";
import { Auth } from "../models/authModel.js";

export const saveTokenFireBase = async (req, res) => {
  const { token, maNhanSu } = req.body;
  if (!token || !maNhanSu) {
    return res.status(400).json({ message: "Thiếu token hoặc mã nhân sự" });
  }

  try {
    const existing = await FCMToken.findOne({
      where: { token, maNhanSu },
    });

    if (existing) {
      return res.status(200).json({ message: "Token đã tồn tại, không cần lưu lại" });
    }
    await FCMToken.create({ token, maNhanSu });

    return res.status(201).json({ message: "Lưu token thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getNotificationsByNhanSu = async (req, res) => {
  const { maNhanSu, pageSize = 10, offset = 0 } = req.body;

  if (!maNhanSu) {
    return res.status(400).json({ message: "Thiếu mã nhân sự" });
  }

  try {
    const notifications = await Notification.findAll({
      where: { maNhanSu },
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: parseInt(offset),
    });

    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


export const getNotificationDetail = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: "Thiếu mã thông báo" });
  }
  try {
    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    return res.status(200).json({ notification });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Thiếu mã thông báo" });
  }

  try {
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({ message: "Thông báo đã được đánh dấu là đã đọc", notification });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

export const sendNotification = async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    notification: { title, body },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const sendNotificationToMany = async (tokens, title, body, data) => {
  try {
    // Lọc token hợp lệ
    const tokensData = await FCMToken.findAll({
      where: { token: { [Op.in]: tokens } },
    });
    const validTokens = tokensData.map(item => item.token);
    if (validTokens.length > 0) {
      try {
        const message = {
          notification: { title, body },
          data: { id: String(data.id) },
          tokens: validTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log("Multicast sent:", response);

        const failedTokens = [];
        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            const errorMsg = resp.error?.message || "Unknown error";
            console.error(`Token ${validTokens[index]} failed: ${errorMsg}`);
            if (
              errorMsg.includes("registration-token-not-registered") ||
              errorMsg.includes("invalid-registration-token")
            ) {
              failedTokens.push(validTokens[index]);
            }
          }
        });

        // Xóa token không hợp lệ
        if (failedTokens.length > 0) {
          await FCMToken.destroy({
            where: { token: { [Op.in]: failedTokens } },
          });
          console.log("🧹 Đã xóa các token không hợp lệ:", failedTokens);
        }
      } catch (sendError) {
        console.error("⚠️ Gửi FCM thất bại nhưng sẽ tiếp tục lưu thông báo:", sendError.message);
      }
    } else {
      console.log("⚠️ Không có token hợp lệ để gửi push, chỉ lưu thông báo.");
    }

    // 2. Luôn lưu thông báo vào bảng Notification, không phụ thuộc FCM
    try {
      const adminUsers = await Auth.findAll({
        where: { Role: "admin" },
        attributes: ["maNhanSu"],
      });

      if (adminUsers.length === 0) {
        return { success: false, message: "Không tìm thấy người dùng admin để lưu thông báo" };
      }

      const notifications = adminUsers.map(({ maNhanSu }) => ({
        maNhanSu,
        title,
        body,
        data,
      }));

      await Notification.bulkCreate(notifications);
      console.log("Đã lưu thông báo vào bảng Notification.");

      return {
        success: true,
        message: `Đã gửi thông báo (nếu có token) và luôn lưu vào bảng Notification.`,
      };
    } catch (saveError) {
      console.error("💥 Lỗi lưu thông báo:", saveError.message);
      return { success: false, message: "Gửi xong nhưng lưu thông báo thất bại" };
    }

  } catch (error) {
    console.error("💥 Lỗi tổng thể trong sendNotificationToMany:", error);
    return { success: false, error: error.message };
  }
};




