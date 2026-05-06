const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Groq = require("groq-sdk");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

dotenv.config({ path: require("path").resolve(__dirname, ".env") });

app.use(cors());
app.use(express.json());

const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// In-memory user store (temporary)
const users = [];

// JWT secret (use env in production)
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// Initialize Groq (only if API key is available)
let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your-api-key-here") {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
} else {
  console.warn("Groq API key is not set or invalid. AI assistant will remain unavailable.");
}

// storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../ml_api")); 
  },
  filename: function (req, file, cb) {
    cb(null, "uploaded.csv");
  },
});

const upload = multer({ storage });
app.get("/", (req, res) => {
  res.send("RINK Global Services Backend is running ✅");
});

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const existingUser = users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });
  res.status(201).json({ message: "User registered" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

app.post("/train", async (req, res) => {
  const r = await axios.post(`${process.env.ML_API_URL}/train`);
  res.json(r.data);
});

app.post("/predict", async (req, res) => {
  const r = await axios.post(`${process.env.ML_API_URL}/predict`, req.body);
  res.json(r.data);
});

app.get("/data", async (req, res) => {
  try {
    const r = await axios.get(`${process.env.ML_API_URL}/data`);
    res.json(r.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Data fetch error");
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // ✅ Automatically train after upload
    await axios.post(`${process.env.ML_API_URL}/train`);

    res.json({ message: "Uploaded + Model trained 🚀" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload or training failed");
  }
});

app.post("/api/ai-assistant", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are RINK AI Assistant, an expert in AI, machine learning, and time series analytics. You help users understand:

- AI and machine learning concepts
- Time series prediction models (LSTM, ARIMA, Prophet, etc.)
- Data preprocessing and feature engineering
- Model selection and evaluation
- RINK platform features and capabilities
- Best practices for predictive analytics

Be helpful, accurate, and encouraging. Keep responses concise but informative. If users ask about specific models or techniques, explain them clearly with practical examples when relevant.

RINK specializes in:
- LSTM neural networks for time series prediction
- Real-time forecasting
- Interactive data visualization
- Automated model training
- CSV data upload and processing`
        },
        { role: "user", content: message }
      ]
    });

    const response = completion.choices[0].message.content;
    res.json({ response });

  } catch (error) {
    console.error("AI Assistant error:", error);

    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      "Sorry, I'm having trouble processing your request right now. Please try again later.";

    res.status(status).json({ error: message });
  }
});

// Fallback to the front-end app for non-API routes when client build exists
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/upload") ||
    req.path.startsWith("/train") ||
    req.path.startsWith("/predict") ||
    req.path.startsWith("/data")
  ) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(5001, () => console.log("Server running on port 5001"));