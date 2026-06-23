import express from "express";

import { authenticate } from "../../middleware/auth.js";
import { validateLogin, validatePinLogin } from "./login/login.middleware.js";
import { login, pinLogin } from "./login/login.controller.js";

const UserRouter = express.Router();

UserRouter.post("/login", validateLogin, login);
UserRouter.post("/pin-login", validatePinLogin, pinLogin);

UserRouter.get("/me", authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default UserRouter;
