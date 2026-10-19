const SPREADSHEET_ID = "1GSPgNkJGz2igyKwP4lrCB6oNiuGb8PSjPw8zrgcHMOI";

function doGet(e) {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Xử lý lấy thông tin cấu hình công thức tính công
  if (e.parameter.action === "get_config") {
    let sheet = ss.getSheetByName("CAU_HINH") || khoiTaoConfig(ss);
    let data = sheet.getDataRange().getValues();
    let config = {};
    for (let i = 1; i < data.length; i++) {
      config[data[i][0]] = { gioVao: data[i][1], heSo: data[i][2] };
    }
    return ContentService.createTextOutput(JSON.stringify(config)).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Tra cứu công nhân theo số Căn cước
  let ccid = e.parameter.ccid;
  let sheet = ss.getSheetByName("LLV");
  let data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][3].toString().trim() === ccid.trim()) {
      let result = {
        status: "success",
        hoten: data[i][0],
        manv: data[i][1],
        machacong: data[i][2],
        phongban: data[i][4],
        bophan: data[i][5],
        chucvu: data[i][6]
      };
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "not_found" })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let requestData = JSON.parse(e.postData.contents);
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Admin cập nhật công thức / thông số tính công
  if (requestData.action === "update_config") {
    let sheet = ss.getSheetByName("CAU_HINH");
    let rows = sheet.getDataRange().getValues();
    let targetCa = requestData.loaiCa;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === targetCa) {
        sheet.getCell(i + 1, 2).setValue(requestData.gioVao);
        sheet.getCell(i + 1, 3).setValue(requestData.heSo);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", msg: "Đã cập nhật công thức tính công mới!" }));
  }
  
  // 2. Lưu dữ liệu chấm công
  if (requestData.action === "cham_cong") {
    let sheet = ss.getSheetByName("CHAM_CONG") || ss.insertSheet("CHAM_CONG");
    if (sheet.getLastRow() === 0) sheet.appendRow(["Thời gian", "Mã NV", "Họ Tên", "Loại ca trực", "Hành động"]);
    sheet.appendRow([new Date(), requestData.manv, requestData.hoten, requestData.loaiCa, requestData.type]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", msg: "Ghi nhận chấm công thành công!" }));
  }
  
  // 3. Lưu yêu cầu đổi ca trực
  if (requestData.action === "doi_ca") {
    let sheet = ss.getSheetByName("DOI_CA") || ss.insertSheet("DOI_CA");
    if (sheet.getLastRow() === 0) sheet.appendRow(["Thời gian gửi", "Mã NV xin đổi", "Họ Tên", "Ngày cần đổi", "Mã NV thay thế", "Trạng thái"]);
    sheet.appendRow([new Date(), requestData.manv, requestData.hoten, requestData.ngayDoi, requestData.maNVDoi, "Chờ duyệt"]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", msg: "Yêu cầu đổi ca đã gửi lên cấp trên!" }));
  }
}

// Hàm khởi tạo bảng cấu hình mặc định nếu chưa có tab CAU_HINH
function khoiTaoConfig(ss) {
  let sheet = ss.insertSheet("CAU_HINH");
  sheet.appendRow(["Loại ca", "Giờ vào chuẩn", "Hệ số lương/công"]);
  sheet.appendRow(["Xoay ca (Ca 1)", "06:00", 1.0]);
  sheet.appendRow(["Xoay ca (Ca 2)", "14:00", 1.0]);
  sheet.appendRow(["Xoay ca (Ca 3)", "22:00", 1.3]); // Ca đêm mặc định nhân 1.3
  sheet.appendRow(["Hành chính", "08:00", 1.0]);
  sheet.appendRow(["12H Ngày", "06:00", 1.5]);
  sheet.appendRow(["12H Đêm", "18:00", 1.8]);
  return sheet;
}
