# Swagger API Documentation

## Tổng quan
Dự án đã được tích hợp Swagger UI để document tất cả các API endpoints.

## Cài đặt

Các package đã được cài đặt:
```bash
npm install swagger-jsdoc swagger-ui-express
```

## Truy cập Swagger UI

Sau khi khởi động server, truy cập:
```
http://localhost:3000/api-docs
```

hoặc

```
http://<IP_ADDRESS>:3000/api-docs
```

## Cấu trúc

### 1. Config Swagger (`src/config/swagger.js`)
- Định nghĩa cấu hình OpenAPI 3.0
- Định nghĩa các schemas chung
- Cấu hình security (JWT Bearer Token)

### 2. Router Documentation
Mỗi route đã được thêm JSDoc comments với format Swagger:

```javascript
/**
 * @swagger
 * /endpoint:
 *   post:
 *     summary: Mô tả endpoint
 *     tags: [Tag Name]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       ...
 *     responses:
 *       200:
 *         description: Success
 */
```

## Đã document các API (100% Modules):

### 1. Authentication & Tài khoản
- ✅ POST `/api/register` - Đăng ký tài khoản mới
- ✅ POST `/api/login` - Đăng nhập
- ✅ POST `/api/logout` - Đăng xuất
- ✅ POST `/api/changepassword` - Đổi mật khẩu
- ✅ POST `/api/reset-password` - Reset mật khẩu (Admin)

### 2. Đơn đăng ký nhãn hiệu Việt Nam (Application VN)
- ✅ POST `/api/application/list` - Lấy danh sách đơn
- ✅ POST `/api/application/add` - Tạo đơn mới
- ✅ POST `/api/application/detail` - Lấy chi tiết đơn
- ✅ POST `/api/application/fulldetail` - Lấy chi tiết đầy đủ
- ✅ PUT `/api/application/edit` - Cập nhật đơn
- ✅ POST `/api/application/delete` - Xóa đơn
- ✅ POST `/api/application/export-excel` - Xuất Excel
- ✅ POST `/api/application/guq` - Lấy đơn theo giấy ủy quyền
- ✅ POST `/api/application/getMaKhachHangByMaHoSoVuViec` - Lấy mã khách hàng theo mã hồ sơ
- ✅ POST `/api/application/getApplicationByGiayUyQuyenGoc` - Lấy đơn theo GUQ gốc

### 3. Đơn đăng ký nhãn hiệu Campuchia (Application KH)
- ✅ POST `/api/application_kh/list` - Lấy danh sách đơn KH
- ✅ POST `/api/application_kh/add` - Tạo đơn KH mới
- ✅ POST `/api/application_kh/detail` - Chi tiết đơn KH
- ✅ POST `/api/application_kh/fulldetail` - Chi tiết đầy đủ đơn KH
- ✅ PUT `/api/application_kh/edit` - Cập nhật đơn KH
- ✅ POST `/api/application_kh/delete` - Xóa đơn KH
- ✅ POST `/api/application_kh/export-excel` - Xuất Excel đơn KH
- ✅ POST `/api/application_kh/getMaKhachHangByMaHoSoVuViec` - Lấy mã KH theo mã hồ sơ
- ✅ POST `/api/application_kh/getApplicationByGiayUyQuyenGoc` - Lấy đơn KH theo GUQ gốc

### 4. Đơn gia hạn nhãn hiệu (Renewal Applications)
- ✅ POST `/api/application_gh_nh_vn/*` - Đơn gia hạn VN (list, add, detail, fulldetail, update, delete)
- ✅ POST `/api/application_gh_nh_kh/*` - Đơn gia hạn KH (list, add, detail, fulldetail, update)

### 5. Đơn sửa đổi nhãn hiệu (Amendment Applications)
- ✅ POST `/api/application_sd_nh_vn/*` - Đơn sửa đổi VN (add, list)
- ✅ POST `/api/application_sd_gcn_nh_vn/*` - Đơn sửa đổi GCN VN (add, list)
- ✅ POST `/api/application_sd_nh_kh/*` - Đơn sửa đổi KH (add, list)
- ✅ POST `/api/application_sd_gcn_nh_kh/*` - Đơn sửa đổi GCN KH (add, list)

### 6. Đơn tách (Division Applications)
- ✅ POST `/api/application_td_nh_vn/*` - Tách đơn VN (add, list)
- ✅ POST `/api/application_td_nh_kh/*` - Tách đơn KH (add, list)

### 7. Giấy chứng nhận nhãn hiệu (GCN) & Văn bằng
- ✅ POST `/api/gcn_nh/list`, `/gcn_nh_sd/list`, `/gcn_nh/detail` - GCN VN
- ✅ POST `/api/gcn_nh_kh/list`, `/api/gcn_nh_sd_kh/list`, `/api/gcn_nh_kh/detail` - GCN Campuchia
- ✅ POST `/api/gcn_nh_vn/add`, PUT `/api/gcn_nh_vn/edit` - Thêm/sửa GCN VN
- ✅ POST `/api/gcn_nh_cam/add`, PUT `/api/gcn_nh_cam/edit` - Thêm/sửa GCN Campuchia
- ✅ POST `/api/degree/shortlist` - Danh sách văn bằng rút gọn

