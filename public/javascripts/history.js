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
window.loadHistory = loadHistory;
window.filterHistory = filterHistory;
window.renderPagination = renderPagination;
window.downloadStatement = downloadStatement;
