# Timesheet – Nội dung cập nhật cho FE

## 1. Tổng quan

Backend đã bổ sung module **Timesheet** để ghi nhận thời gian nhân sự thực hiện công việc theo mã hồ sơ.

Mỗi log Timesheet lưu:

- Nhân sự thực hiện công việc
- Mã hồ sơ
- Ngày làm việc
- Số giờ làm việc
- Hoạt động
- Nội dung công việc
- Đơn giá áp dụng
- Tổng tiền
- Trạng thái xử lý

Module được thiết kế độc lập. `employeeCode` và `caseCode` chỉ được lưu dạng chuỗi, không thiết lập khóa ngoại trong database.

> `caseCode` hiện tại chỉ lưu và lọc theo chuỗi. Backend **chưa kiểm tra mã hồ sơ có tồn tại hay không**.

---

## 2. Cập nhật bảng nhân sự

Bảng `NhanSu` được bổ sung trường:

| Trường | Kiểu dữ liệu | Ý nghĩa |
|---|---|---|
| `hourlyRate` | `DECIMAL(15, 2)` | Đơn giá mặc định của nhân sự theo giờ, đơn vị VNĐ/giờ |

Giá trị mặc định là `0`.

### Bắt buộc chạy lệnh SQL trên database hiện tại

```sql
ALTER TABLE `NhanSu`
ADD COLUMN `hourlyRate` DECIMAL(15, 2) NOT NULL DEFAULT 0;
```

Có thể cập nhật đơn giá cho từng nhân sự bằng API nhân sự hiện tại:

```http
PUT /api/staff/edit
```

Body mẫu:

```json
{
  "maNhanSu": "NS001",
  "hourlyRate": 50000,
  "maNhanSuCapNhap": "ADMIN001"
}
```

Khi lấy danh sách hoặc chi tiết nhân sự, FE sẽ nhận được trường `hourlyRate`.

---

## 3. Cấu trúc Timesheet

### Các trường do FE gửi

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---:|---|
| `employeeCode` | String | Có | Mã nhân sự, tương ứng với `NhanSu.maNhanSu` |
| `caseCode` | String | Có | Mã hồ sơ; hiện chỉ lưu chuỗi, chưa đối chiếu với bảng hồ sơ |
| `workDate` | String | Có | Ngày làm việc, định dạng `YYYY-MM-DD` |
| `hours` | Number | Có | Số giờ làm việc, lớn hơn `0`, tối đa `24` |
| `activity` | String | Có | Tên hoạt động, ví dụ `Nộp đơn`, `Tra cứu thông tin` |
| `description` | String | Không | Mô tả chi tiết công việc |
| `notes` | String | Không | Ghi chú |

### Các trường backend tự sinh

FE không cần gửi:

```text
id
hourlyRate
totalAmount
status
approvedBy
approvedAt
rejectionReason
createdAt
updatedAt
```

Backend sẽ thực hiện:

```text
hourlyRate = NhanSu.hourlyRate
totalAmount = hours × hourlyRate
status = APPROVED
approvedBy = req.user.maNhanSu
approvedAt = thời điểm tạo
```

Hiện tại chưa triển khai quy trình gửi duyệt/từ chối. Timesheet được tạo mới sẽ ở trạng thái `APPROVED` ngay lập tức.

`hourlyRate` được lưu lại trong từng Timesheet để giữ đúng đơn giá tại thời điểm tạo log. Khi đơn giá nhân sự thay đổi, các Timesheet cũ không bị thay đổi.

---

## 4. Danh sách API

Tất cả API cần gửi token đăng nhập:

### 4.1. Lấy danh sách mã hồ sơ chung

Dùng cho dropdown chọn mã hồ sơ khi tạo hoặc sửa Timesheet. API lấy trường `maHoSo` từ các bảng nghiệp vụ hiện có, gộp và loại bỏ mã trùng. API không tạo khóa ngoại và không thay đổi API sinh mã hồ sơ hiện tại.

```http
POST /api/timesheet/case-options
```

Request body (có thể để rỗng):

```json
{
  "searchText": "A00001",
  "pageIndex": 1,
  "pageSize": 20
}
```

Response:

```json
{
  "data": [
    {
      "caseCode": "A00001-00001"
    }
  ],
  "pagination": {
    "totalItems": 1,
    "totalPages": 1,
    "pageIndex": 1,
    "pageSize": 20
  }
}
```

Trong Timesheet, `caseCode` nhận chính giá trị `maHoSo` được trả về từ API này. `searchText`, `pageIndex` và `pageSize` không bắt buộc; `pageSize` tối đa là `100`.

Tất cả API cần gửi token đăng nhập:

```http
Authorization: Bearer <token>
```

### 4.2. Lấy danh sách Timesheet

```http
POST /api/timesheet/list
```

Body mẫu:

```json
{
  "employeeCode": "NS001",
  "caseCode": "HS20260001",
  "status": "DRAFT",
  "activity": "Tra cứu",
  "fromDate": "2026-09-01",
  "toDate": "2026-09-30",
  "pageIndex": 1,
  "pageSize": 20
}
```

Các trường lọc đều không bắt buộc:

- `employeeCode`: lọc theo nhân sự
- `caseCode`: lọc theo mã hồ sơ
- `status`: lọc theo trạng thái
- `activity`: tìm gần đúng theo hoạt động
- `fromDate`, `toDate`: lọc khoảng ngày
- `pageIndex`: mặc định `1`
- `pageSize`: mặc định `20`, tối đa `100`

Response mẫu:

