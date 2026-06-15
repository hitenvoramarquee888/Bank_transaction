// ─────────────────────────────────────────────
//  CONFIG — change base URL to your backend
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  SIDEBAR RESPONSIVE TOGGLE
// ─────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleBtn = document.querySelector(".sidebar-toggle");

  sidebar.classList.add("open");
  overlay.classList.add("visible");
  toggleBtn.classList.add("hidden");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleBtn = document.querySelector(".sidebar-toggle");

  sidebar.classList.remove("open");
  overlay.classList.remove("visible");
  toggleBtn.classList.remove("hidden");
}

// Auto-close sidebar when a nav item is clicked on mobile
document.addEventListener('DOMContentLoaded', function () {
  // Auto-close sidebar on nav click (mobile)
  document.querySelectorAll('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  // Fix inline grid styles that can't be overridden by media queries
  function applyResponsiveGridFix() {
    if (window.innerWidth <= 900) {
      document.querySelectorAll('.main [style*="grid-template-columns"]').forEach(function (el) {
        el.style.gridTemplateColumns = '1fr';
      });
    } else {
      // Restore original inline styles on resize to desktop
      // Dashboard card grid
      var dashGrid = document.querySelector('.main > .page > div[style]');
      if (dashGrid) dashGrid.style.gridTemplateColumns = '1fr 1.4fr';
      // Transaction grid
      var txnGrid = document.querySelector('[style*="max-width: 800px"]');
      if (txnGrid) txnGrid.style.gridTemplateColumns = '1fr 1fr';
      // Quick actions
      document.querySelectorAll('[style*="grid-template-columns: 1fr 1fr"]').forEach(function (el) {
        el.style.gridTemplateColumns = '1fr 1fr';
      });
    }
  }

  applyResponsiveGridFix();
  window.addEventListener('resize', applyResponsiveGridFix);
});



const API = "http://localhost:4000"; // ← your Express server URL
let token = localStorage.getItem("np_token") || "";
let currentUser = JSON.parse(localStorage.getItem("np_user") || "null");
let txnMethod = "credit";
let transferMode = "direct";
let histPage = 1,
  histAllData = [];
let forgotPhone = "";

// ─────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────
function fmt(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}
function fmtDate(d) {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}


async function api(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);

  return r.json();
}

