import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { startCronJobs } from "./services/cron-jobs.js";
import { runAutoSeed } from "./services/auto-seed.js";
import router from "./routers/routers.js";
import { connectDb, disconnectDb } from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Body parsing ───────────────────────────────────────────────────────────────
// Replaces Fastify's built-in body parser + bodyLimit option
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// ── CORS ───────────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";
// app.use(
//   cors({
//     // Dev: allow any localhost port (main ERP 5173, admin panel 5175, etc.)
//     origin: isDev
//       ? (origin, cb) => {
//           if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) cb(null, true);
//           else cb(new Error("CORS: origin not allowed"));
//         }
//       : process.env.FRONTEND_URL || false,
//     credentials: true,
//   }),
// );
app.use(cors()); // Allow all origins for now (can be restricted later if needed)

// ── File uploads ───────────────────────────────────────────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ── Health check ───────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Register all API routes ────────────────────────────────────────────────────
app.use(
  "/api",
  (req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
  },
  router,
);

// ── Serve built frontend in production ────────────────────────────────────────
const publicDir = path.join(__dirname, "..", "public");
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.use((req, res, next) => {
    if (!req.url.startsWith("/api")) {
      return res.sendFile(path.join(publicDir, "index.html"));
    }
    next();
  });
}

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// ── Global error handler ───────────────────────────────────────────────────────
// NOTE: Express requires exactly 4 arguments (err, req, res, next)
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_ERROR",
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);
await connectDb();

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`SOM ERP Backend running on port ${PORT}`);
  runAutoSeed((msg) => console.log(msg));
  startCronJobs(app);
});

const shutdown = async () => {
  console.log("Shutting down backend...");
  await disconnectDb();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
