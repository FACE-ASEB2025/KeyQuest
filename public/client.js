console.log("Client-side JavaScript loaded!");
if (["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyB98BYOq4WSyrys9GeFhISzbO-U-7gokgc",
  authDomain: "face-club-ctf.firebaseapp.com",
  projectId: "face-club-ctf",
  storageBucket: "face-club-ctf.firebasestorage.app",
  messagingSenderId: "566048604135",
  appId: "1:566048604135:web:bf010d0454ee206fbdc742"
};

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
// --- ADD THESE 4 LINES TO INITIALIZE APP CHECK ---
const appCheck = firebase.appCheck();
appCheck.activate(
  '6Le1vfQrAAAAANVwmrPN8Ts4uAK7OdInWPS_cU_2', 
  true 
);
// -----------------------------------------------
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM Elements ---
const gameContainer = document.getElementById("game-container");
const jeopardyGrid = document.getElementById("jeopardy-grid");
const authModal = document.getElementById("auth-modal");
const questionModal = document.getElementById("question-modal");
const leaderboardModal = document.getElementById("leaderboard-modal");
const emailInput = document.getElementById("email-input");
const usernameInputAuth = document.getElementById("username-input-auth");
const passwordInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const authErrorEl = document.getElementById("auth-error");
const logoutBtn = document.getElementById("logout-btn");
const userInfoEl = document.getElementById("user-info");
const currentScoreEl = document.getElementById("current-score");
const viewLeaderboardGameBtn = document.getElementById("view-leaderboard-game-btn");
const closeQuestionModalBtn = document.getElementById("close-modal-btn");
const questionTextEl = document.getElementById("question-text");
const questionCategoryEl = document.getElementById("question-category");
const questionPointsEl = document.getElementById("question-points");
const answerInputEl = document.getElementById("answer-input");
const submitAnswerBtn = document.getElementById("submit-answer-btn");
const answerFeedbackEl = document.getElementById("answer-feedback");
const questionInputContainer = document.getElementById("question-input-container");
const modalAssetContainer = document.getElementById("modal-asset-container");
const leaderboardModalList = document.getElementById("leaderboard-modal-list");
const closeLeaderboardModalBtn = document.getElementById("close-leaderboard-modal-btn");

let currentUser = null;
let currentQuestionId = null;
let allQuestionsData = {};
let userProfile = { solved: [], score: 0 };

function updateHeaderName() {
  const fromProfile = userProfile && userProfile.username ? userProfile.username : "";
  const fromDisplay = currentUser && currentUser.displayName ? currentUser.displayName : "";
  const fromEmail = currentUser && currentUser.email ? currentUser.email.split("@")[0] : "";
  const name = fromProfile || fromDisplay || fromEmail;
  if (name) userInfoEl.textContent = `Team: ${name}`;
}

async function loadUserProfile() {
  if (!currentUser) return;
  try {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if (doc.exists) {
      userProfile = doc.data();
    } else {
      userProfile = { solved: [], score: 0 };
    }
    currentScoreEl.textContent = userProfile.score || 0;
    updateHeaderName();
    applySolvedUI();
  } catch (_) {
    const fallback = currentUser && currentUser.email ? currentUser.email.split("@")[0] : "";
    if (fallback) userInfoEl.textContent = `Team: ${fallback}`;
  }
}

function applySolvedUI() {
  const solved = (userProfile && userProfile.solved) ? userProfile.solved : [];
  solved.forEach((qid) => {
    const box = document.querySelector(`.point-box[data-question-id='${qid}']`);
    if (box) box.classList.add("used");
  });
}

// --- Fetch Questions from Server ---
async function fetchQuestions() {
  try {
    const res = await fetch("/api/questions");
    allQuestionsData = await res.json();
    buildGameBoard(allQuestionsData);
    updateHeaderName();
  } catch (err) {
    console.error("Failed to load questions:", err);
  }
}

function buildGameBoard(questions) {
  const categories = {
    Steganography: "stego",
    Cryptography: "crypto",
    OSINT: "osint",
  };
  const points = [100, 200, 300, 400, 500];
  jeopardyGrid.innerHTML = "";
  Object.keys(categories).forEach((catName) => {
    const col = document.createElement("div");
    col.className = "jeopardy-column";
    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = catName;
    col.appendChild(header);
    points.forEach((p) => {
      const qid = `${categories[catName]}${p}`;
      const q = questions[qid];
      const box = document.createElement("div");
      box.className = "point-box";
      box.dataset.questionId = qid;
      box.dataset.points = p;
      box.dataset.category = catName;
      if (!q) {
        box.classList.add("used");
      } else {
        box.addEventListener("click", () => showQuestionModal(qid));
        box.innerHTML = `<span class="points">${p}</span>`;
      }
      col.appendChild(box);
    });
    jeopardyGrid.appendChild(col);
  });
}

// --- Question Modal ---
function showQuestionModal(questionId) {
  const q = allQuestionsData[questionId];
  if (!q) return;
  currentQuestionId = questionId;
  questionTextEl.textContent = q.question;
  questionCategoryEl.textContent = questionId.replace(/[0-9]/g, "");
  questionPointsEl.textContent = q.points + " Points";
  const fileName = q.image ? q.image.split("/").pop() : "";
  let assetHtml = "";
  if (q.image) {
    assetHtml += `<img src="${q.image}" style="max-width:100%; border-radius:10px; margin-top:10px;">`;
    assetHtml += `<div style=\"margin-top:10px;\"><a href=\"/download/${q.image}\" download=\"${fileName}\" class=\"btn btn-secondary\">Download image</a></div>`;
  }
  if (q.link) {
    assetHtml += `<div style=\"margin-top:12px;\"><a href=\"${q.link}\" target=\"_blank\" rel=\"noopener\" class=\"btn btn-primary\">Open challenge</a></div>`;
  }
  modalAssetContainer.innerHTML = assetHtml;
  modalAssetContainer.style.display = (q.image || q.link) ? "block" : "none";
  questionInputContainer.style.display = "block";
  questionModal.style.display = "flex";
}

function closeQuestionModal() {
  questionModal.style.display = "none";
  currentQuestionId = null;
}

// --- Submit Answer ---
async function submitAnswer() {
  if (!currentUser || !currentQuestionId) return;
  const guess = answerInputEl.value.trim();
  if (!guess) return;
  const idToken = await currentUser.getIdToken();
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ questionId: currentQuestionId, guess }),
  });
  const result = await res.json();
  answerFeedbackEl.textContent = result.message;
  answerFeedbackEl.style.color = result.correct ? "#00ff88" : "#f44336";
  if (result.correct) {
    currentScoreEl.textContent = result.newScore;
    userProfile.score = result.newScore;
    const box = document.querySelector(`.point-box[data-question-id='${currentQuestionId}']`);
    if (box) box.classList.add("used");
    if (!userProfile.solved) userProfile.solved = [];
    if (!userProfile.solved.includes(currentQuestionId)) userProfile.solved.push(currentQuestionId);
  }
}

