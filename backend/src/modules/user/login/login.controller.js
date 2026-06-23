import prisma from "../../../db.js";
import {
  signJwt,
  verifyPassword,
  verifyPin,
} from "../../../middleware/auth.js";
import { writeAudit } from "../../../middleware/audit.js";

export async function login(req, res) {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      userId: true,
      username: true,
      fullName: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive)
    return res.status(401).json({ success: false, error: "Invalid credentials" });

  if (!verifyPassword(password, user.passwordHash))
    return res.status(401).json({ success: false, error: "Invalid credentials" });

  const token = signJwt({
    user_id: user.userId,
    username: user.username,
    full_name: user.fullName,
    role: user.role,
  });

  await writeAudit({
    userId: user.userId,
    username: user.username,
    action: "LOGIN",
    tableName: "users",
    recordId: user.userId,
    ip: req.ip,
  });

  return res.json({
    success: true,
    token,
    user: {
      user_id: user.userId,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
    },
  });
}

export async function pinLogin(req, res) {
  const { username, pin } = req.body;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      userId: true,
      username: true,
      fullName: true,
      role: true,
      pinHash: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive)
    return res.status(401).json({ success: false, error: "Invalid credentials" });

  if (!user.pinHash)
    return res.status(401).json({ success: false, error: "PIN not set for this user" });

  if (!verifyPin(pin, user.pinHash))
    return res.status(401).json({ success: false, error: "Invalid PIN" });

  const token = signJwt(
    {
      user_id: user.userId,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
      pin_session: true,
    },
    30 * 60,
  );

  await writeAudit({
    userId: user.userId,
    username: user.username,
    action: "PIN_LOGIN",
    tableName: "users",
    recordId: user.userId,
    ip: req.ip,
  });

  return res.json({
    success: true,
    token,
    user: {
      user_id: user.userId,
      username: user.username,
      full_name: user.fullName,
      role: user.role,
    },
  });
}
