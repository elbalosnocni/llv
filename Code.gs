/** LỊCH LÀM VIỆC - API V2
 * Chạy setupSystem('MAT_KHAU_ADMIN_MOI') một lần trong Apps Script trước khi dùng.
 */
const SPREADSHEET_ID = '1GSPgNkJGz2igyKwP4lrCB6oNiuGb8PSjPw8zrgcHMOI';
// Sheet log máy chấm công riêng; mặc định đọc tab đầu tiên. Có thể điền tên tab cụ thể nếu cần.
const ATTENDANCE_LOG_SPREADSHEET_ID = '1LshZZc_Pqf2hTq6CCC-6y69RjOPZoylYbGroaAqUrNM';
const ATTENDANCE_LOG_SHEET_NAME = ''; // Để trống = dùng tab đầu tiên trong file log.
const LOG_CODE_COL = 3; // C: Mã chấm công
const LOG_TIME_COL = 4; // D: Thời gian bấm công
const SH = {
  schedule: ['Tháng','Mã NV','Mã chấm công','Họ tên','Phòng ban','Bộ phận','Chức vụ','Ngày','Ca trực','Cập nhật lúc','Người cập nhật'],
  submissions: ['ID','Tháng','Bộ phận','Người gửi','Gửi lúc','Trạng thái','Dữ liệu JSON','Duyệt lúc','Ghi chú'],
  shifts: ['Mã ca','Tên ca','Giờ bắt đầu','Giờ kết thúc','Màu sắc','Đang sử dụng'],
  depts: ['Bộ phận','Mật khẩu','Đang sử dụng','Cập nhật lúc'],
  audit: ['Thời gian','Vai trò','Bộ phận','Hành động','Chi tiết'],
  attendance: ['Thời gian xuất','Tháng','Mã NV','Mã chấm công','Họ tên','Phòng ban','Bộ phận','Chức vụ','Ngày','Ca trực','Loại ngày đã xác nhận','Tên ngày','Giờ vào thực tế','Giờ ra thực tế','Số lần bấm','Số giờ giữa vào/ra','Hệ số tham chiếu','Trạng thái tính lương','Trạng thái đối chiếu','Chi tiết log'],
  calendar: ['Ngày','Loại ngày','Tên ngày / lý do','Lịch điều chỉnh','Đã xác nhận','Người xác nhận','Cập nhật lúc','Ghi chú'],
  employees: ['Hoten','MaNV','Machacong','SoCancuoc','Phongban','Bophan','Chucvu','Totruong']
};
function doGet(e) {
  try {
    const p=(e&&e.parameter)||{}, ss=ss_();
    if(p.action==='schedule_get') return out_(getSchedule_(ss,p.month));
    if(p.action==='calendar_get') return out_(getCalendar_(ss,p.month));
    if(p.action==='submission_status') return out_(getStatus_(ss,p.month));
    if(p.action==='get_shifts') return out_({status:'success',shifts:readShifts_(ss)});
    if(p.action==='health') return out_({status:'success',message:'LLV API V2 ready'});
    return out_({status:'error',message:'Action GET không được hỗ trợ.'});
  } catch(err){return out_({status:'error',message:String(err.message||err)});}
}
function doPost(e) {
  try {
    const b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}'), ss=ss_();
    switch(b.action){
      case 'dept_login': {const dept=verifyDept_(ss,b.department,b.password);return out_(dept?{status:'success',department:dept}:{status:'error',message:'Sai bộ phận hoặc mật khẩu.'});}
      case 'admin_login': return out_(isAdmin_(b.adminPassword)?{status:'success'}:{status:'error',message:'Mật khẩu Admin không đúng.'});
      case 'hr_login': return out_(isHr_(b.hrPassword)?{status:'success'}:{status:'error',message:'Mật khẩu HR không đúng.'});
      case 'schedule_submit': return out_(submitSchedule_(ss,b));
      case 'department_approve': return out_(approveDepartment_(ss,b));
      case 'admin_get_config': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_({status:'success',departments:readDepartments_(ss),shifts:readShifts_(ss)});
      case 'admin_get_employees': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_({status:'success',employees:readCurrentEmployees_(ss)});
      case 'admin_direct_assign': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(directAssign_(ss,b));
      case 'admin_save_department': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(saveDepartment_(ss,b));
      case 'admin_delete_department': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(deleteDepartment_(ss,b));
      case 'admin_save_shifts': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(saveShifts_(ss,b.shifts));
      case 'admin_save_calendar': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(saveCalendar_(ss,b.month,b.days,b.adminName||'ADMIN')); 
      case 'attendance_export': if(!isAdmin_(b.adminPassword)&&!isHr_(b.hrPassword))return out_(denied_());return out_(exportAttendance_(ss,b.month));
      default:return out_({status:'error',message:'Action không được hỗ trợ.'});
    }
  }catch(err){return out_({status:'error',message:String(err.message||err)});}
}
function setupSystem(adminPassword, hrPassword){
  if(!adminPassword||String(adminPassword).length<10)throw new Error('Mật khẩu Admin phải có ít nhất 10 ký tự.');
  if(!hrPassword||String(hrPassword).length<10)throw new Error('Mật khẩu HR phải có ít nhất 10 ký tự.');
  const ss=ss_(); Object.keys(SH).forEach(k=>ensure_(ss,({schedule:'LICH_THANG',submissions:'LICH_GUI_DUYET',shifts:'CA_KIP',depts:'BO_PHAN',audit:'NHAT_KY',attendance:'XUAT_CHAM_CONG',calendar:'LICH_NGAY',employees:'NHAN VIEN'})[k],SH[k]));
  const props=PropertiesService.getScriptProperties();props.setProperty('ADMIN_PASSWORD_HASH',hash_(String(adminPassword)));props.setProperty('HR_PASSWORD_HASH',hash_(String(hrPassword)));
  const shift=ss.getSheetByName('CA_KIP');if(shift.getLastRow()<2)shift.getRange(2,1,6,6).setValues([
    ['C1','Ca 1','06:00','14:00','#dcfce7',true],['C2','Ca 2','14:00','22:00','#fef3c7',true],['C3','Ca 3','22:00','06:00','#fee2e2',true],['HC','Hành chính','08:00','17:00','#dbeafe',true],['OFF','Nghỉ','00:00','00:00','#e2e8f0',true],['AL','Nghỉ phép','00:00','00:00','#f3e8ff',true]
  ]);
  Object.keys(SH).forEach(k=>{const n=({schedule:'LICH_THANG',submissions:'LICH_GUI_DUYET',shifts:'CA_KIP',depts:'BO_PHAN',audit:'NHAT_KY',attendance:'XUAT_CHAM_CONG',calendar:'LICH_NGAY',employees:'NHAN VIEN'})[k];const s=ss.getSheetByName(n);s.setFrozenRows(1);s.getRange(1,1,1,s.getLastColumn()).setFontWeight('bold');});
  return 'Khởi tạo hoàn tất. Hãy thêm bộ phận và mật khẩu trong trang admin.html.';
}
function getSchedule_(ss,month){if(!validMonth_(month))return {status:'error',message:'Tháng không hợp lệ.'};const s=ss.getSheetByName('LICH_THANG'),m={};if(s&&s.getLastRow()>=2){const v=s.getDataRange().getValues();for(let i=1;i<v.length;i++){const r=v[i];if(month_(r[0])!==month)continue;const key=String(r[2]||r[1]||r[3]);if(!m[key])m[key]={id:String(r[1]||''),maChamCong:String(r[2]||''),name:String(r[3]||''),dept:String(r[4]||''),section:String(r[5]||''),position:String(r[6]||''),shifts:{}};if(r[7]&&r[8]&&!isBlankOffShift_(r[8]))m[key].shifts[date_(r[7])]=String(r[8]);}}return {status:'success',month,employees:Object.values(m),shifts:readShifts_(ss).filter(x=>x.active),calendarDays:calendarMap_(ss,month)};}
function submitSchedule_(ss,b){const dept=verifyDept_(ss,b.department,b.password);if(!dept)return {status:'error',message:'Xác thực bộ phận thất bại.'};if(!validMonth_(b.month))return {status:'error',message:'Tháng không hợp lệ.'};if(!Array.isArray(b.employees)||!b.employees.length)return {status:'error',message:'Chưa có danh sách nhân viên.'};const list=b.employees;const errors=validateEmployees_(list,b.month,dept,readShifts_(ss));if(errors.length)return {status:'error',message:'Lịch chưa hợp lệ: '+errors.slice(0,8).join('; ')};const s=ensure_(ss,'LICH_GUI_DUYET',SH.submissions),now=new Date(),id=Utilities.getUuid();s.appendRow([id,b.month,dept,dept,now,'Chờ bộ phận duyệt',JSON.stringify(list),'','']);audit_(ss,'BỘ PHẬN',dept,'GỬI LỊCH',b.month+' / '+list.length+' nhân viên');return {status:'success',message:'Đã gửi lịch vào bước tự kiểm tra. Bộ phận cần xác nhận duyệt để công bố.',submissionId:id};}
function approveDepartment_(ss,b){
  const dept=verifyDept_(ss,b.department,b.password);
  if(!dept)return {status:'error',message:'Xác thực bộ phận thất bại.'};
  if(!validMonth_(b.month))return {status:'error',message:'Tháng không hợp lệ.'};
  const s=ss.getSheetByName('LICH_GUI_DUYET');
  if(!s||s.getLastRow()<2)return {status:'error',message:'Chưa có lịch nào được gửi. Hãy đọc file Excel rồi bấm “Gửi kiểm tra” trước.'};
  const v=s.getDataRange().getValues(), wantedMonth=String(b.month).slice(0,7), normDept=x=>String(x||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
  let idx=-1,rec=null, pendingForDept=[];
  for(let i=1;i<v.length;i++){
    const rowMonth=month_(v[i][1]), rowDept=normDept(v[i][2]), status=String(v[i][5]||'').trim().toLocaleLowerCase('vi');
    const isPending=(status==='chờ bộ phận duyệt'||status==='chờ bộ phận xác nhận'||status==='chờ xác nhận'||status==='pending');
    if(rowDept===normDept(dept) && isPending) pendingForDept.push({row:i+1,month:rowMonth,status:String(v[i][5]||'')});
    if(rowMonth===wantedMonth && rowDept===normDept(dept) && isPending){idx=i+1;rec=v[i];}
  }
  if(idx<0){
    const info=pendingForDept.length ? ' Bộ phận này đang có lịch chờ ở tháng: '+pendingForDept.map(x=>x.month).join(', ')+'. Hãy chọn đúng tháng đã gửi.' : ' Chưa tìm thấy lịch chờ của bộ phận '+dept+'. Hãy bấm “Gửi kiểm tra” lại và kiểm tra tab LICH_GUI_DUYET.';
    return {status:'error',message:'Không có bản lịch đang chờ bộ phận xác nhận cho tháng '+wantedMonth+'.'+info};
  }
  let employees=[];try{employees=JSON.parse(String(rec[6]||'[]'));}catch(e){return {status:'error',message:'Dữ liệu lịch đang chờ bị lỗi JSON tại dòng '+idx+' của tab LICH_GUI_DUYET.'};}
  const errors=validateEmployees_(employees,wantedMonth,dept,readShifts_(ss));
  if(errors.length)return {status:'error',message:'Không thể duyệt: '+errors.slice(0,8).join('; ')};
  let publishedRows=0;
  try { publishedRows=publishDept_(ss,wantedMonth,dept,employees); }
  catch(err) { return {status:'error',message:'Không thể công bố lịch vào LICH_THANG: '+String(err.message||err)}; }
  if(publishedRows<1) return {status:'error',message:'Không có ca làm việc hợp lệ để ghi vào LICH_THANG cho bộ phận '+dept+' tháng '+wantedMonth+'. Lịch chưa được đánh dấu đã duyệt. Hãy kiểm tra cột ngày 1–31 và nội dung ca trong file Excel, sau đó gửi lại lịch.'};
  s.getRange(idx,6).setValue('Đã duyệt bởi bộ phận');s.getRange(idx,8).setValue(new Date());s.getRange(idx,9).setValue('Bộ phận tự duyệt; đã ghi '+publishedRows+' dòng vào LICH_THANG');audit_(ss,'BỘ PHẬN',dept,'DUYỆT & CÔNG BỐ',wantedMonth+' / '+publishedRows+' dòng');
  return {status:'success',message:'Đã duyệt và công bố lịch của '+dept+' tháng '+wantedMonth+'. Đã ghi '+publishedRows+' dòng vào LICH_THANG.',rows:publishedRows,sheet:'LICH_THANG'};
}
function publishDept_(ss,month,dept,employees){
  const rows=[],now=new Date(),activeShifts=readShifts_(ss).filter(x=>x.active);
  employees.forEach(e=>Object.keys(e.shifts||{}).forEach(d=>{
    const raw=String(e.shifts[d]||'').trim(), resolved=resolveShift_(raw,activeShifts), shift=resolved?resolved.name:raw;
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(d)) && String(d).slice(0,7)===month && shift){
      rows.push([month,String(e.id||''),String(e.maChamCong||''),String(e.name||''),String(e.dept||''),dept,String(e.position||''),String(d),shift,now,dept]);
    }
  }));
  // Không xóa dữ liệu đang công bố nếu bản gửi không có ca hợp lệ.
  if(!rows.length) return 0;
  const s=ensure_(ss,'LICH_THANG',SH.schedule),v=s.getDataRange().getValues(),keep=[SH.schedule];
  for(let i=1;i<v.length;i++) if(month_(v[i][0])!==month || String(v[i][5]||'').trim()!==dept){
    const row=v[i].slice(0,SH.schedule.length);while(row.length<SH.schedule.length)row.push('');keep.push(row);
  }
  s.clearContents();
  s.getRange(1,1,keep.length,SH.schedule.length).setValues(keep);
  s.getRange(keep.length+1,1,rows.length,SH.schedule.length).setValues(rows);
  s.setFrozenRows(1);
  SpreadsheetApp.flush();
  return rows.length;
}

