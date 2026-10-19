const SPREADSHEET_ID = '1GSPgNkJGz2igyKwP4lrCB6oNiuGb8PSjPw8zrgcHMOI';
const SCHEDULE_HEADERS = ['Tháng','Mã NV','Mã chấm công','Họ tên','Phòng ban','Bộ phận','Chức vụ','Ngày','Ca trực','Cập nhật lúc'];
const SUBMISSION_HEADERS = ['ID','Tháng','Phòng ban','Người gửi','Gửi lúc','Trạng thái','Dữ liệu JSON','Duyệt lúc','Người duyệt'];

function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID), p = (e && e.parameter) || {};
  if (p.action === 'schedule_get') return json_(getSchedule_(ss, p.month));
  if (p.action === 'submission_status') return json_(getSubmissionStatus_(ss, p.month));
  if (p.action === 'get_config') {
    const sh = ss.getSheetByName('CAU_HINH') || khoiTaoConfig(ss), data = sh.getDataRange().getValues(), config = {};
    for (let i = 1; i < data.length; i++) config[data[i][0]] = { gioVao: data[i][1], heSo: data[i][2] };
    return json_(config);
  }
  const ccid = String(p.ccid || '').trim(), sh = ss.getSheetByName('LLV');
  if (!sh || !ccid) return json_({status:'not_found'});
  const data = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) if (String(data[i][3] || '').trim() === ccid) return json_({status:'success',hoten:data[i][0],manv:data[i][1],machacong:data[i][2],phongban:data[i][4],bophan:data[i][5],chucvu:data[i][6]});
  return json_({status:'not_found'});
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (body.action === 'schedule_submit') return json_(submitSchedule_(ss, body));
    if (body.action === 'schedule_publish') return json_(publishSchedule_(ss, body));
    if (body.action === 'schedule_save') return json_(saveSchedule_(ss, body)); // Tương thích API cũ; chỉ Admin được dùng.
    if (body.action === 'update_config') {
      if (!isAdmin_(body.adminToken)) return json_({status:'error',message:'Không có quyền quản trị.'});
      const sh = ss.getSheetByName('CAU_HINH'); if (!sh) return json_({status:'error',message:'Chưa có sheet CAU_HINH.'});
      const rows = sh.getDataRange().getValues(); let found = false;
      for (let i=1;i<rows.length;i++) if (rows[i][0] === body.loaiCa) { sh.getRange(i+1,2,1,2).setValues([[body.gioVao,body.heSo]]); found=true; break; }
      if (!found) sh.appendRow([body.loaiCa,body.gioVao,body.heSo]);
      return json_({status:'success',msg:'Đã cập nhật cấu hình.'});
    }
    if (body.action === 'cham_cong') {
      const sh = ss.getSheetByName('CHAM_CONG') || ss.insertSheet('CHAM_CONG');
      if (sh.getLastRow() === 0) sh.appendRow(['Thời gian','Mã chấm công','Mã NV','Họ Tên','Loại ca trực','Hành động']);
      sh.appendRow([new Date(),body.machacong||body.maChamCong||'',body.manv||'',body.hoten||'',body.loaiCa||'',body.type||'']);
      return json_({status:'success',msg:'Ghi nhận chấm công thành công.'});
    }
    if (body.action === 'doi_ca') {
      const sh = ss.getSheetByName('DOI_CA') || ss.insertSheet('DOI_CA');
      if (sh.getLastRow() === 0) sh.appendRow(['Thời gian gửi','Mã chấm công xin đổi','Mã NV xin đổi','Họ Tên','Ngày cần đổi','Mã chấm công thay thế','Mã NV thay thế','Trạng thái']);
      sh.appendRow([new Date(),body.machacong||body.maChamCong||'',body.manv||'',body.hoten||'',body.ngayDoi||'',body.maChamCongDoi||'',body.maNVDoi||'','Chờ duyệt']);
      return json_({status:'success',msg:'Yêu cầu đổi ca đã gửi.'});
    }
    return json_({status:'error',message:'Action không được hỗ trợ.'});
  } catch (err) { return json_({status:'error',message:String(err && err.message || err)}); }
}

