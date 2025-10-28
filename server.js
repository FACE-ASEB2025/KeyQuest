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
  crypto100: { 
    points: 100, 
    question: "Hex Mystery. [EASY] Ciphertext: 426c61636b. Hint: Some numbers look different when read by machines.", 
    answer: "BLACK" 
  },
  crypto150: { 
    points: 150, 
    question: "Binary Puzzle. [EASY] Ciphertext: 01000010 01001001 01001111. Hint: Strings of ones and zeros may hide secrets.", 
    answer: "BIO" 
  },
  crypto200: { 
    points: 200, 
    question: "Shifted Alphanumeric (Simple). [EASY] Ciphertext: Dpef15. Hint: Letters and numbers march differently. (Shift 1 applied to letters and digits)", 
    answer: "CODE04" 
  },
  crypto250: { 
    points: 250, 
    question: "XOR Secret. [MEDIUM] Ciphertext (hex): 6b 66 67 6e. Hint: A small invisible key can flip meanings.", 
    answer: "KING" 
  },
  crypto300: { 
    points: 300, 
    question: "Vigenère Cipher. [MEDIUM] Ciphertext: WERBMV. Hint: The thing that opens a door also opens this puzzle.", 
    answer: "MATRIX" 
  },
  crypto350: { 
    points: 350, 
    question: "Ulta. [MEDIUM] Ciphertext: S1003D3IOW. Hint: The true message lies beyond Cerberus's three heads. But first, the message must be unwoven from the two threads of fate. Know that the vowels were marked by single fingers, and the journey itself must be reversed to reach the start.", 
    answer: "HELLOWORLD" 
  },
  crypto400: { 
    points: 400, 
    question: "Masked Vigenère (Key: PIRATE). [HARD] Ciphertext: IZVALYGM. Hint: To reveal the motherlode, you must decrypt using the signature of the one who said, 'Why fight when you can negotiate?'.", 
    answer: "TREASURE" 
  },
  crypto450: { 
    points: 450, 
    question: "Multi-step Number-encoded Letters. [HARD] Numbers: 8, 20, 18, 18, 26, 19, 14, 25, 30. Hint: The true date is scrambled by an erroneous five-year jump and a complete inversion of the timeline.", 
    answer: "COMMUNITY" 
  },
  crypto500: { 
    points: 500, 
    question: "Repeating Mask Cipher (Reverse XOR). [HARD] Ciphertext (Hex): 00 1D 05 06 08 0A 16. Hint: The message is veiled by a repeating four-character blueprint of a system-breaking action. To reveal the one who shatters security, you must use the mask where A ⊕ A = 0 to expose the truth.", 
    answer: "CRACKER" 
  },

  // OSINT
  osint100: { 
    points: 100, 
    question: "Bob wants to find out how many data breaches his email address has been associated with as of 28/10/2025. Email: BOB@gmail.com Find a suitable website to look up the number of breaches and find out the total number of breaches.",
    answer: "390" 
  },

  osint200: { 
    points: 200, 
    question: "While monitoring network traffic, Bob finds a suspicious domain: gogogle.com Perform a domain lookup and find the registrar name (omit “Inc” while answering).", 
    answer: "MarkMonitor"
  },

  osint300: { 
    points: 300, 
    question: "Bob is trying to locate a missing journalist.He finds the journalist’s last post on social media.In which country is Bob most likely to find the journalist?",
    image: "public/OSINT/LocationPic2.png", 
    answer: "Iceland" 
  },

  osint400: { points: 400, 
    question: "One of Bob’s colleagues has hidden a secret message on the website asebface.in, and it is crucial for your next step.Decode the message and give the last word of that hidden message.", 
    answer: "BOB" 
  },

  osint500: { 
    points: 500, 
    question: "As part of Bob’s onboarding, the agency sends an email with an jpg attachemnt and no location information. Bob realizes the true coordinates are hidden inside the image itself. Extract the latitude, longitude   from the image, then add them together.(upto 3 decimals)",
    image: "public/OSINT/Location.jpg", 
    answer: "116.734" },
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

// Leaderboard (Top 10) — requires auth
app.get("/api/leaderboard", verifyToken, async (req, res) => {
  try {
    const snap = await db.collection("users").orderBy("score", "desc").limit(10).get();
    const items = [];
    snap.forEach((doc) => {
      const u = doc.data() || {};
      items.push({
        username: u.username || (u.email ? String(u.email).split("@")[0] : "Player"),
        score: typeof u.score === "number" ? u.score : 0,
      });
    });
    res.json(items);
  } catch (e) {
    console.error("[Server GET /api/leaderboard] Error:", e);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

// Submit answer
app.post("/api/submit", verifyToken, async (req, res) => {
  const { questionId, guess } = req.body;
  const userId = req.user.uid;

  const q = allQuestions[questionId];
  if (!q) return res.status(400).json({ correct: false, message: "Invalid question ID" });

  const isCorrect = typeof guess === "string" && guess.toLowerCase() === q.answer.toLowerCase();
  if (!isCorrect) {
    return res.json({ correct: false, message: "Incorrect." });
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const statsRef = db.collection("questionStats").doc(questionId);

    const result = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const statsSnap = await tx.get(statsRef);

      // Ensure user exists (merge to avoid overwriting)
      const baseUser = userSnap.exists
        ? userSnap.data()
        : {
            username: (req.user.email && req.user.email.split("@")[0]) || userId,
            email: req.user.email || "",
            score: 0,
            solved: [],
          };

      const solved = Array.isArray(baseUser.solved) ? baseUser.solved : [];
      const already = solved.includes(questionId);
      if (already) {
        return { already: true, newScore: baseUser.score || 0, awarded: 0 };
      }

      // Compute dynamic award for stego only
      const basePoints = q.points;
      let awarded = basePoints;
      if (questionId.startsWith("stego")) {
        const solvesCount = statsSnap.exists && typeof statsSnap.data().solvesCount === "number" ? statsSnap.data().solvesCount : 0;
        const dec = ["stego100", "stego200", "stego300"].includes(questionId) ? 5 : 10;
        const extraSolves = Math.max(0, solvesCount - 2); // after first 3 solves (4th solver sees 1x decrement)
        awarded = Math.max(0, basePoints - dec * extraSolves);
      }

      const newScore = (baseUser.score || 0) + awarded;

      // Persist user and question stats
      tx.set(userRef, baseUser, { merge: true });
      tx.set(
        userRef,
        {
          score: newScore,
          solved: [...solved, questionId],
        },
        { merge: true }
      );
      const prevSolves = statsSnap.exists && typeof statsSnap.data().solvesCount === "number" ? statsSnap.data().solvesCount : 0;
      tx.set(statsRef, { solvesCount: prevSolves + 1 }, { merge: true });

      return { already: false, newScore, awarded };
    });

    if (result.already) {
      return res.json({ correct: true, message: "Correct! (Already solved)", newScore: result.newScore });
    } else {
      return res.json({ correct: true, message: `Correct! +${result.awarded} pts!`, newScore: result.newScore });
    }
  } catch (e) {
    console.error("[/api/submit] Transaction error:", e);
    return res.status(500).json({ correct: false, message: "Server error while scoring." });
  }
});

app.get("/download/*", (req, res) => {
  try {
    const publicDir = path.resolve(__dirname, "public");
    const requestedPath = req.params[0] || "";
    const filePath = path.resolve(publicDir, requestedPath);
    const rel = path.relative(publicDir, filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return res.status(400).send("Invalid path");
    }
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        if (!res.headersSent) res.status(404).send("File not found");
      }
    });
  } catch (e) {
    res.status(500).send("Server error");
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
