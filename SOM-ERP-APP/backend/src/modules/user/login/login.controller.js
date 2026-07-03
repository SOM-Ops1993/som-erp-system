import { findAccount } from "../../../../access.js";
import { signJwt } from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";

// Temporary flat-file login — checks credentials against backend/access.js
// instead of a database-backed User table. See that file's header comment.
export const login = async (req, res) => {
  const { email, password } = req.body;

  const account = findAccount(email);
  if (!account || account.password !== password) {
    return res.status(401).json({ success: false, error: "Invalid credentials", code: "UNAUTHORIZED" });
  }

  const token = signJwt({ email: account.email });

  // userId is a strict-UUID column — access.js accounts have no UUID, so it's
  // left null here and the email goes in username instead (a plain string column).
  await writeAudit({
    userId: null,
    username: account.email,
    action: "LOGIN",
    tableName: "access.js",
    recordId: account.email,
    ip: req.ip,
  });

  return res.json({
    success: true,
    token,
    user: {
      user_id: account.email,
      email: account.email,
      full_name: account.fullName,
      role: account.role,
      operation: account.operation,
      plant: account.plant,
    },
  });
};
