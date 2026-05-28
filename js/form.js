let currentStep = 1;
const totalSteps = 4;

function toggleAddStudentForm() {
    const form = document.getElementById('add-student-form');
    form.classList.toggle('hidden');
}

function submitNewStudent() {
    const name = document.getElementById('new-stu-name').value;
    const cls = document.getElementById('new-stu-class').value;
    const no = document.getElementById('new-stu-no').value;
    const gpa = document.getElementById('new-stu-gpa').value;
    if (!name || !cls || !no) { showToast('❌ กรุณากรอก ชื่อ, ชั้น และเลขที่ให้ครบ'); return; }
    
    showToast('กำลังบันทึกรายชื่อใหม่...');
    const payload = { action: "add_student", name: name, class: cls, no: no, gpa: gpa || "0.00" };

    fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === "success") {
            showToast('✓ เพิ่มนักเรียนใหม่เรียบร้อย!');
            toggleAddStudentForm(); 
            document.getElementById('new-stu-name').value = '';
            document.getElementById('new-stu-class').value = '';
            document.getElementById('new-stu-no').value = '';
            document.getElementById('new-stu-gpa').value = '';
            fetchStudentsData(); 
        } else { showToast('❌ ข้อผิดพลาด: ' + result.message); }
    })
    .catch(error => showToast('❌ ไม่สามารถเพิ่มนักเรียนได้'));
}

function openVisitForm(id, name, cls, no, gpa) {
  currentStudentId = id;
  document.getElementById('form-header-name').textContent = `${name} · ${cls} เลขที่ ${no}`;
  document.getElementById('f-visit-date').valueAsDate = new Date();
  document.getElementById('f-name').value = name;
  document.getElementById('f-class').value = cls;
  document.getElementById('f-no').value = no;
  document.getElementById('f-gpa').value = gpa;
  showTab('form');
  showToast(`เริ่มบันทึก: ${name}`);
}

function submitVisitData() {
  showToast('กำลังบันทึกข้อมูลเข้า Google Sheets...');
  const canvasGuard = document.getElementById('sig-guardian');
  const canvasTeacher = document.getElementById('sig-teacher1');
  const sigGuard = canvasGuard ? canvasGuard.toDataURL('image/png') : "";
  const sigTeacher = canvasTeacher ? canvasTeacher.toDataURL('image/png') : "";
  const getRadioVal = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ""; };

  const payload = {
    action: "save_visit", 
    studentId: currentStudentId || "ไม่ระบุ",
    teacherName: document.getElementById('f-teacher-1').value || "ครูที่ปรึกษา",
    step1: { 
        name: document.getElementById('f-name').value, class: document.getElementById('f-class').value,
        address: document.getElementById('f-address').value,
        fatherName: document.getElementById('f-father-name').value, motherName: document.getElementById('f-mother-name').value,
    },
    step2: { 
        fJob: document.getElementById('f-f-job').value, fInc: document.getElementById('f-f-inc').value,
        mJob: document.getElementById('f-m-job').value, mInc: document.getElementById('f-m-inc').value,
    },
    lat: document.getElementById('f-lat').value,
    lng: document.getElementById('f-lng').value,
    signature: "Guardian: " + sigGuard.substring(0,20) + "... | Teacher: " + sigTeacher.substring(0,20) + "..."
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(result => {
    if (result.status === "success") {
      showToast('✓ บันทึกเรียบร้อย!');
      setTimeout(() => { showTab('dashboard'); fetchStudentsData(); }, 1500);
    } else { showToast('❌ ข้อผิดพลาด: ' + result.message); }
  })
  .catch(error => showToast('❌ ไม่สามารถส่งข้อมูลได้'));
}

function showFormStep(step) {
  ['1','2','3','4'].forEach(s => {
    document.getElementById('form-step-' + s).classList.toggle('hidden', s !== String(step));
  });
}

function goToStep(n) {
  currentStep = n;
  showFormStep(n);
  document.getElementById('step-num').textContent = n;
  document.querySelectorAll('[id^="step-dot-"]').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 < n) dot.classList.add('done');
    else if (i + 1 === n) dot.classList.add('active');
  });
  document.getElementById('btn-prev').style.display = n > 1 ? 'flex' : 'none';
  document.getElementById('btn-next').textContent = n === totalSteps ? 'บันทึกข้อมูลเข้าสู่ระบบ' : 'ถัดไป';
  
  // *** [แก้บั๊กลายเซ็น] *** เรียกใช้งาน canvas หลังจากที่ div หายจากการถูกซ่อน (hidden) แล้วแน่นอน
  if (n === 4) { 
    setTimeout(() => { 
        initCanvas('sig-guardian'); 
        initCanvas('sig-teacher1'); 
    }, 100); 
  }
  document.querySelector('#page-form').scrollTop = 0;
}

function nextStep() {
  if (currentStep < totalSteps) goToStep(currentStep + 1);
  else submitVisitData();
}
function prevStep() { if (currentStep > 1) goToStep(currentStep - 1); }

