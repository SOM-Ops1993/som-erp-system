/**
 * Global String Validators
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates string fields: length, pattern, format.
 * Each function returns an error array — empty means valid.
 *
 * Usage in local middleware:
 *   import { isMinLength, isMaxLength } from '../../../../middleware/validators/string.js'
 */

// ─── Length ───────────────────────────────────────────────────────────────────

/**
 * Fails if value is present and shorter than min characters (after trim).
 */
export function isMinLength(field, value, min) {
  if (value === null || value === undefined) return [];
  if (String(value).trim().length < min) {
    return [
      `${field} must be at least ${min} character${min !== 1 ? "s" : ""}`,
    ];
  }
  return [];
}

/**
 * Fails if value is present and longer than max characters (after trim).
 */
export function isMaxLength(field, value, max) {
  if (value === null || value === undefined) return [];
  if (String(value).trim().length > max) {
    return [`${field} must not exceed ${max} character${max !== 1 ? "s" : ""}`];
  }
  return [];
}

/**
 * Fails if value is present and outside [min, max] character length.
 */
export function isLengthBetween(field, value, min, max) {
  return [...isMinLength(field, value, min), ...isMaxLength(field, value, max)];
}

// ─── Format ───────────────────────────────────────────────────────────────────

/**
 * Fails if value is present and is not a valid email address.
 */
export function isEmail(field, value) {
  if (value === null || value === undefined) return [];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(String(value)))
    return [`${field} must be a valid email address`];
  return [];
}

/**
 * Fails if value is present and contains characters not matching the pattern.
 * @param {string} field
 * @param {*}      value
 * @param {RegExp} pattern
 * @param {string} hint    - human-readable description of the pattern
 */
export function matchesPattern(field, value, pattern, hint) {
  if (value === null || value === undefined) return [];
  if (!pattern.test(String(value))) {
    return [`${field} ${hint || "has an invalid format"}`];
  }
  return [];
}

/**
 * Fails if value is present and contains only whitespace (already trimmed to blank).
 */
export function isNotBlank(field, value) {
  if (value === null || value === undefined) return [];
  if (String(value).trim() === "") return [`${field} must not be blank`];
  return [];
}

// ─── Phone ────────────────────────────────────────────────────────────────────

/**
 * Fails if value is present and is not a 10-digit Indian mobile number.
 * Allows optional +91 / 91 prefix.
 */
export function isIndianPhone(field, value) {
  if (value === null || value === undefined) return [];
  const digits = String(value).replace(/\D/g, "");
  const core =
    digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(core)) {
    return [`${field} must be a valid 10-digit Indian mobile number`];
  }
  return [];
}
