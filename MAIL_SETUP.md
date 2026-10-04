# Gửi email báo cáo công bố

Bổ sung biến trong `.env.mail.example` vào `.env` backend, giữ nguyên cấu hình database/JWT. Điền mật khẩu ứng dụng Gmail vào `SMTP_PASS`, đặt `MAIL_ENABLED=true`, khởi động lại backend. Không đưa mật khẩu vào frontend hoặc Git.

Đăng nhập admin, chọn **Email thử** hoặc mở `/email-test`. Nhập email người nhận (mỗi lần gửi một địa chỉ), sửa dữ liệu mẫu, chọn ảnh nhãn hiệu PNG/JPEG và trang công bố PDF/PNG/JPEG nếu cần (tối đa 5 MB/tệp). Bấm **Xem trước email**, kiểm tra người nhận, tiêu đề, nội dung và tệp; bấm **Gửi email**. Đổi thông tin hoặc tệp sẽ yêu cầu xem trước lại.

`SMTP_USER` luôn là tài khoản gửi. `MAIL_TEST_TO` chỉ điền sẵn người nhận, không bắt buộc; người nhận thực tế là địa chỉ trên màn hình. Các API `/api/mail/*` chỉ dành cho admin. Một tiến trình server giới hạn một lần gửi/phút. Server phải kết nối được đến SMTP qua port 465 hoặc 587. Thành công nghĩa là SMTP chấp nhận thư; kiểm tra Inbox/Spam. Nếu lỗi mạng, kiểm tra hộp thư trước khi gửi lại.

Mẫu HTML/text theo nội dung người dùng cung cấp. Ngày hết hạn phản đối = ngày công bố + 3 tháng dương lịch; nếu thiếu ngày ở tháng đích thì dùng ngày cuối tháng. Các thời hạn/nội dung pháp lý là nội dung mẫu, chưa được hệ thống kiểm chứng pháp lý. Không có trang công bố thì bỏ câu thông báo đính kèm. Ảnh nhãn hiệu được nhúng CID.

Bản này phục vụ gửi thủ công để test: chưa lấy dữ liệu từ hồ sơ, chưa gửi tự động khi cập nhật hồ sơ, chưa có lịch sử gửi bền vững. Triển khai frontend/backend mới lên máy chạy phần mềm trước khi sử dụng.

Kiểm tra không gửi thư thật: `node --test tests/mailTrial.test.mjs`.
Hướng dẫn mật khẩu ứng dụng: https://support.google.com/accounts/answer/185833?hl=vi

CC: nhập tối đa 50 email bằng Enter hoặc phân cách bằng dấu phẩy/chấm phẩy. Backend loại địa chỉ trùng nhau và trùng người nhận chính. Danh sách CC hiện trong bản xem trước. Nếu SMTP chỉ chấp nhận một phần danh sách, giao diện hiển thị cảnh báo và các địa chỉ bị từ chối.
