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

let viewedUsername = null;

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

// async function fetchProfile() {
//   const token = localStorage.getItem("access_token");
//   if (!token) return;

//   try {
//     const response = await fetch(`${API_URL}/auth/me`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//     const data = await handleResponse(response);

//     document.getElementById("profile-details").innerHTML = `
//             <p><strong>Name:</strong> ${data.name}</p>
//             <p><strong>Username:</strong> ${data.username}</p>
//             <p><strong>Email:</strong> ${data.email}</p>
//             <p><strong>Rating:</strong> ${data.rating} 🏆</p>
//             <p><strong>Highest Speed:</strong> ${data.highest_speed || 0} WPM ⚡</p>
//             <p><strong>Verified:</strong> ${data.is_verified ? "✅" : "❌"}</p>
//         `;
//   } catch (err) {
//     console.error("Profile load failed:", err);
//   }
//   fetchHistory();
// }

async function fetchProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  viewedUsername = null; // Reset to "self"
  document.getElementById("game-controls").style.display = "block"; // Show game buttons

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);

    document.getElementById("profile-details").innerHTML = `
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Username:</strong> ${data.username} (You)</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Rating:</strong> ${data.rating} 🏆</p>
      <p><strong>Highest Speed:</strong> ${data.highest_speed || 0} WPM ⚡</p>
    `;
    fetchHistory(1); // Fetch own history
  } catch (err) {
    console.error("Profile load failed:", err);
  }
}

async function viewOtherProfile(username) {
  if (
    username === "Unknown" ||
    username === "Monkey 🐒" ||
    username === "Guest"
  )
    return;

  viewedUsername = username;
  document.getElementById("game-controls").style.display = "none"; // Hide game buttons for others

  try {
    const response = await fetch(`${API_URL}/auth/public/profile/${username}`);
    const data = await handleResponse(response);

    document.getElementById("profile-details").innerHTML = `
      <button onclick="fetchProfile()" style="margin-bottom:10px;">⬅️ Back to My Profile</button>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Username:</strong> ${data.username}</p>
      <p><strong>Rating:</strong> ${data.rating} 🏆</p>
      <p><strong>Highest Speed:</strong> ${data.highest_speed || 0} WPM ⚡</p>
    `;
    fetchHistory(1, username);
  } catch (err) {
    alert("Could not load profile: " + err.message);
  }
}

let currentPage = 1;

// async function fetchHistory(page = 1) {
//   const token = localStorage.getItem("access_token");
//   currentPage = page;

//   try {
//     const response = await fetch(
//       `${API_URL}/auth/history?page=${page}&limit=10`,
//       {
//         headers: { Authorization: `Bearer ${token}` },
//       },
//     );
//     const data = await handleResponse(response);

//     document.getElementById("total-games").innerText = data.total_games;

//     const list = document.getElementById("history-list");
//     list.innerHTML = "";

//     data.history.forEach((game) => {
//       const li = document.createElement("li");
//       li.style.borderBottom = "1px solid #ccc";
//       li.style.padding = "10px 0";

//       // Apply a color based on result
//       const resultColor =
//         game.result === "WON"
//           ? "green"
//           : game.result === "LOST"
//             ? "red"
//             : "orange";

//       li.innerHTML = `
//                 <div style="display: flex; justify-content: space-between; align-items: center;">
//                     <div style="flex: 1;">Me: <strong>${game.my_wpm}</strong> WPM (${game.my_acc}%)</div>
//                     <div style="flex: 0.5; text-align: center; color: ${resultColor}; font-weight: bold;">${game.result}</div>
//                     <div style="flex: 1; text-align: right;">${game.opp_name}: <strong>${game.opp_wpm}</strong> WPM (${game.opp_acc}%)</div>
//                 </div>
//                 <div style="font-size: 0.8em; color: gray; margin-top: 4px;">${game.date}</div>
//             `;
//       list.appendChild(li);
//     });

//     // Update Pagination Buttons (Logic added below)
//     renderPaginationControls(data.total_pages);
//   } catch (err) {
//     console.error("History load failed:", err);
//   }
// }

