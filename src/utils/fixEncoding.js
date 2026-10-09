/**
 * Bảng ánh xạ các ký tự Windows-1252 (dải 0x80 - 0x9F) về mã byte gốc
 */
const win1252Map = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

/**
 * Tự động sửa lỗi hiển thị ký tự Unicode / CJK (chữ Hán) / Tiếng Việt bị lỗi mã hóa (Mojibake)
 * Ví dụ: 
 * - "Ã Â¸ÂÃ Â¸Â BAIYAOLANG" -> "白药郎 BAIYAOLANG"
 * - "Logo Äá»©c Ngá»c CERAMIC, LINH MIÃŠU HOME DÃ‰COR" -> "Logo Đức Ngọc CERAMIC, LINH MIÊU HOME DÉCOR"
 */
export const fixMojibake = (str) => {
  if (typeof str !== "string" || !str) return str;

  // Nếu không chứa các dấu hiệu đặc trưng của Mojibake UTF-8 -> Windows-1252 thì giữ nguyên
  if (!/[ÃÄÅÂá]/.test(str)) {
    return str;
  }

  // Chuyển chuỗi về mảng byte theo bảng mã Windows-1252
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (win1252Map[code] !== undefined) {
      bytes.push(win1252Map[code]);
    } else if (code <= 0xFF) {
      bytes.push(code);
    } else {
      // Nếu chuỗi chứa ký tự Unicode thực sự nằm ngoài Windows-1252, không can thiệp để tránh làm hỏng
      return str;
    }
  }

  try {
    const candidate = Buffer.from(bytes).toString("utf8");

    // Kiểm tra kết quả giải mã hợp lệ (không chứa ký tự lỗi \uFFFD)
    if (candidate && !candidate.includes("\uFFFD")) {
      // Cho phép khôi phục nếu kết quả là chữ Hán/Nhật/Hàn (CJK), tiếng Việt hoặc ký tự Latin có dấu
      const isValidTarget = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u00C0-\u024F\u1EA0-\u1EF9]/.test(candidate);
      if (isValidTarget) {
        return candidate;
      }
    }
  } catch (e) {
    // Bỏ qua nếu có lỗi
  }

  return str;
};

export default fixMojibake;
