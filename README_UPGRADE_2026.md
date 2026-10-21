# LLV V2 – nâng cấp giao diện điện thoại, yêu cầu sửa ca, điều chuyển và phiên bản lịch

## Các thay đổi
- `index.html`: ẩn header lớn trên điện thoại; gộp phần điều khiển; ẩn thống kê trên màn hình nhỏ; bảng lịch chỉ hiển thị mã ca; chạm mã ca mở tên ca và giờ làm; chú thích ca thu gọn; thêm biểu mẫu gửi yêu cầu sửa ca.
- `Code.gs`: thêm các sheet `YEU_CAU_SUA_CA`, `DIEU_CHUYEN_NV`, `PHIEN_BAN_LICH`; API gửi và duyệt yêu cầu; API điều chuyển theo ngày hiệu lực; lưu phiên bản trước các thao tác ghi lịch và API khôi phục phiên bản.
- `admin.html`: thêm màn hình Admin duyệt/từ chối yêu cầu, ghi nhận điều chuyển và xem/khôi phục phiên bản.

## Triển khai
1. Sao lưu Google Sheet và Apps Script hiện tại.
2. Thay mã `Code.gs`, `index.html`, `admin.html` trong dự án Apps Script/hosting đang dùng. Giữ nguyên ID spreadsheet và URL API hiện tại nếu đó là môi trường triển khai đúng.
3. Trong Apps Script, chạy `setupSystem()` chỉ khi đã chuẩn bị mật khẩu mới và hiểu hàm này cập nhật hash mật khẩu Admin/HR. Cần truyền mật khẩu Admin và HR mới (mỗi mật khẩu tối thiểu 10 ký tự). Không chạy với mật khẩu mẫu.
4. Nếu không muốn đổi mật khẩu, hãy tạo ba tab mới thủ công với hàng tiêu đề tương ứng trong `SH.requests`, `SH.transfers`, `SH.versions`; các API cũng tự tạo tab khi chạy.
5. Deploy Apps Script thành New version. Kiểm tra URL API trong cả hai HTML có đúng deployment mới.
6. Thử trên bản sao dữ liệu trước khi đưa vào vận hành thật.

## Kiểm tra bắt buộc trước khi dùng thật
- Gửi yêu cầu sửa ca, từ chối, duyệt; xác nhận đúng nhân viên/ngày bị cập nhật.
- Lưu phân ca trực tiếp, xem phiên bản được tạo, rồi khôi phục và so sánh dữ liệu.
- Điều chuyển với cả hai lựa chọn KEEP/UPDATE, kiểm tra lịch trước ngày hiệu lực không đổi.
- Kiểm tra dữ liệu tháng khác và nhân viên đã nghỉ không bị xóa.

## Giới hạn / bảo mật quan trọng
- Biểu mẫu gửi yêu cầu trên trang tra cứu hiện chưa có đăng nhập/xác thực danh tính công nhân. Mã nhân viên là thông tin người gửi tự khai; Admin phải xác minh yêu cầu trước khi duyệt. Không coi đây là bằng chứng danh tính. Trước khi vận hành chính thức, nên bổ sung đăng nhập nhân viên hoặc OTP qua kênh đã xác minh.
- Điều chuyển hiện ghi nhận trong `DIEU_CHUYEN_NV` và có thể cập nhật các dòng lịch từ ngày hiệu lực, nhưng không sửa tab `NHAN VIEN` gốc và không tự thay đổi quyền truy cập bộ phận.
- Tự động snapshot được gọi trước công bố lịch, nhập trực tiếp, duyệt yêu cầu sửa ca và điều chuyển theo lựa chọn cập nhật. Nên sao lưu Google Sheet độc lập trước lần triển khai đầu tiên.
- Đây là mã được kiểm tra cú pháp tĩnh; chưa thể xác nhận hành vi với spreadsheet, mật khẩu, phân quyền và deployment thực tế của chủ sở hữu.

## Bản vá hiển thị mã ca và chú thích (21/10/2026)
- Ô lịch dùng mã ca nếu giá trị lịch khớp mã hoặc tên ca hiện tại; không để tên ca dài làm phình ô.
- Nút chú thích dùng thao tác mở/đóng rõ ràng, hỗ trợ chạm trên điện thoại và cập nhật `aria-expanded`.
- Giá trị lịch cũ không khớp ca hiện tại được rút gọn và vẫn bấm xem được thông báo đối chiếu. Nếu tên ca cũ đã bị đổi trong `CA_KIP`, hệ thống không thể tự suy ra mã ca cũ một cách an toàn; cần đối chiếu các giá trị cũ trong `LICH_THANG` rồi chuẩn hóa sang mã ca.

## Quy tắc ngày nghỉ tuần/ngày lễ (bản cập nhật)
- `LICH_NGAY` là nguồn xác định loại ngày: `WEEKLY_OFF` (OFF) hoặc `LEGAL_HOLIDAY` (H).
- Khi nhân viên không có phân ca thực tế, trang tra cứu hiển thị OFF/H theo loại ngày và cho chạm để xem giải thích.
- Khi Admin phân ca thực tế vào ngày OFF/H, `LICH_THANG` lưu mã ca (ví dụ C1/C2/C3); giao diện hiển thị mã ca thay cho OFF/H, còn màu nền/chi tiết vẫn giữ loại ngày gốc từ `LICH_NGAY`.
- Vì vậy không tạo mã ca làm giả cho OFF/H và không thay đổi loại ngày chỉ vì nhân viên được phân làm. Hãy phân ca bằng màn hình Admin nhập lịch trực tiếp, chọn mã ca làm thực tế cho đúng nhân viên/ngày.
- Sau khi cập nhật, kiểm thử trên bản sao Google Sheet trước. Việc tính công/lương ngày nghỉ tuần/ngày lễ cần được xác minh riêng theo quy định công ty.
