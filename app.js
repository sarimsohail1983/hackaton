
"use strict";

/* ==========================================
   HCM LITE - FRONTEND DEMO
   HTML + CSS + JavaScript
   ========================================== */

// Demo accounts: real authentication ke liye backend chahiye.
const accounts = [
  { username: "admin", password: "admin123", role: "Admin", name: "System Admin" },
  { username: "hr", password: "hr123", role: "HR", name: "HR Manager" },
  { username: "employee", password: "emp123", role: "Employee", name: "Ali Khan" }
];

const defaultEmployees = [
  { id: 1, name: "Ali Khan", email: "ali@company.com", department: "Engineering", designation: "Frontend Developer", salary: 65000, role: "Employee" },
  { id: 2, name: "Sara Ahmed", email: "sara@company.com", department: "Human Resources", designation: "HR Executive", salary: 75000, role: "HR" },
  { id: 3, name: "Usman Raza", email: "usman@company.com", department: "Finance", designation: "Accountant", salary: 60000, role: "Employee" },
  { id: 4, name: "Ayesha Noor", email: "ayesha@company.com", department: "Engineering", designation: "UI Designer", salary: 70000, role: "Employee" },
  { id: 5, name: "Hamza Malik", email: "hamza@company.com", department: "Marketing", designation: "Marketing Executive", salary: 55000, role: "Employee" }
];

