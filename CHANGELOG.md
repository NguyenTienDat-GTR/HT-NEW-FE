# Changelog

## 1.0.0

### Tài khoản nhiều vai trò
- Form đăng ký tham dự khóa có ô "Gửi với tư cách" khi tài khoản có từ hai tư cách trở lên; đổi tư cách thì tải lại danh sách khóa và ứng viên theo tư cách đó.
- Form tạo tài khoản và gán nhiều vai trò: tối đa 3 vai trò (`maxSelect`), có bộ đếm "x/3 đã chọn".
- Phân công ban điều hành: chọn cấp phân công khi tài khoản có quyền ở nhiều cấp.
- `hasAnyRole` chấp nhận tiền tố `ROLE_` như `hasRole`.
- Ẩn đặt lại mật khẩu / bật tắt tài khoản khi bất kỳ vai trò nào của dòng là SUPER_ADMIN, không chỉ vai trò chính.
- Thông tin khóa: thêm dòng "Cấp quản lý" kèm tên đơn vị; "Điểm đạt", "Thành phần điểm của khóa" và nhóm "Cấu hình" chỉ hiện với đơn vị sở hữu khóa, các nhóm còn lại dàn đều cột; địa điểm dài xuống hàng thay vì bị cắt.

### Phiên bản hệ thống
- Phiên bản 1.0.0 (`package.json`), đưa vào giao diện qua `NEXT_PUBLIC_APP_VERSION`.
- Hiển thị "Phiên bản 1.0.0" ở chân sidebar, menu di động và trang đăng nhập.
