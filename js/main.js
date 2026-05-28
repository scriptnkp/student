// ประกาศตัวแปร Global
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwn26krRKHqpeLnc6dVFgM3XR3J6pPyRCBvLodDWOJjwSdCPnjqg4BFlSvM80ACSwfprQ/exec"; 
let currentRole = 'admin';
let selectedRound = 1; 
window.rawStudents = [];
window.rawVisits = [];
let students = [];
let teacherStudents = [];
let currentStudentId = null;

// ระบุปีการศึกษาไทยปัจจุบันอัตโนมัติ
window.onload = function() {
  const now = new Date();
  let currentBE = now.getFullYear() + 543;
  if (now.getMonth() < 4) { currentBE--; }
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
}

function renderStudentList(list) {
  const container = document.getElementById('student-list');
  container.innerHTML = list.map(s => `
    <div class="student-item" style="cursor: pointer;" onclick="openVisitForm('${s.id}', '${s.name}', '${s.class}', '${s.no}', '${s.gpa}')">
      <div class="student-avatar ${s.avatar}">${(s.name || '?').charAt(0)}</div>
      <div class="student-info">
        <div class="student-name">${s.name} ${s.risk ? '<span class="badge badge-red">⚠ เสี่ยง</span>' : ''}</div>
        <div class="student-meta"><span>${s.class} เลขที่ ${s.no}</span></div>
      </div>
      <button type="button" class="visit-btn ${s.visited ? 'done' : ''}" onclick="event.stopPropagation(); openVisitForm('${s.id}', '${s.name}', '${s.class}', '${s.no}', '${s.gpa}')">
        ${s.visited ? 'เยี่ยมแล้ว' : 'บันทึก'}
      </button>
    </div>`).join('');
}

function renderTeacherList() {
  const container = document.getElementById('teacher-student-list');
  container.innerHTML = teacherStudents.map(s => `
    <div class="student-item" style="cursor: pointer;" onclick="openVisitForm('${s.id}', '${s.name}', '${s.class}', '${s.no}', '${s.gpa}')">
      <div class="student-avatar ${s.avatar}">${(s.name || '?').charAt(0)}</div>
      <div class="student-info"><div class="student-name">${s.name}</div></div>
      <button type="button" class="visit-btn ${s.visited ? 'done' : ''}" onclick="event.stopPropagation(); openVisitForm('${s.id}', '${s.name}', '${s.class}', '${s.no}', '${s.gpa}')">
        ${s.visited ? 'เยี่ยมแล้ว' : 'บันทึก'}
      </button>
    </div>`).join('');
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

function searchStudents(q) {
  renderStudentList(q ? students.filter(s => s.name.includes(q)) : students);
}

// ผูกฟังก์ชันข้ามขอบเขตอย่างเป็นทางการสากล เพื่อสกัดบั๊ก ReferenceError ให้หมดไป
window.showToast = showToast;
window.showTab = showTab;
window.setRole = setRole;
window.changeVisitRound = changeVisitRound;
window.filterClass = filterClass;
window.searchStudents = searchStudents;
