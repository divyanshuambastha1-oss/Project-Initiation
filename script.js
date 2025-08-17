/***************
 * UTIL
 ***************/
const $ = (q, ctx = document) => ctx.querySelector(q);
const $$ = (q, ctx = document) => [...ctx.querySelectorAll(q)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/***************
 * ROUTING (Home <-> Practice)
 ***************/
const navButtons = $$(".nav-btn, .go-practice");
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    if (!target) return;
    $$(".view").forEach(v => v.classList.remove("active"));
    $(target).classList.add("active");
    if (target === "#practice") $("#customText").focus();
  });
});

/***************
 * KEYBOARD RENDER + FINGER MAPPING
 ***************/
const keyboardRows = [
  // label, width, finger
  // Row 1
  [
    ["`", "", "rp"], ["1","","lp"], ["2","","lr"], ["3","","lm"], ["4","","li"],
    ["5","","li"], ["6","","ri"], ["7","","ri"], ["8","","rm"], ["9","","rr"],
    ["0","","rp"], ["-","","rp"], ["=","","rp"], ["Backspace","wide","rp"]
  ],
  // Row 2
  [
    ["Tab","wide","lp"], ["q","","lp"], ["w","","lr"], ["e","","lm"], ["r","","li"], ["t","","li"],
    ["y","","ri"], ["u","","ri"], ["i","","rm"], ["o","","rr"], ["p","","rp"], ["[","","rp"],
    ["]","","rp"], ["\\","wide","rp"]
  ],
  // Row 3
  [
    ["Caps","wide","lp"], ["a","","lp"], ["s","","lr"], ["d","","lm"], ["f","","li"], ["g","","li"],
    ["h","","ri"], ["j","","ri"], ["k","","rm"], ["l","","rr"], [";","","rp"], ["'","","rp"],
    ["Enter","wide","rp"]
  ],
  // Row 4
  [
    ["Shift","wide","lp"], ["z","","lp"], ["x","","lr"], ["c","","lm"], ["v","","li"], ["b","","li"],
    ["n","","ri"], ["m","","ri"], [",","","rm"], [".","","rr"], ["/","","rp"], ["Shift","wide","rp"]
  ],
  // Row 5
  [
    ["Ctrl","wide","lp"], ["Alt","wide","lr"], ["Space","space th","th"], ["Alt","wide","rr"], ["Ctrl","wide","rp"]
  ]
];

function renderKeyboard(targetEl) {
  targetEl.innerHTML = "";
  keyboardRows.forEach(row => {
    const rowEl = document.createElement("div");
    rowEl.className = "krow";
    row.forEach(([label, extra, finger]) => {
      const key = document.createElement("div");
      key.className = `key ${extra||""} f-${finger}`;
      key.dataset.key = label.toLowerCase();
      key.innerHTML = `<span class="cap">${label}</span>`;
      rowEl.appendChild(key);
    });
    targetEl.appendChild(rowEl);
  });
}
renderKeyboard($("#keyboard"));
renderKeyboard($("#practiceKeyboard"));

/***************
 * PRACTICE LOGIC
 ***************/
const customText = $("#customText");
const wordCount = $("#wordCount");
const loadBtn = $("#loadBtn");
const startBtn = $("#startBtn");
const resetBtn = $("#resetBtn");
const displayText = $("#displayText");
const readingSurface = $("#readingSurface");
const progressBar = $("#progressBar > span");
const timeEl = $("#time");
const wpmEl = $("#wpm");
const accEl = $("#accuracy");
const errEl = $("#errors");
const hiddenInput = $("#hiddenInput");

let text = "";
let index = 0;
let correct = 0;
let errors = 0;
let startedAt = null;
let tick = null;

customText.addEventListener("input", () => {
  // enforce 1000 word limit
  const words = customText.value.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1000) {
    customText.value = words.slice(0, 1000).join(" ") + " ";
  }
  const count = customText.value.trim() ? customText.value.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${count} / 1000 words`;
});

function renderText() {
  displayText.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    const ch = text[i];
    span.textContent = ch;
    if (i < index) {
      span.className = (displayText.dataset.typed?.[i] === "1") ? "ok" : "bad";
    } else if (i === index) {
      span.className = "cursor";
    }
    frag.appendChild(span);
  }
  displayText.appendChild(frag);
  // scroll into view
  const cursor = $(".cursor", displayText);
  if (cursor) {
    const rect = cursor.getBoundingClientRect();
    const parentRect = readingSurface.getBoundingClientRect();
    if (rect.bottom > parentRect.bottom - 20 || rect.top < parentRect.top + 20) {
      cursor.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }
  highlightCurrentKey();
}

function normalizeKey(ch){
  if (ch === " ") return "space";
  const map = { "\n":"enter", "\r":"enter", "\t":"tab" };
  if (map[ch]) return map[ch];
  return ch.toLowerCase();
}

function fingerForKey(key){
  // find first key element in practice keyboard and read its finger class
  const el = $(`#practiceKeyboard .key[data-key="${CSS.escape(key)}"]`);
  if (!el) return null;
  const m = [...el.classList].find(c => c.startsWith("f-"));
  return m; // e.g., "f-li"
}

