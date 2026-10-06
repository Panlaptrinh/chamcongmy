/* ==========================================================================
   BẢNG LƯƠNG OFFLINE - APPLICATION LOGIC & DATA SYSTEM
   ========================================================================== */

const KEY = "bang_luong_offline_v2";
const THEME_KEY = "bang_luong_theme";

const defaults = {
  settings: {
    baseSalary: 4500000,
    standardDays: 26,
    allowance: 1000000,
    cnRate: 10,
    tvRate: 7,
    ronRate: 10
  },
  employees: [
    { id: crypto.randomUUID(), name: "Hậu", active: true }
  ],
  attendance: []
};

let data = load();
let deferredInstall = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const money = n => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(n) || 0) + " ₫";
const now = new Date();
const monthNow = () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

// --- LocalStorage Data Helpers ---
function load() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    return x || structuredClone(defaults);
  } catch (e) {
    return structuredClone(defaults);
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function toast(msg) {
  const t = $("#toast");
  const txt = $("#toastText");
  if (txt) txt.textContent = msg;
  else t.textContent = msg;
  
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function employeeName(id) {
  return data.employees.find(e => e.id === id)?.name || "—";
}

function getEmpRates(empId) {
  const emp = data.employees.find(e => e.id === empId);
  const cnRate = (emp && emp.cnRate !== undefined && emp.cnRate !== null && emp.cnRate !== "") 
    ? +emp.cnRate 
    : (data.settings.cnRate ?? 10);
  const tvRate = (emp && emp.tvRate !== undefined && emp.tvRate !== null && emp.tvRate !== "") 
    ? +emp.tvRate 
    : (data.settings.tvRate ?? 7);
  const ronRate = (emp && emp.ronRate !== undefined && emp.ronRate !== null && emp.ronRate !== "") 
    ? +emp.ronRate 
    : (data.settings.ronRate ?? 10);
  return { cnRate, tvRate, ronRate };
}

// --- Calculation Logic ---
function calc(a) {
  const cnVal = +a.cn || 0;
  const tvVal = +a.tv || 0;
  const ronVal = +a.ron || 0;
  const rates = getEmpRates(a.employeeId);

  const cnPct = (cnVal * rates.cnRate) / 100;
  const tvPct = (tvVal * rates.tvRate) / 100;
  const ronPct = (ronVal * rates.ronRate) / 100;

  return {
    ...a,
    cn: cnVal,
    tv: tvVal,
    ron: ronVal,
    cnRate: rates.cnRate,
    tvRate: rates.tvRate,
    ronRate: rates.ronRate,
    cnPct,
    tvPct,
    ronPct,
    totalPct: cnPct + tvPct + ronPct
  };
}

function rows(month, emp = "", search = "") {
  return data.attendance
    .filter(a => {
      const matchMonth = a.date?.startsWith(month);
      const matchEmp = !emp || a.employeeId === emp;
      const empName = employeeName(a.employeeId).toLowerCase();
      const dateFmt = fmt(a.date);
      const q = search.trim().toLowerCase();
      const matchSearch = !q || empName.includes(q) || dateFmt.includes(q) || a.date.includes(q);
      return matchMonth && matchEmp && matchSearch;
    })
    .map(calc)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function salary(month, emp = "") {
  const r = rows(month, emp);
  const days = r.filter(x => x.work).length;
  const cn = r.reduce((s, x) => s + (+x.cn || 0), 0);
  const tv = r.reduce((s, x) => s + (+x.tv || 0), 0);
  const ron = r.reduce((s, x) => s + (+x.ron || 0), 0);
  const pCN = r.reduce((s, x) => s + x.cnPct, 0);
  const pTV = r.reduce((s, x) => s + x.tvPct, 0);
  const pRon = r.reduce((s, x) => s + x.ronPct, 0);
  
  const stdDays = data.settings.standardDays || 26;
  const db = (data.settings.baseSalary || 0) / stdDays;
  const da = (data.settings.allowance || 0) / stdDays;
  
  const base = days * db;
  const allowance = days * da;
  const pct = pCN + pTV + pRon;
  const total = base + allowance + pct;

  return { r, days, cn, tv, ron, pCN, pTV, pRon, pct, base, allowance, total };
}

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(savedTheme);
  
  $("#themeToggleBtn")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  });
}

