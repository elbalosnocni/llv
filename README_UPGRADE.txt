LLV – TRÌNH XEM / CHỈNH SỬA LỊCH LÀM VIỆC THÁNG (bản nâng cấp giao diện)

TÍNH NĂNG
- Xem lịch theo tháng, ngày trong tuần và tô màu ca.
- Lọc theo họ tên/mã nhân viên/phòng ban/bộ phận/chức vụ; lọc theo ca.
- Chỉnh ca trực trực tiếp trong ô lịch; thêm nhân viên.
- Đếm nhân viên, số ngày trong tháng, ô đã phân ca và số lần chỉnh sửa.
- Tải Excel/XLSX/CSV lên để đọc danh sách; xuất lịch hiện tại thành Excel.
- In lịch và bố cục phù hợp màn hình điện thoại/máy tính.

CÁCH DÙNG
1. Đưa index.html lên GitHub Pages (hoặc mở trực tiếp trên trình duyệt có Internet).
2. Bấm “Tải Excel lên”, chọn file lịch làm việc.
3. Chọn tháng tương ứng, kiểm tra dữ liệu đã nhập đúng; chỉnh ca trong ô.
4. Bấm “Xuất Excel” để tải bản mới. Bản gốc không bị ghi đè.

LƯU Ý QUAN TRỌNG
- Bản này là trình xem/chỉnh sửa phía trình duyệt, không tự lưu ngược vào Google Sheets hoặc file trên máy chủ. Mỗi lần tải lại trang, hãy nhập lại file gốc hoặc mở bản Excel đã xuất.
- Bảng Excel có cấu trúc đặc biệt/ô gộp hoặc cột ngày khác vị trí có thể cần điều chỉnh quy tắc nhận diện header. Kiểm tra vài nhân viên và ngày trước khi dùng làm lịch chính thức.
- Code.gs trong gói ban đầu là API chấm công/đổi ca, không phải API lưu lịch tháng; không thể coi việc chỉnh trên giao diện là đã cập nhật Google Sheets.
- index.html cũ có API_URL trỏ tới https://google.com nên các chức năng tra cứu/chấm công hiện tại không thể hoạt động như một Apps Script Web App. Không thay URL này bằng URL giả; cần URL triển khai Apps Script thật và thiết kế API lưu lịch riêng nếu muốn đồng bộ trực tuyến.
