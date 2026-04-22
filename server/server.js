const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const app = express();


app.use(cors());
app.use(express.json());

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