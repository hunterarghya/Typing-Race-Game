if (!localStorage.getItem("access_token")) {
  localStorage.setItem("redirect_after_login", window.location.href);
  window.location.href = "index.html";
}

function getUserIdFromToken() {
  const token = localStorage.getItem("access_token");
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch (e) {
    return "Anonymous";
  }
}

const userId = getUserIdFromToken();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room");

let socket;
let gameStarted = false;

// Elements
const textDisplay = document.getElementById("text-display");
const inputField = document.getElementById("keyboard-handler");
const wpmDisplay = document.getElementById("wpm");
const accuracyDisplay = document.getElementById("accuracy");
const timerDisplay = document.getElementById("timer");

// Game State
let targetText = "";
let charIndex = 0;
let mistakes = 0;
let isTyping = false;
let timer = 60;
let timeElapsed = 0;
let intervalId;

if (roomId) {
  const token = localStorage.getItem("access_token");
  socket = new WebSocket(`ws://localhost:10000/ws/game/${roomId}/${token}`);

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "TIMER_UPDATE") {
      timer = data.time;
      timerDisplay.innerText = data.time;
      timeElapsed = 60 - data.time;
      updateStats();
    }

    if (data.type === "GAME_OVER") {
      if (!gameStarted) return;
      gameStarted = false;
      inputField.disabled = true;

      const stats = data.final_stats || {};
      const opponentId = Object.keys(stats).find((id) => id !== userId);

      const myStats = stats[userId] || { wpm: 0, accuracy: 100, charIndex: 0 };
      const oppStats = opponentId
        ? stats[opponentId]
        : { wpm: 0, accuracy: 100, charIndex: 0 };

      const myProgress = Math.round(
        (myStats.charIndex / targetText.length) * 100,
      );
      const oppProgress = Math.round(
        (oppStats.charIndex / targetText.length) * 100,
      );

      wpmDisplay.innerText = myStats.wpm;
      accuracyDisplay.innerText = myStats.accuracy;

      if (opponentId) {
        document.getElementById("opp-wpm").innerText = oppStats.wpm;
        document.getElementById("opp-accuracy").innerText = oppStats.accuracy;
      }

      let resultMsg = "";
      if (data.winner_id === userId) {
        resultMsg = `YOU WON! 🏆\nYour Progress: ${myProgress}%\nYour WPM: ${myStats.wpm}`;
      } else if (data.winner_id === null) {
        resultMsg = `TIME UP! IT'S A TIE! 🤝\nBoth reached ${myProgress}%`;
      } else {
        const isBot = data.winner_id.includes("bot");
        const winnerLabel = isBot ? "THE BOT" : "OPPONENT";

        const reason =
          data.reason === "FINISHED"
            ? "Opponent finished first!"
            : "Opponent was further ahead!";
        resultMsg = `${winnerLabel} WON! 🏁\n${reason}\n${winnerLabel}: ${oppProgress}% vs Yours: ${myProgress}%`;
      }

      alert(resultMsg);
    }

    if (data.type === "PLAYER_READY") {
      document.getElementById("lobby-status").innerText =
        "Opponent is ready! Click yours.";
    }

    if (data.type === "START_GAME") {
      targetText = data.paragraph;
      document.getElementById("lobby-zone").style.display = "none";
      startCountdown();
    }

    if (data.type === "opponent_progress" && data.user_id !== userId) {
      updateOpponentUI(data);
    }
  };
}

function sendReady() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "ready" }));
    const btn = document.getElementById("ready-btn");
    btn.disabled = true;
    btn.innerText = "Waiting...";
    document.getElementById("lobby-status").innerText =
      "You are ready! Waiting for opponent...";
  }
}

function startCountdown() {
  let count = 3;
  inputField.disabled = true;

  const countdownInterval = setInterval(() => {
    if (count > 0) {
      textDisplay.innerHTML = `<h1 class="countdown-text">${count}</h1>`;
      count--;
    } else {
      clearInterval(countdownInterval);
      gameStarted = true;
      inputField.disabled = false;
      initGame();
      isTyping = true;
      timeElapsed = 0;

      const heartbeatId = setInterval(() => {
        if (!gameStarted) {
          clearInterval(heartbeatId);
          return;
        }
        updateStats();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "progress",
              charIndex: charIndex,
              wpm: wpmDisplay.innerText,
              accuracy: accuracyDisplay.innerText,
            }),
          );
        }
      }, 1000);
    }
  }, 1000);
}

function updateOpponentUI(data) {
  // Update Bar
  const opponentBar = document.getElementById("opponent-bar");
  const percent = (data.charIndex / targetText.length) * 100;
  opponentBar.style.width = percent + "%";

  // Update Stats

  const oppWpmEl = document.getElementById("opp-wpm");
  const oppAccEl = document.getElementById("opp-accuracy");

  if (oppWpmEl) oppWpmEl.innerText = data.wpm || 0;
  if (oppAccEl) oppAccEl.innerText = data.accuracy || 100;

  // Ghost Cursor
  const chars = textDisplay.querySelectorAll(".char");
  chars.forEach((c) => c.classList.remove("opponent-ghost"));
  if (chars[data.charIndex]) {
    chars[data.charIndex].classList.add("opponent-ghost");
  }
}

function initGame() {
  textDisplay.innerHTML = "";
  targetText.split("").forEach((char) => {
    let span = document.createElement("span");
    span.innerText = char;
    span.classList.add("char");
    textDisplay.appendChild(span);
  });

  const chars = textDisplay.querySelectorAll(".char");
  if (chars.length > 0) {
    chars[0].classList.add("current");
  }

  // Force focus
  inputField.disabled = false;
  inputField.value = "";
  inputField.focus();
}

inputField.addEventListener("input", (e) => {
  if (!gameStarted || timer <= 0) {
    inputField.value = "";
    return;
  }

  const chars = textDisplay.querySelectorAll(".char");
  const lastTypedChar = e.target.value[e.target.value.length - 1];

  if (charIndex < chars.length) {
    if (lastTypedChar === chars[charIndex].innerText) {
      chars[charIndex].classList.add("correct");
      chars[charIndex].classList.remove("current", "incorrect");
      charIndex++;

      if (charIndex < chars.length) {
        chars[charIndex].classList.add("current");
      }
    } else {
      mistakes++;
      chars[charIndex].classList.add("incorrect");
    }
    inputField.value = "";
    updateStats();

    // Update local progress bar
    document.getElementById("my-bar").style.width =
      (charIndex / targetText.length) * 100 + "%";
  }
});

function updateStats() {
  const effectiveTime = timeElapsed > 0 ? timeElapsed : 1;
  const timeInMins = effectiveTime / 60;

  let wpm = Math.round(charIndex / 5 / timeInMins);
  wpmDisplay.innerText = wpm >= 0 ? wpm : 0;

  let totalAttempts = charIndex + mistakes;
  let acc =
    totalAttempts > 0 ? Math.round((charIndex / totalAttempts) * 100) : 100;
  accuracyDisplay.innerText = acc;
}

document.addEventListener("click", () => {
  if (gameStarted && !inputField.disabled) {
    inputField.focus();
  }
});
