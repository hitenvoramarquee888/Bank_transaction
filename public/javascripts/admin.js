// ─────────────────────────────────────────────
//  ADMIN PANEL
// ─────────────────────────────────────────────
let allAdminUsers = [];
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

  allAdminUsers = r.data || [];
  renderAdminUsersWithHighlight(allAdminUsers, "");
}
function adminLiveSearch() {
  const query = document.getElementById("admin-search-input").value.trim().toLowerCase();
  const scope = document.getElementById("admin-search-scope").value;

  // Re-fetch if scope changed, but usually we can reuse cache
  if (!allAdminUsers.length) {
    adminLoadUsers(scope);
    return;
  }

  renderAdminUsersWithHighlight(allAdminUsers, query);
}
function renderAdminUsersWithHighlight(users, query) {
  const tbody = document.getElementById("admin-users-tbody");
  
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No users found</td></tr>`;
    return;
  }

  let filtered = users;
  if (query) {
    filtered = users.filter(u => 
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.phone && String(u.phone).includes(query)) ||
      (u.account_number && String(u.account_number).includes(query))
      
    );
  }

  tbody.innerHTML = filtered.map(u => {
    const highlight = (text) => {
      if (!query || !text) return text || "—";
      const regex = new RegExp(`(${query})`, 'gi');
      return text.toString().replace(regex, '<span style="background:#c9a84c33; color:var(--gold); border-radius:3px;">$1</span>');
    };

    return `
      <tr>
        <td>${highlight(u.name)}</td>
        <td>${highlight(u.email)}</td>
        <td>${highlight(u.phone)}</td>
        <td>${highlight(u.account_number)}</td>
        <td>${u.role || "user"}</td>
        <td>${u.isDeleted ? '<span class="status-deleted">Deleted</span>' : '<span class="status-active">Active</span>'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="adminViewUser('${u._id}')">View</button>${u.isDeleted? `
              <button class="btn btn-success btn-sm" onclick="restoreUser('${u._id}')">Restore</button> ` : ""}</td>
      </tr> `;
  }).join("");
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
      <td>
         <button class="btn btn-outline btn-sm" onclick="adminViewUser('${u._id}')">View</button>
         <button class="btn btn-warning btn-sm" onclick="openEditUserModal('${u._id}')">Edit</button>

           ${u.isDeleted? `
            <button class="btn btn-success btn-sm" onclick="restoreUser('${u._id}')">Restore</button>`: ""}
      </td>
    </tr> `).join("");
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
  adminLiveSearch();
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
    benTbody.innerHTML = beneficiaries.map((b,i) => `
      <tr>
        <td>${i + 1}</td>
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
    txnTbody.innerHTML = transactions.map((t, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${fmtDate(t.createdAt)}</td>
        <td>${t.senderName || "Self"}</td>
        <td>${t.receiverName || "Self"}</td>
        <td>${t.method}</td>
        <td class="amount amount-${t.method}">
         ${t.method === "credit" ? "+" : "-"}
         ${fmt(t.transaction)}</td>
          <td class="ac-number">${t.senderAccountNumber || "Self"}</td>
         <td class="ac-number">${t.receiverAccountNumber || "Self"}</td>

        
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

//  input remove part //
const input = document.getElementById("admin-search-input");
const btn = document.querySelector(".clear-btn");

function inputValueRemove() {
    input.value = "";
    btn.style.display = "none";
}

input.addEventListener("input", () => {
    if (input.value.trim()) {
    btn.style.display = "block";
 }  else {
    btn.style.display = "none";
}
});

btn.style.display = "none";

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
// restore deleted user
async function restoreUser(id) {

  if (!confirm("Restore this user account?")) {
    return;
  }

  const r = await api(
    "PATCH",
    `/api/v1/admin/users/${id}/restore`
  );

  if (!r.success) {
    toast(r.message || "Restore failed", "error");
    return;
  }

  toast("User restored successfully", "success");

 await adminLoadUsers("deleted");
}

window.adminLoadUsers = adminLoadUsers;
window.adminLiveSearch = adminLiveSearch;
window.renderAdminUsersWithHighlight = renderAdminUsersWithHighlight;
window.renderAdminUsers = renderAdminUsers;
window.adminSearchUsers = adminSearchUsers;
window.adminViewUser = adminViewUser;
window.adminCloseDetails = adminCloseDetails;
window.inputValueRemove = inputValueRemove;
window.adminDownloadStatement = adminDownloadStatement;
window.restoreUser = restoreUser;

