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

QUY TRÌNH BỘ PHẬN GỬI DUYỆT (BỔ SUNG)
1. Trong Apps Script > Project Settings > Script Properties, cấu hình:
   ADMIN_TOKEN = mã bí mật của HR/Admin.
   DEPT_TOKENS = JSON ánh xạ tên phòng ban đúng như cột Phòng ban trong Excel sang mã riêng của phòng ban. Ví dụ cấu trúc: {"Sản xuất":"ma-rieng-1","Kỹ thuật":"ma-rieng-2"}
   Hãy thay toàn bộ mã ví dụ bằng mã dài, khó đoán; không dùng chung mã giữa các bộ phận.
2. Bộ phận mở trang, nhập URL /exec, tải lịch tháng từ Sheets hoặc nhập Excel, nhập Mã bộ phận rồi bấm “Gửi lịch bộ phận”. Backend chỉ nhận nhân viên có cột Phòng ban khớp chính xác với phòng ban của mã được cấp.
3. HR/Admin kiểm tra lịch, nhập ADMIN_TOKEN và bấm “Duyệt & công bố”. Các bộ phận đã gửi trong tháng đó được cập nhật vào lịch chính thức; lịch của các bộ phận chưa gửi được giữ nguyên.
4. Công nhân chỉ cần mở trang và bấm “Tải lịch từ Sheets”; không cần mã bộ phận hay mã quản trị. Chỉ dữ liệu đã công bố trong LICH_THANG mới xuất hiện ở chế độ tra cứu.
5. Mỗi lần sửa Code.gs, triển khai phiên bản Web App mới. Không gửi ADMIN_TOKEN hoặc DEPT_TOKENS cho công nhân.

SHEET TỰ TẠO THÊM
- LICH_GUI_DUYET: lưu lịch gửi lên, trạng thái Chờ duyệt/Đã duyệt và dữ liệu từng lần gửi.
- LICH_THANG: lịch chính thức công nhân tra cứu.
Lưu ý: quyền truy cập Web App vẫn do cấu hình triển khai Apps Script quyết định. Các mã token là lớp phân quyền nghiệp vụ, không thay thế chính sách bảo mật Google Workspace.