### 8. Tờ khai sử dụng nhãn hiệu (Affidavit)
- ✅ POST `/api/affidavit/add`, `/affidavit/list`, `/affidavit/detail`, PUT `/api/affidavit/update`

### 9. Giấy ủy quyền (Power of Attorney)
- ✅ POST `/api/power-of-attorney/list`, `/all`, `/detail`, `/add`, PUT `/update`, POST `/delete`

### 10. Đề nghị thanh toán (Debit Note)
- ✅ POST `/api/denghithanhtoan/add`, `/detail`, `/edit`, `/denghithanhtoan_vn/list`, `/denghithanhtoan_kh/list`, `/denghithanhtoan_all/list`

### 11. Tư vấn chung (General Advices)
- ✅ POST `/api/generaladvices_vn/*` - Tư vấn chung VN (list, add, edit, detail)
- ✅ POST `/api/generaladvices_kh/*` - Tư vấn chung KH (list, add, edit, detail)

### 12. Nhóm khách hàng & Người liên hệ
- ✅ POST `/api/group/list`, `/all`, `/detail`, `/add`, PUT `/update`, POST `/delete`
- ✅ POST `/api/contacts/list`, `/detail`, `/create`, `/update`, `/delete`

### 13. Khách hàng, Đối tác, Nhân sự & Danh mục nền tảng
- ✅ POST `/api/customer/*` - Khách hàng (list, detail, add, edit, delete, restore, generate code)
- ✅ POST `/api/partner/*` - Đối tác (list, all, detail, add, update, delete)
- ✅ POST `/api/staff/*` - Nhân sự (list, basiclist, detail, add, edit, delete)
- ✅ POST `/api/case/*` - Hồ sơ vụ việc (list, detail, add, edit, delete, generate code)
- ✅ POST `/api/vuviec/*`, `/billing/*`, `/vu-viec/*` - Vụ việc & Đề nghị thanh toán YCTT
- ✅ POST `/api/brand/*` - Nhãn hiệu
- ✅ POST `/api/country/*` - Quốc gia
- ✅ POST `/api/productsandservices/*` - Sản phẩm dịch vụ
- ✅ POST `/api/applicationtype/*` - Loại đơn
- ✅ POST `/api/casetype/*` - Loại vụ việc
- ✅ POST `/api/industry/*` - Ngành nghề
- ✅ POST `/api/ds-cong-viec/*` - Danh sách công việc
- ✅ POST `/api/timesheet/*` - Timesheet
- ✅ POST `/api/upload`, `/upload-excel`, `/files/*`, `/import-*` - Upload & Import
- ✅ POST `/api/rollback/*`, `/history/by-notification` - Rollback & Lịch sử
- ✅ GET `/api/deadline-dashboard` - Dashboard hạn xử lý
- ✅ POST `/api/save-token`, `/send-notification*`, `/notification/mark-read` - Push Notification Firebase

## Cách sử dụng Authentication trong Swagger

1. Đăng nhập qua endpoint `/api/login`
2. Copy JWT token từ response
3. Click nút "Authorize" 🔒 ở góc trên bên phải
4. Nhập token vào ô "Value" (không cần thêm "Bearer ")
5. Click "Authorize"
6. Bây giờ có thể test các API cần authentication

## Thêm documentation cho API mới

### Bước 1: Thêm JSDoc comment trong router file

```javascript
/**
 * @swagger
 * /your-endpoint:
 *   post:
 *     summary: Mô tả ngắn gọn
 *     tags: [Tag Name]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - field1
 *             properties:
 *               field1:
 *                 type: string
 *                 example: "value"
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Lỗi request
 *       401:
 *         description: Không có quyền
 */
router.post("/your-endpoint", yourController);
```

### Bước 2: Thêm schema vào swagger.js (nếu cần)

```javascript
components: {
  schemas: {
    YourSchema: {
      type: 'object',
      properties: {
        field1: { type: 'string' },
        field2: { type: 'integer' }
      }
    }
  }
}
```

### Bước 3: Restart server

```bash
npm start
```

## Schemas đã định nghĩa

- `LoginRequest` - Request đăng nhập
- `LoginResponse` - Response đăng nhập
- `Application` - Thông tin đơn đăng ký
- `ApplicationListRequest` - Request lấy danh sách đơn
- `ExportExcelRequest` - Request xuất Excel
- `Error` - Cấu trúc lỗi chung

## Tips

1. **Nhóm API theo tags**: Dùng `tags: [Tag Name]` để nhóm các API liên quan
2. **Mô tả rõ ràng**: Viết summary và description dễ hiểu
3. **Example values**: Luôn thêm `example` cho các field
4. **Response codes**: Document đầy đủ các response code có thể
5. **Security**: Thêm `security: [{ bearerAuth: [] }]` cho API cần auth

## Lưu ý

- Swagger UI tự động refresh khi thay đổi code (cần restart server)
- Tất cả endpoint đều có prefix `/api`
- Authentication sử dụng JWT Bearer Token
- Dữ liệu request/response đều là JSON format

## Support

Nếu gặp vấn đề với Swagger documentation:
1. Check console log khi start server
2. Verify JSDoc comment syntax
3. Kiểm tra swagger.js configuration
4. Restart server sau khi thay đổi

---

**Tài liệu được tạo ngày**: 2026-07-23
**Version**: 1.0.0
