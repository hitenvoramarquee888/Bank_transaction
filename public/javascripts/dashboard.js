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
window.loadDashboard = loadDashboard;