function toast(msg, type = "info") {
  const d = document.createElement("div");
  d.className =
    "toast-msg " +
    (type === "error" ? "error" : type === "success" ? "success" : "");
  d.innerHTML = `<span>${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span> ${msg}`;
  document.getElementById("toast").appendChild(d);
  setTimeout(() => d.remove(), 4000);
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
function switchAuth(tab) {
  document
    .querySelectorAll(".auth-form")
    .forEach((f) => f.classList.remove("active"));
  document
    .querySelectorAll(".auth-tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById(tab + "-form").classList.add("active");
  const tabs = ["login", "register", "forgot"];
  document
    .querySelectorAll(".auth-tab-btn")
  [tabs.indexOf(tab)].classList.add("active");
}

async function doLogin(e) {
  debugger;
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-pass").value;
  try {
    const r = await api("POST", "/api/v1/login", {
      email,
      password,
      phone: email,


    });
    if (r.success && r.token) {
      token = r.token;
      currentUser = r.data;
      localStorage.setItem("np_token", token);
      localStorage.setItem("np_user", JSON.stringify(currentUser));
      window.location.href = "/dashboard";
    } else {
      toast(r.error || r.message || "Login failed", "error");
    }
  } catch (err) {
    toast("Cannot reach server. Make sure backend is running.", "error");
  }
}

async function doRegister(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById("reg-name").value,
    // account_number: +document.getElementById('reg-acc').value,
    email: document.getElementById("reg-email").value,
    phone: document.getElementById("reg-phone").value,
    password: document.getElementById("reg-pass").value,
  };

  try {
    const r = await api("POST", "/api/v1/register", body);
    if (r.success) {
      toast("Account created! Please sign in.", "success");
      switchAuth("login");
      document.getElementById("reg-name").value = "";
      document.getElementById("reg-email").value = "";
      document.getElementById("reg-phone").value = "";
      document.getElementById("reg-pass").value = "";

    } else toast(r.error || r.message, "error");
  } catch (err) {
    toast("Cannot reach server", "error");
  }
}

async function sendOtp() {
  forgotPhone = document.getElementById("fp-phone").value;
  if (!forgotPhone) {
    toast("Enter phone number", "error");
    return;
  }
  try {
    const r = await api("POST", "/api/v1/forgotpassword", {
      phone: +forgotPhone,
    });
    if (r.success) {
      toast("OTP sent to registered email", "success");
      document.getElementById("forgot-step1").style.display = "none";
      document.getElementById("forgot-step2").style.display = "block";
    } else toast(r.message, "error");
  } catch {
    toast("Cannot reach server", "error");
  }
}

async function verifyOtp() {
  const otp = document.getElementById("fp-otp").value;
  try {
    const r = await api("POST", "/api/v1/verifyotp", {
      phone: +forgotPhone,
      otp: +otp,
    });
    if (r.success) {
      document.getElementById("forgot-step2").style.display = "none";
      document.getElementById("forgot-step3").style.display = "block";
    } else toast(r.message, "error");
  } catch {
    toast("Cannot reach server", "error");
  }
}

async function resetPass() {
  const password = document.getElementById("fp-newpass").value;
  try {
    const r = await api("POST", "/api/v1/resetpassword", {
      phone: +forgotPhone,
      password,
    });
    if (r.success) {
      toast("Password reset! Please sign in.", "success");
      switchAuth("login");
    } else toast(r.message, "error");
  } catch {
    toast("Cannot reach server", "error");
  }
}

function logout() {
  localStorage.removeItem("np_token");
  localStorage.removeItem("np_user");
  localStorage.clear();
  window.location.href = "/";
}

// ─────────────────────────────────────────────
//  APP INIT
// ─────────────────────────────────────────────
function initApp() {
  if (currentUser) {
    const initials = (currentUser.name || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    if (document.getElementById("sidebar-avatar"))
      document.getElementById("sidebar-avatar").textContent = initials;
    if (document.getElementById("sidebar-name"))
      document.getElementById("sidebar-name").textContent = currentUser.name || "User";
    if (document.getElementById("sidebar-role"))
      document.getElementById("sidebar-role").textContent = currentUser.role || "user";
    if (document.getElementById("admin-nav-link"))
      document.getElementById("admin-nav-link").style.display =
        currentUser.role === "admin" ? "flex" : "none";
    if (document.getElementById("profile-avatar"))
      document.getElementById("profile-avatar").textContent = initials;
    if (document.getElementById("txn-holder"))
      document.getElementById("txn-holder").value = currentUser.id || "";

    if (document.getElementById("dash-date")) {
      const hour = new Date().getHours();
      const greet =
        hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening";
      document.getElementById("dash-date").textContent =
        greet + " , " + (currentUser.name || "") + " — here's your overview";
    }
  }

  // Per-page initialization based on which elements exist on this page
  if (document.getElementById("page-dashboard")) loadDashboard();
  if (document.getElementById("page-transaction")) {
  loadTransactionBalance();
  loadRecentTransactions();
}
  if (document.getElementById("page-transfer")) loadTransferBalanceAndBens();
  if (document.getElementById("page-history")) loadHistory(1);
  if (document.getElementById("page-beneficiaries")) loadBeneficiaries();
  if (document.getElementById("page-profile")) loadProfile();
}

// ─────────────────────────────────────────────
//  NAVIGATION (handled by real page links; per-page data
//  loading is triggered from initApp() at startup)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────
async function loadDashboard() {
  if (!document.getElementById("page-dashboard")) return;
  try {
    const r = await api("GET", "/api/v1/transaction/alldata?page=1&limit=10");
    if (r.success) {
      const bal = r.currentBalance || 0;
      document.getElementById("stat-balance").textContent = fmt(bal);
      document.getElementById("card-balance").textContent = fmt(bal);
      document.getElementById("stat-count").textContent = r.pagination.totaltransactions || 0;



      // calc credits/debits from data
      let credits = 0,
        debits = 0;
      (r.result || []).forEach((t) => {
        if (t.method === "credit") credits += t.transaction;
        else debits += t.transaction;
      });
      document.getElementById("stat-credits").textContent = fmt(credits);
      document.getElementById("stat-debits").textContent = fmt(debits);

      if (currentUser) {
        const name = currentUser.name || "—";
        document.getElementById("card-name").textContent = name;
        const acc = String(currentUser.account_number || "0000");
        document.getElementById("card-number").textContent =
          `**** **** **** ${acc.slice(-4)}`;
      }

      // Recent tbody
      const tbody = document.getElementById("recent-tbody");
      const data = r.result || [];
      if (!data.length) {
        tbody.innerHTML =
          '<tr><td colspan="3"><div class="empty"><p>No transactions yet</p></div></td></tr>';
        return;
      }
      tbody.innerHTML = data
        .map(
          (t) => `
        <tr>
          <td style="color:var(--text-dim);font-size:12px">${fmtDate(t.createdAt)}</td>
          <td><span class="badge badge-${t.method}">${t.method}</span></td>
          <td class="amount amount-${t.method}">${t.method === "credit" ? "+" : "-"}${fmt(t.transaction)}</td>
        </tr>`,
        )
        .join("");
    }
  } catch (e) {
    console.error(e);
    toast("Dashboard load failed", "error");
  }
}

// ─────────────────────────────────────────────
//  TRANSACTION
// ─────────────────────────────────────────────  
function setMethod(m) {
  txnMethod = m;
  document
    .getElementById("opt-credit")
    .classList.toggle("selected", m === "credit");
  document
    .getElementById("opt-debit")
    .classList.toggle("selected", m === "debit");
  document.getElementById("opt-debit").classList.toggle("debit", m === "debit");
  document.getElementById("opt-credit").classList.remove("debit");
}

async function doTransaction() {
  const amount = +document.getElementById("txn-amount").value;

  if (!amount || amount <= 0) {
    toast("Enter a valid amount", "error");

    return;
  }

  try {
    const r = await api(
      "POST",

      "/api/v1/transaction/transaction",

      {
        transaction: amount,

        method: txnMethod,
      },
    );

    if (r.success) {
      toast(
        `${txnMethod === "credit" ? "Credit" : "Debit"
        } of ${fmt(amount)} successful!`,

        "success",

      );

      document.getElementById("txn-amount").value = "";

      document.getElementById("txn-balance-display").textContent = fmt(
        r.currentBalance || 0,


      );


      loadDashboard();
      loadRecentTransactions() 
      
      



    } else {
      toast(r.error || r.message, "error");
    }
  } catch {
    toast("Cannot reach server", "error");
  }
}
async function loadRecentTransactions() {
  try {
    const r = await api(
      "GET",
      "/api/v1/transaction/alldata?page=1&limit=5"
    );

    if (r.success) {
      const tbody = document.getElementById("recent-5-tbody");

      tbody.innerHTML = (r.result || [])
        .slice(0, 5)
        .map(
          (t) => `
          
          <tr>
            
            <td>${fmtDate(t.createdAt)}</td>
            <td>${t.method}</td>
            <td class="amount-${t.method}">
              ${t.method === "credit" ? "+" : "-"}
              ${fmt(t.transaction)}
            </td>
          </tr>
        `
        )
        .join("");
    }
  } catch (err) {
    console.error(err);
  }
}



// -------------------Delete part-----------------


async function deleteAccount() {
  const confirmDelete = confirm(
    "Are you sure you want to delete your account?",
  );

  if (!confirmDelete) return;

  try {
    const r = await api(
      "DELETE",

      "/api/v1/user/delete",
    );

  if (r.success) {

  localStorage.clear();

 window.location.replace("/");

}
  } catch (error) {
    console.log(error);
  }
}

function renderPagination(id, current, total, cb) {
  const el = document.getElementById(id);
  if (total <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = "";
  if (current > 1)
    html += `<button class="page-btn" onclick="${cb.name}(${current - 1})">‹</button>`;
  for (let i = 1; i <= Math.min(total, 7); i++) {
    if (total > 7 && i > 3 && i < total - 1 && Math.abs(i - current) > 1) {
      if (html.slice(-3) != "...") html += '<span class="page-info">…</span>';
      continue;
    }
    html += `<button class="page-btn${i === current ? " active" : ""}" onclick="${cb.name}(${i})">${i}</button>`;
  }
  if (current < total)
    html += `<button class="page-btn" onclick="${cb.name}(${current + 1})">›</button>`;
  el.innerHTML = html;
}

// --------------------------------------
//     HISTORY
// --------------------------------------

let histFilter = "";
function filterHistory(v) {
  histFilter = v;
  loadHistory(1);
}

async function loadHistory(page = 1) {
  histPage = page;
  document.getElementById("history-tbody").innerHTML =
    '<tr><td colspan="5"><div class="loading-overlay"><div class="spinner"></div> Loading...</div></td></tr>';
  try {
    const r = await api(
      "GET",
      `/api/v1/transaction/history/:${currentUser.id}?page=${page}&limit=10`,
    );
    console.log(r);
    if (r.success) {
      const info = `Page ${page} of ${r.pagination?.totalPages || 1} — ${r.pagination?.totalTransactions || 0} transactions`;
      document.getElementById("hist-info").textContent = info;
      let data = r.transactions || [];
      if (histFilter) data = data.filter((t) => t.method === histFilter);
      const tbody = document.getElementById("history-tbody");
      if (!data.length) {
        tbody.innerHTML =
          '<tr><td colspan="5"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><p>No transactions found</p></div></td></tr>';
        return;
      }
      tbody.innerHTML = data
        .map((t, i) => {
          const holder = Array.isArray(t.account_Holdername)
            ? t.account_Holdername[0]?.name || "—"
            : t.account_Holdername?.name || currentUser?.name || "—";
          return `<tr>
          
         <td>${(page - 1) * 10 + i + 1}</td>
         <td>${fmtDate(t.createdAt)}</td>
         <td>${t.senderName || "Self"}</td>
         <td>${t.receiverName || "Self"}</td>
         <td>${t.method || "-"}</td>
         <td class="amount amount-${t.method}">
         ${t.method === "credit" ? "+" : "-"}
         ${fmt(t.transaction)}</td>
         <td class="ac-number">${t.senderAccountNumber || "Self"}</td>
         <td class="ac-number">${t.receiverAccountNumber || "Self"}</td>
          </tr>`;
        }) 
        .join("");
      renderPagination(
        "hist-pagination",
        page,
        r.pagination?.totalPages || 1,
        loadHistory,
      );
    }
  } catch {
    toast("Cannot reach server", "error");
  }
}

function renderPagination(id, current, total, cb) {
  const el = document.getElementById(id);
  if (total <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = "";
  if (current > 1)
    html += `<button class="page-btn" onclick="${cb.name}(${current - 1})">‹</button>`;
  for (let i = 1; i <= Math.min(total, 7); i++) {
    if (total > 7 && i > 3 && i < total - 1 && Math.abs(i - current) > 1) {
      if (html.slice(-3) != "...") html += '<span class="page-info">…</span>';
      continue;
    }
    html += `<button class="page-btn${i === current ? " active" : ""}" onclick="${cb.name}(${i})">${i}</button>`;
  }
  if (current < total)
    html += `<button class="page-btn" onclick="${cb.name}(${current + 1})">›</button>`;
  el.innerHTML = html;
}

// ─────────────────────────────────────────────
//  DOWNLOAD STATEMENT
// ─────────────────────────────────────────────
async function downloadStatement() {
  try {
    const r = await fetch(API + "/api/v1/transaction/statement", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!r.ok) {
      toast("No transactions found", "error");
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "statement.csv";
    a.click();
    toast("Statement downloaded", "success");
  } catch {
    toast("Cannot reach server", "error");
  }
}

// ─────────────────────────────────────────────
//  TRANSFER
// ─────────────────────────────────────────────
function setTransferMode(mode) {
  transferMode = mode;
  document
    .getElementById("t-direct")
    .classList.toggle("active", mode === "direct");
  document
    .getElementById("t-ben")
    .classList.toggle("active", mode === "beneficiary");
  document.getElementById("transfer-direct-section").style.display =
    mode === "direct" ? "block" : "none";
  document.getElementById("transfer-ben-section").style.display =
    mode === "beneficiary" ? "block" : "none";
}

async function loadTransferBalanceAndBens() {
  try {
    const r = await api("GET", "/api/v1/transaction/alldata?page=1&limit=10");
    console.log(r);
    if (r.success)
      document.getElementById("transfer-avail").textContent = fmt(
        r.currentBalance || 0,
      );
  } catch { }
  // populate beneficiary dropdown
  try {
    const bens = JSON.parse(localStorage.getItem("np_bens") || "[]");
    const sel = document.getElementById("transfer-ben-select");
    sel.innerHTML =
      '<option value="">-- Select a beneficiary --</option>' +
      bens
        .map(
          (b) =>
            `<option value="${b._id}">${b.beneficiaryName} (${b.accountNo})</option>`,
        )
        .join("");
  } catch { }
}
async function loadTransactionBalance() {
  try {
    const r = await api(
      "GET",
      "/api/v1/transaction/alldata?page=1&limit=10"
    );

    if (r.success) {
      document.getElementById(
        "txn-balance-display"
      ).textContent = fmt(r.currentBalance || 0);
    }
  } catch (err) {
    console.error(err);
  }
}

async function doTransfer() {
  const amount = +document.getElementById("transfer-amount").value;
  if (!amount || amount <= 0) {
    toast("Enter a valid amount", "error");
    return;
  }
  const body = { amount };
  if (transferMode === "direct") {
    const acc = +document.getElementById("transfer-accno").value;
    if (!acc) {
      toast("Enter receiver account number", "error");
      return;
    }
    body.receiverAccountNo = acc;
  } else {
    const benId = document.getElementById("transfer-ben-select").value;
    if (!benId) {
      toast("Select a beneficiary", "error");
      return;
    }
    body.beneficiaryId = benId;
  }
  try {
    const r = await api("POST", "/api/v1/transaction/transfer", body);
    if (r.success) {
      toast(`Transfer of ${fmt(amount)} successful!`, "success");
      document.getElementById("transfer-amount").value = "";
      document.getElementById("transfer-avail").textContent = fmt(
        r.currentBalance || 0,
      );
      loadDashboard();
    } else toast(r.error || r.message, "error");
  } catch {
    toast("Cannot reach server", "error");
  }
}

// ─────────────────────────────────────────────
//  BENEFICIARIES
// ─────────────────────────────────────────────
async function loadBeneficiaries() {
  // The API doesn't expose a list endpoint, so we cache locally
  const bens = JSON.parse(localStorage.getItem("np_bens") || "[]");
  renderBenList(bens);
}

function renderBenList(bens) {
  const el = document.getElementById("beneficiary-list");
  if (!bens.length) {
    el.innerHTML =
      '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg><p>No beneficiaries added yet</p></div>';
    return;
  }
  el.innerHTML = bens
    .map((b, i) => {
      const initials = (b.beneficiaryName || "B")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return `<div class="beneficiary-item">
      <div class="avatar" style="width:40px;height:40px">${initials}</div>
      <div class="ben-info">
        <div class="ben-name">${b.beneficiaryName || "—"}</div>
        <div class="ben-acc">${("" + b.accountNo).replace(/(\d{4})/g, "$1 ").trim()}</div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="removeBen(${i})">Remove</button>
    </div>`;
    })
    .join("");
}

function openAddBen() {
  openModal("add-ben-modal");
}

async function doAddBen() {
  const name = document.getElementById("ben-name").value;
  const accno = +document.getElementById("ben-accno").value;
  if (!name || !accno) {
    toast("Fill all fields", "error");
    return;
  }
  try {
    const r = await api("POST", "/api/v1/transaction/add-beneficiary", {
      name,
      accountNo: accno,
    });
    if (r.success) {
      const bens = JSON.parse(localStorage.getItem("np_bens") || "[]");
      bens.push(
        r.data || { _id: Date.now(), beneficiaryName: name, accountNo: accno },
      );
      localStorage.setItem("np_bens", JSON.stringify(bens));
      renderBenList(bens);
      closeModal("add-ben-modal");
      document.getElementById("ben-name").value = "";
      document.getElementById("ben-accno").value = "";
      toast("Beneficiary added!", "success");
    } else toast(r.error || r.message, "error");
  } catch {
    toast("Cannot reach server", "error");
  }
}

function removeBen(idx) {
  const bens = JSON.parse(localStorage.getItem("np_bens") || "[]");
  bens.splice(idx, 1);
  localStorage.setItem("np_bens", JSON.stringify(bens));
  renderBenList(bens);
  toast("Beneficiary removed", "info");
}

// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────
async function loadProfile() {
  if (!currentUser) return;
  // document.getElementById('profile-image').textContent = me.image||'—';
  document.getElementById("profile-name").textContent = currentUser.name || "—";
  document.getElementById("profile-email").textContent =
    currentUser.email || "—";
  document.getElementById("upd-name").value = currentUser.name || "";
  document.getElementById("upd-email").value = currentUser.email || "";

  // Try to load full profile
  try {
    const r = await api("GET", "/api/v1/getusers");
    if (r.success && r.data) {
      const me = r.data.find(
        (u) => u._id === currentUser.id || u.email === currentUser.email,
      );
      if (me) {
        document.getElementById("profile-acc").textContent =
          me.account_number || "—";
        document.getElementById("profile-phone").textContent = me.phone || "—";
        document.getElementById("profile-role").textContent = me.role || "user";
        document.getElementById("profile-joined").textContent = me.createdAt
          ? new Date(me.createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
          : "—";
      }
    }
  } catch { }
}

async function doUpdateProfile() {
  const body = {};
  const name = document.getElementById("upd-name").value;
  const email = document.getElementById("upd-email").value;
  const pass = document.getElementById("upd-pass").value;
  if (name) body.name = name;
  if (email) body.email = email;
  if (pass) body.password = pass;

  try {
    const r = await api("PATCH", `/api/v1/${currentUser.id}`, body);
    if (r.success) {
      toast("Profile updated!", "success");
      if (name) currentUser.name = name;
      if (email) currentUser.email = email;
      localStorage.setItem("np_user", JSON.stringify(currentUser));
      document.getElementById("sidebar-name").textContent = currentUser.name;
      document.getElementById("profile-name").textContent = currentUser.name;
      document.getElementById("upd-pass").value = "";
    } else toast(r.error || r.message, "error");
  } catch {
    toast("Cannot reach server", "error");
  }
}

// ─────────────────────────────────────────────
//  STARTUP
// ─────────────────────────────────────────────
(function () {
  const onAuthPage = !!document.getElementById("auth-screen");

  if (token && currentUser) {
    if (onAuthPage) {
      // Already logged in, no need to show login form
      window.location.href = "/dashboard";
      return;
    }
    initApp();
  } else {
    if (!onAuthPage) {
      // Not logged in, can't access protected pages
      window.location.href = "/";
    }
  }
})();

// ─────────────────────────────────────────────
//  ADMIN PANEL
// ─────────────────────────────────────────────

async function adminLoadUsers(scope = "active") {
  const tbody = document.getElementById("admin-users-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div>Loading...</div></td></tr>`;

  const endpoint = scope === "deleted"
    ? "/api/v1/admin/users/deleted"
    : "/api/v1/admin/users";

  const r = await api("GET", endpoint);

  if (!r.success) {
    tbody.innerHTML = `<tr><td colspan="7">Error: ${r.message || "Failed to load users"}</td></tr>`;
    return;
  }

  renderAdminUsers(r.data);
}

function renderAdminUsers(users) {
  const tbody = document.getElementById("admin-users-tbody");
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.name || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>${u.phone || "—"}</td>
      <td>${u.account_number || "—"}</td>
      <td>${u.role || "user"}</td>
      <td>${u.isDeleted ? '<span class="status-deleted">Deleted</span>' : '<span class="status-active">Active</span>'}</td>
      <td><button class="btn btn-outline btn-sm" onclick="adminViewUser('${u._id}')">View</button></td>
    </tr>
  `).join("");
}

async function adminSearchUsers() {
  const query = document.getElementById("admin-search-input").value.trim().toLowerCase();
  const scope = document.getElementById("admin-search-scope").value;

  const endpoint = scope === "deleted"
    ? "/api/v1/admin/users/deleted"
    : "/api/v1/admin/users";

  const r = await api("GET", endpoint);

  if (!r.success) {
    toast(r.message || "Search failed", "error");
    return;
  }

  if (!query) {
    renderAdminUsers(r.data);
    return;
  }

  const filtered = r.data.filter(u =>
    (u.name && u.name.toLowerCase().includes(query)) ||
    (u.email && u.email.toLowerCase().includes(query)) ||
    (u.phone && String(u.phone).includes(query)) ||
    (u.account_number && String(u.account_number).includes(query))
  );

  renderAdminUsers(filtered);
}

async function adminViewUser(userId) {
  const r = await api("GET", `/api/v1/admin/users/${userId}`);

  if (!r.success) {
    toast(r.message || "Failed to fetch user details", "error");
    return;
  }

  const { user, currentBalance, transactions, beneficiaries } = r.data;
  adminCurrentUserId = userId;

  document.getElementById("ad-name").textContent = user.name || "—";
  document.getElementById("ad-email").textContent = user.email || "—";
  document.getElementById("ad-phone").textContent = user.phone || "—";
  document.getElementById("ad-account").textContent = user.account_number || "—";
  document.getElementById("ad-role").textContent = user.role || "user";
  document.getElementById("ad-balance").textContent = fmt(currentBalance);
  document.getElementById("ad-created").textContent = fmtDate(user.createdAt);

  if (user.isDeleted) {
    document.getElementById("ad-status").innerHTML = '<span class="status-deleted">Deleted</span>';
    document.getElementById("ad-deleted-row").style.display = "block";
    document.getElementById("ad-deletedAt").textContent = user.deletedAt ? fmtDate(user.deletedAt) : "—";
  } else {
    document.getElementById("ad-status").innerHTML = '<span class="status-active">Active</span>';
    document.getElementById("ad-deleted-row").style.display = "none";
  }

  // Beneficiaries
  const benTbody = document.getElementById("ad-beneficiaries-tbody");
  if (beneficiaries && beneficiaries.length > 0) {
    benTbody.innerHTML = beneficiaries.map(b => `
      <tr>
        <td>${b.beneficiaryName || "—"}</td>
        <td>${b.account_number || "—"}</td>
        <td>${fmtDate(b.createdAt)}</td>
      </tr>
    `).join("");
  } else {
    benTbody.innerHTML = `<tr><td colspan="3">No beneficiaries</td></tr>`;
  }

  // Transactions
  const txnTbody = document.getElementById("ad-transactions-tbody");
  if (transactions && transactions.length > 0) {
    txnTbody.innerHTML = transactions.map(t => `
      <tr>
        <td>${fmtDate(t.createdAt)}</td>
        <td>${t.method}</td>
        <td>${fmt(t.transaction)}</td>
        <td>${t.senderName || "—"}</td>
        <td>${t.receiverName || "—"}</td>
      </tr>
    `).join("");
  } else {
    txnTbody.innerHTML = `<tr><td colspan="5">No transactions</td></tr>`;
  }

  document.getElementById("admin-detail-card").style.display = "block";
  document.getElementById("admin-detail-card").scrollIntoView({ behavior: "smooth" });
}

function adminCloseDetails() {
  document.getElementById("admin-detail-card").style.display = "none";
}

// Auto-load users when admin page opens
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("admin-users-tbody")) {
    adminLoadUsers("active");

    const scopeSelect = document.getElementById("admin-search-scope");
    if (scopeSelect) {
      scopeSelect.addEventListener("change", function () {
        adminLoadUsers(this.value);
      });
    }
  }
});

//<------------------Admin download statement-------------->
let adminCurrentUserId = null;

async function adminDownloadStatement() {
  if (!adminCurrentUserId) return;

  try {
    const res = await fetch(`${API}/api/v1/admin/users/${adminCurrentUserId}/statement`, {
      headers: { "Authorization": "Bearer " + token },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      toast(errData?.message || "No statement available for this user", "error");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement_${adminCurrentUserId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    toast("Failed to download statement", "error");
  }
}
