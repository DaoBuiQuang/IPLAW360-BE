import dayjs from "dayjs";

const isEmptyDate = (val) => {
    if (val === null || val === undefined) return true;
    if (typeof val === "string" && val.trim() === "") return true;
    return false;
};

/**
 * Tính ngày hết hạn bằng = ngayNopDon + 10 năm (YYYY-MM-DD)
 */
export const computeNgayHetHanBang = (ngayNopDon) => {
    if (isEmptyDate(ngayNopDon)) return null;
    const parsed = dayjs(ngayNopDon);
    if (!parsed.isValid()) return null;
    return parsed.add(10, "year").format("YYYY-MM-DD");
};

/**
 * Tính hạn gia hạn = ngayNopDon + 9.5 năm (9 năm 6 tháng) (YYYY-MM-DD)
 */
export const computeHanGiaHan = (ngayNopDon) => {
    if (isEmptyDate(ngayNopDon)) return null;
    const parsed = dayjs(ngayNopDon);
    if (!parsed.isValid()) return null;
    return parsed.add(9, "year").add(6, "month").format("YYYY-MM-DD");
};

/**
 * Chuẩn hóa ngayHetHanBang và hanGiaHan trước khi lưu vào DB:
 * - Nếu ngayHetHanBang trống mà có ngayNopDon -> tự động tính ngayNopDon + 10 năm
 * - Nếu hanGiaHan trống mà có ngayNopDon -> tự động tính ngayNopDon + 9.5 năm
 */
export const resolveGCNDatesForSave = ({ ngayNopDon, ngayHetHanBang, hanGiaHan } = {}) => {
    const resolvedNgayHetHanBang = isEmptyDate(ngayHetHanBang)
        ? computeNgayHetHanBang(ngayNopDon)
        : ngayHetHanBang;

    const resolvedHanGiaHan = isEmptyDate(hanGiaHan)
        ? computeHanGiaHan(ngayNopDon)
        : hanGiaHan;

    return {
        ngayHetHanBang: resolvedNgayHetHanBang || null,
        hanGiaHan: resolvedHanGiaHan || null,
    };
};

/**
 * Fallback khi đọc dữ liệu GCN_NH trả ra API:
 * - Nếu ngayHetHanBang đang null/trống mà có ngayNopDon -> fallback ngayNopDon + 10 năm
 */
export const resolveNgayHetHanBangForRead = (ngayHetHanBang, ngayNopDon) => {
    if (!isEmptyDate(ngayHetHanBang)) return ngayHetHanBang;
    return computeNgayHetHanBang(ngayNopDon);
};

export const resolveHanGiaHanForRead = (hanGiaHan, ngayNopDon) => {
    if (!isEmptyDate(hanGiaHan)) return hanGiaHan;
    return computeHanGiaHan(ngayNopDon);
};