// *** [แก้บั๊กลายเซ็น] *** ฟังก์ชันนี้ถูกปรับปรุงใหม่เพื่อรองรับมือถือและการคำนวณขนาดอย่างแม่นยำ
function initCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  // ตั้งค่ากว้างยาวให้ตรงกับกล่องที่ครอบอยู่จริง (ห้ามเป็น 0)
  canvas.width = canvas.parentElement.offsetWidth || 300;
  canvas.height = 120;
  
  const ctx = canvas.getContext('2d');
  let drawing = false; let lastX = 0, lastY = 0;
  
  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
        return [e.touches[0].clientX - r.left, e.touches[0].clientY - r.top];
    }
    return [e.clientX - r.left, e.clientY - r.top];
  }
  
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  
  const startDraw = (e) => { e.preventDefault(); drawing = true; [lastX, lastY] = getPos(e); };
  const moveDraw = (e) => { 
      e.preventDefault(); 
      if (!drawing) return; 
      const [x, y] = getPos(e); 
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke(); 
      [lastX, lastY] = [x, y]; 
  };
  const stopDraw = () => { drawing = false; };

  // ลบ event เก่าออกก่อนป้องกันการทำงานซ้ำซ้อน
  canvas.replaceWith(canvas.cloneNode(true));
  const newCanvas = document.getElementById(canvasId);
  
  newCanvas.addEventListener('mousedown', startDraw);
  newCanvas.addEventListener('mousemove', moveDraw);
  newCanvas.addEventListener('mouseup', stopDraw);
  newCanvas.addEventListener('mouseleave', stopDraw);
  
  // touch event ต้องใส่ {passive: false} เพื่อใช้ preventDefault() หยุดหน้าจอไม่ให้เลื่อนตอนเซ็น
  newCanvas.addEventListener('touchstart', startDraw, {passive: false});
  newCanvas.addEventListener('touchmove', moveDraw, {passive: false});
  newCanvas.addEventListener('touchend', stopDraw);
}

function clearSig(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getGPS() {
  const result = document.getElementById('gps-result');
  result.style.display = 'flex';
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
}

// *** ฟังก์ชันจัดเรียงข้อมูลลงกระดาษ A4 ก่อนพิมพ์ (เวอร์ชันเต็มรูปแบบ) ***
function prepareAndPrintPDF() {
  const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
  const getRadioVal = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ""; };
  
  // อัปเดตข้อมูลลง Span (หน้า 1)
  document.getElementById('p-visit-no').textContent = getVal('f-visit-no');
  document.getElementById('p-visit-date').textContent = getVal('f-visit-date');
  document.getElementById('p-visit-time').textContent = getVal('f-visit-time');
  document.getElementById('p-teacher-1').textContent = getVal('f-teacher-1');
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

  // อัปเดตข้อมูลลง Span (หน้า 2)
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
  if(document.getElementById('chk-help-1') && document.getElementById('chk-help-1').checked) helps.push("✔ อุปกรณ์การเรียน");
  if(document.getElementById('chk-help-2') && document.getElementById('chk-help-2').checked) helps.push("✔ อาหารกลางวัน");
  if(document.getElementById('chk-help-3') && document.getElementById('chk-help-3').checked) helps.push("✔ เครื่องแบบนักเรียน");
  if(document.getElementById('chk-help-4') && document.getElementById('chk-help-4').checked) helps.push("✔ ทุนการศึกษา");
  document.getElementById('p-help').textContent = helps.length > 0 ? helps.join("   ") : "-";

  document.getElementById('p-trans').textContent = getRadioVal('r_trans');
  document.getElementById('p-trans-cost').textContent = getVal('f-trans-cost');
  document.getElementById('p-trans-time').textContent = getVal('f-trans-time');
  document.getElementById('p-trans-dist').textContent = getVal('f-trans-dist');
  document.getElementById('p-money-day').textContent = getVal('f-money-day');
  document.getElementById('p-money-en').textContent = getRadioVal('r_money_en');
  document.getElementById('p-bf').textContent = getRadioVal('r_bf');
  document.getElementById('p-lunch').textContent = getRadioVal('r_lunch');

  const parentStatusSelect = document.getElementById('s-parent-status');
  document.getElementById('p-parent-status').textContent = parentStatusSelect ? parentStatusSelect.value : "";
  
  document.getElementById('p-house-type').textContent = getRadioVal('r_house_type');
  document.getElementById('p-space').textContent = getRadioVal('r_space');
  document.getElementById('p-private-rm').textContent = getRadioVal('r_private_rm');
  document.getElementById('p-safe').textContent = getRadioVal('r_safe');
  
  document.getElementById('p-lat').textContent = getVal('f-lat');
  document.getElementById('p-lng').textContent = getVal('f-lng');

  // ลายเซ็น
  const canvasG = document.getElementById('sig-guardian');
  const canvasT = document.getElementById('sig-teacher1');
  document.getElementById('print-sig-img-guardian').src = canvasG ? canvasG.toDataURL() : "";
  document.getElementById('print-sig-img-teacher').src = canvasT ? canvasT.toDataURL() : "";
  
  const gName = getVal('f-guard-name') || getVal('f-father-name') || getVal('f-mother-name') || ".........................................";
  document.getElementById('p-sig-name-guardian').textContent = gName;
  document.getElementById('p-sig-name-teacher').textContent = getVal('f-teacher-1') || ".........................................";

  // สั่งพิมพ์
  window.print();
}