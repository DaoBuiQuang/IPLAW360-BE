# Tổng Quan Dự Án Backend - Hệ Thống Quản Lý Vụ Việc Pháp Lý

## Thông Tin Cơ Bản

**Tên dự án:** DATN Backend (Hệ thống quản lý vụ việc pháp lý - Intellectual Property Management)
**Công nghệ:** Node.js + Express + Sequelize + MySQL
**Port:** 3000
**Database:** MySQL (QLCV_DB)

## Kiến Trúc Dự Án

```
DATN-backend/
├── server.js              # Entry point, khởi tạo Express server
├── src/
│   ├── config/           # Cấu hình database, Firebase
│   ├── controllers/      # Business logic xử lý request
│   ├── models/           # Sequelize models và associations
│   ├── routers/          # API routes
│   ├── middleware/       # Auth, upload, migrate middleware
│   ├── scripts/          # Scripts tiện ích
│   ├── utils/            # Helper functions
│   ├── firebase/         # Firebase config
│   └── uploads/          # Thư mục lưu file upload
└── uploads/              # Thư mục upload chính
```

## Chức Năng Chính

Hệ thống quản lý các vụ việc pháp lý liên quan đến **Nhãn hiệu**, **Sở hữu trí tuệ** cho 2 thị trường:
- **VN** (Việt Nam)
- **KH** (Campuchia/Cambodia)

### Các Module Chính:

#### 1. **Quản Lý Nhân Sự & Xác Thực**
- Authentication (JWT)
- Quản lý nhân sự (NhanSu)
- Phân quyền

#### 2. **Quản Lý Khách Hàng**
- Khách hàng cuối (KhachHangCuoi)
- Đối tác (DoiTac)
- Nhóm khách hàng (NhomKhachHang)
- Người liên hệ (NguoiLienHe)

#### 3. **Quản Lý Vụ Việc**
- Hồ sơ vụ việc (HoSo_VuViec)
- Vụ việc (VuViec)
- Loại vụ việc (LoaiVuViec)
- Phân công nhân sự xử lý (NhanSu_VuViec)

#### 4. **Quản Lý Đơn Đăng Ký Nhãn Hiệu**
##### Việt Nam (VN):
- Đơn đăng ký nhãn hiệu (DonDangKy)
- Đơn gia hạn nhãn hiệu (DonGiaHan_NH_VN)
- Đơn sửa đổi nhãn hiệu (DonSuaDoi_NH_VN)
- Đơn sửa đổi GCN nhãn hiệu (DonSuaDoiGCN_NH_VN)
- Đơn tách nhãn hiệu (DonTachNH_VN)

##### Campuchia (KH):
- Đơn đăng ký nhãn hiệu (DonDangKyNhanHieu_KH)
- Đơn gia hạn nhãn hiệu (DonGiaHan_NH_KH)
- Đơn sửa đổi nhãn hiệu (DonSuaDoi_NH_KH)
- Đơn sửa đổi GCN nhãn hiệu (DonSuaDoiGCN_NH_KH)
- Đơn tách nhãn hiệu (DonTachNH_KH)
- Affidavit (Tuyên thệ sử dụng nhãn hiệu)

#### 5. **Giấy Chứng Nhận (GCN)**
- Giấy chứng nhận nhãn hiệu VN (GCN_NH)
- Giấy chứng nhận nhãn hiệu KH (GCN_NH_KH)

#### 6. **Quản Lý Thanh Toán**
- Đề nghị thanh toán (DeNghiThanhToan)
- Liên kết đề nghị thanh toán - vụ việc (DeNghiThanhToan_VuViec)
- Debit Note Number

#### 7. **Quản Lý Tài Liệu**
- Tài liệu đơn VN (TaiLieu)
- Tài liệu đơn KH (TaiLieu_KH)
- Tài liệu gia hạn VN (TaiLieuGH_NH_VN)
- Tài liệu gia hạn KH (TaiLieuGH_NH_KH)
- Tài liệu Affidavit (TaiLieuAffidavit)
- Upload file (multer)