function highlightCurrentKey(){
  // clear previous glow
  $$("#practiceKeyboard .key").forEach(k => k.classList.remove("glow"));
  const current = text[index] || "";
  const key = normalizeKey(current);
  const el = $(`#practiceKeyboard .key[data-key="${CSS.escape(key)}"]`);
  if (el) el.classList.add("glow");
}

function loadText() {
  const raw = customText.value.trim();
  if (!raw) {
    alert("Please paste or type some text (up to 1000 words).");
    return;
  }
  text = raw.replace(/\r\n/g, "\n");
  index = 0; correct = 0; errors = 0; startedAt = null;
  displayText.dataset.typed = ""; // string of "1" (ok) / "0" (bad)
  renderText();
  updateHUD();
}
function updateHUD(){
  const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  timeEl.textContent = `${Math.floor(elapsed)}s`;
  const minutes = elapsed / 60 || 1/60; // avoid 0
  const wordsTyped = index ? text.slice(0, index).trim().split(/\s+/).filter(Boolean).length : 0;
  const wpm = Math.round(wordsTyped / minutes);
  const acc = index ? Math.round((correct / index) * 100) : 100;
  wpmEl.textContent = wpm;
  accEl.textContent = `${acc}%`;
  errEl.textContent = errors;
  progressBar.style.width = `${clamp((index / text.length) * 100, 0, 100)}%`;
}

function startTyping(){
  if (!text) {
    loadText();
    if (!text) return;
  }
  hiddenInput.value = "";
  hiddenInput.focus();
  startedAt = Date.now();
  clearInterval(tick);
  tick = setInterval(updateHUD, 250);
}

function resetAll(){
  clearInterval(tick);
  hiddenInput.blur();
  index = 0; correct = 0; errors = 0; startedAt = null;
  displayText.dataset.typed = "";
  renderText();
  updateHUD();
}

loadBtn.addEventListener("click", loadText);
startBtn.addEventListener("click", startTyping);
resetBtn.addEventListener("click", resetAll);

// Capture keystrokes
hiddenInput.addEventListener("keydown", (e) => {
  if (!text) return;
  if (!startedAt) startedAt = Date.now();

  let expected = text[index] || "";
  let pressed = e.key;

  // Normalize Enter/Tab/Backspace behavior
  if (pressed === "Backspace") {
    if (index > 0) {
      index--;
      const arr = (displayText.dataset.typed || "").split("");
      arr.pop();
      displayText.dataset.typed = arr.join("");
      renderText();
      updateHUD();
    }
    e.preventDefault();
    return;
  }

  // build string of correctness flags
  if (pressed === "Enter") pressed = "\n";
  if (pressed.length > 1 && pressed !== "\n" && pressed !== "Tab" && pressed !== " ") {
    // ignore modifier keys
    return;
  }
  if (pressed === "Tab") {
    pressed = "\t";
    e.preventDefault();
  }

  const ok = pressed === expected;
  const flags = (displayText.dataset.typed || "") + (ok ? "1" : "0");
  displayText.dataset.typed = flags;

  if (ok) correct++; else errors++;
  index = Math.min(index + 1, text.length);

  renderText();
  updateHUD();

  if (index >= text.length) {
    clearInterval(tick);
    setTimeout(() => alert(`Done!\nWPM: ${$("#wpm").textContent}\nAccuracy: ${$("#accuracy").textContent}`), 50);
  }
});

// Clicking the text focuses hidden input (mobile-friendly)
readingSurface.addEventListener("click", () => hiddenInput.focus());

/***************
 * INITIALIZE
 ***************/
function build(){
  // also make the non-practice keyboard clickable to show glow demo
  $("#keyboard").addEventListener("click", (e)=>{
    const key = e.target.closest(".key");
    if (!key) return;
    $$("#keyboard .key").forEach(k=>k.classList.remove("glow"));
    key.classList.add("glow");
  });
}
build();