function readCurrentEmployees_(ss){
  const sh=ss.getSheetByName('NHAN VIEN'); if(!sh||sh.getLastRow()<2)return [];
  const vals=sh.getDataRange().getDisplayValues(), headers=vals[0].map(normalizeShiftKey_);
  const aliases={name:['hoten','ho ten'],id:['manv','ma nv'],clock:['machamcong','ma cham cong'],cccd:['socancuoc','so can cuoc'],dept:['phongban','phong ban'],section:['bophan','bo phan'],position:['chucvu','chuc vu'],leader:['totruong','to truong']};
  const ix={};Object.keys(aliases).forEach(k=>ix[k]=headers.findIndex(h=>aliases[k].includes(h)));
  if(ix.name<0||ix.id<0)return [];
  const out=[],seen={};for(let i=1;i<vals.length;i++){const r=vals[i],id=String(r[ix.id]||'').trim(),name=String(r[ix.name]||'').trim();if(!id||!name||seen[id])continue;seen[id]=1;out.push({id,maChamCong:ix.clock<0?'':String(r[ix.clock]||''),name,soCanCuoc:ix.cccd<0?'':String(r[ix.cccd]||''),dept:ix.dept<0?'':String(r[ix.dept]||''),section:ix.section<0?'':String(r[ix.section]||''),position:ix.position<0?'':String(r[ix.position]||''),leader:ix.leader<0?'':String(r[ix.leader]||'')});}return out;
}
function directAssign_(ss,b){
  const month=String(b.month||''),dept=String(b.department||'').trim(),items=b.assignments;
  if(!validMonth_(month))return {status:'error',message:'Tháng không hợp lệ.'};
  if(!dept||!Array.isArray(items)||!items.length)return {status:'error',message:'Chọn bộ phận và ít nhất một phân ca.'};
  const roster=readCurrentEmployees_(ss),byId={};roster.forEach(e=>byId[e.id]=e);
  const shifts=readShifts_(ss).filter(x=>x.active),shiftMap={};shifts.forEach(x=>{shiftMap[x.code.toLowerCase()]=x;shiftMap[x.name.toLowerCase()]=x;});
  const max=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate(),prepared=[],errors=[];
  items.forEach((a,i)=>{const e=byId[String(a.employeeId||'').trim()],d=String(a.date||''),raw=String(a.shift||'').trim(),sh=shiftMap[raw.toLowerCase()];if(!e)errors.push('Nhân viên không còn trong NHAN VIEN: '+a.employeeId);else if(e.section!==dept)errors.push(e.name+' không thuộc bộ phận '+dept);if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d.slice(0,7)!==month||Number(d.slice(-2))<1||Number(d.slice(-2))>max)errors.push('Ngày không hợp lệ: '+d);if(!sh)errors.push('Mã ca không hợp lệ: '+raw);if(e&&sh&&d.slice(0,7)===month)prepared.push([month,e.id,e.maChamCong,e.name,e.dept,e.section,e.position,d,sh.code,new Date(),String(b.adminName||'ADMIN')]);});
  if(errors.length)return {status:'error',message:'Không lưu lịch vì có lỗi: '+errors.slice(0,8).join('; ')};
  if(!prepared.length)return {status:'error',message:'Không có phân ca hợp lệ.'};
  const lock=LockService.getScriptLock();lock.waitLock(20000);try{const sh=ensure_(ss,'LICH_THANG',SH.schedule),old=sh.getDataRange().getValues(),replace={};prepared.forEach(r=>replace[r[1]+'|'+r[7]]=r);const keep=[SH.schedule];for(let i=1;i<old.length;i++){const r=old[i],key=String(r[1]||'')+'|'+date_(r[7]);if(month_(r[0])===month&&String(r[5]||'').trim()===dept&&replace[key])continue;keep.push(r.slice(0,SH.schedule.length));}const existing={};keep.slice(1).forEach(r=>existing[String(r[1]||'')+'|'+date_(r[7])+'|'+String(r[5]||'').trim()]=1);prepared.forEach(r=>{const key=r[1]+'|'+r[7]+'|'+dept;if(!existing[key])keep.push(r);else{for(let i=1;i<keep.length;i++)if(String(keep[i][1]||'')===r[1]&&date_(keep[i][7])===r[7]&&month_(keep[i][0])===month&&String(keep[i][5]||'').trim()===dept){keep[i]=r;break;}}});sh.clearContents();sh.getRange(1,1,keep.length,SH.schedule.length).setValues(keep);sh.setFrozenRows(1);SpreadsheetApp.flush();audit_(ss,'ADMIN',dept,'NHẬP LỊCH TRỰC TIẾP',month+' / '+prepared.length+' phân ca');return {status:'success',message:'Đã lưu '+prepared.length+' phân ca trực tiếp. Lịch tháng khác và lịch nhân viên đã nghỉ không bị xóa.',rows:prepared.length};}finally{lock.releaseLock();}
}

