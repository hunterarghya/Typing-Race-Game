// // // game.js additions at the top
// // const urlParams = new URLSearchParams(window.location.search);
// // const roomId = urlParams.get("room");
// // const gameMode = urlParams.get("mode");
// // // Get username from localStorage or a quick prompt for testing
// // let userId =
// //   localStorage.getItem("username") ||
// //   "Guest_" + Math.floor(Math.random() * 1000);

// // // We need a unique ID for this session (using username is easiest)
// // // You might want to fetch this from the token, but for now, let's use a random ID or prompt
// // // const userId = "user_" + Math.floor(Math.random() * 1000);

// // let socket;

// // if (roomId) {
// //   // Connect to WebSocket
// //   socket = new WebSocket(`ws://localhost:10000/ws/game/${roomId}/${userId}`);

// //   socket.onmessage = (event) => {
// //     const data = JSON.parse(event.data);
// //     if (data.type === "opponent_progress" && data.user_id !== userId) {
// //       updateOpponentUI(data.charIndex);
// //     }
// //   };
// // }

// // function updateOpponentUI(index) {
// //   const opponentBar = document.getElementById("opponent-bar");
// //   const percent = (index / targetText.length) * 100;
// //   opponentBar.style.width = percent + "%";
// // }

// // const textDisplay = document.getElementById("text-display");
// // const inputField = document.getElementById("keyboard-handler");
// // const wpmDisplay = document.getElementById("wpm");
// // const accuracyDisplay = document.getElementById("accuracy");
// // const timerDisplay = document.getElementById("timer");

// // let targetText =
// //   "The quick brown fox jumps over the lazy dog. Programming is the art of algorithm design and the craft of debugging code.";
// // let charIndex = 0;
// // let mistakes = 0;
// // let isTyping = false;
// // let timer = 60;
// // let timeElapsed = 0;
// // let intervalId;

// // function initGame() {
// //   textDisplay.innerHTML = "";
// //   targetText.split("").forEach((char) => {
// //     let span = `<span class="char">${char}</span>`;
// //     textDisplay.innerHTML += span;
// //   });
// //   textDisplay.querySelectorAll(".char")[0].classList.add("current");
// //   document.addEventListener("click", () => inputField.focus());
// //   inputField.focus();
// // }

// // // Keybr Style Logic: Cursor freezes until correct key is hit.
// // inputField.addEventListener("input", (e) => {
// //   const chars = textDisplay.querySelectorAll(".char");
// //   const typedValue = e.target.value;
// //   const lastTypedChar = typedValue[typedValue.length - 1];

// //   if (charIndex < chars.length && timer > 0) {
// //     if (!isTyping) {
// //       isTyping = true;
// //       startTimer();
// //     }

// //     // Check if the character typed matches the target character
// //     if (lastTypedChar === chars[charIndex].innerText) {
// //       // Correct hit
// //       chars[charIndex].classList.add("correct");
// //       chars[charIndex].classList.remove("current", "incorrect");
// //       charIndex++;

// //       if (socket && socket.readyState === WebSocket.OPEN) {
// //         socket.send(
// //           JSON.stringify({
// //             type: "progress",
// //             charIndex: charIndex,
// //           }),
// //         );
// //       }

// //       if (charIndex < chars.length) {
// //         chars[charIndex].classList.add("current");
// //       }
// //     } else {
// //       // Mistake hit
// //       mistakes++;
// //       chars[charIndex].classList.add("incorrect");
// //       // We do NOT increment charIndex, so the user stays on this letter
// //     }

// //     // CRITICAL: Always keep the input field empty.
// //     // This prevents the "double type" bug and allows us to focus only on the LAST key pressed.
// //     inputField.value = "";

// //     updateStats();
// //   }
// // });

// // function updateStats() {
// //   const timeInMins = timeElapsed / 60 || 1 / 60;
// //   let wpm = Math.round(charIndex / 5 / timeInMins);
// //   wpmDisplay.innerText = wpm >= 0 ? wpm : 0;

// //   // Accuracy tracks total attempts (charIndex is successful hits, mistakes is failures)
// //   let totalAttempts = charIndex + mistakes;
// //   let acc =
// //     totalAttempts > 0 ? Math.round((charIndex / totalAttempts) * 100) : 100;
// //   accuracyDisplay.innerText = acc;
// // }

// // function startTimer() {
// //   timer = 60;
// //   timeElapsed = 0;
// //   intervalId = setInterval(() => {
// //     if (timer > 0 && charIndex < targetText.length) {
// //       timer--;
// //       timeElapsed++;
// //       timerDisplay.innerText = timer;
// //       updateStats();
// //     } else {
// //       clearInterval(intervalId);
// //       isTyping = false;
// //       finishGame();
// //     }
// //   }, 1000);
// // }