async function fetchHistory(page = 1, username = null) {
  const token = localStorage.getItem("access_token");
  currentPage = page;

  try {
    // If username is provided, use public endpoint, else use private "/history"
    const url = username
      ? `${API_URL}/auth/public/history/${username}?page=${page}&limit=10`
      : `${API_URL}/auth/history?page=${page}&limit=10`;

    const headers = username ? {} : { Authorization: `Bearer ${token}` };

    const response = await fetch(url, { headers });
    const data = await handleResponse(response);

    document.getElementById("total-games").innerText = data.total_games;
    const list = document.getElementById("history-list");
    list.innerHTML = "";

    data.history.forEach((game) => {
      const resultColor =
        game.result === "WON"
          ? "green"
          : game.result === "LOST"
            ? "red"
            : "orange";
      const li = document.createElement("li");
      li.style.borderBottom = "1px solid #ccc";
      li.style.padding = "10px 0";

      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">${username || "Me"}: <strong>${game.my_wpm}</strong> WPM</div>
            <div style="flex: 0.5; text-align: center; color: ${resultColor}; font-weight: bold;">${game.result}</div>
            <div style="flex: 1; text-align: right;">
                <a href="javascript:void(0)" onclick="viewOtherProfile('${game.opp_name}')">${game.opp_name}</a>: 
                <strong>${game.opp_wpm}</strong> WPM
            </div>
        </div>
        <div style="font-size: 0.8em; color: gray; margin-top: 4px;">${game.date}</div>
      `;
      list.appendChild(li);
    });

    renderPaginationControls(data.total_pages);
  } catch (err) {
    console.error("History load failed:", err);
  }
}

// function renderPaginationControls(totalPages) {
//   let controls = document.getElementById("pagination-controls");
//   if (!controls) {
//     controls = document.createElement("div");
//     controls.id = "pagination-controls";
//     document.getElementById("history-container").after(controls);
//   }

//   controls.innerHTML = `
//         <button onclick="fetchHistory(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>Prev</button>
//         <span> Page ${currentPage} of ${totalPages} </span>
//         <button onclick="fetchHistory(${currentPage + 1})" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
//     `;
// }

function renderPaginationControls(totalPages) {
  let controls = document.getElementById("pagination-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.id = "pagination-controls";
    document.getElementById("history-container").after(controls);
  }

  // Pass current viewedUsername to the next/prev buttons
  const userParam = viewedUsername ? `'${viewedUsername}'` : "null";
  controls.innerHTML = `
    <button onclick="fetchHistory(${currentPage - 1}, ${userParam})" ${currentPage === 1 ? "disabled" : ""}>Prev</button>
    <span> Page ${currentPage} of ${totalPages} </span>
    <button onclick="fetchHistory(${currentPage + 1}, ${userParam})" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
  `;
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

// --- SEARCH PLAYERS LOGIC ---

// async function searchPlayers(page = 1) {
//   const token = localStorage.getItem("access_token");
//   const username = document.getElementById("search-username").value;
//   const minWpm = document.getElementById("search-min-wpm").value;
//   const maxWpm = document.getElementById("search-max-wpm").value;

//   try {
//     const response = await fetch(
//       `${API_URL}/social/search?username=${username}&min_wpm=${minWpm}&max_wpm=${maxWpm}&page=${page}&limit=5`,
//       { headers: { Authorization: `Bearer ${token}` } },
//     );
//     const data = await handleResponse(response);

//     const list = document.getElementById("search-results-list");
//     list.innerHTML = "";

//     if (data.users.length === 0) {
//       list.innerHTML = "<li>No players found.</li>";
//     }

//     data.users.forEach((user) => {
//       const li = document.createElement("li");
//       li.style.padding = "8px";
//       li.style.borderBottom = "1px dashed #eee";
//       li.innerHTML = `
//                 <div style="display: flex; justify-content: space-between; align-items: center;">
//                     <span>
//                         <strong style="cursor:pointer; color: blue;" onclick="viewOtherProfile('${user.username}')">
//                             ${user.username}
//                         </strong>
//                         <span style="font-size: 0.8em; color: #666;">(${user.highest_speed} WPM)</span>
//                     </span>
//                     <button onclick="openChat('${user.username}')" style="font-size: 0.7em;">Message</button>
//                 </div>
//             `;
//       list.appendChild(li);
//     });

//     renderSearchPagination(data.total_pages, data.current_page);
//   } catch (err) {
//     console.error("Search failed:", err);
//   }
// }

async function searchPlayers(page = 1) {
  const token = localStorage.getItem("access_token");

  // Get values and provide defaults if they are empty
  const usernameInput = document.getElementById("search-username").value.trim();
  const minWpmInput = document.getElementById("search-min-wpm").value;
  const maxWpmInput = document.getElementById("search-max-wpm").value;

  const minWpm = minWpmInput === "" ? 0 : parseInt(minWpmInput);
  const maxWpm = maxWpmInput === "" ? 250 : parseInt(maxWpmInput);

  try {
    // Construct URL with sanitized values
    const url = new URL(`${API_URL}/social/search`);
    url.searchParams.append("page", page);
    url.searchParams.append("limit", 5);
    url.searchParams.append("min_wpm", minWpm);
    url.searchParams.append("max_wpm", maxWpm);
    if (usernameInput) url.searchParams.append("username", usernameInput);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await handleResponse(response);

    const list = document.getElementById("search-results-list");
    list.innerHTML = "";

    if (!data.users || data.users.length === 0) {
      list.innerHTML =
        "<li style='color: gray; padding: 10px;'>No other players found matching these filters.</li>";
      renderSearchPagination(1, 1);
      return;
    }

    data.users.forEach((user) => {
      const li = document.createElement("li");
      li.style.padding = "10px";
      li.style.borderBottom = "1px solid #eee";
      li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>
                        <strong style="cursor:pointer; color: #007bff;" onclick="viewOtherProfile('${user.username}')">
                            ${user.username}
                        </strong> 
                        <br>
                        <small style="color: #666;">Speed: ${user.highest_speed} WPM | Rating: ${user.rating}</small>
                    </span>
                    <button onclick="openChat('${user.username}')" style="padding: 5px 10px;">Message</button>
                </div>
            `;
      list.appendChild(li);
    });

    renderSearchPagination(data.total_pages, data.current_page);
  } catch (err) {
    console.error("Search failed:", err);
    alert("Search failed: " + err.message);
  }
}

function renderSearchPagination(totalPages, currentPage) {
  const container = document.getElementById("search-pagination");
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
        <div style="margin-top: 10px; font-size: 0.8em;">
            <button onclick="searchPlayers(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>Prev</button>
            <span> ${currentPage} / ${totalPages} </span>
            <button onclick="searchPlayers(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>Next</button>
        </div>
    `;
}

// Placeholder for the next phase
function openChat(username) {
  alert(
    "Chat feature coming soon! You can view " +
      username +
      "'s profile by clicking their name.",
  );
}

function handleLogout() {
  localStorage.removeItem("access_token");
  window.location.href = "index.html";
}
