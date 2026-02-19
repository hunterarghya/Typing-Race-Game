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
      startTimer();
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
    // if (!isTyping) {
    //   isTyping = true;
    //   startTimer();
    // }

    if (lastTypedChar === chars[charIndex].innerText) {
      chars[charIndex].classList.add("correct");
      chars[charIndex].classList.remove("current", "incorrect");
      charIndex++;

      // Send progress + current stats to opponent
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
  const timeInMins = timeElapsed / 60 || 1 / 60;
  let wpm = Math.round(charIndex / 5 / timeInMins);
  wpmDisplay.innerText = wpm >= 0 ? wpm : 0;
  let totalAttempts = charIndex + mistakes;
  let acc =
    totalAttempts > 0 ? Math.round((charIndex / totalAttempts) * 100) : 100;
  accuracyDisplay.innerText = acc;
}

function startTimer() {
  timer = 60;
  timeElapsed = 0;
  // Clear any existing interval before starting a new one
  if (intervalId) clearInterval(intervalId);

  intervalId = setInterval(() => {
    if (timer > 0 && charIndex < targetText.length) {
      timer--;
      timeElapsed++;
      timerDisplay.innerText = timer;
      updateStats();
    } else {
      clearInterval(intervalId);
      isTyping = false;
      gameStarted = false; // Stop input
      finishGame();
    }
  }, 1000);
}

function finishGame() {
  gameStarted = false;
  inputField.disabled = true;

  // Logic to determine winner
  const myWpm = parseInt(wpmDisplay.innerText);
  const oppWpm = parseInt(document.getElementById("opp-wpm").innerText);
  let resultMsg = myWpm > oppWpm ? "YOU WON! 🏆" : "OPPONENT WON! 🏁";
  if (myWpm === oppWpm) resultMsg = "IT'S A TIE! 🤝";

  alert(`${resultMsg}\nYour WPM: ${myWpm} | Opponent WPM: ${oppWpm}`);
}

// If the user clicks anywhere on the page, put the focus back on the hidden input
document.addEventListener("click", () => {
  if (gameStarted && !inputField.disabled) {
    inputField.focus();
  }
});
