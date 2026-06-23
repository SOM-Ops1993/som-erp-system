/**
 * Auth › Login — Local Middleware
 * Validates POST /api/auth/login request body.
 * Uses global validators from middleware/validators/.
 */
import {
  isRequired,
  validationError,
} from "../../../middleware/validators/common.js";

export function validateLogin(req, res, next) {
  const { username, password } = req.body || {};
  const errors = [
    ...isRequired("username", username),
    ...isRequired("password", password),
  ];
  if (errors.length) return res.status(400).json(validationError(errors));
  next();
}

export function validatePinLogin(req, res, next) {
  const { username, pin } = req.body || {};
  const errors = [
    ...isRequired("username", username),
    ...isRequired("pin", pin),
  ];
  if (errors.length) return res.status(400).json(validationError(errors));
  next();
}
