// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json()); // parse application/json
app.use(express.static(path.join(__dirname, "public")));

// Simple CORS for browser UI (if needed)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // можно ограничить
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// In-memory store + persist to file
let measurements = [];
// try load existing
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    measurements = JSON.parse(raw) || [];
    console.log(`Loaded ${measurements.length} measurements from ${DATA_FILE}`);
  }
} catch (err) {
  console.error("Failed to load data file:", err);
}

// helper: persist (append-safe)
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(measurements, null, 2));
  } catch (err) {
    console.error("Failed to save data:", err);
  }
}

/**
 * API endpoints
 */

// ESP будет посылать JSON:
// { "valueA": <temp>, "valueB": <humi>, "valueC": <light> }

app.post("/api/measurements", (req, res) => {
  const body = req.body;
  if (!body) return res.status(400).json({ error: "empty body" });

  // Normalize fields — подстрахуемся
  const temp = Number(body.valueA ?? body.temp ?? body.temperature);
  const humi = Number(body.valueB ?? body.humi ?? body.humidity);
  const light = Number(body.valueC ?? body.light ?? body.lux ?? body.l);

  if (Number.isNaN(temp) || Number.isNaN(humi) || Number.isNaN(light)) {
    // всё же примем, но пометим
    console.warn("Received invalid numbers, storing raw body:", body);
  }

  const entry = {
    id: Date.now(),
    ts: new Date().toISOString(),
    raw: body,
    temp,
    humi,
    light,
  };

  measurements.push(entry);

  // Keep last N to avoid бесконечного роста (optional)
  const MAX = 1000;
  if (measurements.length > MAX)
    measurements = measurements.slice(measurements.length - MAX);

  saveData();

  console.log("Saved measurement:", entry);
  res.json({ ok: true, saved: entry });
});

// Return last measurement
app.get("/api/latest", (req, res) => {
  if (measurements.length === 0) return res.json({ ok: true, latest: null });
  res.json({ ok: true, latest: measurements[measurements.length - 1] });
});

// Return history (paginated simple)
app.get("/api/history", (req, res) => {
  // ?limit=100
  const limit = Math.min(parseInt(req.query.limit || "200", 10) || 200, 2000);
  const start = Math.max(0, measurements.length - limit);
  res.json({
    ok: true,
    count: measurements.length,
    items: measurements.slice(start),
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Static files served from ${path.join(__dirname, "public")}`);
});
