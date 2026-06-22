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
     const benRes = await api(
    "GET",
    "/api/v1/transaction/beneficiaries"
  );

  if (benRes.success) {

    const sel =
      document.getElementById(
        "transfer-ben-select"
      );

    sel.innerHTML =
      '<option value="">-- Select a beneficiary --</option>' +
      benRes.data
        .map(
          (b) =>
            `<option value="${b._id}">${b.beneficiaryName}</option>`
        )
        .join("");

  }
       
  } catch {}
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
window.setTransferMode = setTransferMode;
window.loadTransferBalanceAndBens = loadTransferBalanceAndBens;
window.loadTransactionBalance = loadTransactionBalance;
window.doTransfer = doTransfer;