```json
{
  "data": [
    {
      "id": 1,
      "employeeCode": "NS001",
      "caseCode": "HS20260001",
      "workDate": "2026-09-06",
      "hours": "2.50",
      "activity": "Tra cứu thông tin",
      "description": "Tra cứu tình trạng hồ sơ",
      "hourlyRate": "50000.00",
      "totalAmount": "125000.00",
      "status": "DRAFT",
      "approvedBy": null,
      "approvedAt": null,
      "rejectionReason": null,
      "notes": null,
      "createdAt": "2026-09-06T10:00:00.000Z",
      "updatedAt": "2026-09-06T10:00:00.000Z",
      "employee": {
        "maNhanSu": "NS001",
        "hoTen": "Nguyễn Văn A",
        "phongBan": "Phòng nghiệp vụ"
      }
    }
  ],
  "pagination": {
    "totalItems": 1,
    "totalPages": 1,
    "pageIndex": 1,
    "pageSize": 20
  }
}
```

> Các trường Sequelize kiểu `DECIMAL` có thể trả về dạng chuỗi. FE nên chuyển sang Number khi cần tính toán hoặc định dạng.

### 4.2. Lấy chi tiết Timesheet

```http
POST /api/timesheet/detail
```

Body:

```json
{
  "id": 1
}
```

Response là một object Timesheet, có thêm thông tin nhân sự trong trường `employee`.

### 4.3. Lấy Timesheet theo mã hồ sơ

Dùng cho tab Timesheet trong màn hình chi tiết hồ sơ:

```http
POST /api/timesheet/by-case
```

Body:

```json
{
  "caseCode": "HS20260001"
}
```

Response mẫu:

```json
{
  "data": [],
  "summary": {
    "totalHours": 12.5,
    "totalAmount": 625000
  }
}
```

### 4.4. Lấy thống kê Timesheet

```http
POST /api/timesheet/summary
```

Body mẫu:

```json
{
  "employeeCode": "NS001",
  "caseCode": "HS20260001",
  "fromDate": "2026-09-01",
  "toDate": "2026-09-30",
  "status": "APPROVED"
}
```

Response:

```json
{
  "summary": {
    "totalItems": 8,
    "totalHours": 32.5,
    "totalAmount": 1625000
  }
}
```

### 4.5. Thêm Timesheet

```http
POST /api/timesheet/add
```

Quyền: `admin`, `staff`.

Body mẫu:

```json
{
  "employeeCode": "NS001",
  "caseCode": "HS20260001",
  "workDate": "2026-09-06",
  "hours": 2.5,
  "activity": "Tra cứu thông tin",
  "description": "Tra cứu tình trạng hồ sơ",
  "notes": "Công việc phát sinh"
}
```

Backend kiểm tra `employeeCode`, lấy đơn giá từ nhân sự và tự tính `totalAmount`.

### 4.6. Cập nhật Timesheet

```http
PUT /api/timesheet/edit
```

Quyền: `admin`, `staff`.

Body mẫu:

```json
{
  "id": 1,
  "employeeCode": "NS001",
  "caseCode": "HS20260001",
  "workDate": "2026-09-06",
  "hours": 4,
  "activity": "Nộp đơn",
  "description": "Hoàn thiện và nộp hồ sơ",
  "notes": "Đã hoàn thành"
}
```

Chỉ bắt buộc `id`; các trường còn lại có thể gửi khi cần thay đổi.

Không thể sửa Timesheet có trạng thái `APPROVED` hoặc `LOCKED`.

### 4.7. Xóa Timesheet

```http
DELETE /api/timesheet/delete
```

Quyền: `admin`, `staff`.

Body:

```json
{
  "id": 1
}
```

Không thể xóa Timesheet có trạng thái `APPROVED` hoặc `LOCKED`.

---

## 5. Trạng thái Timesheet

| Giá trị | Hiển thị đề xuất trên FE |
|---|---|
| `DRAFT` | Nháp |
| `SUBMITTED` | Chờ duyệt |
| `APPROVED` | Đã duyệt |
| `REJECTED` | Từ chối |
| `LOCKED` | Đã chốt |

Hiện backend tạo mới với trạng thái `APPROVED` và khóa sửa/xóa khi trạng thái là `APPROVED` hoặc `LOCKED`. Do đó Timesheet vừa tạo sẽ không được sửa hoặc xóa qua API hiện tại.

---

## 6. Gợi ý giao diện FE

### Danh sách Timesheet

Nên có các bộ lọc:

- Từ ngày
- Đến ngày
- Nhân sự
- Mã hồ sơ
- Hoạt động
- Trạng thái

Các cột:

```text
Ngày | Mã hồ sơ | Nhân sự | Hoạt động | Nội dung | Số giờ | Đơn giá/giờ | Thành tiền | Trạng thái
```

### Form thêm/sửa

Các trường:

```text
Nhân sự
Mã hồ sơ
Ngày làm việc
Số giờ
Hoạt động
Nội dung công việc
Ghi chú
```

Khi chọn nhân sự, FE có thể hiển thị `hourlyRate` hiện tại nhưng không cần gửi `hourlyRate` và `totalAmount` khi submit.

### Tab Timesheet trong chi tiết hồ sơ

Gọi:

```http
POST /api/timesheet/by-case
```

với:

```json
{
  "caseCode": "mã hồ sơ hiện tại"
}
```

Hiển thị danh sách logtime cùng:

```text
Tổng số giờ
Tổng chi phí
```

---

## 7. Các file backend liên quan

- `src/models/timeSheetModel.js`
- `src/controllers/timeSheetController.js`
- `src/routers/timeSheetRouter.js`
- `src/models/nhanSuModel.js`
- `src/controllers/nhanSuController.js`
- `src/scripts/add-timesheet-schema.sql`
- `server.js`