#### 8. **Quản Lý Nhãn Hiệu & Sản Phẩm**
- Nhãn hiệu (NhanHieu)
- Sản phẩm/Dịch vụ (SanPham_DichVu)
- Liên kết đơn - sản phẩm (DonDK_SPDV, DonDK_SPDV_KH)

#### 9. **Tiện Ích Khác**
- Lịch sử thẩm định (LichSuThamDinh, LichSuThamDinh_KH)
- Lịch sử gia hạn (LichSuGiaHan_KH)
- Tư vấn chung (TuVanChung_VN, TuVanChung_KH)
- Giấy ủy quyền (GiayUyQuyen)
- Dashboard/Thống kê
- Push notification (Firebase)
- Audit log
- Rollback

## API Routes

### Endpoints chính (tất cả prefix `/api`):

| Router | Chức năng |
|--------|-----------|
| `/auth` | Đăng nhập, đăng ký, xác thực |
| `/nhansu` | Quản lý nhân sự |
| `/khachhangcuoi` | Quản lý khách hàng |
| `/doitac` | Quản lý đối tác |
| `/vuviec` | Quản lý vụ việc |
| `/hosovuviec` | Quản lý hồ sơ vụ việc |
| `/dongangky` | Đơn đăng ký VN |
| `/dongangkynhanhieu-kh` | Đơn đăng ký KH |
| `/dongiahannnhanhieu-vn` | Đơn gia hạn VN |
| `/dongiahannnhanhieu-kh` | Đơn gia hạn KH |
| `/donsuadoinhanhieu-vn` | Đơn sửa đổi VN |
| `/donsuadoinhanhieu-kh` | Đơn sửa đổi KH |
| `/dontach` | Đơn tách |
| `/denghithanhtoan` | Đề nghị thanh toán |
| `/gcn-nh` | Giấy chứng nhận |
| `/affidavit` | Affidavit (KH) |
| `/nhanhieu` | Nhãn hiệu |
| `/sanpham-dichvu` | Sản phẩm/Dịch vụ |
| `/nguoilienhe` | Người liên hệ |
| `/giayuyquyen` | Giấy ủy quyền |
| `/dashboard` | Dashboard/Thống kê |
| `/upload` | Upload files |
| `/rollback` | Rollback data |

## Database Schema

### Bảng Core:
- **NhanSu**: Nhân viên
- **Auth**: Xác thực
- **QuocGia**: Quốc gia (VN, KH, ...)
- **DoiTac**: Đối tác
- **KhachHangCuoi**: Khách hàng
- **VuViec**: Vụ việc
- **NhanHieu**: Nhãn hiệu

### Bảng Đơn VN:
- **DonDangKy**: Đơn đăng ký
- **DonGiaHan_NH_VN**: Đơn gia hạn
- **DonSuaDoi_NH_VN**: Đơn sửa đổi
- **DonSuaDoiGCN_NH_VN**: Đơn sửa đổi GCN
- **DonTachNH_VN**: Đơn tách
- **GCN_NH**: Giấy chứng nhận

### Bảng Đơn KH:
- **DonDangKyNhanHieu_KH**: Đơn đăng ký
- **DonGiaHan_NH_KH**: Đơn gia hạn
- **DonSuaDoi_NH_KH**: Đơn sửa đổi
- **DonSuaDoiGCN_NH_KH**: Đơn sửa đổi GCN
- **DonTachNH_KH**: Đơn tách
- **GCN_NH_KH**: Giấy chứng nhận
- **Affidavit**: Tuyên thệ

### Bảng Thanh Toán:
- **DeNghiThanhToan**: Đề nghị thanh toán
- **DeNghiThanhToan_VuViec**: Liên kết vụ việc

## Công Nghệ Sử Dụng

### Backend Framework:
- **Express.js** 4.21.2: Web framework
- **Sequelize** 6.37.5: ORM cho MySQL
- **MySQL2** 3.12.0: MySQL driver

