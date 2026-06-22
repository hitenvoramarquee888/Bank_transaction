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
  document.getElementById("toast").appendChild(d);
  setTimeout(() => d.remove(), 4000);
  
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
window.fmt = fmt;
window.fmtDate = fmtDate;
window.api = api;
window.toast = toast;
window.openModal = openModal;
window.closeModal = closeModal;

