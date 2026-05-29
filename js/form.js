let currentStep = 1;
const totalSteps = 4;

window.goToStep = function(n) {
  currentStep = n;
  ['1','2','3','4'].forEach(s => { 
    const el = document.getElementById('form-step-' + s);
    if(el) el.classList.toggle('hidden', s !== String(n)); 
  });
  document.getElementById('step-num').textContent = n;
  document.querySelectorAll('[id^="step-dot-"]').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 < n) dot.classList.add('done');
    else if (i + 1 === n) dot.classList.add('active');
  });
  document.getElementById('btn-prev').style.display = n > 1 ? 'flex' : 'none';
  document.getElementById('btn-next').textContent = n === 4 ? 'บันทึกข้อมูลเข้าสู่ระบบ' : 'ถัดไป';
  
  if (n === 4) { 
    setTimeout(() => { window.initCanvas('sig-guardian'); window.initCanvas('sig-teacher1'); }, 200); 
  }
  
  const mainContainer = document.getElementById('main');
  if (mainContainer) { mainContainer.scrollTop = 0; }
  window.scrollTo(0, 0);
};

window.initCanvas = function(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  canvas.width = canvas.parentElement.clientWidth || 350;
  canvas.height = 120;
  
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  
  let isDrawing = false; let lastX = 0; let lastY = 0;
  
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return [
      (clientX - rect.left) * (canvas.width / rect.width),
      (clientY - rect.top) * (canvas.height / rect.height)
    ];
  }
  
  if (!canvas.dataset.hasListeners) {
    canvas.addEventListener('mousedown', (e) => { isDrawing = true; [lastX, lastY] = getPos(e); });
    canvas.addEventListener('mousemove', (e) => { if (!isDrawing) return; const [x, y] = getPos(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke(); [lastX, lastY] = [x, y]; });
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseleave', () => isDrawing = false);
    
    canvas.addEventListener('touchstart', (e) => { isDrawing = true; [lastX, lastY] = getPos(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { if (!isDrawing) return; e.preventDefault(); const [x, y] = getPos(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke(); [lastX, lastY] = [x, y]; }, { passive: false });
    canvas.addEventListener('touchend', () => isDrawing = false);
    
    canvas.dataset.hasListeners = "true";
  }
};

window.submitNewTeacher = function() {
  const teacherNameInput = document.getElementById('add-new-teacher-name');
  const name = teacherNameInput ? teacherNameInput.value.trim() : "";
  if (!name) { window.showToast('❌ กรุณากรอกชื่อครูก่อนกดบันทึก'); return; }
  
  window.showToast('กำลังส่งชื่อครูขึ้นคลาวด์...');
  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "add_teacher", name: name })
  })
  .then(r => r.json()).then(result => {
    if (result.status === "success") {
      window.showToast('✓ บันทึกชื่อครูสำเร็จ!');
      teacherNameInput.value = '';
      fetchStudentsData(); 
    }
  }).catch(() => window.showToast('❌ ไม่สามารถลงทะเบียนชื่อครูได้'));
};

window.startSpeechRecognition = function(inputId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { window.showToast("❌ อุปกรณ์นี้ไม่รองรับระบบพิมพ์ด้วยเสียง"); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = 'th-TH';
  window.showToast("🎙️ กำลังฟังเสียง... พูดได้เลยครับครู");
  recognition.onresult = function(event) {
    const text = event.results[0][0].transcript;
    const inputEl = document.getElementById(inputId);
    if (inputEl) { inputEl.value = inputEl.value ? inputEl.value + " " + text : text; }
    window.showToast("✓ สั่งพิมพ์ด้วยเสียงสำเร็จ!");
  };
  recognition.start();
};

window.toggleAddStudentForm = () => { document.getElementById('add-student-form').classList.toggle('hidden'); };

window.submitNewStudent = () => {
    const name = document.getElementById('new-stu-name').value;
    const cls = document.getElementById('new-stu-class').value;
    const no = document.getElementById('new-stu-no').value;
    const gpa = document.getElementById('new-stu-gpa').value;
    if (!name || !cls || !no) { window.showToast('❌ กรุณากรอก ชื่อ, ชั้น และเลขที่ให้ครบ'); return; }
    
    window.showToast('กำลังบันทึกรายชื่อใหม่...');
    fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "add_student", name: name, class: cls, no: no, gpa: gpa || "0.00" })
    })
    .then(r => r.json()).then(result => {
        if (result.status === "success") {
            window.showToast('✓ เพิ่มนักเรียนใหม่เรียบร้อย!');
            toggleAddStudentForm(); 
            document.getElementById('new-stu-name').value = ''; document.getElementById('new-stu-class').value = '';
            document.getElementById('new-stu-no').value = ''; document.getElementById('new-stu-gpa').value = '';
            fetchStudentsData(); 
        }
    }).catch(() => window.showToast('❌ ไม่สามารถเพิ่มนักเรียนได้'));
};