function normalizeShiftKey_(value){return String(value==null?'':value).trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function resolveShift_(value,shifts){
  const raw=normalizeShiftKey_(value);if(!raw)return null;
  for(const x of shifts){
    const code=normalizeShiftKey_(x.code),name=normalizeShiftKey_(x.name);
    if(raw===code||raw===name)return x;
    // Accept common schedule values "1", "2", "3" for configured names "Ca 1", "Ca 2", "Ca 3".
    const digits=raw.match(/^(?:ca\s*)?(\d+)$/),nameDigits=name.match(/^ca\s*(\d+)$/),codeDigits=code.match(/^c(\d+)$/);
    if(digits&&((nameDigits&&digits[1]===nameDigits[1])||(codeDigits&&digits[1]===codeDigits[1])))return x;
  }
  return null;
}
function validateEmployees_(list,month,dept,shifts){
  const errors=[],seenErrors={};
  function add(msg){if(!seenErrors[msg]){seenErrors[msg]=true;errors.push(msg);}}
  const active=shifts.filter(x=>x.active),ids={};
  list.forEach((e,i)=>{
    const label='Dòng '+(i+1);
    if(!String(e.name||'').trim())add(label+' thiếu họ tên');
    if(!String(e.id||e.maChamCong||'').trim())add(label+' thiếu mã nhân viên/mã chấm công');
    if(String(e.section||e.dept||'').trim()!==dept)add(label+' không thuộc bộ phận '+dept);
    const ident=String(e.maChamCong||e.id||'').trim();
    if(ids[ident])add(label+' trùng mã với dòng '+ids[ident]);ids[ident]=i+1;
    Object.keys(e.shifts||{}).forEach(d=>{
      if(!d.startsWith(month+'-'))add(label+' có ngày ngoài tháng');
      const day=Number(d.slice(-2));
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||day<1||day>new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())add(label+' có ngày không hợp lệ '+d);
      const val=String(e.shifts[d]||'').trim();
      if(val&&!resolveShift_(val,active))add(label+' dùng ca chưa cấu hình: '+val);
    });
  });
  return errors;
}
function saveDepartment_(ss,b){const dept=String(b.department||'').trim(),pw=String(b.password||'');if(!dept||!pw)return {status:'error',message:'Cần nhập tên bộ phận và mật khẩu.'};if(pw.length<6)return {status:'error',message:'Mật khẩu bộ phận tối thiểu 6 ký tự.'};const s=ensure_(ss,'BO_PHAN',SH.depts),v=s.getDataRange().getValues();let row=-1;for(let i=1;i<v.length;i++)if(String(v[i][0]).trim()===dept){row=i+1;break;}const vals=[dept,hash_(pw),true,new Date()];if(row>0)s.getRange(row,1,1,4).setValues([vals]);else s.appendRow(vals);audit_(ss,'ADMIN','', 'CẬP NHẬT BỘ PHẬN',dept);return {status:'success',message:'Đã lưu bộ phận '+dept};}
function deleteDepartment_(ss,b){const dept=String(b.department||'').trim(),s=ss.getSheetByName('BO_PHAN');if(s&&s.getLastRow()>1){const v=s.getDataRange().getValues();for(let i=v.length-1;i>=1;i--)if(String(v[i][0]).trim()===dept)s.deleteRow(i+1);}audit_(ss,'ADMIN','','NGỪNG BỘ PHẬN',dept);return {status:'success',message:'Đã xóa/ngừng bộ phận '+dept};}
function saveShifts_(ss,shifts){if(!Array.isArray(shifts))return {status:'error',message:'Danh sách ca không hợp lệ.'};const seen={};for(const x of shifts){if(!String(x.code||'').trim()||!String(x.name||'').trim())return {status:'error',message:'Mỗi ca cần mã và tên.'};const k=String(x.name).trim().toLowerCase();if(seen[k])return {status:'error',message:'Tên ca bị trùng: '+x.name};seen[k]=1;const code=String(x.code||'').trim().toUpperCase();const name=String(x.name||'').trim().toLowerCase();const isOff=['OFF','AL'].includes(code)||['nghỉ','nghi','nghỉ phép','nghi phep'].includes(name);const start=String(x.start||'').trim();const end=String(x.end||'').trim();if(isOff){if((start&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))||(end&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)))return {status:'error',message:'Nếu nhập giờ cho ca nghỉ, giờ phải theo HH:MM.'};}else if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end))return {status:'error',message:'Ca làm việc phải có giờ bắt đầu và kết thúc theo HH:MM. Ca Nghỉ/Nghỉ phép có thể để trống giờ.'};}const s=ensure_(ss,'CA_KIP',SH.shifts);s.clearContents();s.getRange(1,1,1,SH.shifts.length).setValues([SH.shifts]);if(shifts.length)s.getRange(2,1,shifts.length,6).setValues(shifts.map(x=>[x.code,x.name,x.start,x.end,x.color||'#dbeafe',x.active!==false]));s.setFrozenRows(1);audit_(ss,'ADMIN','','CẬP NHẬT CA KÍP',shifts.length+' ca');return {status:'success',message:'Đã lưu '+shifts.length+' ca kíp.'};}
function exportAttendance_(ss,month){
  if(!validMonth_(month))return {status:'error',message:'Tháng không hợp lệ.'};
  const data=getSchedule_(ss,month);if(data.status!=='success')return data;
  const logs=readAttendanceLogs_(month), shifts=readShifts_(ss), shiftMap={}, calendar=data.calendarDays||{};
  shifts.forEach(x=>{shiftMap[String(x.name||'').trim().toLowerCase()]=x;shiftMap[String(x.code||'').trim().toLowerCase()]=x;});
  const now=new Date(),rows=[];
  data.employees.forEach(e=>Object.keys(e.shifts||{}).sort().forEach(d=>{
    const shiftName=String(e.shifts[d]||'').trim(), shift=shiftMap[shiftName.toLowerCase()]||null;
    const code=normalizeClockCode_(e.maChamCong||e.id);
    const dayLogs=(logs.byCode[code]||[]);
    const pair=matchPunchesToShift_(dayLogs,d,shift);
    const day=calendar[d]||Object.assign(dayTypeInfo_('NORMAL',''),{approved:true});
    const factor=day.type==='NORMAL'?1:(day.approved?day.factor:'');
    const payNote=day.approved?day.payNote:(day.type==='NORMAL'?day.payNote:'Chưa xác nhận loại ngày; không dùng hệ số này để tính lương');
    rows.push([now,month,e.id,e.maChamCong,e.name,e.dept,e.section,e.position,d,shiftName,day.type,day.name||'',
      pair.inTime||'',pair.outTime||'',pair.count,pair.hours===null?'':pair.hours,factor,payNote,pair.status,pair.detail]);
  }));
  const s=ensure_(ss,'XUAT_CHAM_CONG',SH.attendance);s.clearContents();s.getRange(1,1,1,SH.attendance.length).setValues([SH.attendance]);
  if(rows.length){s.getRange(2,1,rows.length,SH.attendance.length).setValues(rows);s.getRange(2,13,rows.length,2).setNumberFormat('yyyy-mm-dd hh:mm:ss');s.getRange(2,16,rows.length,1).setNumberFormat('0.00');}
  audit_(ss,'HR/ADMIN','','ĐỐI CHIẾU LOG CHẤM CÔNG',month+' / '+rows.length+' dòng');
  return {status:'success',message:'Đã đối chiếu lịch với log máy chấm công và tạo bảng XUAT_CHAM_CONG.',rows:rows.length,logRows:logs.rows,sheet:'XUAT_CHAM_CONG',unmatched:logs.unmatched};
}
function readAttendanceLogs_(month){
  const out={byCode:{},rows:0,unmatched:0};
  const logSS=SpreadsheetApp.openById(ATTENDANCE_LOG_SPREADSHEET_ID);
  const sh=ATTENDANCE_LOG_SHEET_NAME?logSS.getSheetByName(ATTENDANCE_LOG_SHEET_NAME):logSS.getSheets()[0];
  if(!sh)throw new Error('Không tìm thấy tab log máy chấm công. Kiểm tra ATTENDANCE_LOG_SHEET_NAME.');
  const last=sh.getLastRow();if(last<2)return out;
  // Display values giữ nguyên số 0 đầu của mã chấm công; raw values dùng để đọc thời gian.
  const display=sh.getRange(1,1,last,Math.max(LOG_CODE_COL,LOG_TIME_COL)).getDisplayValues();
  const raw=sh.getRange(1,1,last,Math.max(LOG_CODE_COL,LOG_TIME_COL)).getValues();
  const startDate=new Date(month+'-01T00:00:00');startDate.setDate(startDate.getDate()-1);const start=Utilities.formatDate(startDate,Session.getScriptTimeZone(),'yyyy-MM-dd');const nextDate=new Date(nextMonth_(month)+'T00:00:00');nextDate.setDate(nextDate.getDate()+1);const next=Utilities.formatDate(nextDate,Session.getScriptTimeZone(),'yyyy-MM-dd');
  for(let i=1;i<last;i++){
    const code=normalizeClockCode_(display[i][LOG_CODE_COL-1]);
    const dt=parsePunchDate_(raw[i][LOG_TIME_COL-1],display[i][LOG_TIME_COL-1]);
    if(!code||!dt){out.unmatched++;continue;}
    const dateKey=Utilities.formatDate(dt,Session.getScriptTimeZone(),'yyyy-MM-dd');
    if(dateKey<start||dateKey>=next)continue;
    if(!out.byCode[code])out.byCode[code]=[];
    out.byCode[code].push(dt);out.rows++;
  }
  Object.keys(out.byCode).forEach(k=>out.byCode[k].sort((a,b)=>a-b));
  return out;
}
function matchPunchesToShift_(allLogs,dateStr,shift){
  if(!shift||isOffShift_(shift))return {inTime:'',outTime:'',count:0,hours:null,status:'Không tính công',detail:'Ca nghỉ/không tìm thấy cấu hình giờ ca'};
  const startMin=timeMinutes_(shift.start),endMin=timeMinutes_(shift.end);
  if(startMin===null||endMin===null)return {inTime:'',outTime:'',count:0,hours:null,status:'Thiếu cấu hình',detail:'Chưa cấu hình giờ bắt đầu/kết thúc ca'};
  const base=new Date(dateStr+'T00:00:00');
  const start=new Date(base.getTime()+startMin*60000),end=new Date(base.getTime()+endMin*60000);
  if(endMin<=startMin)end.setDate(end.getDate()+1); // ca qua nửa đêm
  // Cửa sổ nhận diện log: 2 giờ trước giờ vào đến 2 giờ sau giờ ra.
  const winStart=new Date(start.getTime()-2*3600000),winEnd=new Date(end.getTime()+2*3600000);
  const punches=allLogs.filter(t=>t>=winStart&&t<=winEnd);
  if(!punches.length)return {inTime:'',outTime:'',count:0,hours:null,status:'Thiếu log vào/ra',detail:'Không có log trong cửa sổ ca'};
  // Chọn log vào gần đầu ca nhất ở phía trước/đầu ca; log ra gần cuối ca nhất ở phía sau/đến cuối ca.
  let ins=punches.filter(t=>t<=new Date(start.getTime()+2*3600000));
  let outs=punches.filter(t=>t>=new Date(end.getTime()-2*3600000));
  let tin=ins.length?ins.reduce((best,t)=>Math.abs(t-start)<Math.abs(best-start)?t:best):null;
  let tout=outs.length?outs.reduce((best,t)=>Math.abs(t-end)<Math.abs(best-end)?t:best):null;
  if(tin&&tout&&tout<=tin)tout=null;
  const fmt=t=>t?Utilities.formatDate(t,Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss'):'';
  const hours=tin&&tout?Math.round(((tout-tin)/3600000)*100)/100:null;
  let status='Đủ log';if(!tin||!tout)status='Cần kiểm tra';
  const detail=(!tin?'Thiếu log vào; ':'')+(!tout?'Thiếu log ra; ':'')+(tin&&tout?'Đã ghép log gần giờ ca dự kiến':'');
  return {inTime:fmt(tin),outTime:fmt(tout),count:punches.length,hours,status,detail};
}
function parsePunchDate_(raw,display){
  if(raw instanceof Date&&!isNaN(raw.getTime()))return raw;
  if(typeof raw==='number'&&raw>0)return new Date(Math.round((raw-25569)*86400000));
  const s=String(display||raw||'').trim();if(!s)return null;
  let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0));
  const d=new Date(s);return isNaN(d.getTime())?null:d;
}
function normalizeClockCode_(v){return String(v==null?'':v).trim().replace(/\s+/g,'');}
function timeMinutes_(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;}
function isOffShift_(s){const n=String(s.name||'').trim().toLowerCase(),c=String(s.code||'').trim().toUpperCase();return c==='OFF'||c==='AL'||['nghỉ','nghi','nghỉ phép','nghi phep'].includes(n);}
function isBlankOffShift_(v){const n=normalizeShiftKey_(v);return n==='off'||n==='nghi'||n==='off day';}
function nextMonth_(m){const p=m.split('-').map(Number);return Utilities.formatDate(new Date(p[0],p[1],1),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function getCalendar_(ss,month){if(!validMonth_(month))return {status:'error',message:'Tháng không hợp lệ.'};return {status:'success',month,days:calendarMap_(ss,month)};}
function calendarMap_(ss,month){const out={};const sh=ss.getSheetByName('LICH_NGAY');if(!sh||sh.getLastRow()<2)return out;const v=sh.getDataRange().getValues();for(let i=1;i<v.length;i++){const r=v[i],d=date_(r[0]);if(!d||d.slice(0,7)!==month)continue;const type=String(r[1]||'NORMAL').trim().toUpperCase();out[d]=Object.assign(dayTypeInfo_(type,String(r[2]||'')),{date:d,type:type,name:String(r[2]||dayTypeInfo_(type,'').name),adjustment:String(r[3]||''),approved:r[4]===true||String(r[4]).toLowerCase()==='true',approvedBy:String(r[5]||''),note:String(r[7]||'')});}return out;}
function dayTypeInfo_(type,name){const t=String(type||'NORMAL').toUpperCase();const labels={NORMAL:'Ngày làm việc bình thường',WEEKLY_OFF:'Nghỉ hàng tuần',LEGAL_HOLIDAY:'Lễ/Tết theo luật',COMPANY_OFF:'Nghỉ đặc biệt công ty',COMPANY_WORKDAY:'Ngày làm bù/đổi lịch',ANNUAL_LEAVE:'Nghỉ phép năm'};let factor=1,payNote='Hệ số tham chiếu 100%; kiểm tra giờ làm thêm/ban đêm riêng';if(t==='WEEKLY_OFF'){factor=2;payNote='Tham chiếu tối thiểu 200% nếu là ngày nghỉ hàng tuần hợp lệ';}else if(t==='LEGAL_HOLIDAY'){factor=3;payNote='Tham chiếu tối thiểu 300% tiền làm thêm; tiền lương ngày lễ và điều kiện khác xét riêng';}else if(t==='COMPANY_OFF'){factor=null;payNote='Chưa tự áp hệ số: cần xác định có đồng thời là ngày nghỉ hàng tuần/ngày lễ theo luật không';}else if(t==='ANNUAL_LEAVE'){factor=null;payNote='Nghỉ phép: không tính như ca làm; xử lý tiền phép theo quy định riêng';}return {type:t,name:name||labels[t]||labels.NORMAL,factor,payNote,label:labels[t]||labels.NORMAL};}
function saveCalendar_(ss,month,days,adminName){if(!validMonth_(month)||!Array.isArray(days))return {status:'error',message:'Tháng hoặc danh sách ngày không hợp lệ.'};const max=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate(),seen={},valid=['NORMAL','WEEKLY_OFF','LEGAL_HOLIDAY','COMPANY_OFF','COMPANY_WORKDAY','ANNUAL_LEAVE'];for(const x of days){const d=String(x.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d.slice(0,7)!==month||Number(d.slice(-2))<1||Number(d.slice(-2))>max)return {status:'error',message:'Ngày không hợp lệ: '+d};if(seen[d])return {status:'error',message:'Ngày bị lặp: '+d};seen[d]=true;if(!valid.includes(String(x.type||'NORMAL').toUpperCase()))return {status:'error',message:'Loại ngày không hợp lệ: '+x.type};}const sh=ensure_(ss,'LICH_NGAY',SH.calendar),old=sh.getDataRange().getValues(),keep=[SH.calendar];for(let i=1;i<old.length;i++)if(date_(old[i][0]).slice(0,7)!==month)keep.push(old[i].slice(0,SH.calendar.length));const now=new Date();days.forEach(x=>keep.push([x.date,String(x.type||'NORMAL').toUpperCase(),String(x.name||''),String(x.adjustment||''),x.approved===true, x.approved===true?adminName:'',now,String(x.note||'')]));sh.clearContents();sh.getRange(1,1,keep.length,SH.calendar.length).setValues(keep);sh.setFrozenRows(1);audit_(ss,'ADMIN','', 'CẬP NHẬT LỊCH NGÀY',month+' / '+days.length+' ngày');return {status:'success',message:'Đã lưu '+days.length+' ngày cho '+month+'. Loại ngày được lưu riêng với ca trực.'};}
function getStatus_(ss,month){if(!validMonth_(month))return {status:'error',message:'Tháng không hợp lệ.'};const s=ss.getSheetByName('LICH_GUI_DUYET');if(!s||s.getLastRow()<2)return {status:'success',submissions:[]};return {status:'success',submissions:s.getDataRange().getValues().slice(1).filter(r=>String(r[1])===month).map(r=>({month:r[1],department:r[2],submittedAt:r[4],status:r[5]}))};}
function readDepartments_(ss){const s=ss.getSheetByName('BO_PHAN');if(!s||s.getLastRow()<2)return [];return s.getDataRange().getValues().slice(1).filter(r=>r[0]&&r[2]!==false).map(r=>({department:String(r[0]),active:r[2]!==false}));}
function readShifts_(ss){const s=ss.getSheetByName('CA_KIP');if(!s||s.getLastRow()<2)return [];return s.getDataRange().getValues().slice(1).filter(r=>r[0]&&r[1]).map(r=>({code:String(r[0]),name:String(r[1]),start:String(r[2]),end:String(r[3]),color:String(r[4]||'#dbeafe'),active:r[5]!==false}));}
function verifyDept_(ss,dept,pw){const s=ss.getSheetByName('BO_PHAN');if(!s||!dept||!pw)return '';const v=s.getDataRange().getValues(),h=hash_(String(pw));for(let i=1;i<v.length;i++)if(String(v[i][0]).trim()===String(dept).trim()&&v[i][2]!==false&&String(v[i][1])===h)return String(v[i][0]).trim();return '';}
function isAdmin_(pw){const h=PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH');return !!h&&hash_(String(pw||''))===h;}
function isHr_(pw){const h=PropertiesService.getScriptProperties().getProperty('HR_PASSWORD_HASH');return !!h&&hash_(String(pw||''))===h;}
function hash_(s){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8);return bytes.map(b=>(b+256).toString(16).slice(-2)).join('');}
function audit_(ss,role,dept,action,detail){ensure_(ss,'NHAT_KY',SH.audit).appendRow([new Date(),role,dept,action,detail]);}
function ss_(){return SpreadsheetApp.openById(SPREADSHEET_ID)}
function ensure_(ss,name,headers){let s=ss.getSheetByName(name);if(!s)s=ss.insertSheet(name);if(s.getLastRow()===0||s.getRange(1,1).getValue()===''){s.getRange(1,1,1,headers.length).setValues([headers]);}else{const current=s.getRange(1,1,1,Math.max(1,s.getLastColumn())).getDisplayValues()[0];if(current.length<headers.length)s.getRange(1,1,1,headers.length).setValues([headers]);}s.setFrozenRows(1);return s;}
function validMonth_(m){return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m||''))}
function month_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM');return String(v||'').slice(0,7)}
function date_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');return String(v||'').slice(0,10)}
function out_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function denied_(){return {status:'error',message:'Không có quyền Admin.'}}
