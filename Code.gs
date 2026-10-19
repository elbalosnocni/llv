const SPREADSHEET_ID = "1GSPgNkJGz2igyKwP4lrCB6oNiuGb8PSjPw8zrgcHMOI";

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const p = (e && e.parameter) || {};
  if (p.action === "schedule_get") return json_(getSchedule_(ss, p.month));
  if (p.action === "get_config") {
    const sh = ss.getSheetByName("CAU_HINH") || khoiTaoConfig(ss), data = sh.getDataRange().getValues(), config = {};
    for (let i = 1; i < data.length; i++) config[data[i][0]] = { gioVao: data[i][1], heSo: data[i][2] };
    return json_(config);
  }
  // Tra cuu nhan vien bang CCCD; giu nguyen API cu.
  const ccid = String(p.ccid || "").trim(), sh = ss.getSheetByName("LLV");
  if (!sh || !ccid) return json_({status:"not_found"});
  const data = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3] || "").trim() === ccid) return json_({status:"success",hoten:data[i][0],manv:data[i][1],machacong:data[i][2],phongban:data[i][4],bophan:data[i][5],chucvu:data[i][6]});
  }
  return json_({status:"not_found"});
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (body.action === "schedule_save") return json_(saveSchedule_(ss, body));
    if (body.action === "update_config") {
      if (!isAdmin_(body.adminToken)) return json_({status:"error",message:"Không có quyền quản trị."});
      const sh = ss.getSheetByName("CAU_HINH"); if (!sh) return json_({status:"error",message:"Chưa có sheet CAU_HINH."});
      const rows = sh.getDataRange().getValues();
      for (let i=1;i<rows.length;i++) if (rows[i][0] === body.loaiCa) { sh.getRange(i+1,2).setValue(body.gioVao); sh.getRange(i+1,3).setValue(body.heSo); break; }
      return json_({status:"success",msg:"Đã cập nhật cấu hình."});
    }
    if (body.action === "cham_cong") {
      const sh = ss.getSheetByName("CHAM_CONG") || ss.insertSheet("CHAM_CONG");
      if (sh.getLastRow() === 0) sh.appendRow(["Thời gian","Mã chấm công","Mã NV","Họ Tên","Loại ca trực","Hành động"]);
      // Ma cham cong la khoa doi soat voi may cham cong; khong dung Ma NV lam khoa.
      sh.appendRow([new Date(), body.machacong || body.maChamCong || "", body.manv || "", body.hoten || "", body.loaiCa || "", body.type || ""]);
      return json_({status:"success",msg:"Ghi nhận chấm công thành công."});
    }
    if (body.action === "doi_ca") {
      const sh = ss.getSheetByName("DOI_CA") || ss.insertSheet("DOI_CA");
      if (sh.getLastRow() === 0) sh.appendRow(["Thời gian gửi","Mã chấm công xin đổi","Mã NV xin đổi","Họ Tên","Ngày cần đổi","Mã chấm công thay thế","Mã NV thay thế","Trạng thái"]);
      sh.appendRow([new Date(),body.machacong||body.maChamCong||"",body.manv||"",body.hoten||"",body.ngayDoi||"",body.maChamCongDoi||"",body.maNVDoi||"","Chờ duyệt"]);
      return json_({status:"success",msg:"Yêu cầu đổi ca đã gửi."});
    }
    return json_({status:"error",message:"Action không được hỗ trợ."});
  } catch (err) { return json_({status:"error",message:String(err && err.message || err)}); }
}

function getSchedule_(ss, month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return {status:"error",message:"Tháng không hợp lệ."};
  const sh = ss.getSheetByName("LICH_THANG"); if (!sh || sh.getLastRow() < 2) return {status:"success",month:month,employees:[]};
  const values = sh.getDataRange().getValues(), map = {};
  for (let i=1;i<values.length;i++) {
    const r=values[i]; if (String(r[0]) !== month) continue;
    const id=String(r[1]||"");
    const key=id || String(r[2]||"") || String(r[3]||"");
    if (!map[key]) map[key]={id:id,maChamCong:String(r[2]||""),name:String(r[3]||""),dept:String(r[4]||""),section:String(r[5]||""),position:String(r[6]||""),shifts:{}};
    if (r[7] && r[8]) map[key].shifts[String(r[7])]=String(r[8]);
  }
  return {status:"success",month:month,employees:Object.keys(map).map(k=>map[k])};
}

function saveSchedule_(ss, body) {
  if (!isAdmin_(body.adminToken)) return {status:"error",message:"Mã quản trị không đúng hoặc chưa được cấu hình."};
  const month=String(body.month||""); if (!/^\d{4}-\d{2}$/.test(month)) return {status:"error",message:"Tháng không hợp lệ."};
  if (!Array.isArray(body.employees)) return {status:"error",message:"Danh sách nhân viên không hợp lệ."};
  const sh=ss.getSheetByName("LICH_THANG")||ss.insertSheet("LICH_THANG");
  const headers=["Tháng","Mã NV","Mã chấm công","Họ tên","Phòng ban","Bộ phận","Chức vụ","Ngày","Ca trực","Cập nhật lúc"];
  if (sh.getLastRow()===0) sh.appendRow(headers);
  else if (sh.getLastRow()===1 && sh.getRange(1,1).getValue()==="") sh.getRange(1,1,1,headers.length).setValues([headers]);
  const last=sh.getLastRow();
  if (last>=2) {
    const months=sh.getRange(2,1,last-1,1).getDisplayValues();
    for(let i=months.length-1;i>=0;i--) if(String(months[i][0])===month) sh.deleteRow(i+2);
  }
  const rows=[], now=new Date();
  body.employees.forEach(e=>{
    const shifts=e.shifts||{};
    Object.keys(shifts).forEach(date=>{ if(date.indexOf(month+'-')===0) rows.push([month,String(e.id||""),String(e.maChamCong||e.machacong||""),String(e.name||""),String(e.dept||""),String(e.section||""),String(e.position||""),date,String(shifts[date]||""),now]); });
  });
  if(rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,headers.length).setValues(rows);
  sh.setFrozenRows(1); sh.getRange(1,1,1,headers.length).setFontWeight("bold");
  return {status:"success",message:"Đã lưu lịch tháng "+month+" lên Google Sheets ("+rows.length+" ô ca trực).",rows:rows.length};
}
function isAdmin_(token) { const expected=PropertiesService.getScriptProperties().getProperty("ADMIN_TOKEN"); return !!expected && String(token||"")===expected; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function khoiTaoConfig(ss) {
  const sh=ss.insertSheet("CAU_HINH"); sh.appendRow(["Loại ca","Giờ vào chuẩn","Hệ số lương/công"]); sh.appendRow(["Xoay ca (Ca 1)","06:00",1]); sh.appendRow(["Xoay ca (Ca 2)","14:00",1]); sh.appendRow(["Xoay ca (Ca 3)","22:00",1.3]); sh.appendRow(["Hành chính","08:00",1]); sh.appendRow(["12H Ngày","06:00",1.5]); sh.appendRow(["12H Đêm","18:00",1.8]); return sh;
}