function getSchedule_(ss, month) {
  if (!validMonth_(month)) return {status:'error',message:'Tháng không hợp lệ.'};
  const sh = ss.getSheetByName('LICH_THANG'); if (!sh || sh.getLastRow() < 2) return {status:'success',month:month,employees:[]};
  const values = sh.getDataRange().getValues(), map = {};
  for (let i=1;i<values.length;i++) {
    const r=values[i]; if (monthText_(r[0]) !== month) continue;
    const id=String(r[1]||''), clock=String(r[2]||''), name=String(r[3]||''), dept=String(r[4]||''), section=String(r[5]||''), pos=String(r[6]||'');
    const key=clock || id || (name+'|'+dept); if (!map[key]) map[key]={id:id,maChamCong:clock,name:name,dept:dept,section:section,position:pos,shifts:{}};
    if (r[7] && r[8]) map[key].shifts[dateText_(r[7])]=String(r[8]);
  }
  return {status:'success',month:month,employees:Object.keys(map).map(k=>map[k])};
}

function submitSchedule_(ss, body) {
  const month=String(body.month||''), token=String(body.departmentToken||'').trim();
  if (!validMonth_(month)) return {status:'error',message:'Tháng không hợp lệ.'};
  if (!Array.isArray(body.employees) || !body.employees.length) return {status:'error',message:'Danh sách lịch trống. Hãy tải Excel hoặc tải lịch tháng trước khi gửi.'};
  const department = authorizedDepartment_(token);
  if (!department) return {status:'error',message:'Mã bộ phận không đúng hoặc chưa cấu hình DEPT_TOKENS.'};
  const rows = body.employees.filter(e => normalize_(e.dept) === department);
  if (!rows.length) return {status:'error',message:'Không có nhân viên thuộc bộ phận được cấp mã: '+department+'. Không gửi dữ liệu bộ phận khác.'};
  const bad = rows.find(e => !normalize_(e.name) || (!normalize_(e.id) && !normalize_(e.maChamCong)));
  if (bad) return {status:'error',message:'Có nhân viên thiếu họ tên hoặc cả Mã NV và Mã chấm công. Vui lòng kiểm tra trước khi gửi.'};
  const sh = ensureSheet_(ss,'LICH_GUI_DUYET',SUBMISSION_HEADERS);
  const now = new Date(), id = Utilities.getUuid();
  sh.appendRow([id,month,department,department,now,'Chờ duyệt',JSON.stringify(rows), '', '']);
  return {status:'success',message:'Đã gửi lịch '+month+' của '+department+' lên tổng hợp ('+rows.length+' nhân viên). Lịch chỉ hiển thị cho công nhân sau khi Admin duyệt.',submissionId:id,department:department,count:rows.length};
}

function publishSchedule_(ss, body) {
  if (!isAdmin_(body.adminToken)) return {status:'error',message:'Mã quản trị không đúng hoặc chưa được cấu hình.'};
  const month=String(body.month||''); if (!validMonth_(month)) return {status:'error',message:'Tháng không hợp lệ.'};
  const sub=ss.getSheetByName('LICH_GUI_DUYET'); if (!sub || sub.getLastRow()<2) return {status:'error',message:'Chưa có lịch bộ phận gửi duyệt.'};
  const data=sub.getDataRange().getValues(), latestByDept={};
  for(let i=1;i<data.length;i++) if(String(data[i][1])===month && String(data[i][5])==='Chờ duyệt') latestByDept[String(data[i][2])] = {row:i+1,id:data[i][0],dept:String(data[i][2]),employees:JSON.parse(String(data[i][6]||'[]'))};
  const selected=Object.keys(latestByDept).map(dept=>latestByDept[dept]);
  if(!selected.length) return {status:'error',message:'Không có lịch đang chờ duyệt cho tháng '+month+'.'};
  // Nếu một bộ phận gửi nhiều lần, chỉ lấy bản mới nhất và đánh dấu các bản cũ đã bị thay thế.
  const latestRows=new Set(selected.map(x=>x.row));
  for(let i=1;i<data.length;i++) if(String(data[i][1])===month && String(data[i][5])==='Chờ duyệt' && !latestRows.has(i+1)) sub.getRange(i+1,6).setValue('Bị thay thế bởi bản gửi mới hơn');
  const schedule=ensureSheet_(ss,'LICH_THANG',SCHEDULE_HEADERS), old=schedule.getLastRow()>=2?schedule.getDataRange().getValues():[SCHEDULE_HEADERS];
  const replaceDepts=new Set(selected.map(x=>x.dept)), kept=[SCHEDULE_HEADERS];
  for(let i=1;i<old.length;i++) if(monthText_(old[i][0])!==month || !replaceDepts.has(String(old[i][4]||''))) kept.push(old[i]);
  if(schedule.getLastRow()>0) schedule.clearContents();
  schedule.getRange(1,1,kept.length,SCHEDULE_HEADERS.length).setValues(kept);
  const now=new Date(), output=[];
  selected.forEach(s=>s.employees.forEach(e=>Object.keys(e.shifts||{}).forEach(date=>{
    if(date.startsWith(month+'-') && String(e.shifts[date]||'')) output.push([month,String(e.id||''),String(e.maChamCong||e.machacong||''),String(e.name||''),String(e.dept||s.dept),String(e.section||''),String(e.position||''),date,String(e.shifts[date]),now]);
  })));
  if(output.length) schedule.getRange(schedule.getLastRow()+1,1,output.length,SCHEDULE_HEADERS.length).setValues(output);
  selected.forEach(s=>{sub.getRange(s.row,6).setValue('Đã duyệt');sub.getRange(s.row,8).setValue(now);sub.getRange(s.row,9).setValue('Admin');});
  formatSchedule_(schedule);
  return {status:'success',message:'Đã công bố lịch '+month+' cho '+[...replaceDepts].join(', ')+'. Nhân viên có thể tra cứu lịch chính thức.',departments:[...replaceDepts],rows:output.length};
}

