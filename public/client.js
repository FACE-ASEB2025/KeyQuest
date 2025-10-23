console.log("Client-side JavaScript loaded!");

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

// --- Fetch Questions from Server ---
async function fetchQuestions() {
  try {
    const res = await fetch("/api/questions");
    allQuestionsData = await res.json();
    buildGameBoard(allQuestionsData);
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
  modalAssetContainer.innerHTML = q.image
    ? `<img src="${q.image}" style="max-width:100%; border-radius:10px; margin-top:10px;">`
    : "";
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
    const box = document.querySelector(`.point-box[data-question-id='${currentQuestionId}']`);
    if (box) box.classList.add("used");
  }
}

// --- Auth Functions ---
async function handleRegister() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const username = usernameInputAuth.value.trim();
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection("users").doc(cred.user.uid).set({
      username,
      email,
      score: 0,
      solved: [],
    });
  } catch (err) {
    authErrorEl.textContent = err.message;
  }
}

async function handleLogin() {
  try {
    await auth.signInWithEmailAndPassword(emailInput.value.trim(), passwordInput.value.trim());
  } catch (err) {
    authErrorEl.textContent = err.message;
  }
}

async function handleLogout() {
  await auth.signOut();
}

// --- Leaderboard ---
async function showLeaderboardModal() {
  leaderboardModal.style.display = "flex";
  leaderboardModalList.innerHTML = "Loading...";
  const snapshot = await db.collection("users").orderBy("score", "desc").limit(10).get();
  leaderboardModalList.innerHTML = "";
  snapshot.forEach((doc) => {
    const user = doc.data();
    leaderboardModalList.innerHTML += `<div style="margin:8px 0;">${user.username}: <strong>${user.score}</strong></div>`;
  });
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
    fetchQuestions();
  } else {
    currentUser = null;
    authModal.style.display = "flex";
    gameContainer.classList.add("hidden");
  }
});
