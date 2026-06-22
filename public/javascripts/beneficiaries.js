// ─────────────────────────────────────────────
//  BENEFICIARIES
// ─────────────────────────────────────────────
async function loadBeneficiaries() {

  try {

    const r = await api(
      "GET",
      "/api/v1/transaction/beneficiaries"
    );

    if (r.success) {
      renderBenList(r.data);
    }

  } catch (error) {
    console.error(error);
  }
     
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
       
      </div>
      <button class="btn btn-outline btn-sm" onclick="removeBen('${b._id}')">Remove</button>
    </div>`;
    })
    .join("");
}

function openAddBen() {
  openModal("add-ben-modal");
}

async function doAddBen() {
  
  const accno = +document.getElementById("ben-accno").value;
  
  try {
    const r = await api("POST", "/api/v1/transaction/add-beneficiary", {
      accountNo: accno,
    });
    if (r.success) {
      await loadBeneficiaries();
      await loadTransferBalanceAndBens();
      closeModal("add-ben-modal");
      document.getElementById("ben-accno").value = "";
      toast("Beneficiary added!", "success");
    } else toast(r.error || r.message, "error");
  } catch {
    toast("Cannot reach server", "error");
  }
}

async function removeBen(id) {



  try {

    const r = await api(
      "DELETE",
      `/api/v1/transaction/beneficiary/${id}`
      
    );
   

    if (r.success) {

  const benRes = await api(
    "GET",
    "/api/v1/transaction/beneficiaries"
  );

  console.log("After Delete:", benRes.data);

  renderBenList(benRes.data);

  await loadTransferBalanceAndBens();

  toast(
    "Beneficiary removed",
    "success"
  );

}

  } catch {

    toast(
      "Cannot reach server",
      "error"
    );

  }

}

window.loadBeneficiaries = loadBeneficiaries;
window.renderBenList = renderBenList;
window.openAddBen = openAddBen;
window.doAddBen = doAddBen;
window.removeBen = removeBen;
