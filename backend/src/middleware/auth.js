/**
 * ERP Auth Middleware — JWT verify + role guard
 * Uses Node.js built-in crypto (no external JWT library needed)
 */
import { createHmac, pbkdf2Sync, randomBytes } from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "som-erp-super-secret-change-in-production-2026";
const JWT_EXPIRES_SEC = 8 * 60 * 60; // 8 hours
const PIN_JWT_EXPIRES_SEC = 30 * 60; // 30 min pin session

// ─── JWT helpers ────────────────────────────────────────────────────────────

export function signJwt(payload, expiresIn = JWT_EXPIRES_SEC) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }),
  ).toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token) {
  const parts = token?.split(".");
  if (!parts || parts.length !== 3) throw new Error("Invalid token format");
  const [h, b, s] = parts;
  const expected = createHmac("sha256", JWT_SECRET)
    .update(`${h}.${b}`)
    .digest("base64url");
  if (s !== expected) throw new Error("Invalid token signature");
  const payload = JSON.parse(Buffer.from(b, "base64url").toString());
  if (payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  return payload;
}

// ─── Password helpers ────────────────────────────────────────────────────────

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const attempt = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString(
    "hex",
  );
  return attempt === hash;
}

export function hashPin(pin) {
  const salt = randomBytes(8).toString("hex");
  const hash = pbkdf2Sync(pin, salt, 50000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const attempt = pbkdf2Sync(pin, salt, 50000, 32, "sha256").toString("hex");
  return attempt === hash;
}

// ─── Dev bypass ─────────────────────────────────────────────────────────────
// Set BYPASS_AUTH=true in .env to skip token checks during development.
// Never set this in production — the guard below prevents it.
const BYPASS_AUTH =
  process.env.BYPASS_AUTH === "true" &&
  process.env.NODE_ENV !== "production";

const DEV_USER = {
  user_id: "dev-user",
  username: "dev",
  full_name: "Dev Admin",
  role: "admin",
};

// ─── Express middleware: authenticate ────────────────────────────────────────

export function authenticate(req, res, next) {
  if (BYPASS_AUTH) {
    req.user = DEV_USER;
    return next();
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header",
      });
    }
    const token = authHeader.slice(7);
    const payload = verifyJwt(token);
    req.user = payload; // { user_id, username, role, full_name }
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: err.message || "Unauthorized" });
  }
}

// ─── Express middleware factory: authorize(roles[]) ───────────────────────────

export function authorize(roles = []) {
  return function (req, res, next) {
    authenticate(req, res, () => {
      if (roles.length && !roles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user?.role}`,
        });
      }
      next();
    });
  };
}

// Alias for admin only
export const adminOnly = authorize(["admin"]);

export const storeOrAbove = authorize([
  "store_person",
  "store_manager",
  "admin",
]);

export const managerOrAbove = authorize([
  "store_manager",
  "planning_manager",
  "admin",
]);
