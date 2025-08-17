const textDisplay = document.getElementById("text-display");
const inputField = document.getElementById("input-field");
const timeEl = document.getElementById("time");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const restartBtn = document.getElementById("restart-btn");

// Sample practice text
const sampleText = `Typing fast requires practice, focus, and accuracy. 
With consistent effort, anyone can improve their typing speed and become more efficient.`;

// State variables
let startTime, interval, correctChars, totalChars;

// Display the sample text
function loadText() {
  textDisplay.innerHTML = "";
  sampleText.split("").forEach(char => {
    const span = document.createElement("span");
    span.innerText = char;
    textDisplay.appendChild(span);
  });
}

function startTimer() {
  startTime = new Date();
  interval = setInterval(() => {
    let elapsed = Math.floor((new Date() - startTime) / 1000);
    timeEl.textContent = elapsed;
    calculateWPM();
  }, 1000);
}

function calculateWPM() {
  const elapsedMinutes = (new Date() - startTime) / 60000;
  const wordsTyped = inputField.value.trim().split(/\s+/).length;
  const wpm = Math.round(wordsTyped / elapsedMinutes) || 0;
  wpmEl.textContent = wpm;
}

function calculateAccuracy() {
  const input = inputField.value.split("");
  const spans = textDisplay.querySelectorAll("span");
  correctChars = 0;
  totalChars = input.length;

  spans.forEach((span, i) => {
    const char = input[i];
    if (char == null) {
      span.classList.remove("correct", "incorrect");
    } else if (char === span.innerText) {
      span.classList.add("correct");
      span.classList.remove("incorrect");
      correctChars++;
    } else {
      span.classList.add("incorrect");
      span.classList.remove("correct");
    }
  });

  const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
  accuracyEl.textContent = accuracy;
}

inputField.addEventListener("input", () => {
  if (!startTime) startTimer();
  calculateAccuracy();
});

restartBtn.addEventListener("click", () => {
  clearInterval(interval);
  startTime = null;
  inputField.value = "";
  timeEl.textContent = "0";
  wpmEl.textContent = "0";
  accuracyEl.textContent = "100";
  loadText();
});

// Initial load
loadText();