// // function finishGame() {
// //   inputField.disabled = true;
// //   alert(
// //     `Game Over! WPM: ${wpmDisplay.innerText} | Accuracy: ${accuracyDisplay.innerText}%`,
// //   );
// // }

// // initGame();

// // game.js - Top of file
// if (!localStorage.getItem("access_token")) {
//   // Save the current URL so we can come back after login
//   localStorage.setItem("redirect_after_login", window.location.href);
//   window.location.href = "index.html";
// }

// // Helper to get username from the token (Optional but better than random IDs)
// function getUsernameFromToken() {
//   const token = localStorage.getItem("access_token");
//   try {
//     const payload = JSON.parse(atob(token.split(".")[1]));
//     return payload.sub; // Usually the username/email is stored in 'sub'
//   } catch (e) {
//     return "Anonymous";
//   }
// }

// // const currentUsername = getUsernameFromToken();
// const userId = getUsernameFromToken();
// // game.js additions at the top
// const urlParams = new URLSearchParams(window.location.search);
// const roomId = urlParams.get("room");
// const gameMode = urlParams.get("mode");
// // Get username from localStorage or a quick prompt for testing
// // let userId =
// //   localStorage.getItem("username") ||
// //   "Guest_" + Math.floor(Math.random() * 1000);

// // We need a unique ID for this session (using username is easiest)
// // You might want to fetch this from the token, but for now, let's use a random ID or prompt
// // const userId = "user_" + Math.floor(Math.random() * 1000);

// let socket;

// if (roomId) {
//   const token = localStorage.getItem("access_token");
//   // Pass the token in the URL for the backend to verify
//   socket = new WebSocket(`ws://localhost:10000/ws/game/${roomId}/${token}`);

//   socket.onmessage = (event) => {
//     const data = JSON.parse(event.data);
//     if (data.type === "opponent_progress" && data.user_id !== userId) {
//       updateOpponentUI(data.charIndex);
//     }
//   };
// }

// function updateOpponentUI(index) {
//   const opponentBar = document.getElementById("opponent-bar");
//   const percent = (index / targetText.length) * 100;
//   opponentBar.style.width = percent + "%";
// }

// const textDisplay = document.getElementById("text-display");
// const inputField = document.getElementById("keyboard-handler");
// const wpmDisplay = document.getElementById("wpm");
// const accuracyDisplay = document.getElementById("accuracy");
// const timerDisplay = document.getElementById("timer");

// let targetText =
//   "The quick brown fox jumps over the lazy dog. Programming is the art of algorithm design and the craft of debugging code.";
// let charIndex = 0;
// let mistakes = 0;
// let isTyping = false;
// let timer = 60;
// let timeElapsed = 0;
// let intervalId;

// function initGame() {
//   textDisplay.innerHTML = "";
//   targetText.split("").forEach((char) => {
//     let span = `<span class="char">${char}</span>`;
//     textDisplay.innerHTML += span;
//   });
//   textDisplay.querySelectorAll(".char")[0].classList.add("current");
//   document.addEventListener("click", () => inputField.focus());
//   inputField.focus();
// }

// // Keybr Style Logic: Cursor freezes until correct key is hit.
// inputField.addEventListener("input", (e) => {
//   const chars = textDisplay.querySelectorAll(".char");
//   const typedValue = e.target.value;
//   const lastTypedChar = typedValue[typedValue.length - 1];

//   if (charIndex < chars.length && timer > 0) {
//     if (!isTyping) {
//       isTyping = true;
//       startTimer();
//     }

//     // Check if the character typed matches the target character
//     if (lastTypedChar === chars[charIndex].innerText) {
//       // Correct hit
//       chars[charIndex].classList.add("correct");
//       chars[charIndex].classList.remove("current", "incorrect");
//       charIndex++;

//       if (socket && socket.readyState === WebSocket.OPEN) {
//         socket.send(
//           JSON.stringify({
//             type: "progress",
//             charIndex: charIndex,
//           }),
//         );
//       }

//       if (charIndex < chars.length) {
//         chars[charIndex].classList.add("current");
//       }
//     } else {
//       // Mistake hit
//       mistakes++;
//       chars[charIndex].classList.add("incorrect");
//       // We do NOT increment charIndex, so the user stays on this letter
//     }