// --- Auth Functions ---
async function handleRegister() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const username = usernameInputAuth.value.trim();
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (username) {
      try { await cred.user.updateProfile({ displayName: username }); } catch (_) {}
      userInfoEl.textContent = `Team: ${username}`;
    }
    await db.collection("users").doc(cred.user.uid).set({
      username,
      email,
      score: 0,
      solved: [],
    });
  } catch (err) {
    const msg = (err && err.code && String(err.code).includes("app-check")) ?
      "App Check token invalid. If running locally, hard refresh and ensure debug token is allowed in Firebase Console." :
      err.message;
    authErrorEl.textContent = msg;
  }
}

async function handleLogin() {
  try {
    const email = emailInput.value.trim();
    await auth.signInWithEmailAndPassword(email, passwordInput.value.trim());
    const name = email ? email.split("@")[0] : "";
    if (name) userInfoEl.textContent = `Team: ${name}`;
  } catch (err) {
    const msg = (err && err.code && String(err.code).includes("app-check")) ?
      "App Check token invalid. If running locally, hard refresh and ensure debug token is allowed in Firebase Console." :
      err.message;
    authErrorEl.textContent = msg;
  }
}

async function handleLogout() {
  await auth.signOut();
}

// --- Leaderboard ---
async function showLeaderboardModal() {
  leaderboardModal.style.display = "flex";
  leaderboardModalList.innerHTML = "Loading...";
  try {
    if (!currentUser) {
      leaderboardModalList.innerHTML = "Please log in to view the leaderboard.";
      return;
    }
    const idToken = await currentUser.getIdToken();

    // Try server-side leaderboard first
    try {
      const res = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const items = await res.json();
        if (!items || !items.length) {
          leaderboardModalList.innerHTML = "No players yet.";
          return;
        }
        leaderboardModalList.innerHTML = "";
        items.forEach((u) => {
          const name = u.username || "Player";
          const score = typeof u.score === "number" ? u.score : 0;
          leaderboardModalList.innerHTML += `<div style="margin:8px 0;">${name}: <strong>${score}</strong></div>`;
        });
        return; // success
      }
      // fallthrough to client-side if non-200
      throw new Error(`HTTP ${res.status}`);
    } catch (serverErr) {
      console.warn("[Leaderboard] Server fetch failed, falling back to client Firestore:", serverErr);
      // Fallback: client Firestore (requires read rules)
      const snapshot = await db.collection("users").orderBy("score", "desc").limit(10).get();
      if (snapshot.empty) {
        leaderboardModalList.innerHTML = "No players yet.";
        return;
      }
      leaderboardModalList.innerHTML = "";
      snapshot.forEach((doc) => {
        const u = doc.data() || {};
        const name = u.username || (u.email ? u.email.split("@")[0] : "Player");
        const score = typeof u.score === "number" ? u.score : 0;
        leaderboardModalList.innerHTML += `<div style="margin:8px 0;">${name}: <strong>${score}</strong></div>`;
      });
    }
  } catch (err) {
    console.error("[Leaderboard] Failed to load:", err);
    const msg = err && (err.code || err.message) ? (err.code || err.message) : "Unknown error";
    leaderboardModalList.innerHTML = `Failed to load leaderboard: ${msg}`;
  }
}

function closeLeaderboardModal() {
  leaderboardModal.style.display = "none";
}

// --- Event Listeners ---
closeQuestionModalBtn.addEventListener("click", closeQuestionModal);
submitAnswerBtn.addEventListener("click", submitAnswer);
loginBtn.addEventListener("click", handleLogin);
registerBtn.addEventListener("click", handleRegister);
logoutBtn.addEventListener("click", handleLogout);
viewLeaderboardGameBtn.addEventListener("click", showLeaderboardModal);
closeLeaderboardModalBtn.addEventListener("click", closeLeaderboardModal);

// --- Auth State ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    authModal.style.display = "none";
    gameContainer.classList.remove("hidden");
    const defaultName = user.displayName || (user.email ? user.email.split("@")[0] : "");
    if (defaultName) userInfoEl.textContent = `Team: ${defaultName}`;
    await fetchQuestions();
    await loadUserProfile();
  } else {
    currentUser = null;
    authModal.style.display = "flex";
    gameContainer.classList.add("hidden");
    userProfile = { solved: [], score: 0 };
    currentScoreEl.textContent = 0;
    userInfoEl.textContent = "Welcome!";
  }
});
