# Lịch làm việc V2

## Vai trò
- `index.html`: tra cứu lịch đã được bộ phận duyệt/công bố; chỉ đọc.
- `admin.html`: bộ phận đăng nhập để gửi và tự duyệt lịch; HR đăng nhập để xem tổng hợp/tạo bảng xuất chấm công; Admin quản lý mật khẩu bộ phận và ca kíp.
- `Code.gs`: API Google Apps Script và khởi tạo các tab/header.

## Triển khai lần đầu
1. Mở Apps Script đang gắn với Google Sheets hiện tại.
2. Sao lưu toàn bộ Google Sheets và code cũ.
3. Thay code bằng `Code.gs` trong gói này. Giữ đúng `SPREADSHEET_ID` hiện tại.
4. Chọn hàm `setupSystem`, chạy một lần với hai mật khẩu mạnh, ví dụ trong editor:
   `setupSystem('MAT_KHAU_ADMIN_DAI_HON_10_KY_TU', 'MAT_KHAU_HR_DAI_HON_10_KY_TU')`
   Không dùng nguyên chuỗi ví dụ; thay bằng mật khẩu thật. Hàm tạo/chuẩn hóa các tab: `LICH_THANG`, `LICH_GUI_DUYET`, `CA_KIP`, `BO_PHAN`, `NHAT_KY`, `XUAT_CHAM_CONG`.
5. Cấp quyền Google Sheets khi được hỏi.
6. Deploy > Manage deployments > Edit > New version > Deploy. Giữ URL `/exec` hiện tại nếu deployment đó được cập nhật.
7. Đưa `index.html` và `admin.html` lên GitHub Pages cùng thư mục; hai file đã trỏ tới GAS URL được cung cấp.
8. Mở `admin.html`, đăng nhập Admin, thêm từng bộ phận và đặt mật khẩu. Mật khẩu bộ phận được lưu dạng SHA-256 hash trong tab `BO_PHAN`.
9. Thử với một bản sao dữ liệu và một bộ phận trước khi triển khai toàn công ty.

## Quy trình bộ phận
1. Đăng nhập đúng tên bộ phận và mật khẩu.
2. Tải Excel có cột nhận diện được: Mã NV, Mã chấm công (không bắt buộc nếu có Mã NV), Họ tên, Phòng ban, Bộ phận, Chức vụ; cột ngày đặt là `1` đến `31`.
3. Nội dung ca trong file phải trùng với cột `Tên ca` đang bật trong tab `CA_KIP` (ví dụ `Ca 1`, `Ca 2`, `Ca 3`, `Hành chính`, `Nghỉ`, `Nghỉ phép`).
4. Chọn tháng, đọc file, gửi kiểm tra; sau đó bộ phận bấm “Duyệt & công bố lịch bộ phận”. HR không duyệt/sửa lịch.

## HR và Admin
- HR dùng mật khẩu HR riêng đã đặt qua `setupSystem(adminPassword, hrPassword)`. HR chỉ xem lịch và gọi chức năng tạo bảng `XUAT_CHAM_CONG`; không có API chỉnh sửa/duyệt lịch.
- Admin dùng mật khẩu Admin riêng, quản lý danh mục ca và mật khẩu bộ phận. Admin không có chức năng ghi đè lịch bộ phận.
- Các hành động quan trọng được ghi vào `NHAT_KY`.

## Lưu ý quan trọng
- `setupSystem()` lưu lại mật khẩu Admin/HR mới và khởi tạo tab còn thiếu. Không chạy lại nếu không muốn đổi mật khẩu Admin/HR.
- Bản V2 giữ Spreadsheet ID và tên tab lịch hiện tại, nhưng hãy sao lưu trước. Các cột lịch mới có thêm `Người cập nhật`; dữ liệu cũ được giữ khi tab được chuẩn hóa.
- Bản này đã kiểm tra cú pháp JavaScript tĩnh, chưa thể kiểm chứng quyền truy cập/triển khai trực tiếp trên tài khoản Google của bạn. Cần thử bằng tài khoản và dữ liệu sao lưu trước khi dùng chính thức.