function loadData(key, fallback) {
  try {
    const value = localStorage.getItem("hcm_" + key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem("hcm_" + key, JSON.stringify(value));
}

let employees = loadData("employees", defaultEmployees);
let leaves = loadData("leaves", []);
let attendance = loadData("attendance", []);
let departments = loadData("departments", [
  "Engineering", "Human Resources", "Finance", "Marketing"
]);
let announcements = loadData("announcements", [
  { text: "Welcome to the HCM Lite company workspace!", date: new Date().toLocaleDateString() }
]);
let audit = loadData("audit", []);
let payrollRuns = loadData("payrollRuns", []);

let currentUser = null;
let activePage = "dashboard";
let toastTimer;

const $ = id => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(value) {
  return "Rs. " + Number(value || 0).toLocaleString("en-PK");
}

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function timeNow() {
  return new Date().toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function recordAudit(message) {
  audit.unshift({
    message,
    user: currentUser?.name || "System",
    date: new Date().toLocaleString()
  });

  audit = audit.slice(0, 100);
  saveData("audit", audit);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function employeeForUser() {
  if (!currentUser) return null;

  return employees.find(emp =>
    emp.email.toLowerCase() === currentUser.email?.toLowerCase()
  ) || employees.find(emp =>
    emp.name === currentUser.name
  ) || employees[0];
}

function isManager() {
  return currentUser && ["Admin", "HR"].includes(currentUser.role);
}

function canManageEmployees() {
  return currentUser?.role === "Admin" || currentUser?.role === "HR";
}

function canManageOrganization() {
  return currentUser?.role === "Admin";
}

function visibleEmployees() {
  if (currentUser?.role === "Admin") return employees;
  if (currentUser?.role === "HR") {
    return employees.filter(emp => emp.role !== "Admin");
  }

  const own = employeeForUser();
  return own ? [own] : [];
}

function visibleLeaves() {
  if (isManager()) {
    return leaves.filter(leave => {
      if (currentUser.role === "Admin") return true;

      const emp = employees.find(item => item.id === leave.employeeId);
      return emp && emp.role !== "Admin";
    });
  }

  const own = employeeForUser();
  return leaves.filter(leave => own && leave.employeeId === own.id);
}

function visibleAttendance() {
  if (isManager()) {
    return attendance.filter(record => {
      if (currentUser.role === "Admin") return true;
      const emp = employees.find(item => item.id === record.employeeId);
      return emp && emp.role !== "Admin";
    });
  }

  const own = employeeForUser();
  return attendance.filter(record => own && record.employeeId === own.id);
}

// ==========================================
// LOGIN AND LOGOUT
// ==========================================

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const username = $("username").value.trim().toLowerCase();
  const password = $("password").value;
  const role = $("role").value;

  const account = accounts.find(item =>
    item.username === username &&
    item.password === password &&
    item.role === role
  );

  if (!account) {
    $("loginError").textContent =
      "Invalid username, password or role. Check demo accounts.";
    return;
  }

  const linkedEmployee = employees.find(emp =>
    emp.email.toLowerCase() === `${account.username}@company.com`
  );

  currentUser = {
    username: account.username,
    name: linkedEmployee?.name || account.name,
    role: account.role,
    email: linkedEmployee?.email || `${account.username}@company.com`
  };

  $("loginError").textContent = "";
  $("loginPage").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("sideName").textContent = currentUser.name;
  $("sideRole").textContent = currentUser.role;
  $("headerName").textContent = currentUser.name;
  $("sideAvatar").textContent = currentUser.name.charAt(0).toUpperCase();
  $("headerAvatar").textContent = currentUser.name.charAt(0).toUpperCase();

  recordAudit("Logged in to the workspace");
  buildNavigation();
  renderAll();
  navigate("dashboard");
});

$("logoutBtn").addEventListener("click", () => {
  if (currentUser) recordAudit("Logged out");

  currentUser = null;
  $("app").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
  $("loginForm").reset();
  $("role").value = "Admin";
  $("loginError").textContent = "";
});

// ==========================================
// ROLE-BASED NAVIGATION
// ==========================================

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦", roles: ["Admin", "HR", "Employee"] },
  { id: "employees", label: "Employees", icon: "♙", roles: ["Admin", "HR"] },
  { id: "attendance", label: "Attendance", icon: "◷", roles: ["Admin", "HR", "Employee"] },
  { id: "leave", label: "Leave Management", icon: "▤", roles: ["Admin", "HR", "Employee"] },
  { id: "payroll", label: "Payroll", icon: "＄", roles: ["Admin", "HR", "Employee"] },
  { id: "organization", label: "Organization Setup", icon: "⚙", roles: ["Admin"] },
  { id: "assistant", label: "AI Assistant", icon: "✦", roles: ["Admin", "HR", "Employee"] },
  { id: "comms", label: "Announcements & Audit", icon: "♧", roles: ["Admin", "HR", "Employee"] }
];

function buildNavigation() {
  $("navigation").innerHTML = "";

  navItems.filter(item => item.roles.includes(currentUser.role))
    .forEach(item => {
      const button = document.createElement("button");
      button.className = "nav-btn";
      button.dataset.page = item.id;
      button.innerHTML =
        `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;

      button.addEventListener("click", () => navigate(item.id));
      $("navigation").appendChild(button);
    });
}

function navigate(page) {
  const item = navItems.find(nav =>
    nav.id === page && nav.roles.includes(currentUser?.role)
  );

  if (!item) {
    showToast("You don't have permission to open this section.");
    return;
  }

  activePage = page;

  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.add("hidden");
  });

  const section = $(page + "Section");
  if (section) section.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("pageTitle").textContent = item.label;
  $("pageSubtitle").textContent = `${currentUser.role} workspace`;

  if (page === "dashboard") renderDashboard();
  if (page === "employees") renderEmployees();
  if (page === "attendance") renderAttendance();
  if (page === "leave") renderLeaves();
  if (page === "payroll") renderPayroll();
  if (page === "organization") renderDepartments();
  if (page === "comms") renderCommunications();
}

// ==========================================
// DASHBOARD AND ANALYTICS
// ==========================================

function renderDashboard() {
  const own = employeeForUser();
  const team = visibleEmployees();
  const myLeaves = visibleLeaves();
  const myAttendance = visibleAttendance();

  const presentToday = myAttendance.filter(item =>
    item.date === today() && item.checkIn
  ).length;

  const pendingLeaves = myLeaves.filter(item =>
    item.status === "Pending"
  ).length;

  const payrollTotal = team.reduce((sum, emp) =>
    sum + Number(emp.salary), 0
  );

  let stats;

  if (currentUser.role === "Admin") {
    stats = [
      ["Total Employees", employees.length, "♙", "Across the company"],
      ["Present Today", presentToday, "◷", "Recorded check-ins"],
      ["Pending Leaves", pendingLeaves, "▤", "Awaiting decisions"],
      ["Monthly Payroll", money(payrollTotal), "＄", "Estimated gross"]
    ];
  } else if (currentUser.role === "HR") {
    stats = [
      ["Team Employees", team.length, "♙", "Accessible records"],
      ["Present Today", presentToday, "◷", "Recorded check-ins"],
      ["Pending Leaves", pendingLeaves, "▤", "Awaiting decisions"],
      ["Monthly Payroll", money(payrollTotal), "＄", "Estimated gross"]
    ];
  } else {
    const ownRecord = myAttendance.find(item => item.date === today());
    stats = [
      ["My Department", own?.department || "N/A", "♙", "Your team"],
      ["My Attendance", ownRecord?.checkOut ? "Complete" : ownRecord?.checkIn ? "Checked In" : "Not Checked In", "◷", "Today's status"],
      ["My Leave Requests", myLeaves.length, "▤", "All your requests"],
      ["My Monthly Salary", money(own?.salary || 0), "＄", "Gross salary"]
    ];
  }

  $("welcomeTitle").textContent = `Welcome back, ${currentUser.name}!`;

  $("statsGrid").innerHTML = stats.map(([label, value, icon, foot]) => `
    <div class="stat-card">
      <div class="stat-top">
        <span>${escapeHTML(label)}</span>
        <span class="stat-icon">${icon}</span>
      </div>
      <strong class="stat-number">${escapeHTML(value)}</strong>
      <span class="stat-foot">${escapeHTML(foot)}</span>
    </div>
  `).join("");

  const activities = [
    ...myLeaves.slice(0, 3).map(item => ({
      icon: "▤",
      text: `${item.name}: ${item.type} — ${item.status}`,
      date: item.start
    })),
    ...myAttendance.slice(0, 3).map(item => ({
      icon: "◷",
      text: `${item.name}: Attendance ${item.checkOut ? "completed" : "checked in"}`,
      date: item.date
    })),
    ...audit.slice(0, 3).map(item => ({
      icon: "✦",
      text: `${item.user}: ${item.message}`,
      date: item.date
    }))
  ].slice(0, 6);

  $("activityList").innerHTML = activities.length
    ? activities.map(item => `
      <div class="activity-item">
        <div class="activity-icon">${item.icon}</div>
        <div>${escapeHTML(item.text)}
          <div class="muted">${escapeHTML(item.date)}</div>
        </div>
      </div>
    `).join("")
    : '<p class="muted">No activity yet.</p>';

  const actions = [
    ["◷", "Open Attendance", "attendance"],
    ["▤", "Apply for Leave", "leave"],
    ["✦", "Ask Smart Assistant", "assistant"]
  ];

  if (canManageEmployees()) {
    actions.unshift(["♙", "Manage Employees", "employees"]);
  }

  $("quickActions").innerHTML = actions.map(([icon, label, page]) => `
    <button class="action-btn" data-action-page="${page}">
      <span>${icon}</span><span>${label}</span>
    </button>
  `).join("");

  $("quickActions").querySelectorAll("[data-action-page]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.actionPage));
  });

  const counts = {};
  team.forEach(emp => {
    counts[emp.department] = (counts[emp.department] || 0) + 1;
  });

  const max = Math.max(1, ...Object.values(counts));

  $("departmentChart").innerHTML = Object.keys(counts).length
    ? Object.entries(counts).map(([department, count]) => `
      <div class="chart-row">
        <span>${escapeHTML(department)}</span>
        <div class="chart-track">
          <div class="chart-fill" style="width:${count / max * 100}%"></div>
        </div>
        <strong>${count}</strong>
      </div>
    `).join("")
    : '<p class="muted">No department data available.</p>';
}

// ==========================================
// EMPLOYEE MANAGEMENT
// ==========================================

$("addEmployeeBtn").addEventListener("click", () => {
  if (!canManageEmployees()) return;
  $("employeeModal").classList.remove("hidden");
});

$("closeModalBtn").addEventListener("click", () => {
  $("employeeModal").classList.add("hidden");
});

$("employeeForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!canManageEmployees()) return;

  const name = $("empName").value.trim();
  const email = $("empEmail").value.trim().toLowerCase();
  const department = $("empDepartment").value.trim();
  const designation = $("empDesignation").value.trim();
  const salary = Number($("empSalary").value);

  if (!name || !email || !department || !designation || salary < 0) {
    showToast("Please enter valid employee details.");
    return;
  }

  if (employees.some(emp => emp.email.toLowerCase() === email)) {
    showToast("This email already exists.");
    return;
  }

  employees.push({
    id: Date.now(),
    name, email, department, designation, salary,
    role: "Employee"
  });

  saveData("employees", employees);
  recordAudit(`Added employee ${name}`);

  $("employeeForm").reset();
  $("employeeModal").classList.add("hidden");
  renderAll();
  showToast("Employee added successfully.");
});

$("employeeSearch").addEventListener("input", renderEmployees);

function renderEmployees() {
  const query = $("employeeSearch").value.toLowerCase();

  const list = visibleEmployees().filter(emp =>
    [emp.name, emp.email, emp.department, emp.designation]
      .some(value => value.toLowerCase().includes(query))
  );

  $("employeeTable").innerHTML = list.length
    ? list.map(emp => `
      <tr>
        <td>
          <div class="person-cell">
            <span class="mini-avatar">${escapeHTML(emp.name.charAt(0))}</span>
            <div>
              <strong>${escapeHTML(emp.name)}</strong>
              <div class="muted">${escapeHTML(emp.email)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHTML(emp.department)}</td>
        <td>${escapeHTML(emp.designation)}</td>
        <td>${money(emp.salary)}</td>
        <td><span class="status-badge">Active</span></td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No employees found.</td></tr>';
}

// ==========================================
// ATTENDANCE
// ==========================================

function renderAttendance() {
  $("attendanceDate").textContent = new Date().toLocaleDateString("en-PK", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const own = employeeForUser();
  const record = attendance.find(item =>
    item.employeeId === own?.id && item.date === today()
  );

  $("attendanceStatus").textContent = record
    ? `Checked in at ${record.checkIn || "--"}${record.checkOut ? " · Checked out at " + record.checkOut : ""}`
    : "You haven't checked in today.";

  $("checkInBtn").disabled = !own || !!record?.checkIn;
  $("checkOutBtn").disabled = !own || !record?.checkIn || !!record?.checkOut;

  $("attendanceTable").innerHTML = visibleAttendance().length
    ? visibleAttendance().slice().reverse().map(item => `
      <tr>
        <td>${escapeHTML(item.name)}</td>
        <td>${escapeHTML(item.date)}</td>
        <td>${escapeHTML(item.checkIn || "--")}</td>
        <td>${escapeHTML(item.checkOut || "--")}</td>
        <td><span class="status-badge">${item.checkOut ? "Complete" : "Present"}</span></td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No attendance records yet.</td></tr>';
}

$("checkInBtn").addEventListener("click", () => {
  const own = employeeForUser();
  if (!own) return;

  if (attendance.some(item =>
    item.employeeId === own.id && item.date === today() && item.checkIn
  )) {
    showToast("You have already checked in.");
    return;
  }

  attendance.push({
    employeeId: own.id,
    name: own.name,
    date: today(),
    checkIn: timeNow(),
    checkOut: ""
  });

  saveData("attendance", attendance);
  recordAudit(`${own.name} checked in`);
  renderAll();
  showToast("Check-in recorded.");
});

$("checkOutBtn").addEventListener("click", () => {
  const own = employeeForUser();
  const record = attendance.find(item =>
    item.employeeId === own?.id && item.date === today()
  );

  if (!record?.checkIn || record.checkOut) {
    showToast("Please check in first.");
    return;
  }

  record.checkOut = timeNow();
  saveData("attendance", attendance);
  recordAudit(`${own.name} checked out`);
  renderAll();
  showToast("Check-out recorded.");
});

// ==========================================
// LEAVE MANAGEMENT
// ==========================================

function updateLeaveSuggestion() {
  const start = $("leaveStart").value;
  const end = $("leaveEnd").value;

  if (!start || !end) {
    $("leaveSuggestion").textContent = "Select your leave dates.";
    return;
  }

  if (end < start) {
    $("leaveSuggestion").textContent = "End date cannot be before start date.";
    return;
  }

  const startDate = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");
  const days = Math.round((endDate - startDate) / 86400000) + 1;

  $("leaveSuggestion").textContent =
    `${days} calendar day(s) requested. Check your team's schedule and leave policy before submitting.`;
}

$("leaveStart").addEventListener("change", updateLeaveSuggestion);
$("leaveEnd").addEventListener("change", updateLeaveSuggestion);

$("leaveForm").addEventListener("submit", event => {
  event.preventDefault();

  const own = employeeForUser();
  const start = $("leaveStart").value;
  const end = $("leaveEnd").value;
  const reason = $("leaveReason").value.trim();

  if (!own || end < start) {
    showToast("Please check your leave dates.");
    return;
  }

  if (start < today()) {
    showToast("Please select today or a future date.");
    return;
  }

  const overlap = leaves.some(item =>
    item.employeeId === own.id &&
    item.status !== "Rejected" &&
    start <= item.end && end >= item.start
  );

  if (overlap) {
    showToast("These dates overlap with another leave request.");
    return;
  }

  leaves.push({
    id: Date.now(),
    employeeId: own.id,
    name: own.name,
    type: $("leaveType").value,
    start, end, reason,
    status: "Pending"
  });

  saveData("leaves", leaves);
  recordAudit(`${own.name} submitted a leave request`);

  $("leaveForm").reset();
  updateLeaveSuggestion();
  renderAll();
  showToast("Leave request submitted.");
});

function renderLeaves() {
  const list = visibleLeaves().slice().reverse();

  $("leaveTable").innerHTML = list.length
    ? list.map(item => {
      const actions = isManager() && item.status === "Pending"
        ? `<button class="small-btn approve-btn" data-leave-id="${item.id}" data-decision="Approved">Approve</button>
           <button class="small-btn reject-btn" data-leave-id="${item.id}" data-decision="Rejected">Reject</button>`
        : `<span class="status-badge ${item.status === "Pending" ? "pending" : item.status === "Rejected" ? "rejected" : ""}">${escapeHTML(item.status)}</span>`;

      return `
        <tr>
          <td>${escapeHTML(item.name)}</td>
          <td>${escapeHTML(item.start)} – ${escapeHTML(item.end)}</td>
          <td>${escapeHTML(item.type)}</td>
          <td>${actions}</td>
        </tr>`;
    }).join("")
    : '<tr><td colspan="4">No leave requests yet.</td></tr>';
}

$("leaveTable").addEventListener("click", event => {
  const button = event.target.closest("[data-leave-id]");
  if (!button || !isManager()) return;

  const item = leaves.find(leave => leave.id === Number(button.dataset.leaveId));
  if (!item || item.status !== "Pending") return;

  if (currentUser.role === "HR") {
    const emp = employees.find(person => person.id === item.employeeId);
    if (!emp || emp.role === "Admin") {
      showToast("This record is outside your permitted scope.");
      return;
    }
  }

  item.status = button.dataset.decision;
  item.reviewedBy = currentUser.name;

  saveData("leaves", leaves);
  recordAudit(`${item.name}'s leave was ${item.status}`);
  renderAll();
  showToast(`Leave ${item.status.toLowerCase()}.`);
});

// ==========================================
// PAYROLL AND PAYSLIP PREVIEW
// ==========================================

function payrollDetails(emp) {
  const gross = Number(emp.salary) || 0;

  // Illustrative demo tax, NOT official Pakistan tax advice.
  const tax = gross * 0.02;
  const net = gross - tax;

  return { gross, tax, net };
}

function renderPayroll() {
  const team = visibleEmployees();
  const totals = team.reduce((result, emp) => {
    const data = payrollDetails(emp);
    result.gross += data.gross;
    result.tax += data.tax;
    result.net += data.net;
    return result;
  }, { gross: 0, tax: 0, net: 0 });

  $("payrollSummary").innerHTML = [
    ["Gross Payroll", money(totals.gross), "＄", "Monthly estimate"],
    ["Estimated Tax", money(totals.tax), "▤", "Demo rate: 2%"],
    ["Net Payroll", money(totals.net), "✓", "After demo deduction"],
    ["Employees", team.length, "♙", "Visible records"]
  ].map(([label, value, icon, foot]) => `
    <div class="stat-card">
      <div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div>
      <strong class="stat-number">${value}</strong>
      <span class="stat-foot">${foot}</span>
    </div>
  `).join("");

  $("runPayrollBtn").classList.toggle("hidden", currentUser.role === "Employee");

  $("payrollTable").innerHTML = team.map(emp => {
    const data = payrollDetails(emp);

    return `
      <tr>
        <td>${escapeHTML(emp.name)}</td>
        <td>${escapeHTML(emp.department)}</td>
        <td>${money(data.gross)}</td>
        <td>${money(data.tax)}</td>
        <td><strong>${money(data.net)}</strong></td>
        <td><button class="payslip-btn" data-payslip-id="${emp.id}">View Payslip</button></td>
      </tr>
    `;
  }).join("") || '<tr><td colspan="6">No payroll records.</td></tr>';
}

$("runPayrollBtn").addEventListener("click", () => {
  if (!isManager()) return;

  const month = today().slice(0, 7);

  if (payrollRuns.includes(month)) {
    showToast("Payroll has already been run for this month.");
    return;
  }

  payrollRuns.push(month);
  saveData("payrollRuns", payrollRuns);
  recordAudit(`Monthly payroll demo run for ${month}`);
  showToast("Demo payroll run completed.");
});

$("payrollTable").addEventListener("click", event => {
  const button = event.target.closest("[data-payslip-id]");
  if (!button) return;

  const emp = visibleEmployees().find(item =>
    item.id === Number(button.dataset.payslipId)
  );

  if (!emp) {
    showToast("Employee record not accessible.");
    return;
  }

  const data = payrollDetails(emp);

  $("payslipPreview").classList.remove("hidden");
  $("payslipPreview").innerHTML = `
    <h2>HCM Lite — Payslip Preview</h2>
    <p class="muted">${escapeHTML(today().slice(0, 7))} · Demo only</p>
    <hr style="margin:18px 0;border:0;border-top:1px solid #e9eaf2">
    <p><strong>Employee:</strong> ${escapeHTML(emp.name)}</p>
    <p><strong>Department:</strong> ${escapeHTML(emp.department)}</p>
    <p><strong>Designation:</strong> ${escapeHTML(emp.designation)}</p>
    <p><strong>Gross Salary:</strong> ${money(data.gross)}</p>
    <p><strong>Illustrative Tax:</strong> ${money(data.tax)}</p>
    <h3 style="margin-top:18px">Net Salary: ${money(data.net)}</h3>
    <p class="muted">This preview is not an official tax calculation or PDF payslip.</p>
    <button id="printPayslipBtn" class="primary-btn">Print / Save as PDF</button>
  `;

  $("printPayslipBtn").addEventListener("click", () => window.print());
  $("payslipPreview").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ==========================================
// ORGANIZATION SETUP
// ==========================================

$("departmentForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!canManageOrganization()) return;

  const name = $("departmentName").value.trim();

  if (departments.some(item => item.toLowerCase() === name.toLowerCase())) {
    showToast("Department already exists.");
    return;
  }

  departments.push(name);
  saveData("departments", departments);
  recordAudit(`Created department ${name}`);

  $("departmentForm").reset();
  renderDepartments();
  showToast("Department added.");
});

function renderDepartments() {
  $("departmentList").innerHTML = departments.map(name =>
    `<span class="tag">${escapeHTML(name)}</span>`
  ).join("");
}

// ==========================================
// DEMO AI ASSISTANT
// ==========================================

$("chatForm").addEventListener("submit", event => {
  event.preventDefault();

  const question = $("chatInput").value.trim();
  if (!question) return;

  addChatMessage(question, "user");
  $("chatInput").value = "";

  const q = question.toLowerCase();
  const own = employeeForUser();
  const myLeaves = visibleLeaves();
  const pending = myLeaves.filter(item => item.status === "Pending").length;

  let answer;

  if (q.includes("leave")) {
    answer = `You have ${myLeaves.length} visible leave request(s), with ${pending} pending. Use Leave Management to apply or review requests.`;
  } else if (q.includes("attendance") || q.includes("check in")) {
    const record = attendance.find(item =>
      item.employeeId === own?.id && item.date === today()
    );

    answer = record
      ? `Today's check-in: ${record.checkIn || "Not recorded"}. Check-out: ${record.checkOut || "Not recorded"}.`
      : "No check-in is recorded for you today. Open Attendance to check in.";
  } else if (q.includes("salary") || q.includes("payroll") || q.includes("payslip")) {
    answer = own
      ? `Your recorded gross monthly salary is ${money(own.salary)}. The demo payslip uses a simplified illustrative deduction, not official tax rates.`
      : "Open Payroll to review available salary records.";
  } else if (q.includes("employee") || q.includes("staff")) {
    answer = `There are ${visibleEmployees().length} employee record(s) in your accessible data scope.`;
  } else if (q.includes("policy") || q.includes("holiday")) {
    answer = "Demo policy: submit leave requests with dates and a reason. Requests remain pending until an authorized manager reviews them. Public holidays and official company rules are not configured yet.";
  } else if (q.includes("dashboard") || q.includes("summary") || q.includes("report")) {
    answer = `Workspace summary: ${visibleEmployees().length} accessible employee(s), ${pending} pending leave request(s), and ${visibleAttendance().filter(item => item.date === today()).length} attendance record(s) today.`;
  } else {
    answer = "I can help with dashboard summaries, employee counts, attendance, leave requests, salary and basic demo policies. Ask me about one of these topics.";
  }

  addChatMessage(answer, "bot");
});

function addChatMessage(message, type) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = message;
  $("chatMessages").appendChild(bubble);
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
}

// ==========================================
// ANNOUNCEMENTS AND AUDIT
// ==========================================

$("announcementForm").addEventListener("submit", event => {
  event.preventDefault();

  const text = $("announcementText").value.trim();
  if (!text) return;

  announcements.unshift({
    text,
    date: new Date().toLocaleString(),
    author: currentUser.name
  });

  saveData("announcements", announcements);
  recordAudit("Published a company announcement");

  $("announcementForm").reset();
  renderCommunications();
  showToast("Announcement published.");
});

function renderCommunications() {
  $("announcementList").innerHTML = announcements.map(item => `
    <div class="announcement">
      <strong>${escapeHTML(item.text)}</strong>
      <small>${escapeHTML(item.author || "Company")} · ${escapeHTML(item.date)}</small>
    </div>
  `).join("");

  const visibleAudit = currentUser.role === "Admin"
    ? audit
    : audit.filter(item => item.user === currentUser.name);

  $("auditList").innerHTML = visibleAudit.length
    ? visibleAudit.slice(0, 30).map(item => `
      <div class="activity-item">
        <div class="activity-icon">✦</div>
        <div>
          ${escapeHTML(item.message)}
          <div class="muted">${escapeHTML(item.user)} · ${escapeHTML(item.date)}</div>
        </div>
      </div>
    `).join("")
    : '<p class="muted">No audit records available.</p>';
};

// ==========================================
// REFRESH ALL VIEWS
// ==========================================

function renderAll() {
  renderDashboard();
  renderEmployees();
  renderAttendance();
  renderLeaves();
  renderPayroll();
  renderDepartments();
  renderCommunications();
}

// Live clock
function updateClock() {
  $("attendanceClock").textContent = new Date().toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

updateClock();
setInterval(updateClock, 1000);

// Initial state
$("app").classList.add("hidden");
$("loginPage").classList.remove("hidden");