//     // CRITICAL: Always keep the input field empty.
//     // This prevents the "double type" bug and allows us to focus only on the LAST key pressed.
//     inputField.value = "";

//     updateStats();
//   }
// });

// function updateStats() {
//   const timeInMins = timeElapsed / 60 || 1 / 60;
//   let wpm = Math.round(charIndex / 5 / timeInMins);
//   wpmDisplay.innerText = wpm >= 0 ? wpm : 0;

//   // Accuracy tracks total attempts (charIndex is successful hits, mistakes is failures)
//   let totalAttempts = charIndex + mistakes;
//   let acc =
//     totalAttempts > 0 ? Math.round((charIndex / totalAttempts) * 100) : 100;
//   accuracyDisplay.innerText = acc;
// }

// function startTimer() {
//   timer = 60;
//   timeElapsed = 0;
//   intervalId = setInterval(() => {
//     if (timer > 0 && charIndex < targetText.length) {
//       timer--;
//       timeElapsed++;
//       timerDisplay.innerText = timer;
//       updateStats();
//     } else {
//       clearInterval(intervalId);
//       isTyping = false;
//       finishGame();
//     }
//   }, 1000);
// }

// function finishGame() {
//   inputField.disabled = true;
//   alert(
//     `Game Over! WPM: ${wpmDisplay.innerText} | Accuracy: ${accuracyDisplay.innerText}%`,
//   );
// }

// initGame();

// game.js - Top of file
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
const gameMode = urlParams.get("mode");

let socket;
let gameStarted = false; // NEW: Track if the game is live

// Elements
const textDisplay = document.getElementById("text-display");
const inputField = document.getElementById("keyboard-handler");
const wpmDisplay = document.getElementById("wpm");
const accuracyDisplay = document.getElementById("accuracy");
const timerDisplay = document.getElementById("timer");

// Game State
let targetText =
  "The quick brown fox jumps over the lazy dog. Programming is the art of algorithm design.";
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

    // Handle opponent movement
    if (data.type === "opponent_progress" && data.user_id !== userId) {
      updateOpponentUI(data.charIndex);
    }

    // NEW: Handle the Start Signal from backend
    if (data.type === "START_GAME") {
      startCountdown();
    }
  };
}

// NEW: Countdown before enabling input
function startCountdown() {
  let count = 3;
  inputField.disabled = true; // Ensure they can't type yet

  const countdownInterval = setInterval(() => {
    if (count > 0) {
      textDisplay.innerHTML = `<h1 style="font-size: 3rem; text-align: center;">${count}</h1>`;
      count--;
    } else {
      clearInterval(countdownInterval);
      textDisplay.innerHTML = "";
      gameStarted = true;
      inputField.disabled = false;
      initGame(); // Render the text and focus
    }
  }, 1000);
}

function updateOpponentUI(index) {
  const opponentBar = document.getElementById("opponent-bar");
  const percent = (index / targetText.length) * 100;
  opponentBar.style.width = percent + "%";
}

function initGame() {
  textDisplay.innerHTML = "";
  targetText.split("").forEach((char) => {
    let span = document.createElement("span");
    span.innerText = char;
    span.classList.add("char");
    textDisplay.appendChild(span);
  });
  textDisplay.querySelectorAll(".char")[0].classList.add("current");
  inputField.focus();
}

inputField.addEventListener("input", (e) => {
  // Check if game has actually started
  if (!gameStarted || timer <= 0) {
    inputField.value = "";
    return;
  }

  const chars = textDisplay.querySelectorAll(".char");
  const lastTypedChar = e.target.value[e.target.value.length - 1];

  if (charIndex < chars.length) {
    if (!isTyping) {
      isTyping = true;
      startTimer();
    }

    if (lastTypedChar === chars[charIndex].innerText) {
      chars[charIndex].classList.add("correct");
      chars[charIndex].classList.remove("current", "incorrect");
      charIndex++;

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "progress",
            charIndex: charIndex,
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
  intervalId = setInterval(() => {
    if (timer > 0 && charIndex < targetText.length) {
      timer--;
      timeElapsed++;
      timerDisplay.innerText = timer;
      updateStats();
    } else {
      clearInterval(intervalId);
      isTyping = false;
      finishGame();
    }
  }, 1000);
}

function finishGame() {
  gameStarted = false;
  inputField.disabled = true;
  alert(
    `Game Over! WPM: ${wpmDisplay.innerText} | Accuracy: ${accuracyDisplay.innerText}%`,
  );
}

// Do NOT call initGame() here anymore.
// It will be called by startCountdown() when the server says GO.
textDisplay.innerHTML = "Waiting for opponent...";