function getSubmissionStatus_(ss, month) {
  if (!validMonth_(month)) return {status:'error',message:'Tháng không hợp lệ.'};
  const sh=ss.getSheetByName('LICH_GUI_DUYET'); if(!sh||sh.getLastRow()<2) return {status:'success',submissions:[]};
  const v=sh.getDataRange().getValues(), submissions=[];
  for(let i=1;i<v.length;i++) if(String(v[i][1])===month) submissions.push({month:String(v[i][1]),department:String(v[i][2]),submittedAt:v[i][4],status:String(v[i][5])});
  return {status:'success',submissions:submissions};
}

// API cũ: chỉ Admin được thay toàn bộ lịch tháng.
function saveSchedule_(ss, body) {
  if (!isAdmin_(body.adminToken)) return {status:'error',message:'Mã quản trị không đúng hoặc chưa được cấu hình.'};
  const month=String(body.month||''); if (!validMonth_(month)) return {status:'error',message:'Tháng không hợp lệ.'};
  if (!Array.isArray(body.employees)) return {status:'error',message:'Danh sách nhân viên không hợp lệ.'};
  const sh=ensureSheet_(ss,'LICH_THANG',SCHEDULE_HEADERS), last=sh.getLastRow();
  if(last>=2){const months=sh.getRange(2,1,last-1,1).getDisplayValues();for(let i=months.length-1;i>=0;i--)if(monthText_(months[i][0])===month)sh.deleteRow(i+2);}
  const rows=[],now=new Date(); body.employees.forEach(e=>Object.keys(e.shifts||{}).forEach(date=>{if(date.startsWith(month+'-')&&String(e.shifts[date]||''))rows.push([month,String(e.id||''),String(e.maChamCong||e.machacong||''),String(e.name||''),String(e.dept||''),String(e.section||''),String(e.position||''),date,String(e.shifts[date]),now]);}));
  if(rows.length)sh.getRange(sh.getLastRow()+1,1,rows.length,SCHEDULE_HEADERS.length).setValues(rows); formatSchedule_(sh);
  return {status:'success',message:'Đã lưu lịch tháng '+month+' ('+rows.length+' ca trực).',rows:rows.length};
}
function authorizedDepartment_(token) { const raw=PropertiesService.getScriptProperties().getProperty('DEPT_TOKENS'); if(!raw)return ''; try {const map=JSON.parse(raw);for(const dept in map)if(String(map[dept])===token)return dept;}catch(e){} return ''; }
function isAdmin_(token) { const expected=PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN'); return !!expected && String(token||'')===expected; }
function ensureSheet_(ss,name,headers){let sh=ss.getSheetByName(name)||ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers);else if(sh.getLastRow()===1&&sh.getRange(1,1).getValue()==='')sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);return sh;}
function formatSchedule_(sh){sh.setFrozenRows(1);sh.getRange(1,1,1,SCHEDULE_HEADERS.length).setFontWeight('bold');}
function validMonth_(m){return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m||''));}
function monthText_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM');return String(v||'').slice(0,7);}
function dateText_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');return String(v||'').slice(0,10);}
function normalize_(v){return String(v==null?'':v).trim();}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function khoiTaoConfig(ss) { const sh=ss.insertSheet('CAU_HINH'); sh.appendRow(['Loại ca','Giờ vào chuẩn','Hệ số lương/công']); sh.appendRow(['Xoay ca (Ca 1)','06:00',1]); sh.appendRow(['Xoay ca (Ca 2)','14:00',1]); sh.appendRow(['Xoay ca (Ca 3)','22:00',1]); sh.appendRow(['Hành chính','08:00',1]); sh.appendRow(['12H Ngày','06:00',1.5]); sh.appendRow(['12H Đêm','18:00',1.8]); return sh; }