// ====== [แก้ไขจุดที่ 2]: ปรับโครงสร้างให้ระบบคำนวณวันและเวลาปัจจุบันล็อกลงฟอร์มอัตโนมัติ 100% ======
window.openVisitForm = (id, name, cls, no, gpa) => {
  currentStudentId = id;
  document.getElementById('form-header-name').textContent = `${name} · ${cls} เลขที่ ${no}`;
  
  // คํานวณ วันที่ และ เวลาปัจจุบัน (ล็อกตามเขตเวลาประเทศไทย GMT+7 ป้องกันบั๊กข้ามวันของระเบียบเบราว์เซอร์)
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString();
  
  const localDate = localISOTime.split('T')[0]; // สกัดรูปฟอร์ม YYYY-MM-DD
  const localTime = localISOTime.split('T')[1].substring(0, 5); // สกัดรูปฟอร์ม HH:MM

  // ป้อนลงกล่องข้อความฟอร์มบันทึกโดยอัตโนมัติหน้างาน
  if(document.getElementById('f-visit-date')) document.getElementById('f-visit-date').value = localDate;
  if(document.getElementById('f-visit-time')) document.getElementById('f-visit-time').value = localTime;
  
  document.getElementById('f-name').value = name; document.getElementById('f-class').value = cls;
  document.getElementById('f-no').value = no; document.getElementById('f-gpa').value = gpa;
  
  document.getElementById('f-sig-name-guard-input').value = "";
  document.getElementById('f-sig-name-teacher-input').value = document.getElementById('f-teacher-1').value || "";
  
  if (window.rawVisits && window.rawVisits.length > 0) {
    const pastVisits = window.rawVisits.filter(v => String(v.Student_ID) === String(id));
    if (pastVisits.length > 0) {
      const latestPastVisit = pastVisits[pastVisits.length - 1]; 
      try {
        const s1 = JSON.parse(latestPastVisit.Step1_Basic);
        if(s1.idcard) document.getElementById('f-idcard').value = s1.idcard;
        if(s1.likeSub) document.getElementById('f-like-sub').value = s1.likeSub;
        if(s1.dislikeSub) document.getElementById('f-dislike-sub').value = s1.dislikeSub;
        if(s1.dob) document.getElementById('f-dob').value = s1.dob;
        if(s1.blood) document.getElementById('f-blood').value = s1.blood;
        if(s1.address) document.getElementById('f-address').value = s1.address;
        if(s1.fatherName) document.getElementById('f-father-name').value = s1.fatherName;
        if(s1.fatherId) document.getElementById('f-father-id').value = s1.fatherId;
        if(s1.fatherAge) document.getElementById('f-father-age').value = s1.fatherAge;
        if(s1.fatherEdu) document.getElementById('f-father-edu').value = s1.fatherEdu;
        if(s1.fatherPhone) document.getElementById('f-father-phone').value = s1.fatherPhone;
        if(s1.motherName) document.getElementById('f-mother-name').value = s1.motherName;
        if(s1.motherId) document.getElementById('f-mother-id').value = s1.motherId;
        if(s1.motherAge) document.getElementById('f-mother-age').value = s1.motherAge;
        if(s1.motherEdu) document.getElementById('f-mother-edu').value = s1.motherEdu;
        if(s1.motherPhone) document.getElementById('f-mother-phone').value = s1.motherPhone;
        if(s1.guardName) document.getElementById('f-guard-name').value = s1.guardName;
        if(s1.guardRel) document.getElementById('f-guard-rel').value = s1.guardRel;
        if(s1.guardId) document.getElementById('f-guard-id').value = s1.guardId;
        if(s1.guardAge) document.getElementById('f-guard-age').value = s1.guardAge;
        if(s1.guardPhone) document.getElementById('f-guard-phone').value = s1.guardPhone;
        window.showToast("🧠 ดึงประวัติพื้นฐานเดิมลงฟอร์มให้อัตโนมัติ!");
      } catch(err){}
    }
  }

  if(document.getElementById('f-visit-no')) { document.getElementById('f-visit-no').value = selectedRound; }
  window.showTab('form');
};

