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

## Đã document các API:

### Authentication
- ✅ POST `/api/register` - Đăng ký tài khoản mới
- ✅ POST `/api/login` - Đăng nhập
- ✅ POST `/api/logout` - Đăng xuất
- ✅ POST `/api/changepassword` - Đổi mật khẩu
- ✅ POST `/api/reset-password` - Reset mật khẩu (Admin)

### Application (Đơn đăng ký)
- ✅ POST `/api/application/list` - Lấy danh sách đơn
- ✅ POST `/api/application/add` - Tạo đơn mới
- ✅ POST `/api/application/detail` - Lấy chi tiết đơn
- ✅ POST `/api/application/fulldetail` - Lấy chi tiết đầy đủ
- ✅ PUT `/api/application/edit` - Cập nhật đơn
- ✅ POST `/api/application/delete` - Xóa đơn
- ✅ POST `/api/application/export-excel` - Xuất Excel
- ✅ POST `/api/application/guq` - Lấy đơn theo giấy ủy quyền

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

## TODO - Các API cần thêm documentation

- [ ] Nhân sự (Staff) APIs
- [ ] Quốc gia (Country) APIs
- [ ] Đối tác (Partner) APIs
- [ ] Khách hàng (Customer) APIs
- [ ] Hồ sơ vụ việc (Matter) APIs
- [ ] Nhãn hiệu (Trademark) APIs
- [ ] Sản phẩm dịch vụ (Product/Service) APIs
- [ ] Vụ việc (Task) APIs
- [ ] Dashboard APIs
- [ ] Upload APIs
- [ ] Notification APIs

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
