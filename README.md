# Lịch làm việc V2 — sửa xác nhận và công bố lịch

## Sửa lỗi “báo công bố thành công nhưng LICH_THANG trống”
- Hàm công bố tạo danh sách dòng cần ghi trước khi thay đổi `LICH_THANG`.
- Nếu bản lịch không có ca/ngày hợp lệ, API trả lỗi rõ ràng và không đánh dấu đã duyệt.
- Nếu công bố thành công, thông báo trả về số dòng đã ghi vào `LICH_THANG`; tab `LICH_GUI_DUYET` cũng ghi số dòng trong cột Ghi chú.
- Dữ liệu lịch cũ không bị xóa nếu bản gửi mới không có dòng hợp lệ.

## Triển khai
1. Sao lưu Google Sheets và Apps Script hiện tại.
2. Thay `Code.gs` bằng file trong gói này. Giữ nguyên `SPREADSHEET_ID` đang trỏ tới file lịch làm việc; file log máy chấm công vẫn được cấu hình riêng.
3. Lưu và triển khai Apps Script bằng **Deploy > Manage deployments > Edit > New version > Deploy**.
4. Tải `admin.html` và `index.html` cùng gói lên GitHub Pages nếu cần đồng bộ phiên bản giao diện.
5. Mở lại trang quản trị, tải lại lịch tháng 2026-10. Nếu lần trước báo thành công nhưng `LICH_THANG` rỗng, hãy kiểm tra dữ liệu JSON ở cột G của `LICH_GUI_DUYET`: phải có `shifts` với khóa ngày dạng `YYYY-MM-DD` và ca không rỗng. Nếu bản gửi cũ không có ca, đọc lại Excel và gửi bản mới.

## Kiểm tra sau công bố
- Thông báo thành công phải nêu `Đã ghi N dòng vào LICH_THANG` với N > 0.
- Mở đúng file lịch có ID được khai báo trong `SPREADSHEET_ID`, kiểm tra tab `LICH_THANG`.
- Trang tra cứu phải dùng cùng URL Apps Script đang triển khai.

Bản này được sửa tĩnh; cần kiểm tra với Google Sheets và quyền triển khai thực tế trước khi dùng chính thức.