function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem(THEME_KEY, mode);
  
  const sun = $("#themeIconSun");
  const moon = $("#themeIconMoon");
  if (sun && moon) {
    if (mode === "dark") {
      sun.style.display = "block";
      moon.style.display = "none";
    } else {
      sun.style.display = "none";
      moon.style.display = "block";
    }
  }
}

// --- Navigation & Page Rendering ---
function showPage(p) {
  $(".page.active")?.classList.remove("active");
  $("#" + p)?.classList.add("active");
  
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === p));
  $$(".desktop-nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === p));
  
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  const m = $("#dashboardMonth")?.value || monthNow();
  const s = salary(m);

  if ($("#monthLabel")) $("#monthLabel").textContent = `Tháng ${m.slice(5, 7)} / ${m.slice(0, 4)}`;
  if ($("#statDays")) $("#statDays").textContent = s.days;
  if ($("#statCN")) $("#statCN").textContent = money(s.cn);
  if ($("#statTV")) $("#statTV").textContent = money(s.tv);
  if ($("#statRon")) $("#statRon").textContent = money(s.ron);
  if ($("#statPct")) $("#statPct").textContent = money(s.pct);
  if ($("#statSalary")) $("#statSalary").textContent = money(s.total);

  if ($("#cnRateBadge")) $("#cnRateBadge").textContent = (data.settings.cnRate || 10) + "%";
  if ($("#tvRateBadge")) $("#tvRateBadge").textContent = (data.settings.tvRate || 7) + "%";
  if ($("#ronRateBadge")) $("#ronRateBadge").textContent = (data.settings.ronRate || 10) + "%";

  renderEarningsBreakdown(s);
  renderOptions();
  renderAttendance();
  renderPayroll();
  renderEmployees();
  renderSettings();
}

function renderEarningsBreakdown(s) {
  const total = s.total || 1;
  const basePct = Math.max(0, Math.min(100, (s.base / total) * 100));
  const allowPct = Math.max(0, Math.min(100, (s.allowance / total) * 100));
  const cnPct = Math.max(0, Math.min(100, (s.pCN / total) * 100));
  const tvPct = Math.max(0, Math.min(100, (s.pTV / total) * 100));
  const ronPct = Math.max(0, Math.min(100, (s.pRon / total) * 100));

  if ($("#barBase")) $("#barBase").style.width = basePct + "%";
  if ($("#barAllowance")) $("#barAllowance").style.width = allowPct + "%";
  if ($("#barCN")) $("#barCN").style.width = cnPct + "%";
  if ($("#barTV")) $("#barTV").style.width = tvPct + "%";
  if ($("#barRon")) $("#barRon").style.width = ronPct + "%";

  if ($("#legBase")) $("#legBase").textContent = money(s.base);
  if ($("#legAllowance")) $("#legAllowance").textContent = money(s.allowance);
  if ($("#legCN")) $("#legCN").textContent = money(s.pCN);
  if ($("#legTV")) $("#legTV").textContent = money(s.pTV);
  if ($("#legRon")) $("#legRon").textContent = money(s.pRon);
}

function renderOptions() {
  const a = $("#attendanceEmployee");
  const p = $("#payrollEmployee");
  if (!a || !p) return;
  
  const av = a.value;
  const pv = p.value;

  a.innerHTML = '<option value="">Tất cả nhân viên</option>' + 
    data.employees.filter(e => e.active).map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join("");
    
  p.innerHTML = data.employees.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join("");

  if (data.employees.some(e => e.id === av)) a.value = av;
  if (data.employees.some(e => e.id === pv)) p.value = pv;
  else if (data.employees[0]) p.value = data.employees[0].id;
}

