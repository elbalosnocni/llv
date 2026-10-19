LLV - LICH LAM VIEC THANG - BAN NANG CAP

TÍNH NĂNG
- Xem lịch tháng dạng bảng, tự nhận số ngày và thứ trong tuần.
- Lọc phòng ban, tìm kiếm, lọc ca, chọn tháng/năm.
- Cố định đồng thời cột Họ tên và Mã NV khi cuộn ngang.
- Sửa ca ngay trong ô, sao chép lịch từ một ngày sang ngày khác, hoàn tác.
- Nhập/xuất Excel, in ngang khổ A3.
- Tải lịch tháng từ Google Sheets và lưu lịch tháng lên Google Sheets.
- API lưu lịch kiểm tra quyền quản trị phía Apps Script.
- Giữ API tra cứu CCCD, cấu hình ca, chấm công và đăng ký đổi ca cũ; bản ghi chấm công mới ưu tiên lưu Mã chấm công để đối soát máy chấm công.

CÀI ĐẶT
1. Tải index.html lên GitHub Pages.
2. Mở Google Apps Script gắn với bảng tính, thay Code.gs bằng file trong gói này.
3. Trong Apps Script > Project Settings > Script Properties, tạo:
   ADMIN_TOKEN = một chuỗi bí mật do công ty tự đặt.
   Không dùng mã ví dụ công khai; chỉ cấp cho người có quyền chỉnh lịch.
4. Deploy > New deployment > Web app. Execute as: Me. Who has access: theo chính sách công ty (thường Anyone trong phạm vi cần gọi từ GitHub Pages; cân nhắc chính sách dữ liệu nội bộ). Cấp quyền khi được hỏi.
5. Sao chép URL Web App kết thúc bằng /exec, dán vào ô Apps Script Web App URL trên trang lịch.
6. Nhập mã quản trị ở ô tương ứng để lưu. Người xem chỉ cần tải lịch; không nhập mã quản trị.
7. Bấm “Tải lịch từ Sheets” để đọc lịch tháng hoặc “Lưu lên Sheets” để ghi lịch.

CẤU TRÚC GOOGLE SHEETS
- API tự tạo tab LICH_THANG khi lưu lần đầu, mỗi dòng là một ca của một nhân viên trong một ngày.
- Dữ liệu tháng khác được giữ nguyên. Chỉ những dòng thuộc tháng đang lưu mới được thay thế.
- Quy tắc định danh khi tổng hợp lịch ưu tiên Mã chấm công; Mã NV được giữ riêng để hiển thị.
- Sheet LLV cũ và API tra cứu CCCD vẫn được hỗ trợ.

LƯU Ý QUAN TRỌNG
- Trước khi triển khai, sao lưu Google Sheet và kiểm tra quyền truy cập dữ liệu nhân viên.
- Sau khi thay Code.gs, phải triển khai phiên bản Web App mới; URL /exec cũ có thể vẫn chạy phiên bản cũ.
- Với dữ liệu chấm công từ máy, hãy ghép theo Mã chấm công (cột C trong ví dụ ảnh), không dùng Mã NV vì Mã NV có thể thay đổi theo tháng/bộ phận.
- Nếu nhập file Excel, hãy kiểm tra dòng tiêu đề có cột Mã chấm công/Attendance Code. Nếu không có, trường này để trống và cần bổ sung trước khi lưu lịch chính thức.
- Bản ghi chấm công và đổi ca giữ tương thích trường manv cũ, đồng thời hỗ trợ machacong/maChamCong.
