// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────
async function loadProfile() {
  if (!currentUser) return;

  document.getElementById("profile-name").textContent = currentUser.name || "—";
  document.getElementById("profile-email").textContent = currentUser.email || "—";
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
        document.getElementById("profile-acc").textContent = me.account_number || "—";
        document.getElementById("profile-phone").textContent = me.phone || "—";
        document.getElementById("profile-role").textContent = me.role || "user";
        document.getElementById("profile-joined").textContent = me.createdAt
          ? new Date(me.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "—";

        // ✅ Avatar — show image if exists, else show initials
        const avatarEl = document.getElementById("profile-avatar");
        if (avatarEl) {
          if (me.profilePic) {
            avatarEl.innerHTML = `<img src="${me.profilePic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
            const removeBtn = document.getElementById("remove-pic-btn");
            if (removeBtn) removeBtn.style.display = "inline-flex";
          } else {
            const initials = (currentUser.name || "U")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            avatarEl.textContent = initials;
          }
        }
      }
    }
  } catch {}
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

//================= upload profile pic ===========//

async function uploadProfilePic(input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('profilePic', file);

  try {
    const res = await fetch(`/api/v1/${currentUser.id}/profile-pic`, {
      method: 'PATCH',
      headers: { 
        'Authorization': 'Bearer ' + token  // use the same variable your app uses
        // do NOT set Content-Type here — browser sets it automatically for FormData
      },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      currentUser.profilePic = data.data.profilePic;
      location.reload();
    } else {
      alert(data.message || 'Upload failed');
    }
  } catch (err) {
    alert('Upload error: ' + err.message);
  }
}

async function removeProfilePic() {
  if (!confirm('Remove your profile picture?')) return;

  try {
    const res = await fetch(`/api/v1/${currentUser.id}/profile-pic`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    const data = await res.json();
    if (data.success) {
      location.reload();
    } else {
      alert(data.message || 'Remove failed');
    }
  } catch (err) {
    alert('Error: ' + err.message);
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
window.loadProfile = loadProfile;
window.doUpdateProfile = doUpdateProfile;
window.uploadProfilePic = uploadProfilePic;
window.removeProfilePic = removeProfilePic;
window.deleteAccount = deleteAccount;