function fmt(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function renderAttendance() {
  const m = $("#attendanceMonth")?.value || monthNow();
  const emp = $("#attendanceEmployee")?.value || "";
  const search = $("#attendanceSearch")?.value || "";
  const r = rows(m, emp, search);

  const tbody = $("#attendanceBody");
  if (!tbody) return;

  if (r.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <div>Chưa có dữ liệu chấm công cho tháng này.</div>
          <button class="primary" style="margin-top:12px;" onclick="editAttendance()">＋ Thêm lượt chấm công</button>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = r.map(a => {
    const dayOfWeek = weekdays[new Date(a.date + "T00:00:00").getDay()];
    return `
      <tr>
        <td><strong>${fmt(a.date)}</strong></td>
        <td><span class="badge badge-muted">${dayOfWeek}</span></td>
        <td><strong>${esc(employeeName(a.employeeId))}</strong></td>
        <td>
          <label class="custom-checkbox">
            <input type="checkbox" ${a.work ? "checked" : ""} onchange="toggleWork('${a.id}', this.checked)">
            <span class="checkmark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          </label>
        </td>
        <td>${money(a.cn)}</td>
        <td>${money(a.tv)}</td>
        <td>${money(a.ron)}</td>
        <td><span class="badge badge-warning" title="Tỷ lệ % CN: ${a.cnRate}%">+${money(a.cnPct)}</span></td>
        <td><span class="badge badge-success" title="Tỷ lệ % TV: ${a.tvRate}%">+${money(a.tvPct)}</span></td>
        <td><span class="badge badge-purple" title="Tỷ lệ % Ron: ${a.ronRate}%">+${money(a.ronPct)}</span></td>
        <td><strong style="color:var(--primary);">${money(a.totalPct)}</strong></td>
        <td style="text-align:right;">
          <div class="action-btns" style="justify-content:flex-end;">
            <button class="table-icon-btn" onclick="editAttendance('${a.id}')" title="Sửa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="table-icon-btn delete-btn" onclick="deleteAttendance('${a.id}')" title="Xóa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function renderPayroll() {
  const m = $("#payrollMonth")?.value || monthNow();
  const emp = $("#payrollEmployee")?.value || data.employees[0]?.id;
  const s = salary(m, emp);

  const summary = $("#payrollSummary");
  if (summary) {
    summary.innerHTML = [
      ["Số ngày công làm", s.days + " ngày"],
      ["Lương ngày công", money(s.base)],
      ["Phụ cấp ngày công", money(s.allowance)],
      ["Doanh thu VS CN", money(s.cn)],
      ["Doanh thu VS TV", money(s.tv)],
      ["Doanh thu Ron Keo", money(s.ron)],
      [`Tiền % VS CN`, money(s.pCN)],
      [`Tiền % VS TV`, money(s.pTV)],
      [`Tiền % Ron Keo`, money(s.pRon)],
      ["Tổng hoa hồng %", money(s.pct)],
      ["TỔNG LƯƠNG NHẬN", money(s.total)]
    ].map((x, i) => `
      <div class="pay-card ${i === 10 ? "total" : ""}">
        <span>${x[0]}</span>
        <strong>${x[1]}</strong>
      </div>
    `).join("");
  }

  const tbody = $("#payrollBody");
  if (!tbody) return;

  if (s.r.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Chưa có chi tiết ngày công nào trong tháng này.</td></tr>`;
    return;
  }

  tbody.innerHTML = s.r.map(a => `
    <tr>
      <td><strong>${fmt(a.date)}</strong> (${weekdays[new Date(a.date + "T00:00:00").getDay()]})</td>
      <td>
        ${a.work 
          ? `<span class="badge badge-success">Đi làm</span>` 
          : `<span class="badge badge-muted">Nghỉ</span>`}
      </td>
      <td>${money(a.cn)}</td>
      <td>${money(a.tv)}</td>
      <td>${money(a.ron)}</td>
      <td><strong>${money(a.totalPct)}</strong></td>
    </tr>
  `).join("");
}

function renderEmployees() {
  const list = $("#employeeList");
  if (!list) return;

  if (data.employees.length === 0) {
    list.innerHTML = `<div class="card empty-state">Chưa có nhân viên nào. Bấm "Thêm nhân viên" để bắt đầu.</div>`;
    return;
  }

  list.innerHTML = data.employees.map(e => {
    const totalDaysWorked = data.attendance.filter(a => a.employeeId === e.id && a.work).length;
    const rates = getEmpRates(e.id);
    const hasCustom = (e.cnRate !== null && e.cnRate !== undefined && e.cnRate !== "") ||
                      (e.tvRate !== null && e.tvRate !== undefined && e.tvRate !== "") ||
                      (e.ronRate !== null && e.ronRate !== undefined && e.ronRate !== "");

    return `
      <div class="employee-card">
        <div class="employee-info-box">
          <div class="employee-avatar">${getInitials(e.name)}</div>
          <div>
            <div class="employee-name">${esc(e.name)}</div>
            <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              ${e.active 
                ? `<span class="badge badge-success">Đang làm</span>` 
                : `<span class="badge badge-muted">Đã nghỉ</span>`}
              <span class="badge badge-info">${totalDaysWorked} ngày công</span>
              ${hasCustom 
                ? `<span class="badge badge-warning">Setup % riêng</span>` 
                : `<span class="badge badge-muted">% Mặc định</span>`}
            </div>
            <div style="margin-top:6px;font-size:12px;color:var(--text-muted);display:flex;gap:10px;flex-wrap:wrap;">
              <span>CN: <strong style="color:var(--text-main);">${rates.cnRate}%</strong></span>
              <span>TV: <strong style="color:var(--text-main);">${rates.tvRate}%</strong></span>
              <span>Ron: <strong style="color:var(--text-main);">${rates.ronRate}%</strong></span>
            </div>
          </div>
        </div>
        <div class="action-btns">
          <button class="table-icon-btn" onclick="editEmployee('${e.id}')" title="Sửa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="table-icon-btn delete-btn" onclick="deleteEmployee('${e.id}')" title="Xóa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function renderSettings() {
  const s = data.settings;
  if ($("#baseSalary")) $("#baseSalary").value = s.baseSalary;
  if ($("#standardDays")) $("#standardDays").value = s.standardDays;
  if ($("#allowance")) $("#allowance").value = s.allowance;
  if ($("#cnRate")) $("#cnRate").value = s.cnRate;
  if ($("#tvRate")) $("#tvRate").value = s.tvRate;
  if ($("#ronRate")) $("#ronRate").value = s.ronRate ?? 10;
}

// --- Modals & Forms ---
function openModal(title, html) {
  $("#modalTitle").textContent = title;
  $("#modalContent").innerHTML = html;
  $("#modal").classList.remove("hidden");
}

function closeModal() {
  $("#modal").classList.add("hidden");
}

// Single Attendance Form Modal
function attendanceForm(id = "") {
  const a = data.attendance.find(x => x.id === id) || {
    date: $("#attendanceMonth")?.value ? $("#attendanceMonth").value + "-01" : now.toISOString().slice(0, 10),
    employeeId: data.employees[0]?.id || "",
    work: true,
    cn: 0,
    tv: 0,
    ron: 0
  };

  openModal(
    id ? "Sửa lượt chấm công" : "Thêm lượt chấm công",
    `<form class="modal-form" id="attForm">
      <div class="form-group">
        <label for="fDate">Ngày chấm công</label>
        <input id="fDate" type="date" required value="${a.date}">
      </div>

      <div class="form-group">
        <label for="fEmp">Nhân viên</label>
        <select id="fEmp" required>
          ${data.employees.map(e => `<option value="${e.id}" ${e.id === a.employeeId ? "selected" : ""}>${esc(e.name)}</option>`).join("")}
        </select>
      </div>

      <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
        <label class="custom-checkbox">
          <input id="fWork" type="checkbox" ${a.work ? "checked" : ""}>
          <span class="checkmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
        </label>
        <span style="font-weight:600;font-size:14px;">Tính ngày công (Đi làm)</span>
      </div>

      <div class="form-group">
        <label for="fCN">Doanh thu VS công nghiệp (VNĐ)</label>
        <input id="fCN" type="number" min="0" step="1000" value="${a.cn || 0}" placeholder="0">
      </div>

      <div class="form-group">
        <label for="fTV">Doanh thu VS tạp vụ (VNĐ)</label>
        <input id="fTV" type="number" min="0" step="1000" value="${a.tv || 0}" placeholder="0">
      </div>

      <div class="form-group">
        <label for="fRon">Doanh thu Ron keo (VNĐ)</label>
        <input id="fRon" type="number" min="0" step="1000" value="${a.ron || 0}" placeholder="0">
      </div>

      <!-- Real-time Live Calculation Box -->
      <div class="preview-box">
        <div>
          <label id="lblCNP">Tiền % VS CN:</label>
          <strong id="prevCNP">0 ₫</strong>
        </div>
        <div>
          <label id="lblTVP">Tiền % VS TV:</label>
          <strong id="prevTVP">0 ₫</strong>
        </div>
        <div>
          <label id="lblRonP">Tiền % Ron keo:</label>
          <strong id="prevRonP">0 ₫</strong>
        </div>
        <div style="grid-column: 1 / -1; border-top:1px solid var(--border-color); padding-top:6px;">
          <label>Tổng hoa hồng % trong ngày:</label>
          <strong id="prevTotalP" style="color:var(--success);font-size:16px;">0 ₫</strong>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" onclick="closeModal()">Hủy</button>
        <button class="primary" type="submit">Lưu bản ghi</button>
      </div>
    </form>`
  );

  const updatePreview = () => {
    const empId = $("#fEmp")?.value || "";
    const rates = getEmpRates(empId);

    if ($("#lblCNP")) $("#lblCNP").textContent = `Tiền % VS CN (${rates.cnRate}%):`;
    if ($("#lblTVP")) $("#lblTVP").textContent = `Tiền % VS TV (${rates.tvRate}%):`;
    if ($("#lblRonP")) $("#lblRonP").textContent = `Tiền % Ron keo (${rates.ronRate}%):`;

    const cnVal = +$("#fCN").value || 0;
    const tvVal = +$("#fTV").value || 0;
    const ronVal = +$("#fRon").value || 0;

    const cnP = (cnVal * rates.cnRate) / 100;
    const tvP = (tvVal * rates.tvRate) / 100;
    const ronP = (ronVal * rates.ronRate) / 100;

    if ($("#prevCNP")) $("#prevCNP").textContent = money(cnP);
    if ($("#prevTVP")) $("#prevTVP").textContent = money(tvP);
    if ($("#prevRonP")) $("#prevRonP").textContent = money(ronP);
    if ($("#prevTotalP")) $("#prevTotalP").textContent = money(cnP + tvP + ronP);
  };

  $("#fEmp").onchange = updatePreview;
  $("#fCN").oninput = updatePreview;
  $("#fTV").oninput = updatePreview;
  $("#fRon").oninput = updatePreview;
  updatePreview();

  $("#attForm").onsubmit = e => {
    e.preventDefault();
    const o = {
      id: id || crypto.randomUUID(),
      date: $("#fDate").value,
      employeeId: $("#fEmp").value,
      work: $("#fWork").checked,
      cn: +$("#fCN").value || 0,
      tv: +$("#fTV").value || 0,
      ron: +$("#fRon").value || 0
    };

    if (id) {
      const idx = data.attendance.findIndex(x => x.id === id);
      if (idx !== -1) data.attendance[idx] = o;
    } else {
      data.attendance.push(o);
    }

    save();
    closeModal();
    renderAll();
    toast(id ? "Đã cập nhật lượt chấm công" : "Đã thêm lượt chấm công mới");
  };
}

// Batch Attendance Form Modal (Chấm công nhanh nhiều nhân viên)
function batchAttendanceForm() {
  const activeEmps = data.employees.filter(e => e.active);
  if (activeEmps.length === 0) {
    toast("Cần có ít nhất 1 nhân viên đang làm việc.");
    return;
  }

  const todayStr = now.toISOString().slice(0, 10);

  openModal(
    "⚡ Chấm công nhanh theo ngày",
    `<form class="modal-form" id="batchForm">
      <div class="form-group">
        <label for="bDate">Chọn ngày chấm công</label>
        <input id="bDate" type="date" required value="${todayStr}">
      </div>

      <div class="card-title" style="margin-top:6px;">Danh sách nhân viên đi làm</div>
      <div style="display:grid;gap:10px;max-height:200px;overflow-y:auto;padding-right:4px;">
        ${activeEmps.map(e => `
          <label class="custom-checkbox" style="gap:10px;background:var(--bg-subtle);padding:10px 14px;border-radius:var(--radius-md);">
            <input type="checkbox" class="batch-emp-cb" value="${e.id}" checked>
            <span class="checkmark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
            <span style="font-weight:600;">${esc(e.name)}</span>
          </label>
        `).join("")}
      </div>

      <div class="form-group">
        <label for="bCN">Doanh thu VS CN mặc định cho mỗi người (VNĐ)</label>
        <input id="bCN" type="number" min="0" step="1000" value="0" placeholder="0">
      </div>

      <div class="form-group">
        <label for="bTV">Doanh thu VS TV mặc định cho mỗi người (VNĐ)</label>
        <input id="bTV" type="number" min="0" step="1000" value="0" placeholder="0">
      </div>

      <div class="form-group">
        <label for="bRon">Doanh thu Ron keo mặc định cho mỗi người (VNĐ)</label>
        <input id="bRon" type="number" min="0" step="1000" value="0" placeholder="0">
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" onclick="closeModal()">Hủy</button>
        <button class="primary" type="submit">Xác nhận chấm công</button>
      </div>
    </form>`
  );

  $("#batchForm").onsubmit = e => {
    e.preventDefault();
    const dateVal = $("#bDate").value;
    const selectedEmpIds = $$(".batch-emp-cb:checked").map(cb => cb.value);
    const cnVal = +$("#bCN").value || 0;
    const tvVal = +$("#bTV").value || 0;
    const ronVal = +$("#bRon").value || 0;

    if (selectedEmpIds.length === 0) {
      toast("Vui lòng chọn ít nhất 1 nhân viên.");
      return;
    }

    let addedCount = 0;
    selectedEmpIds.forEach(empId => {
      const existingIdx = data.attendance.findIndex(x => x.date === dateVal && x.employeeId === empId);
      const record = {
        id: existingIdx !== -1 ? data.attendance[existingIdx].id : crypto.randomUUID(),
        date: dateVal,
        employeeId: empId,
        work: true,
        cn: cnVal,
        tv: tvVal,
        ron: ronVal
      };

      if (existingIdx !== -1) {
        data.attendance[existingIdx] = record;
      } else {
        data.attendance.push(record);
      }
      addedCount++;
    });

    save();
    closeModal();
    renderAll();
    toast(`Đã ghi nhận chấm công cho ${addedCount} nhân viên!`);
  };
}

window.editAttendance = attendanceForm;

window.toggleWork = (id, val) => {
  const a = data.attendance.find(x => x.id === id);
  if (a) {
    a.work = val;
    save();
    renderAll();
    toast(val ? "Đánh dấu đi làm" : "Đánh dấu nghỉ");
  }
};

window.deleteAttendance = id => {
  if (confirm("Bạn có chắc chắn muốn xóa bản ghi chấm công này?")) {
    data.attendance = data.attendance.filter(x => x.id !== id);
    save();
    renderAll();
    toast("Đã xóa bản ghi chấm công");
  }
};

// Employee Form Modal
function employeeForm(id = "") {
  const emp = data.employees.find(x => x.id === id) || { 
    name: "", active: true, cnRate: null, tvRate: null, ronRate: null 
  };

  const globalCN = data.settings.cnRate || 10;
  const globalTV = data.settings.tvRate || 7;
  const globalRon = data.settings.ronRate || 10;

  openModal(
    id ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới",
    `<form class="modal-form" id="empForm">
      <div class="form-group">
        <label for="eName">Họ và tên nhân viên</label>
        <input id="eName" required value="${esc(emp.name)}" placeholder="Ví dụ: Nguyễn Văn A">
      </div>

      <div class="form-group" style="flex-direction:row;align-items:center;gap:10px;">
        <label class="custom-checkbox">
          <input id="eActive" type="checkbox" ${emp.active ? "checked" : ""}>
          <span class="checkmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
        </label>
        <span style="font-weight:600;font-size:14px;">Đang làm việc</span>
      </div>

      <div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:4px;">
        <div style="font-weight:700;font-size:14px;color:var(--text-main);margin-bottom:10px;">Cấu hình % hoa hồng riêng (để trống nếu dùng mặc định)</div>
        <div class="form-grid form-grid-2col">
          <div class="form-group">
            <label for="eCN">Tỷ lệ % VS Công nghiệp</label>
            <input id="eCN" type="number" min="0" max="100" step="0.1" value="${emp.cnRate != null ? emp.cnRate : ""}" placeholder="Mặc định: ${globalCN}%">
          </div>
          <div class="form-group">
            <label for="eTV">Tỷ lệ % VS Tạp vụ</label>
            <input id="eTV" type="number" min="0" max="100" step="0.1" value="${emp.tvRate != null ? emp.tvRate : ""}" placeholder="Mặc định: ${globalTV}%">
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label for="eRon">Tỷ lệ % Ron keo</label>
            <input id="eRon" type="number" min="0" max="100" step="0.1" value="${emp.ronRate != null ? emp.ronRate : ""}" placeholder="Mặc định: ${globalRon}%">
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" onclick="closeModal()">Hủy</button>
        <button class="primary" type="submit">Lưu thông tin</button>
      </div>
    </form>`
  );

  $("#empForm").onsubmit = e => {
    e.preventDefault();
    const nameVal = $("#eName").value.trim();
    if (!nameVal) return;

    const parseRate = val => (val.trim() === "" || isNaN(val)) ? null : +val;

    const o = {
      id: id || crypto.randomUUID(),
      name: nameVal,
      active: $("#eActive").checked,
      cnRate: parseRate($("#eCN").value),
      tvRate: parseRate($("#eTV").value),
      ronRate: parseRate($("#eRon").value)
    };

    if (id) {
      const idx = data.employees.findIndex(x => x.id === id);
      if (idx !== -1) data.employees[idx] = o;
    } else {
      data.employees.push(o);
    }

    save();
    closeModal();
    renderAll();
    toast(id ? "Đã cập nhật nhân viên" : "Đã thêm nhân viên mới");
  };
}

window.editEmployee = employeeForm;

window.deleteEmployee = id => {
  if (confirm("Xóa nhân viên này? Tất cả dữ liệu liên quan vẫn được lưu.")) {
    data.employees = data.employees.filter(e => e.id !== id);
    save();
    renderAll();
    toast("Đã xóa nhân viên");
  }
};

// --- Export / Import / Reset / CSV Print ---
function exportData() {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bang-luong-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Đã xuất file sao lưu JSON thành công");
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.settings || !Array.isArray(parsed.employees) || !Array.isArray(parsed.attendance)) {
        throw new Error("Invalid structure");
      }
      data = parsed;
      save();
      renderAll();
      toast("Đã nhập dữ liệu thành công");
    } catch (err) {
      alert("File sao lưu không hợp lệ. Vui lòng chọn file JSON chuẩn.");
    }
  };
  reader.readAsText(file);
}

function exportPayrollCsv() {
  const m = $("#payrollMonth")?.value || monthNow();
  const empId = $("#payrollEmployee")?.value || data.employees[0]?.id;
  const s = salary(m, empId);
  const empName = employeeName(empId);

  let csvContent = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  csvContent += `BẢNG LƯƠNG CHI TIẾT THÁNG ${m}\n`;
  csvContent += `Nhân viên: ${empName}\n\n`;
  csvContent += `Hạng mục,Số tiền / Giá trị\n`;
  csvContent += `Số ngày công làm,${s.days} ngày\n`;
  csvContent += `Lương cơ bản,${s.base}\n`;
  csvContent += `Phụ cấp,${s.allowance}\n`;
  csvContent += `Doanh thu VS CN,${s.cn}\n`;
  csvContent += `Doanh thu VS TV,${s.tv}\n`;
  csvContent += `Doanh thu Ron keo,${s.ron}\n`;
  csvContent += `Tiền % VS CN,${s.pCN}\n`;
  csvContent += `Tiền % VS TV,${s.pTV}\n`;
  csvContent += `Tiền % Ron keo,${s.pRon}\n`;
  csvContent += `Tổng tiền %,${s.pct}\n`;
  csvContent += `TỔNG LƯƠNG THỰC LĨNH,${s.total}\n\n`;

  csvContent += `CHI TIẾT HẰNG NGÀY\n`;
  csvContent += `Ngày,Trạng thái,Doanh thu VS CN,Doanh thu VS TV,Doanh thu Ron keo,Tiền % trong ngày\n`;
  s.r.forEach(a => {
    csvContent += `"${fmt(a.date)}","${a.work ? "Đi làm" : "Nghỉ"}",${a.cn || 0},${a.tv || 0},${a.ron || 0},${a.totalPct}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Phieu_Luong_${empName.replace(/\s+/g, '_')}_${m}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Đã xuất file CSV phiếu lương thành công");
}

function generateSampleData() {
  if (confirm("Tạo dữ liệu mẫu thử nghiệm? Dữ liệu hiện tại sẽ được cập nhật thêm.")) {
    const curMonth = monthNow();
    const emp1Id = data.employees[0]?.id || crypto.randomUUID();
    let emp2 = data.employees.find(e => e.name === "Minh");
    if (!emp2) {
      emp2 = { id: crypto.randomUUID(), name: "Minh", active: true };
      data.employees.push(emp2);
    }

    // Add 10 sample attendance records for current month
    for (let i = 1; i <= 10; i++) {
      const dayStr = String(i).padStart(2, "0");
      const dateVal = `${curMonth}-${dayStr}`;

      if (!data.attendance.some(a => a.date === dateVal && a.employeeId === emp1Id)) {
        data.attendance.push({
          id: crypto.randomUUID(),
          date: dateVal,
          employeeId: emp1Id,
          work: true,
          cn: i % 2 === 0 ? 1500000 : 0,
          tv: i % 3 === 0 ? 800000 : 0,
          ron: i % 4 === 0 ? 500000 : 0
        });
      }

      if (!data.attendance.some(a => a.date === dateVal && a.employeeId === emp2.id)) {
        data.attendance.push({
          id: crypto.randomUUID(),
          date: dateVal,
          employeeId: emp2.id,
          work: true,
          cn: i % 3 === 0 ? 2000000 : 0,
          tv: i % 2 === 0 ? 1000000 : 0,
          ron: i % 2 === 0 ? 600000 : 0
        });
      }
    }

    save();
    renderAll();
    toast("Đã tạo dữ liệu mẫu thành công!");
  }
}

function resetData() {
  if (confirm("CẢNH BÁO: Xóa toàn bộ dữ liệu trên thiết bị? Hãy xuất file JSON sao lưu trước.")) {
    localStorage.removeItem(KEY);
    data = structuredClone(defaults);
    save();
    renderAll();
    toast("Đã đặt lại toàn bộ dữ liệu");
  }
}

// --- PWA Installation Prompt ---
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstall = e;
  if ($("#installCard")) $("#installCard").style.display = "flex";
});

$("#installBtn")?.addEventListener("click", async () => {
  if (!deferredInstall) {
    toast("Mở menu trình duyệt và chọn 'Thêm vào màn hình chính'");
    return;
  }
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
});

window.addEventListener("appinstalled", () => {
  if ($("#installCard")) $("#installCard").style.display = "none";
  toast("Ứng dụng đã được cài thành công!");
});

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  // Set default current month in inputs
  ["dashboardMonth", "attendanceMonth", "payrollMonth"].forEach(id => {
    const el = $("#" + id);
    if (el) el.value = monthNow();
  });

  // Attach Navigation Click Handlers
  $$(".nav-btn, .desktop-nav-btn, [data-page]").forEach(b => {
    b.addEventListener("click", () => {
      const page = b.dataset.page;
      if (page) showPage(page);
    });
  });

  // Action Buttons
  if ($("#addAttendance")) $("#addAttendance").onclick = () => attendanceForm();
  if ($("#dashAddAttendance")) $("#dashAddAttendance").onclick = () => attendanceForm();
  if ($("#batchAttendanceBtn")) $("#batchAttendanceBtn").onclick = () => batchAttendanceForm();
  if ($("#dashBatchAttendance")) $("#dashBatchAttendance").onclick = () => batchAttendanceForm();
  if ($("#addEmployee")) $("#addEmployee").onclick = () => employeeForm();
  if ($("#closeModal")) $("#closeModal").onclick = closeModal;
  if ($("#modal")) $("#modal").onclick = e => { if (e.target.id === "modal") closeModal(); };

  // Filter Listeners
  if ($("#dashboardMonth")) $("#dashboardMonth").onchange = renderAll;
  if ($("#attendanceMonth")) $("#attendanceMonth").onchange = renderAttendance;
  if ($("#attendanceEmployee")) $("#attendanceEmployee").onchange = renderAttendance;
  if ($("#attendanceSearch")) $("#attendanceSearch").oninput = renderAttendance;

  if ($("#payrollMonth")) $("#payrollMonth").onchange = renderPayroll;
  if ($("#payrollEmployee")) $("#payrollEmployee").onchange = renderPayroll;

  // Settings Form Submit
  if ($("#settingsForm")) {
    $("#settingsForm").onsubmit = e => {
      e.preventDefault();
      data.settings = {
        baseSalary: +$("#baseSalary").value || 0,
        standardDays: +$("#standardDays").value || 26,
        allowance: +$("#allowance").value || 0,
        cnRate: +$("#cnRate").value || 0,
        tvRate: +$("#tvRate").value || 0,
        ronRate: +$("#ronRate").value || 0
      };
      save();
      renderAll();
      toast("Đã lưu cấu hình mới");
    };
  }

  // Export / Import / Print
  if ($("#exportBtn")) $("#exportBtn").onclick = exportData;
  if ($("#backupBtn")) $("#backupBtn").onclick = exportData;
  if ($("#importFile")) $("#importFile").onchange = e => e.target.files[0] && importData(e.target.files[0]);
  if ($("#exportCsvBtn")) $("#exportCsvBtn").onclick = exportPayrollCsv;
  if ($("#sampleDataBtn")) $("#sampleDataBtn").onclick = generateSampleData;
  if ($("#resetBtn")) $("#resetBtn").onclick = resetData;

  // Initial Render
  renderAll();
});