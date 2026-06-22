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
window.setMethod = setMethod;
window.doTransaction = doTransaction;
window.loadRecentTransactions = loadRecentTransactions;