### Authentication & Security:
- **jsonwebtoken** 9.0.2: JWT authentication
- **bcrypt** 5.1.1: Hash password

### File Processing:
- **multer** 2.0.1: Upload file
- **exceljs** 4.4.0: Xử lý Excel
- **xlsx** 0.18.5: Đọc/ghi Excel

### Utilities:
- **dayjs** 1.11.18: Date manipulation
- **cors** 2.8.5: CORS middleware
- **dotenv** 16.5.0: Environment variables
- **node-cron** 4.0.7: Scheduled tasks
- **firebase-admin** 13.4.0: Push notifications

## File Quan Trọng

### [server.js](server.js)
Entry point của ứng dụng, khởi tạo Express server và đăng ký tất cả routes.

### [src/config/db.js](src/config/db.js)
Cấu hình kết nối Sequelize với MySQL database.

### [src/models/index.js](src/models/index.js)
Định nghĩa tất cả associations (relationships) giữa các models, sync database.

### [src/controllers/deNghiThanhToanController.js](src/controllers/deNghiThanhToanController.js)
Controller xử lý đề nghị thanh toán:
- `addDeNghiThanhToan`: Tạo mới đề nghị thanh toán
- `getDeNghiThanhToansVN`: Lấy danh sách cho VN
- `getDeNghiThanhToansKH`: Lấy danh sách cho KH
- `getDeNghiThanhToanDetail`: Lấy chi tiết
- `editDeNghiThanhToan`: Cập nhật

### [src/middleware/authMiddleware.js](src/middleware/authMiddleware.js)
JWT authentication middleware.

### [src/middleware/upload.js](src/middleware/upload.js)
Multer configuration cho upload files.

## Environment Variables (.env)

```env
JWT_SECRET=my_secret_key
DB_NAME=QLCV_DB
DB_USER=root
DB_PASSWORD=22082003
DB_HOST=localhost
DB_DIALECT=mysql
PORT=3000
UPLOAD_DIR=uploads
UPLOAD_MAX_SIZE=10485760
```

## Scripts

- `npm start`: Chạy server với `--watch` mode (hot reload)
- `npm run build`: Build với esbuild

## Đặc Điểm Kỹ Thuật

### 1. **Phân biệt thị trường VN/KH**
Nhiều module có 2 phiên bản riêng cho VN và KH (ví dụ: DonDangKy vs DonDangKyNhanHieu_KH).

### 2. **Transaction Support**
Sử dụng Sequelize transactions cho các thao tác phức tạp (ví dụ: tạo đề nghị thanh toán + liên kết vụ việc).

### 3. **Associations phức tạp**
Models có nhiều mối quan hệ 1-n, n-n qua bảng trung gian.

### 4. **File Upload**
Hỗ trợ upload file với multer, lưu vào thư mục `uploads/`.

### 5. **Pagination**
API hỗ trợ phân trang với `pageIndex`, `pageSize`.

### 6. **Dynamic Field Selection**
Client có thể chọn fields cần trả về qua `fields` array.

### 7. **Audit Log**
Ghi log các thao tác quan trọng.

### 8. **Firebase Push Notification**
Tích hợp Firebase để gửi thông báo.

## Lưu Ý Quan Trọng

1. **Database**: Cần có MySQL server đang chạy với database `QLCV_DB`
2. **Port**: Server chạy trên port 3000, có thể truy cập qua LAN IP
3. **CORS**: Đã enable CORS cho tất cả origins
4. **File size**: Upload file tối đa 50MB
5. **Auto-sync**: Database tự động sync khi khởi động server

## Quy Trình Phát Triển Típ

1. Tạo model trong `src/models/`
2. Định nghĩa associations trong `src/models/index.js`
3. Tạo controller trong `src/controllers/`
4. Tạo router trong `src/routers/`
5. Đăng ký router trong `server.js`
6. Test API với Postman/Thunder Client

---

**Tác giả:** DATN Team
**Cập nhật:** 2026-07-17
