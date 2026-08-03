// utils/notificationHelper.js

import { sendNotificationToMany } from "../firebase/sendNotification.js";
import { FCMToken } from "../models/fcmTokenModel.js";
import { NhanSu } from "../models/nhanSuModel.js";


export const sendGenericNotification = async ({
  maNhanSuCapNhap,
  title,
  bodyTemplate,
  data,
}) => {
  try {
    const nhanSu = await NhanSu.findOne({ where: { maNhanSu: maNhanSuCapNhap } });
    const tenNhanSu = nhanSu?.hoTen || "Không rõ";

    const body = typeof bodyTemplate === "function"
      ? bodyTemplate(tenNhanSu)
      : bodyTemplate;

    const tokenRecords = await FCMToken.findAll();
    const tokens = tokenRecords.map((rec) => rec.token).filter(Boolean);

    // Gửi thông báo và luôn lưu dù có token hay không
    await sendNotificationToMany(tokens, title, body, {
      ...data,
      maNhanSuCapNhap,
    });
  } catch (err) {
    console.error("Lỗi khi gửi thông báo:", err.message);
  }
};
