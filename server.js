// ================================
// FACE CLUB CTF — SERVER (Node.js)
// ================================

const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

// --- 1. CONNECT TO FIREBASE ADMIN SDK ---
const serviceAccount = require("./face-club-ctf-firebase-adminsdk-fbsvc-a9e9abb1e1.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("[Server Startup] Firebase Admin SDK initialized.");
} catch (error) {
  console.error("[Server Startup] Firebase Admin Init Error:", error);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();
console.log("[Server Startup] Connected to Firebase services.");

// --- 2. EXPRESS APP SETUP ---
const app = express();
const PORT = 3000;

console.log("[Server Startup] Setting up middleware...");
app.use(express.static(path.join(__dirname, "public"))); // serve index.html, client.js, styles.css
app.use(express.json());
console.log("[Server Startup] Middleware setup complete.");

// --- 3. QUESTION DATA ---
const allQuestions = {
  // Steganography
  stego100: {
    points: 100,
    question: "Decode the hidden data from this image...",
    image: "Stego/Vardhan/crowd.jpg.bmp",
    answer: "Sacrifice more or want less",
  },
  stego200: {
    points: 200,
    question: "Decode the hidden data from this image...",
    image: "Stego/Nayan/IRO.png",
    answer: "IRON MAN BUILT THIS IN A CAVE, WITH A BOX OF SCRAPS!",
  },
  stego300: {
    points: 300,
    question: "Decode the hidden data from this image...",
    image: "Stego/Nayan/dum.png",
    answer: "this is my red flag",
  },
  stego400: {
    points: 400,
    question: "Open the challenge and enter the secret/flag.",
    link: "https://68f352a753e83c14d8f81996--regal-beignet-28f0c8.netlify.app/",
    answer: "FLAG{easy}",
  },
  stego500: {
    points: 500,
    question: "Open the challenge and enter the secret/flag.",
    link: "https://68f3de95a6f75258f31aaa90--regal-beignet-28f0c8.netlify.app/",
    answer: "FLAG{hex_hunt_master}",
  },

  // Cryptography
  crypto100: { points: 100, question: "Decode Morse code: .- .-.. --. --- .-. .. - .... --", answer: "ALGORITHM" },
  crypto200: { points: 200, question: "Agent message, keyword hint: 'door'. Decrypt: WERBMV", answer: "MATRIX" },
  crypto300: { points: 300, question: "Caesar (3) then Rail Fence (2). Decrypt: HORELLOLW", answer: "HELLOWORLD" },
  crypto400: { points: 400, question: "Shifted message G M F R W Q V H O R, shifts (-2)(+1)(-3)(0)(+2)(-1)(-2)(+1)(0)(-4). Find original.", answer: "ENCRYPTION" },
  crypto500: { points: 500, question: "Masked word hint: 'science rooms'. Cipher: BEL STX ACK BEL FF SOH BS BS SOH.", answer: "SCHEMATIC" },

  // OSINT
  osint100: { points: 100, question: "What does OSINT stand for?", answer: "open source intelligence" },
  osint200: { points: 200, question: "Common website for exposed device info?", answer: "shodan" },
  osint300: { points: 300, question: "What is 'dorking' in OSINT?", answer: "using advanced search operators" },
  osint400: { points: 400, question: "Tool for historical website versions?", answer: "wayback machine" },
  osint500: { points: 500, question: "Finding location from photo metadata is called?", answer: "exif analysis" },
};

// --- 4. TOKEN VERIFICATION MIDDLEWARE ---
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("[VerifyToken] No token.");
    return res.status(401).json({ correct: false, message: "Unauthorized: No token." });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    req.user = await auth.verifyIdToken(idToken);
    console.log("[VerifyToken] OK for UID:", req.user.uid);
    next();
  } catch (error) {
    console.error("[VerifyToken] Invalid token:", error.code);
    return res.status(401).json({ correct: false, message: "Unauthorized: Invalid token." });
  }
};

// --- 5. API ROUTES ---

// Get questions
app.get("/api/questions", (req, res) => {
  console.log("[Server GET /api/questions] Request received.");
  const safeQuestions = {};
  for (const [id, data] of Object.entries(allQuestions)) {
    safeQuestions[id] = { question: data.question, image: data.image, link: data.link, points: data.points };
  }
  res.status(200).json(safeQuestions);
});
console.log("[Server Setup] Defined GET /api/questions");

// Submit answer
app.post("/api/submit", verifyToken, async (req, res) => {
  const { questionId, guess } = req.body;
  const userId = req.user.uid;

  const q = allQuestions[questionId];
  if (!q) return res.status(400).json({ correct: false, message: "Invalid question ID" });

  if (guess.toLowerCase() === q.answer.toLowerCase()) {
    const userRef = db.collection("users").doc(userId);
    let userDoc = await userRef.get();

    // Auto-create profile if missing
    if (!userDoc.exists) {
      console.warn(`[Server] Auto-creating profile for ${userId}`);
      await userRef.set({
        username: req.user.email.split("@")[0],
        email: req.user.email,
        score: 0,
        solved: [],
      });
      userDoc = await userRef.get();
    }

    const user = userDoc.data();
    const solved = user.solved || [];
    const already = solved.includes(questionId);
    const newScore = already ? user.score : (user.score || 0) + q.points;

    if (!already) {
      await userRef.update({ score: newScore, solved: [...solved, questionId] });
    }

    return res.json({
      correct: true,
      message: already ? "Correct! (Already solved)" : `Correct! +${q.points} pts!`,
      newScore,
    });
  } else {
    return res.json({ correct: false, message: "Incorrect." });
  }
});

// --- Catch-All Route ---
app.use((req, res) => {
  console.log(`[Server Catch-All] ${req.method} ${req.originalUrl}`);
  res.status(404).send("Resource not found!");
});
console.log("[Server Setup] Defined Catch-All Route.");

// --- Start Server ---
console.log("[Server Setup] Starting listener...");
app.listen(PORT, () => {
  console.log(`[Server Running] Server listening on http://localhost:${PORT}`);
  console.log("[Server Running] Listener callback executed.");
});
