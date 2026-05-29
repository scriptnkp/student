// ประกาศตัวแปรควบคุมระบบ Global สากล
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwn26krRKHqpeLnc6dVFgM3XR3J6pPyRCBvLodDWOJjwSdCPnjqg4BFlSvM80ACSwfprQ/exec"; 
let currentBE = 2569;
let currentRole = 'admin';
let selectedRound = 1; 
window.rawStudents = [];
window.rawVisits = [];
window.rawTeachers = [];
let students = [];
let teacherStudents = [];
let currentStudentId = null;

// สั่งคำนวณปี พ.ศ. การศึกษาไทยอัตโนมัติเมื่อเริ่มเปิดเว็บหน้างาน
window.onload = function() {
  const now = new Date();
  currentBE = now.getFullYear() + 543;
  if (now.getMonth() < 4) { currentBE--; } // ปฏิทินโรงเรียน: ม.ค. ถึง เม.ย. นับเป็นเทอมปลายปีเก่า
  const yearEl = document.getElementById('current-academic-year');
  if (yearEl) { yearEl.textContent = currentBE; }

  fetchStudentsData();
};

function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.header-tab').forEach(t => t.classList.remove('active'));
  
  const targetPage = document.getElementById('page-' + tab);
  if(targetPage) targetPage.classList.add('active');
  
  const tabEl = document.querySelector(`[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');
  
  if (tab === 'students') {
    closeStudentDetail(); // ดีดหน้าต่างดีเทลกลับสู่โหมดรายชื่อเมื่อคลิกแท็บ
  }
  if (tab === 'form') window.goToStep(1);
}

function setRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach((b,i) => { b.classList.toggle('active', (i === 0 && role === 'admin') || (i === 1 && role === 'teacher')); });
  document.getElementById('admin-dash').classList.toggle('hidden', role === 'teacher');
  document.getElementById('teacher-dash').classList.toggle('hidden', role === 'admin');
}

async function fetchStudentsData() {
  showToast('กำลังโหลดข้อมูลคลาวด์...'); 
  try {
    const response = await fetch(WEB_APP_URL);
    const result = await response.json();
    if (result.status === "success") {
      window.rawStudents = result.students || [];
      window.rawVisits = result.visits || [];
      window.rawTeachers = result.teachers || [];
      
      renderTeacherDropdown();
      processStudentStatus();
      
      const uniqueClasses = [...new Set(students.map(s => {
          if(!s.class) return "";
          return s.class.split('/')[0].trim(); 
      }))].filter(c => c !== "").sort();

      const filterBar = document.getElementById('dynamic-filter-bar');
      if (filterBar) {
          let filterHTML = `<button class="filter-chip active" onclick="filterClass('all', this)">ทั้งหมด</button>`;
          uniqueClasses.forEach(cls => {
              filterHTML += `<button class="filter-chip" onclick="filterClass('${cls}', this)">${cls}</button>`;
          });
          filterHTML += `<button class="filter-chip" onclick="filterClass('risk', this)">⚠ กลุ่มเสี่ยง</button>
                         <button class="filter-chip" onclick="filterClass('unvisited', this)">ยังไม่เยี่ยม</button>`;
          filterBar.innerHTML = filterHTML;
      }
      showToast('โหลดข้อมูลสำเร็จ!');
    }
  } catch (error) {
    showToast('❌ การเชื่อมต่อฐานข้อมูลล้มเหลว');
  }
}

function renderTeacherDropdown() {
  const dropdown = document.getElementById('f-teacher-1');
  if (!dropdown) return;
  let html = '<option value="">-- กรุณาเลือกรายชื่อครู --</option>';
  window.rawTeachers.forEach(t => { html += `<option value="${t.name}">${t.name}</option>`; });
  dropdown.innerHTML = html;
}

function processStudentStatus() {
  students = window.rawStudents.map((s, index) => {
    const avatars = ['avatar-blue', 'avatar-green', 'avatar-purple', 'avatar-orange'];
    const isVisited = window.rawVisits.some(v => {
      if (String(v.Student_ID) !== String(s.id)) return false;
      try {
        const step1 = JSON.parse(v.Step1_Basic);
        return String(step1.visitNo) === String(selectedRound);
      } catch(e) { return false; }
    });

    return {
      id: s.id, name: s.name || s.Name, class: s.class || s.Class, no: s.no || s.Number, gpa: s.gpa || s.GPA,
      visited: isVisited, risk: s.risk === true || s.risk === "TRUE" || s.risk === 1, avatar: avatars[index % 4]
    };
  });

  teacherStudents = students.filter(s => s.class === 'ม.1/9');
  updateDashboardStats();
  renderStudentList(students);
  renderTeacherList();
}

function changeVisitRound(roundVal) {
  selectedRound = parseInt(roundVal);
  const formVisitNoInput = document.getElementById('f-visit-no');
  if(formVisitNoInput) { formVisitNoInput.value = selectedRound; }
  processStudentStatus();
  showToast(`สลับข้อมูลเป็น: ครั้งที่ ${selectedRound}`);
}

function updateDashboardStats() {
  const total = students.length;
  const visited = students.filter(s => s.visited).length;
  const pending = total - visited;
  const risk = students.filter(s => s.risk).length;
  const percent = total === 0 ? 0 : Math.round((visited / total) * 100);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-visited').textContent = visited;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-risk').textContent = risk;
  document.getElementById('stat-percent').textContent = percent + '%';
  document.getElementById('stat-prog-fill').style.width = percent + '%';

  const tTotal = teacherStudents.length;
  const tVisited = teacherStudents.filter(s => s.visited).length;
  const tPending = tTotal - tVisited;
  const tPercent = tTotal === 0 ? 0 : Math.round((tVisited / tTotal) * 100);

  document.getElementById('t-total').textContent = tTotal;
  document.getElementById('t-visited').textContent = tVisited;
  document.getElementById('t-pending').textContent = tPending;
  document.getElementById('t-percent').textContent = tPercent + '%';
  document.getElementById('t-prog-fill').style.width = tPercent + '%';

  const classGroups = {};
  students.forEach(s => {
      if(!s.class) return;
      const prefix = s.class.split('/')[0].trim(); 
      if(!classGroups[prefix]) { classGroups[prefix] = { total: 0, visited: 0 }; }
      classGroups[prefix].total++;
      if(s.visited) classGroups[prefix].visited++;
  });

  const classColors = {
      'ม.1': { bg: '#e8f5ee', text: '#1a6b4a', bar: 'var(--primary)' }, 'ม.2': { bg: '#e3f2fd', text: '#1565c0', bar: '#1565c0' },
      'ม.3': { bg: '#fff3e0', text: '#e65100', bar: '#f57c00' }, 'ม.4': { bg: '#f3e5f5', text: '#6a1b9a', bar: '#7b1fa2' },
      'ม.5': { bg: '#fce4ec', text: '#880e4f', bar: '#c2185b' }, 'ม.6': { bg: '#e0f2f1', text: '#004d40', bar: '#00796b' }
  };
  const defaultColor = { bg: '#f1f3f4', text: '#5f6368', bar: '#9aa0a6' };

  const gridContainer = document.getElementById('class-grid');
  if(gridContainer) {
      let gridHTML = '';
      const sortedClasses = Object.keys(classGroups).sort();
      sortedClasses.forEach(cls => {
          const stats = classGroups[cls];
          const pct = stats.total === 0 ? 0 : Math.round((stats.visited / stats.total) * 100);
          const c = classColors[cls] || defaultColor;
          gridHTML += `
          <div class="class-card" onclick="showTab('students'); filterClass('${cls}', null);">
            <h3><span style="background: ${c.bg}; color:${c.text}; padding:2px 8px; border-radius:6px; font-size:12px">${cls}</span></h3>
            <div class="mini-prog"><div class="mini-fill" style="width:${pct}%; background: ${c.bar}"></div></div>
            <div class="mini-stats">
              <span>เยี่ยมแล้ว ${stats.visited}/${stats.total}</span>
              <span style="color:${c.text}; font-weight:500">${pct}%</span>
            </div>
          </div>`;
      });
      gridContainer.innerHTML = gridHTML;
  }

  // คำนวณแผงกลุ่มเสี่ยงด้านล่างสุด
  let countFinanceRisk = 0; let countSafetyRisk = 0; let countFamilyRisk = 0;
  const financeRooms = {};

  window.rawStudents.forEach(s => {
    const studentVisits = window.rawVisits.filter(v => String(v.Student_ID) === String(s.id));
    if (studentVisits.length === 0) return;
    const latestVisit = studentVisits[studentVisits.length - 1];
    let v2 = {};
    try { v2 = JSON.parse(latestVisit.Step2_Economy); } catch(e){}

    if (v2.helpNeeds && v2.helpNeeds.includes("ทุนการศึกษา")) {
      countFinanceRisk++;
      if (s.class) { financeRooms[s.class] = (financeRooms[s.class] || 0) + 1; }
    }
    if (latestVisit.Step2_Economy && (latestVisit.Step2_Economy.includes("ไม่ปลอดภัย") || latestVisit.Step2_Economy.includes("มีจุดเสี่ยง"))) { countSafetyRisk++; }
    if (latestVisit.Step2_Economy && (latestVisit.Step2_Economy.includes("หย่าร้าง") || latestVisit.Step2_Economy.includes("แยกกันอยู่"))) { countFamilyRisk++; }
  });

  const roomBreakdownText = Object.keys(financeRooms).sort().map(rm => `${rm} (${financeRooms[rm]} คน)`).join(', ');

  const riskPanelContainer = document.getElementById('dynamic-risk-panel');
  if (riskPanelContainer) {
    riskPanelContainer.innerHTML = `
      <div class="risk-panel-card">
        <h4><i class="ti ti-coin-off"></i> ฐานะยากจน / รายได้ต่ำ — ${countFinanceRisk} คน</h4>
        <p>${roomBreakdownText ? roomBreakdownText + ' — ' : ''}ต้องการทุนการศึกษาเร่งด่วน</p>
      </div>
      <div class="risk-panel-card">
        <h4><i class="ti ti-home-off"></i> สภาพบ้านไม่ปลอดภัย — ${countSafetyRisk} คน</h4>
        <p>พบว่าสภาพแวดล้อมรอบบ้านมีความเสี่ยง ต้องการการติดตามอย่างต่อเนื่อง</p>
      </div>
      <div class="risk-panel-card">
        <h4><i class="ti ti-users-minus"></i> ครอบครัวแตกแยก / ผู้ปกครองไม่ใช่บิดามารดา — ${countFamilyRisk} คน</h4>
        <p>อาศัยอยู่กับปู่ย่าตายาย หรือญาติ — ควรประสานงานแนะแนวเพิ่มเติมเพื่อดูแลอย่างใกล้ชิด</p>
      </div>`;
  }
}

function renderStudentList(list) {
  const container = document.getElementById('student-list');
  if(!container) return;
  
  container.innerHTML = list.map(s => {
    const gpaPercent = s.gpa ? (parseFloat(s.gpa) / 4.0) * 100 : 0;
    return `
    <div class="student-item-row" onclick="viewStudentDetail('${s.id}')" style="cursor:pointer;">
      <div style="display:flex; align-items:center; gap:10px; min-width:0;">
        <div class="student-avatar ${s.avatar}" style="width:32px; height:32px; font-size:13px;">${s.no}</div>
        <div class="student-name" style="font-size:13.5px;">${s.name}</div>
      </div>
      <div style="padding: 0 10px;">
        <div style="font-size:12px; font-weight:500; color:var(--gray800); text-align:center;">${parseFloat(s.gpa).toFixed(2)}</div>
        <div class="gpa-track-bar" style="margin-top:2px; height:5px;"><div class="gpa-track-fill" style="width:${gpaPercent}%;"></div></div>
      </div>
      <div style="text-align:center;"><span class="badge ${s.visited ? 'badge-green' : 'badge-gray'}">${s.visited ? 'เยี่ยมแล้ว' : 'ยังไม่เยี่ยม'}</span></div>
      <div style="text-align:center;">${s.risk ? '<span class="badge badge-red">เสี่ยง</span>' : '<span style="color:var(--gray400); font-size:12px;">-</span>'}</div>
      <div style="text-align:right;">
        <button type="button" class="visit-btn ${s.visited ? 'done' : ''}" style="padding:5px 12px; font-size:12px;" onclick="event.stopPropagation(); viewStudentDetail('${s.id}')">
          ${s.visited ? 'ดูข้อมูล' : 'บันทึก'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function renderTeacherList() {
  const container = document.getElementById('teacher-student-list');
  if(!container) return;
  container.innerHTML = teacherStudents.map(s => {
    const gpaPercent = s.gpa ? (parseFloat(s.gpa) / 4.0) * 100 : 0;
    return `
    <div class="student-item-row" onclick="viewStudentDetail('${s.id}')" style="cursor:pointer;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="student-avatar ${s.avatar}" style="width:32px; height:32px; font-size:13px;">${s.no}</div>
        <div class="student-name" style="font-size:13.5px;">${s.name}</div>
      </div>
      <div style="padding: 0 10px;">
        <div style="font-size:12px; font-weight:500; text-align:center;">${parseFloat(s.gpa).toFixed(2)}</div>
        <div class="gpa-track-bar" style="margin-top:2px; height:5px;"><div class="gpa-track-fill" style="width:${gpaPercent}%;"></div></div>
      </div>
      <div style="text-align:center;"><span class="badge ${s.visited ? 'badge-green' : 'badge-gray'}">${s.visited ? 'เยี่ยมแล้ว' : 'ยังไม่เยี่ยม'}</span></div>
      <div style="text-align:center;">${s.risk ? '<span class="badge badge-red">เสี่ยง</span>' : '<span style="color:var(--gray400); font-size:12px;">-</span>'}</div>
      <div style="text-align:right;">
        <button type="button" class="visit-btn ${s.visited ? 'done' : ''}" style="padding:5px 12px; font-size:12px;" onclick="event.stopPropagation(); viewStudentDetail('${s.id}')">
          ${s.visited ? 'ดูข้อมูล' : 'บันทึก'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function filterClass(cls, el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  let list = students;
  if (cls === 'all') list = students;
  else if (cls === 'risk') list = students.filter(s => s.risk);
  else if (cls === 'unvisited') list = students.filter(s => !s.visited);
  else list = students.filter(s => s.class.startsWith(cls));
  renderStudentList(list);
}

function viewStudentDetail(studentId) {
  const s = students.find(item => String(item.id) === String(studentId));
  if (!s) return;
  
  document.getElementById('student-list-wrapper').classList.add('hidden');
  document.getElementById('student-detail-wrapper').classList.remove('hidden');
  
  document.getElementById('det-avatar').className = `info-avatar ${s.avatar}`;
  document.getElementById('det-avatar').textContent = s.name.charAt(0);
  document.getElementById('det-name').textContent = s.name;
  document.getElementById('det-meta').textContent = `${s.class} · เลขที่ ${s.no} · โรงเรียนปิยมหาราชาลัย`;
  document.getElementById('det-badge-gpa').textContent = `GPA ${s.gpa}`;
  document.getElementById('det-badge-risk').textContent = s.risk ? "กลุ่มเสี่ยง" : "ปกติ";
  document.getElementById('det-badge-risk').className = s.risk ? "badge badge-red" : "badge badge-green";

  const history = window.rawVisits.filter(v => String(v.Student_ID) === String(studentId));
  document.getElementById('det-badge-visited').textContent = `เยี่ยมบ้านแล้ว ${history.length} ครั้ง`;

  let latestS1 = {}, latestS2 = {}, lat = "-", lng = "-";

  if (history.length > 0) {
    const latest = history[history.length - 1]; 
    try { latestS1 = JSON.parse(latest.Step1_Basic); } catch(e){}
    try { latestS2 = JSON.parse(latest.Step2_Economy); } catch(e){}
    lat = latest.GPS_Lat || "-";
    lng = latest.GPS_Lng || "-";
  }

  document.getElementById('det-idcard').textContent = latestS1.idcard || "-";
  document.getElementById('det-dob').textContent = latestS1.dob || "-";
  document.getElementById('det-wh').textContent = latestS1.weight && latestS1.height ? `${latestS1.weight} กก. / ${latestS1.height} ซม.` : "-";
  document.getElementById('det-race').textContent = latestS1.race && latestS1.nation ? `${latestS1.race} / ${latestS1.nation}` : "-";
  document.getElementById('det-subs').textContent = latestS1.likeSub && latestS1.dislikeSub ? `${latestS1.likeSub} / ${latestS1.dislikeSub}` : "-";
  document.getElementById('det-address').textContent = latestS1.address || "-";

  document.getElementById('det-father').textContent = latestS1.fatherName ? `${latestS1.fatherName} · อายุ ${latestS1.fatherAge || '-'} ปี · จบ ${latestS1.fatherEdu || '-'}` : "-";
  document.getElementById('det-mother').textContent = latestS1.motherName ? `${latestS1.motherName} · อายุ ${latestS1.motherAge || '-'} ปี · จบ ${latestS1.motherEdu || '-'}` : "-";
  document.getElementById('det-guard').textContent = latestS1.guardName ? `${latestS1.guardName} (${latestS1.guardRel || '-'}) · โทร ${latestS1.guardPhone || '-'}` : "-";
  document.getElementById('det-siblings').textContent = latestS1.broOlder ? `พี่ชาย ${latestS1.broOlder} · พี่สาว ${latestS1.sisOlder} · น้องชาย ${latestS1.broYoung} · น้องสาว ${latestS1.sisYoung} คน` : "-";
  document.getElementById('det-house-members').textContent = latestS2.houseMembers ? `${latestS2.houseMembers} คน` : "-";
  document.getElementById('det-status').textContent = latestS2.parentStatus || "-";

  document.getElementById('det-f-job').textContent = latestS2.fJob ? `${latestS2.fJob} · รายได้ ~${latestS2.fInc || '0'} บ./เดือน` : "-";
  document.getElementById('det-m-job').textContent = latestS2.mJob ? `${latestS2.mJob} · รายได้ ~${latestS2.mInc || '0'} บ./เดือน` : "-";
  document.getElementById('det-sp').textContent = latestS2.spName ? `${latestS2.spName} (${latestS2.spRel || '-'})` : "-";
  document.getElementById('det-trans').textContent = latestS2.transport || "-";
  document.getElementById('det-trans-meta').textContent = latestS2.transCost ? `${latestS2.transCost} บาท · ${latestS2.transTime || '-'} นาที (${latestS2.transDist || '-'} กม.)` : "-";
  document.getElementById('det-money').textContent = latestS2.moneyDay ? `${latestS2.moneyDay} บ./วัน · สถานะ: ${latestS2.moneyEnough || '-'}` : "-";

  document.getElementById('det-house-type').textContent = latestS2.houseType ? `${latestS2.houseType} · สภาพในบ้าน: ${latestS2.space || '-'}` : "-";
  document.getElementById('det-safe').textContent = latestS2.safety || "-";
  document.getElementById('det-atmos').textContent = latestS2.houseAtmos ? `${latestS2.houseAtmos} · ความเอาใจใส่: ${latestS2.care || '-'}` : "-";
  document.getElementById('det-hobbies').textContent = latestS2.hobby ? `${latestS2.hobby} · ความสามารถ: ${latestS2.talent || '-'}` : "-";
  document.getElementById('det-help').textContent = latestS2.helpNeeds || "ปกติ ไม่มีสภาวะความช่วยเหลือวิกฤต";
  
  // ====== [แก้ไขจุดที่ 1]: ดึงตัวเลข GPA มาแสดงผลคู่ขนาดยอดกราฟให้เห็นชัดเจนตามภาพ 151404548_0 ======
  const gpaPercent = s.gpa ? (parseFloat(s.gpa) / 4.0) * 100 : 0;
  const gpaFillBar = document.getElementById('det-gpa-fill');
  if (gpaFillBar && gpaFillBar.parentElement && gpaFillBar.parentElement.previousElementSibling) {
    const labelElement = gpaFillBar.parentElement.previousElementSibling;
    labelElement.innerHTML = `เกรดเฉลี่ยสะสมปัจจุบัน (GPA) <span style="float: right; font-weight: 600; color: var(--primary); font-size: 14px;">${parseFloat(s.gpa).toFixed(2)}</span>`;
  }
  if(gpaFillBar) gpaFillBar.style.width = `${gpaPercent}%`;

  document.getElementById('det-lat').textContent = lat;
  document.getElementById('det-lng').textContent = lng;
  
  // ลิงก์ระบบพิกัดสากล Google Maps (แก้ไขทางเทคนิคให้ถูกต้องแม่นยำ)
  const mapsBtn = document.getElementById('det-google-maps-link');
  if(lat !== "-" && lng !== "-") {
    mapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    mapsBtn.style.display = "flex";
  } else {
    mapsBtn.style.display = "none";
  }

  // เรนเดอร์ประวัติประทับรูปภาพลายเซ็นต์จริงลงไทม์ไลน์ 1-5
  const timelineContainer = document.getElementById('det-timeline-container');
  let timelineHTML = '';
  
  for (let round = 1; round <= 5; round++) {
    const matchVisit = history.find(v => {
      try { return String(JSON.parse(v.Step1_Basic).visitNo) === String(round); } catch(e){return false;}
    });
    
    if (matchVisit) {
      let v1 = {}, v2 = {};
      try { v1 = JSON.parse(matchVisit.Step1_Basic); } catch(e){}
      try { v2 = JSON.parse(matchVisit.Step2_Economy); } catch(e){}
      
      let sigImages = { guardian: "", teacher: "" };
      try { 
          // ดึงค่าจากหัวคอลัมน์ทุกรูปแบบ (ตัวเล็ก/ตัวใหญ่/มี s) ป้องกันบั๊กชื่อคอลัมน์ไม่ตรง
          var rawSig = matchVisit.signature || matchVisit.Signatures || matchVisit.Signature;
          if(rawSig) { sigImages = JSON.parse(rawSig); } 
          } catch(e){}
      
      timelineHTML += `
        <div class="timeline-node complete">
          <div class="timeline-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="color:var(--primary); font-size:14px;">🟢 ครั้งที่ ${round}</strong>
              <div style="display:flex; gap:6px; align-items:center;">
                <span class="badge badge-green" style="font-size:11px; padding:2px 8px;">เสร็จสมบูรณ์</span>
                <button type="button" onclick="printPastVisit('${s.id}', ${round})" style="padding:3px 8px; font-size:11px; background:var(--accent); color:black; border:none; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:2px; font-family:inherit; font-weight:500;"><i class="ti ti-printer"></i> พิมพ์รายงาน</button>
              </div>
            </div>
            <p style="font-size:12.5px; margin-bottom:3px; color:#555;"><i class="ti ti-calendar-event"></i> <b>วันที่เยี่ยม:</b> ${v1.visitDate || '-'} เวลา ${v1.visitTime || '-'} น.</p>
            <p style="font-size:12.5px; margin-bottom:3px; color:#555;"><i class="ti ti-school"></i> <b>ครูผู้เยี่ยม:</b> ${v1.teacher1 || '-'} ${v1.teacher2 ? 'และ ' + v1.teacher2 : ''}</p>
            <p style="font-size:12.5px; margin-bottom:8px; color:#555;"><i class="ti ti-edit"></i> <b>บันทึกสรุปย่อ:</b> ${v2.care || '-'}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
              <div style="background: white; border: 1px solid var(--gray200); border-radius: 6px; padding: 10px; text-align: center; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:85px;">
                <div style="font-size: 11px; color: #e67e22; font-weight:500; margin-bottom:4px;">✍️ ผู้ปกครอง</div>
                ${sigImages.guardian ? `<img src="${sigImages.guardian}" style="height: 38px; max-width: 100%; object-fit: contain; margin-bottom:2px;" />` : '<div style="height:38px; line-height:38px; color:var(--gray400); font-size:11px;">ไม่มีลายเซ็น</div>'}
                <div style="font-size: 10.5px; color: #27ae60; font-weight: 500;">✓ ตรวจลงนามแล้ว</div>
              </div>
              <div style="background: white; border: 1px solid var(--gray200); border-radius: 6px; padding: 10px; text-align: center; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:85px;">
                <div style="font-size: 11px; color: #e67e22; font-weight:500; margin-bottom:4px;">✍️ ครูที่ปรึกษา 1</div>
                ${sigImages.teacher ? `<img src="${sigImages.teacher}" style="height: 38px; max-width: 100%; object-fit: contain; margin-bottom:2px;" />` : '<div style="height:38px; line-height:38px; color:var(--gray400); font-size:11px;">ไม่มีลายเซ็น</div>'}
                <div style="font-size: 10.5px; color: #27ae60; font-weight: 500;">✓ ตรวจลงนามแล้ว</div>
              </div>
            </div>
          </div>
        </div>`;
    } else {
      timelineHTML += `
        <div class="timeline-node">
          <div class="timeline-box" style="opacity:0.6; border-style:dashed; background:none;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:13px; color:var(--gray600);"><i class="ti ti-clock"></i> ครั้งที่ ${round} - รอดำเนินการ</span>
              <span class="badge badge-gray" onclick="openFormFromHistory('${s.id}', '${s.name}', '${s.class}', '${s.no}', '${s.gpa}', ${round})" style="cursor:pointer; background:var(--primary); color:white; font-size:11px; padding:3px 10px;">+ บันทึกด่วน</span>
            </div>
          </div>
        </div>`;
    }
  }
  timelineContainer.innerHTML = timelineHTML;
}

function openFormFromHistory(id, name, cls, no, gpa, roundNo) {
  window.changeVisitRound(roundNo);
  const selectRoundBox = document.getElementById('select-visit-round');
  if(selectRoundBox) selectRoundBox.value = roundNo;
  window.openVisitForm(id, name, cls, no, gpa);
}

function closeStudentDetail() {
  document.getElementById('student-list-wrapper').classList.remove('hidden');
  document.getElementById('student-detail-wrapper').classList.add('hidden');
}

// ===================================================
// ฟังก์ชันใหม่: ดึงข้อมูลประวัติการเยี่ยมบ้านรอบเก่ามาจัดลงกระดาษ A4 และสั่งพิมพ์ย้อนหลัง
// ===================================================
window.printPastVisit = function(studentId, round) {
  const s = window.rawStudents.find(item => String(item.id) === String(studentId));
  const matchVisit = window.rawVisits.find(v => {
    if (String(v.Student_ID) !== String(studentId)) return false;
    try { return String(JSON.parse(v.Step1_Basic).visitNo) === String(round); } catch(e){return false;}
  });
  
  if (!s || !matchVisit) {
    showToast("❌ ไม่พบข้อมูลประวัติการเยี่ยมบ้านในรอบนี้");
    return;
  }
  
  let v1 = {}, v2 = {};
  try { v1 = JSON.parse(matchVisit.Step1_Basic); } catch(e){}
  try { v2 = JSON.parse(matchVisit.Step2_Economy); } catch(e){}
  
  let sigImages = { guardian: "", teacher: "" };
  try {
    var rawSig = matchVisit.signature || matchVisit.Signatures || matchVisit.Signature;
    if(rawSig) { sigImages = JSON.parse(rawSig); }
  } catch(e){}

  // กวาดข้อมูลประวัติย้อนหลังโยนเข้าหน้ากระดาษพิมพ์จำลอง A4 ตรงๆ
  document.getElementById('p-visit-no').textContent = v1.visitNo || round;
  document.getElementById('p-visit-date').textContent = v1.visitDate || "-";
  document.getElementById('p-visit-time').textContent = v1.visitTime || "-";
  document.getElementById('p-teacher-1').textContent = v1.teacher1 || "-";
  document.getElementById('p-teacher-2').textContent = v1.teacher2 || "-";
  
  document.getElementById('p-name').textContent = s.name || s.Name || "-";
  document.getElementById('p-class').textContent = (s.class || s.Class || "-") + " เลขที่ " + (s.no || s.Number || "-");
  document.getElementById('p-idcard').textContent = v1.idcard || "-";
  document.getElementById('p-gpa').textContent = parseFloat(s.gpa || s.GPA || 0).toFixed(2);
  document.getElementById('p-like-sub').textContent = v1.likeSub || "-";
  document.getElementById('p-dislike-sub').textContent = v1.dislikeSub || "-";
  document.getElementById('p-dob').textContent = v1.dob || "-";
  document.getElementById('p-race').textContent = v1.race || "-";
  document.getElementById('p-nation').textContent = v1.nation || "-";
  document.getElementById('p-weight').textContent = v1.weight || "-";
  document.getElementById('p-height').textContent = v1.height || "-";
  document.getElementById('p-blood').textContent = v1.blood || "-";
  document.getElementById('p-address').textContent = v1.address || "-";
  
  document.getElementById('p-father-name').textContent = v1.fatherName || "-";
  document.getElementById('p-father-id').textContent = v1.fatherId || "-";
  document.getElementById('p-father-age').textContent = v1.fatherAge || "-";
  document.getElementById('p-father-edu').textContent = v1.fatherEdu || "-";
  document.getElementById('p-father-phone').textContent = v1.fatherPhone || "-";
  
  document.getElementById('p-mother-name').textContent = v1.motherName || "-";
  document.getElementById('p-mother-id').textContent = v1.motherId || "-";
  document.getElementById('p-mother-age').textContent = v1.motherAge || "-";
  document.getElementById('p-mother-edu').textContent = v1.motherEdu || "-";
  document.getElementById('p-mother-phone').textContent = v1.motherPhone || "-";
  
  document.getElementById('p-guard-name').textContent = v1.guardName || "-";
  document.getElementById('p-guard-rel').textContent = v1.guardRel || "-";
  document.getElementById('p-guard-id').textContent = v1.guardId || "-";
  document.getElementById('p-guard-age').textContent = v1.guardAge || "-";
  document.getElementById('p-guard-phone').textContent = v1.guardPhone || "-";
  
  document.getElementById('p-bro-older').textContent = v1.broOlder || "0";
  document.getElementById('p-sis-older').textContent = v1.sisOlder || "0";
  document.getElementById('p-bro-young').textContent = v1.broYoung || "0";
  document.getElementById('p-sis-young').textContent = v1.sisYoung || "0";
  document.getElementById('p-child-no').textContent = v1.childNo || "1";
  document.getElementById('p-sib-study').textContent = v1.sibStudy || "1";
  document.getElementById('p-sib-work').textContent = v1.sibWork || "0";
  
  document.getElementById('p-house-members').textContent = v2.houseMembers || "-";
  document.getElementById('p-house-cond').textContent = v2.houseCond || "-";
  document.getElementById('p-house-atmos').textContent = v2.houseAtmos || "-";
  document.getElementById('p-care').textContent = v2.care || "-";
  document.getElementById('p-rel').textContent = v2.rel || "-";
  document.getElementById('p-hobby').textContent = v2.hobby || "-";
  document.getElementById('p-talent').textContent = v2.talent || "-";
  document.getElementById('p-parent-suggest').textContent = v2.parentSuggest || "-";
  
  document.getElementById('p-f-job').textContent = v2.fJob || "-";
  document.getElementById('p-f-pos').textContent = v2.fPos || "-";
  document.getElementById('p-f-inc').textContent = v2.fInc || "-";
  document.getElementById('p-m-job').textContent = v2.mJob || "-";
  document.getElementById('p-m-pos').textContent = v2.mPos || "-";
  document.getElementById('p-m-inc').textContent = v2.mInc || "-";
  
  document.getElementById('p-sp-name').textContent = v2.spName || "-";
  document.getElementById('p-sp-rel').textContent = v2.spRel || "-";
  document.getElementById('p-sp-job').textContent = v2.spJob || "-";
  document.getElementById('p-sp-pos').textContent = v2.spPos || "-";
  document.getElementById('p-sp-inc').textContent = v2.spInc || "-";
  
  document.getElementById('p-help').textContent = v2.helpNeeds || "ไม่มี";
  document.getElementById('p-trans').textContent = v2.transport || "-";
  document.getElementById('p-trans-cost').textContent = v2.transCost || "-";
  document.getElementById('p-trans-time').textContent = v2.transTime || "-";
  document.getElementById('p-trans-dist').textContent = v2.transDist || "-";
  document.getElementById('p-money-day').textContent = v2.moneyDay || "-";
  document.getElementById('p-money-en').textContent = v2.moneyEnough || "-";
  document.getElementById('p-bf').textContent = v2.breakfast || "-";
  document.getElementById('p-lunch').textContent = v2.lunch || "-";
  document.getElementById('p-parent-status').textContent = v2.parentStatus || "-";
  document.getElementById('p-house-type').textContent = v2.houseType || "-";
  document.getElementById('p-space').textContent = v2.space || "-";
  document.getElementById('p-private-rm').textContent = v2.privateRoom || "-";
  document.getElementById('p-safe').textContent = v2.safety || "-";
  
  document.getElementById('p-lat').textContent = matchVisit.GPS_Lat || "-";
  document.getElementById('p-lng').textContent = matchVisit.GPS_Lng || "-";
  
  document.getElementById('print-sig-img-guardian').src = sigImages.guardian || "";
  document.getElementById('print-sig-img-teacher').src = sigImages.teacher || "";
  
  document.getElementById('p-sig-name-guardian').textContent = v1.guardName || v1.fatherName || v1.motherName || "ผู้ปกครอง";
  document.getElementById('p-sig-name-teacher').textContent = v1.teacher1 || "ครูที่ปรึกษา";
  
  // สั่งเปิดคำสั่งปริ้นเอกสารย้อนหลังรอบนี้ทันที
  window.print();
};

// ผูกระบบสิทธิ์ข้ามไฟล์ ป้องกัน Error โกลบอลสากล
window.showToast = showToast;
window.showTab = showTab;
window.setRole = setRole;
window.changeVisitRound = changeVisitRound;
window.filterClass = filterClass;
window.searchStudents = (q) => { renderStudentList(q ? students.filter(s => s.name.includes(q)) : students); };
window.viewStudentDetail = viewStudentDetail;
window.closeStudentDetail = closeStudentDetail;
window.openFormFromHistory = openFormFromHistory;
