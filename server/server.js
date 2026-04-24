const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = express();


app.use(cors());
app.use(express.json());

// In-memory user store (temporary)
const users = [];

// JWT secret (use env in production)
const JWT_SECRET = "your-secret-key";

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
  res.send("RINK Backend is running ✅");
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
  const r = await axios.post("http://localhost:8000/train");
  res.json(r.data);
});

app.post("/predict", async (req, res) => {
  const r = await axios.post("http://localhost:8000/predict", req.body);
  res.json(r.data);
});

app.get("/data", async (req, res) => {
  try {
    const r = await axios.get("http://localhost:8000/data");
    res.json(r.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Data fetch error");
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // ✅ Automatically train after upload
    await axios.post("http://localhost:8000/train");

    res.json({ message: "Uploaded + Model trained 🚀" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload or training failed");
  }
});

app.listen(5001, () => console.log("Server running on port 5001"));