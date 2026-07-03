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
  const { email, password } = req.body || {};
  const errors = [
    ...isRequired("email", email),
    ...isRequired("password", password),
  ];
  if (errors.length) return res.status(400).json(validationError(errors));
  next();
}
