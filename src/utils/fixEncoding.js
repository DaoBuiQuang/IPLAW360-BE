/**
 * Tự động sửa lỗi hiển thị ký tự Unicode / CJK / Hán tự bị lỗi mã hóa (Mojibake)
 * Ví dụ: "ç™¾è ¯éƒŽ BAIYAOLANG" -> "百药郎 BAIYAOLANG"
 */
export const fixMojibake = (str) => {
  if (typeof str !== "string" || !str) return str;

  // Nếu chuỗi đã chứa sẵn ký tự CJK (chữ Hán, Nhật, Hàn) chuẩn thì không cần sửa
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(str)) {
    return str;
  }

  try {
    // Thử giải mã các byte Latin-1 / Windows-1252 về UTF-8
    const fixed = Buffer.from(str, "latin1").toString("utf8");

    // Nếu giải mã thành công, không chứa ký tự lỗi  (\uFFFD) và có ký tự CJK hợp lệ
    if (fixed && !fixed.includes("\uFFFD") && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(fixed)) {
      return fixed;
    }
  } catch (e) {
    // Bỏ qua nếu có lỗi giải mã
  }

  return str;
};

export default fixMojibake;
