const API_URL = "http://localhost:10000";

const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get("token");

if (tokenFromUrl) {
  console.log("Token captured from URL!");
  localStorage.setItem("access_token", tokenFromUrl);

  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}

const currentToken = localStorage.getItem("access_token");
const isDashboard = window.location.pathname.includes("dashboard.html");

if (isDashboard && !currentToken) {
  console.warn("No token found. Redirecting to login...");
  window.location.href = "index.html";
}

// --- HELPERS ---

function saveTokenAndRedirect(data) {
  localStorage.setItem("access_token", data.access_token);

  const pendingGame = localStorage.getItem("redirect_after_login");
  if (pendingGame) {
    localStorage.removeItem("redirect_after_login");
    window.location.href = pendingGame;
  } else {
    window.location.href = "dashboard.html";
  }
}

async function handleResponse(response) {
  if (response.status === 401) {
    localStorage.removeItem("access_token");
    if (isDashboard) window.location.href = "index.html";
    throw new Error("Session expired. Please login again.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong");
  }
  return data;
}

// --- AUTH FUNCTIONS ---

// --- REGISTER ---

async function handleRegister() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const name = document.getElementById("reg-name").value;
  const username = document.getElementById("reg-username").value;

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, username }),
    });
    const data = await handleResponse(response);
    alert(data.message);
    document.getElementById("reg-otp-section").style.display = "block";
  } catch (err) {
    alert(err.message);
  }
}

async function handleVerifyRegistration() {
  const email = document.getElementById("reg-email").value;
  const otp = document.getElementById("reg-otp").value;

  const data = await handleResponse(
    await fetch(`${API_URL}/auth/verify?email=${email}&otp=${otp}`, {
      method: "POST",
    }),
  );

  alert(data.message);
  location.reload();
}

// --- LOGIN ---

async function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const formData = new FormData();
  formData.append("username", email);
  formData.append("password", password);

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });
    const data = await handleResponse(response);
    saveTokenAndRedirect(data);
  } catch (err) {
    alert(err.message);
  }
}

// // --- FORGOT PASSWORD ---

function toggleModal(show) {
  document.getElementById("fp-modal").style.display = show ? "block" : "none";
}

async function handleForgotPassword() {
  const email = document.getElementById("fp-email").value;
  const data = await handleResponse(
    await fetch(`${API_URL}/auth/forgot-password?email=${email}`, {
      method: "POST",
    }),
  );
  alert(data.message);
  document.getElementById("fp-step-1").style.display = "none";
  document.getElementById("fp-step-2").style.display = "block";
}

async function handleResetPassword() {
  const email = document.getElementById("fp-email").value;
  const otp = document.getElementById("fp-otp").value;
  const new_password = document.getElementById("fp-new-password").value;

  const data = await handleResponse(
    await fetch(
      `${API_URL}/auth/reset-password?email=${email}&otp=${otp}&new_password=${new_password}`,
      {
        method: "POST",
      },
    ),
  );
  alert(data.message);
  toggleModal(false);
}

// --- PROFILE LOGIC ---

async function fetchProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await handleResponse(response);

    document.getElementById("profile-details").innerHTML = `
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Username:</strong> ${data.username}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Rating:</strong> ${data.rating}</p>
            <p><strong>Verified:</strong> ${data.is_verified ? "✅" : "❌"}</p>
        `;
  } catch (err) {
    console.error("Profile load failed:", err);
  }
}

let pendingRedirectUrl = "";

async function createNewGame(mode) {
  const token = localStorage.getItem("access_token");
  try {
    const response = await fetch(`${API_URL}/game/create/${mode}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await handleResponse(response);

    const currentDir = window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/") + 1,
    );

    if (mode === "bot") {
      window.location.href = currentDir + data.redirect_url;
    } else {
      const inviteSection = document.getElementById("invite-section");
      const inviteInput = document.getElementById("invite-link");

      const fullUrl = window.location.origin + currentDir + data.redirect_url;

      inviteInput.value = fullUrl;
      inviteSection.style.display = "block";

      pendingRedirectUrl = currentDir + data.redirect_url;
    }
  } catch (err) {
    alert("Error creating game: " + err.message);
  }
}

function goToArena() {
  if (pendingRedirectUrl) {
    window.location.href = pendingRedirectUrl;
  }
}

function handleLogout() {
  localStorage.removeItem("access_token");
  window.location.href = "index.html";
}