window.nextStep = () => { if (currentStep < totalSteps) goToStep(currentStep + 1); else submitVisitData(); };
window.prevStep = () => { if (currentStep > 1) goToStep(currentStep - 1); };
window.clearSig = (id) => { const c = document.getElementById(id); if(c) c.getContext('2d').clearRect(0,0,c.width,c.height); };

window.getGPS = () => {
  document.getElementById('gps-result').style.display = 'flex';
  document.getElementById('gps-text').textContent = 'กำลังดึงพิกัด...';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        document.getElementById('f-lat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('f-lng').value = pos.coords.longitude.toFixed(6);
        document.getElementById('gps-text').textContent = 'ดึงพิกัดสำเร็จ';
      },
      () => document.getElementById('gps-text').textContent = 'เปิด GPS ไม่สำเร็จ'
    );
  }
};

window.submitVisitData = () => {
  window.showToast('กำลังบันทึกข้อมูล...');
  const canvasGuard = document.getElementById('sig-guardian');
  const canvasTeacher = document.getElementById('sig-teacher1');
  const sigGuardData = canvasGuard ? canvasGuard.toDataURL('image/png') : "";
  const sigTeacherData = canvasTeacher ? canvasTeacher.toDataURL('image/png') : "";

  const payload = {
    action: "save_visit", studentId: currentStudentId || "ไม่ระบุ",
    teacherName: document.getElementById('f-teacher-1').value,
    step1: { 
      visitNo: document.getElementById('f-visit-no').value, visitDate: document.getElementById('f-visit-date').value, visitTime: document.getElementById('f-visit-time').value,
      teacher1: document.getElementById('f-teacher-1').value, teacher2: document.getElementById('f-teacher-2').value,
      name: document.getElementById('f-name').value, class: document.getElementById('f-class').value, no: document.getElementById('f-no').value,
      idcard: document.getElementById('f-idcard').value, gpa: document.getElementById('f-gpa').value, likeSub: document.getElementById('f-like-sub').value,
      dislikeSub: document.getElementById('f-dislike-sub').value, dob: document.getElementById('f-dob').value, race: document.getElementById('f-race').value,
      nation: document.getElementById('f-nation').value, weight: document.getElementById('f-weight').value, height: document.getElementById('f-height').value,
      blood: document.getElementById('f-blood').value, address: document.getElementById('f-address').value, fatherName: document.getElementById('f-father-name').value,
      fatherId: document.getElementById('f-father-id').value, fatherAge: document.getElementById('f-father-age').value, fatherEdu: document.getElementById('f-father-edu').value,
      fatherPhone: document.getElementById('f-father-phone').value, motherName: document.getElementById('f-mother-name').value, motherId: document.getElementById('f-mother-id').value,
      motherAge: document.getElementById('f-mother-age').value, motherEdu: document.getElementById('f-mother-edu').value, motherPhone: document.getElementById('f-mother-phone').value,
      guardName: document.getElementById('f-guard-name').value, guardRel: document.getElementById('f-guard-rel').value, guardId: document.getElementById('f-guard-id').value,
      guardAge: document.getElementById('f-guard-age').value, guardPhone: document.getElementById('f-guard-phone').value, broOlder: document.getElementById('f-bro-older').value,
      sisOlder: document.getElementById('f-sis-older').value, broYoung: document.getElementById('f-bro-young').value, sisYoung: document.getElementById('f-sis-young').value,
      childNo: document.getElementById('f-child-no').value, sibStudy: document.getElementById('f-sib-study').value, sibWork: document.getElementById('f-sib-work').value
    },
    step2: { 
      houseMembers: document.getElementById('f-house-members').value, houseCond: document.getElementById('f-house-cond').value,
      houseAtmos: document.getElementById('f-house-atmos').value, care: document.getElementById('f-care').value, rel: document.getElementById('f-rel').value,
      hobby: document.getElementById('f-hobby').value, talent: document.getElementById('f-talent').value, parentSuggest: document.getElementById('f-parent-suggest').value,
      fJob: document.getElementById('f-f-job').value, fPos: document.getElementById('f-f-pos').value, fInc: document.getElementById('f-f-inc').value,
      mJob: document.getElementById('f-m-job').value, mPos: document.getElementById('f-m-pos').value, mInc: document.getElementById('f-m-inc').value,
      spName: document.getElementById('f-sp-name').value, spRel: document.getElementById('f-sp-rel').value, spJob: document.getElementById('f-sp-job').value,
      spPos: document.getElementById('f-sp-pos').value, spInc: document.getElementById('f-sp-inc').value, transport: document.getElementById('f-trans-cost').value, safety: document.getElementById('s-parent-status').value
    },
    lat: document.getElementById('f-lat').value, lng: document.getElementById('f-lng').value, 
    signature: JSON.stringify({ guardian: sigGuardData, teacher: sigTeacherData })
  };
  fetch(WEB_APP_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
  .then(r => r.json()).then(res => { if(res.status === "success") { window.showToast('✓ บันทึกข้อมูลคลาวด์เรียบร้อย!'); setTimeout(() => { window.showTab('dashboard'); fetchStudentsData(); }, 1500); } })
  .catch(() => window.showToast('❌ ไม่สามารถส่งข้อมูลได้'));
};

window.prepareAndPrintPDF = () => {
  const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
  const getRadioVal = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ""; };
  
  document.getElementById('p-visit-no').textContent = getVal('f-visit-no');
  document.getElementById('p-visit-date').textContent = getVal('f-visit-date');
  document.getElementById('p-visit-time').textContent = getVal('f-visit-time');
  document.getElementById('p-teacher-1').textContent = document.getElementById('f-teacher-1').value;
  document.getElementById('p-teacher-2').textContent = getVal('f-teacher-2');
  document.getElementById('p-name').textContent = getVal('f-name');
  document.getElementById('p-class').textContent = getVal('f-class') + " เลขที่ " + getVal('f-no');
  document.getElementById('p-idcard').textContent = getVal('f-idcard');
  document.getElementById('p-gpa').textContent = getVal('f-gpa');
  document.getElementById('p-like-sub').textContent = getVal('f-like-sub');
  document.getElementById('p-dislike-sub').textContent = getVal('f-dislike-sub');
  document.getElementById('p-dob').textContent = getVal('f-dob');
  document.getElementById('p-race').textContent = getVal('f-race');
  document.getElementById('p-nation').textContent = getVal('f-nation');
  document.getElementById('p-weight').textContent = getVal('f-weight');
  document.getElementById('p-height').textContent = getVal('f-height');
  document.getElementById('p-blood').textContent = getVal('f-blood');
  document.getElementById('p-address').textContent = getVal('f-address');
  document.getElementById('p-father-name').textContent = getVal('f-father-name');
  document.getElementById('p-father-id').textContent = getVal('f-father-id');
  document.getElementById('p-father-age').textContent = getVal('f-father-age');
  document.getElementById('p-father-edu').textContent = getVal('f-father-edu');
  document.getElementById('p-father-phone').textContent = getVal('f-father-phone');
  document.getElementById('p-mother-name').textContent = getVal('f-mother-name');
  document.getElementById('p-mother-id').textContent = getVal('f-mother-id');
  document.getElementById('p-mother-age').textContent = getVal('f-mother-age');
  document.getElementById('p-mother-edu').textContent = getVal('f-mother-edu');
  document.getElementById('p-mother-phone').textContent = getVal('f-mother-phone');
  document.getElementById('p-guard-name').textContent = getVal('f-guard-name');
  document.getElementById('p-guard-rel').textContent = getVal('f-guard-rel');
  document.getElementById('p-guard-id').textContent = getVal('f-guard-id');
  document.getElementById('p-guard-age').textContent = getVal('f-guard-age');
  document.getElementById('p-guard-phone').textContent = getVal('f-guard-phone');
  document.getElementById('p-bro-older').textContent = getVal('f-bro-older');
  document.getElementById('p-sis-older').textContent = getVal('f-sis-older');
  document.getElementById('p-bro-young').textContent = getVal('f-bro-young');
  document.getElementById('p-sis-young').textContent = getVal('f-sis-young');
  document.getElementById('p-child-no').textContent = getVal('f-child-no');
  document.getElementById('p-sib-study').textContent = getVal('f-sib-study');
  document.getElementById('p-sib-work').textContent = getVal('f-sib-work');
  document.getElementById('p-house-members').textContent = getVal('f-house-members');
  document.getElementById('p-house-cond').textContent = getVal('f-house-cond');
  document.getElementById('p-house-atmos').textContent = getVal('f-house-atmos');
  document.getElementById('p-care').textContent = getVal('f-care');
  document.getElementById('p-rel').textContent = getVal('f-rel');
  document.getElementById('p-hobby').textContent = getVal('f-hobby');
  document.getElementById('p-talent').textContent = getVal('f-talent');
  document.getElementById('p-parent-suggest').textContent = getVal('f-parent-suggest');
  document.getElementById('p-f-job').textContent = getVal('f-f-job');
  document.getElementById('p-f-pos').textContent = getVal('f-f-pos');
  document.getElementById('p-f-inc').textContent = getVal('f-f-inc');
  document.getElementById('p-m-job').textContent = getVal('f-m-job');
  document.getElementById('p-m-pos').textContent = getVal('f-m-pos');
  document.getElementById('p-m-inc').textContent = getVal('f-m-inc');
  document.getElementById('p-sp-name').textContent = getVal('f-sp-name');
  document.getElementById('p-sp-rel').textContent = getVal('f-sp-rel');
  document.getElementById('p-sp-job').textContent = getVal('f-sp-job');
  document.getElementById('p-sp-pos').textContent = getVal('f-sp-pos');
  document.getElementById('p-sp-inc').textContent = getVal('f-sp-inc');

  let helps = [];
  if(document.getElementById('chk-help-1').checked) helps.push("✔ อุปกรณ์การเรียน");
  if(document.getElementById('chk-help-2').checked) helps.push("✔ อาหารกลางวัน");
  if(document.getElementById('chk-help-3').checked) helps.push("✔ เครื่องแบบนักเรียน");
  if(document.getElementById('chk-help-4').checked) helps.push("✔ ทุนการศึกษา");
  document.getElementById('p-help').textContent = helps.length > 0 ? helps.join("   ") : "-";

  document.getElementById('p-trans').textContent = getRadioVal('r_trans');
  document.getElementById('p-trans-cost').textContent = getVal('f-trans-cost');
  document.getElementById('p-trans-time').textContent = getVal('f-trans-time');
  document.getElementById('p-trans-dist').textContent = getVal('f-trans-dist');
  document.getElementById('p-money-day').textContent = getVal('f-money-day');
  document.getElementById('p-money-en').textContent = getRadioVal('r_money_en');
  document.getElementById('p-bf').textContent = getRadioVal('r_bf');
  document.getElementById('p-lunch').textContent = getRadioVal('r_lunch');
  document.getElementById('p-parent-status').textContent = document.getElementById('s-parent-status').value;
  document.getElementById('p-house-type').textContent = getRadioVal('r_house_type');
  document.getElementById('p-space').textContent = getRadioVal('r_space');
  document.getElementById('p-private-rm').textContent = getRadioVal('r_private_rm');
  document.getElementById('p-safe').textContent = getRadioVal('r_safe');
  document.getElementById('p-lat').textContent = getVal('f-lat');
  document.getElementById('p-lng').textContent = getVal('f-lng');

  const canvasG = document.getElementById('sig-guardian');
  const canvasT = document.getElementById('sig-teacher1');
  document.getElementById('print-sig-img-guardian').src = canvasG ? canvasG.toDataURL() : "";
  document.getElementById('print-sig-img-teacher').src = canvasT ? canvasT.toDataURL() : "";
  
  document.getElementById('p-sig-name-guardian').textContent = getVal('f-sig-name-guard-input') || "....................................................";
  document.getElementById('p-sig-name-teacher').textContent = getVal('f-sig-name-teacher-input') || "....................................................";

  window.print();
};

window.toggleAddStudentForm = toggleAddStudentForm;
window.submitNewStudent = submitNewStudent;
window.openVisitForm = openVisitForm;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.clearSig = clearSig;
window.getGPS = getGPS;
