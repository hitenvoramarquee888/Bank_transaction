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
  
  e.preventDefault();
  
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value
  try {
    const r = await api("POST", "/api/v1/login", {
     identifier: email,
     password,
      


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

  window.location.href = "/";
}

window.switchAuth = switchAuth;
window.doLogin = doLogin;
window.doRegister = doRegister;
window.sendOtp = sendOtp;
window.verifyOtp = verifyOtp;
window.resetPass = resetPass;
window.logout = logout;