/** LỊCH LÀM VIỆC - API V2
 * Chạy setupSystem('MAT_KHAU_ADMIN_MOI') một lần trong Apps Script trước khi dùng.
 */
const SPREADSHEET_ID = '1GSPgNkJGz2igyKwP4lrCB6oNiuGb8PSjPw8zrgcHMOI';
const SH = {
  schedule: ['Tháng','Mã NV','Mã chấm công','Họ tên','Phòng ban','Bộ phận','Chức vụ','Ngày','Ca trực','Cập nhật lúc','Người cập nhật'],
  submissions: ['ID','Tháng','Bộ phận','Người gửi','Gửi lúc','Trạng thái','Dữ liệu JSON','Duyệt lúc','Ghi chú'],
  shifts: ['Mã ca','Tên ca','Giờ bắt đầu','Giờ kết thúc','Màu sắc','Đang sử dụng'],
  depts: ['Bộ phận','Mật khẩu','Đang sử dụng','Cập nhật lúc'],
  audit: ['Thời gian','Vai trò','Bộ phận','Hành động','Chi tiết'],
  attendance: ['Thời gian xuất','Tháng','Mã NV','Mã chấm công','Họ tên','Phòng ban','Bộ phận','Chức vụ','Ngày','Ca trực']
};
function doGet(e) {
  try {
    const p=(e&&e.parameter)||{}, ss=ss_();
    if(p.action==='schedule_get') return out_(getSchedule_(ss,p.month));
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
      case 'admin_save_department': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(saveDepartment_(ss,b));
      case 'admin_delete_department': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(deleteDepartment_(ss,b));
      case 'admin_save_shifts': if(!isAdmin_(b.adminPassword))return out_(denied_());return out_(saveShifts_(ss,b.shifts));
      case 'attendance_export': if(!isAdmin_(b.adminPassword)&&!isHr_(b.hrPassword))return out_(denied_());return out_(exportAttendance_(ss,b.month));
      default:return out_({status:'error',message:'Action không được hỗ trợ.'});
    }
  }catch(err){return out_({status:'error',message:String(err.message||err)});}
}
function setupSystem(adminPassword, hrPassword){
  if(!adminPassword||String(adminPassword).length<10)throw new Error('Mật khẩu Admin phải có ít nhất 10 ký tự.');
  if(!hrPassword||String(hrPassword).length<10)throw new Error('Mật khẩu HR phải có ít nhất 10 ký tự.');
  const ss=ss_(); Object.keys(SH).forEach(k=>ensure_(ss,({schedule:'LICH_THANG',submissions:'LICH_GUI_DUYET',shifts:'CA_KIP',depts:'BO_PHAN',audit:'NHAT_KY',attendance:'XUAT_CHAM_CONG'})[k],SH[k]));
  const props=PropertiesService.getScriptProperties();props.setProperty('ADMIN_PASSWORD_HASH',hash_(String(adminPassword)));props.setProperty('HR_PASSWORD_HASH',hash_(String(hrPassword)));
  const shift=ss.getSheetByName('CA_KIP');if(shift.getLastRow()<2)shift.getRange(2,1,6,6).setValues([
    ['C1','Ca 1','06:00','14:00','#dcfce7',true],['C2','Ca 2','14:00','22:00','#fef3c7',true],['C3','Ca 3','22:00','06:00','#fee2e2',true],['HC','Hành chính','08:00','17:00','#dbeafe',true],['OFF','Nghỉ','00:00','00:00','#e2e8f0',true],['AL','Nghỉ phép','00:00','00:00','#f3e8ff',true]
  ]);
  Object.keys(SH).forEach(k=>{const n=({schedule:'LICH_THANG',submissions:'LICH_GUI_DUYET',shifts:'CA_KIP',depts:'BO_PHAN',audit:'NHAT_KY',attendance:'XUAT_CHAM_CONG'})[k];const s=ss.getSheetByName(n);s.setFrozenRows(1);s.getRange(1,1,1,s.getLastColumn()).setFontWeight('bold');});
  return 'Khởi tạo hoàn tất. Hãy thêm bộ phận và mật khẩu trong trang admin.html.';
}
function getSchedule_(ss,month){if(!validMonth_(month))return {status:'error',message:'Tháng không hợp lệ.'};const s=ss.getSheetByName('LICH_THANG');if(!s||s.getLastRow()<2)return {status:'success',month,employees:[]};const v=s.getDataRange().getValues(),m={};for(let i=1;i<v.length;i++){const r=v[i];if(month_(r[0])!==month)continue;const key=String(r[2]||r[1]||r[3]);if(!m[key])m[key]={id:String(r[1]||''),maChamCong:String(r[2]||''),name:String(r[3]||''),dept:String(r[4]||''),section:String(r[5]||''),position:String(r[6]||''),shifts:{}};if(r[7]&&r[8])m[key].shifts[date_(r[7])]=String(r[8]);}return {status:'success',month,employees:Object.values(m)};}
function submitSchedule_(ss,b){const dept=verifyDept_(ss,b.department,b.password);if(!dept)return {status:'error',message:'Xác thực bộ phận thất bại.'};if(!validMonth_(b.month))return {status:'error',message:'Tháng không hợp lệ.'};if(!Array.isArray(b.employees)||!b.employees.length)return {status:'error',message:'Chưa có danh sách nhân viên.'};const list=b.employees;const errors=validateEmployees_(list,b.month,dept,readShifts_(ss));if(errors.length)return {status:'error',message:'Lịch chưa hợp lệ: '+errors.slice(0,8).join('; ')};const s=ensure_(ss,'LICH_GUI_DUYET',SH.submissions),now=new Date(),id=Utilities.getUuid();s.appendRow([id,b.month,dept,dept,now,'Chờ bộ phận duyệt',JSON.stringify(list),'','']);audit_(ss,'BỘ PHẬN',dept,'GỬI LỊCH',b.month+' / '+list.length+' nhân viên');return {status:'success',message:'Đã gửi lịch vào bước tự kiểm tra. Bộ phận cần xác nhận duyệt để công bố.',submissionId:id};}
function approveDepartment_(ss,b){const dept=verifyDept_(ss,b.department,b.password);if(!dept)return {status:'error',message:'Xác thực bộ phận thất bại.'};if(!validMonth_(b.month))return {status:'error',message:'Tháng không hợp lệ.'};const s=ss.getSheetByName('LICH_GUI_DUYET');if(!s||s.getLastRow()<2)return {status:'error',message:'Không có lịch chờ duyệt.'};const v=s.getDataRange().getValues();let idx=-1,rec=null;for(let i=1;i<v.length;i++)if(String(v[i][1])===b.month&&String(v[i][2])===dept&&String(v[i][5])==='Chờ bộ phận duyệt'){idx=i+1;rec=v[i];}if(idx<0)return {status:'error',message:'Không có bản lịch đang chờ bộ phận xác nhận.'};const employees=JSON.parse(String(rec[6]||'[]')),errors=validateEmployees_(employees,b.month,dept,readShifts_(ss));if(errors.length)return {status:'error',message:'Không thể duyệt: '+errors.slice(0,8).join('; ')};publishDept_(ss,b.month,dept,employees);s.getRange(idx,6).setValue('Đã duyệt bởi bộ phận');s.getRange(idx,8).setValue(new Date());s.getRange(idx,9).setValue('Bộ phận tự duyệt');audit_(ss,'BỘ PHẬN',dept,'DUYỆT & CÔNG BỐ',b.month);return {status:'success',message:'Đã duyệt và công bố lịch của '+dept+' tháng '+b.month+'.'};}
function publishDept_(ss,month,dept,employees){const s=ensure_(ss,'LICH_THANG',SH.schedule),v=s.getDataRange().getValues(),keep=[SH.schedule];for(let i=1;i<v.length;i++)if(month_(v[i][0])!==month||String(v[i][5]||'')!==dept){const row=v[i].slice(0,SH.schedule.length);while(row.length<SH.schedule.length)row.push('');keep.push(row);}s.clearContents();s.getRange(1,1,keep.length,SH.schedule.length).setValues(keep);const now=new Date(),rows=[];employees.forEach(e=>Object.keys(e.shifts||{}).forEach(d=>{const shift=String(e.shifts[d]||'').trim();if(d.startsWith(month+'-')&&shift)rows.push([month,String(e.id||''),String(e.maChamCong||''),String(e.name||''),String(e.dept||''),dept,String(e.position||''),d,shift,now,dept]);}));if(rows.length)s.getRange(s.getLastRow()+1,1,rows.length,SH.schedule.length).setValues(rows);s.setFrozenRows(1);}
function validateEmployees_(list,month,dept,shifts){const errors=[],known={};shifts.filter(x=>x.active).forEach(x=>known[x.name.toLowerCase()]=true);const ids={};list.forEach((e,i)=>{const label='Dòng '+(i+1);if(!String(e.name||'').trim())errors.push(label+' thiếu họ tên');if(!String(e.id||e.maChamCong||'').trim())errors.push(label+' thiếu mã nhân viên/mã chấm công');if(String(e.section||e.dept||'').trim()!==dept)errors.push(label+' không thuộc bộ phận '+dept);const ident=String(e.maChamCong||e.id||'').trim();if(ids[ident])errors.push(label+' trùng mã với dòng '+ids[ident]);ids[ident]=i+1;Object.keys(e.shifts||{}).forEach(d=>{if(!d.startsWith(month+'-'))errors.push(label+' có ngày ngoài tháng');const day=Number(d.slice(-2));if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||day<1||day>new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())errors.push(label+' có ngày không hợp lệ '+d);const val=String(e.shifts[d]||'').trim();if(val&&!known[val.toLowerCase()])errors.push(label+' dùng ca chưa cấu hình: '+val);});});return errors;}
function saveDepartment_(ss,b){const dept=String(b.department||'').trim(),pw=String(b.password||'');if(!dept||!pw)return {status:'error',message:'Cần nhập tên bộ phận và mật khẩu.'};if(pw.length<6)return {status:'error',message:'Mật khẩu bộ phận tối thiểu 6 ký tự.'};const s=ensure_(ss,'BO_PHAN',SH.depts),v=s.getDataRange().getValues();let row=-1;for(let i=1;i<v.length;i++)if(String(v[i][0]).trim()===dept){row=i+1;break;}const vals=[dept,hash_(pw),true,new Date()];if(row>0)s.getRange(row,1,1,4).setValues([vals]);else s.appendRow(vals);audit_(ss,'ADMIN','', 'CẬP NHẬT BỘ PHẬN',dept);return {status:'success',message:'Đã lưu bộ phận '+dept};}
function deleteDepartment_(ss,b){const dept=String(b.department||'').trim(),s=ss.getSheetByName('BO_PHAN');if(s&&s.getLastRow()>1){const v=s.getDataRange().getValues();for(let i=v.length-1;i>=1;i--)if(String(v[i][0]).trim()===dept)s.deleteRow(i+1);}audit_(ss,'ADMIN','','NGỪNG BỘ PHẬN',dept);return {status:'success',message:'Đã xóa/ngừng bộ phận '+dept};}
function saveShifts_(ss,shifts){if(!Array.isArray(shifts))return {status:'error',message:'Danh sách ca không hợp lệ.'};const seen={};for(const x of shifts){if(!String(x.code||'').trim()||!String(x.name||'').trim())return {status:'error',message:'Mỗi ca cần mã và tên.'};const k=String(x.name).trim().toLowerCase();if(seen[k])return {status:'error',message:'Tên ca bị trùng: '+x.name};seen[k]=1;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.end))return {status:'error',message:'Giờ ca phải theo HH:MM.'};}const s=ensure_(ss,'CA_KIP',SH.shifts);s.clearContents();s.getRange(1,1,1,SH.shifts.length).setValues([SH.shifts]);if(shifts.length)s.getRange(2,1,shifts.length,6).setValues(shifts.map(x=>[x.code,x.name,x.start,x.end,x.color||'#dbeafe',x.active!==false]));s.setFrozenRows(1);audit_(ss,'ADMIN','','CẬP NHẬT CA KÍP',shifts.length+' ca');return {status:'success',message:'Đã lưu '+shifts.length+' ca kíp.'};}
function exportAttendance_(ss,month){if(!validMonth_(month))return {status:'error',message:'Tháng không hợp lệ.'};const data=getSchedule_(ss,month);if(data.status!=='success')return data;const s=ensure_(ss,'XUAT_CHAM_CONG',SH.attendance),now=new Date(),rows=[];data.employees.forEach(e=>Object.keys(e.shifts).sort().forEach(d=>rows.push([now,month,e.id,e.maChamCong,e.name,e.dept,e.section,e.position,d,e.shifts[d]])));s.clearContents();s.getRange(1,1,1,SH.attendance.length).setValues([SH.attendance]);if(rows.length)s.getRange(2,1,rows.length,SH.attendance.length).setValues(rows);audit_(ss,'HR/ADMIN','','XUẤT CHẤM CÔNG',month+' / '+rows.length+' dòng');return {status:'success',message:'Đã tạo bảng XUAT_CHAM_CONG.',rows:rows.length,sheet:'XUAT_CHAM_CONG'};}
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
