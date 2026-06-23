/**
 * Global Number Validators
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates numeric fields: positive floats, integers, range checks.
 * Each function returns an error array — empty means valid.
 *
 * Usage in local middleware:
 *   import { isPositiveFloat, isInteger } from '../../../../middleware/validators/number.js'
 */

// ─── Float ────────────────────────────────────────────────────────────────────

/**
 * Fails if value is present but cannot be parsed as a finite number.
 */
export function isNumber(field, value) {
  if (value === null || value === undefined) return [];
  const n = Number(value);
  if (isNaN(n) || !isFinite(n)) return [`${field} must be a valid number`];
  return [];
}

/**
 * Fails if value is present but is not a number > 0.
 */
export function isPositiveFloat(field, value) {
  const numErr = isNumber(field, value);
  if (numErr.length) return numErr;
  if (value === null || value === undefined) return [];
  if (Number(value) <= 0) return [`${field} must be greater than 0`];
  return [];
}

/**
 * Fails if value is absent OR is not a number > 0.
 */
export function isRequiredPositiveFloat(field, value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [`${field} is required`];
  }
  return isPositiveFloat(field, value);
}

/**
 * Fails if value is present but is not >= 0.
 */
export function isNonNegativeFloat(field, value) {
  const numErr = isNumber(field, value);
  if (numErr.length) return numErr;
  if (value === null || value === undefined) return [];
  if (Number(value) < 0) return [`${field} must be 0 or greater`];
  return [];
}

// ─── Integer ──────────────────────────────────────────────────────────────────

/**
 * Fails if value is present but is not a whole integer.
 */
export function isInteger(field, value) {
  const numErr = isNumber(field, value);
  if (numErr.length) return numErr;
  if (value === null || value === undefined) return [];
  if (!Number.isInteger(Number(value)))
    return [`${field} must be a whole number`];
  return [];
}

/**
 * Fails if value is present but is not a positive integer (>= 1).
 */
export function isPositiveInteger(field, value) {
  const intErr = isInteger(field, value);
  if (intErr.length) return intErr;
  if (value === null || value === undefined) return [];
  if (Number(value) < 1)
    return [`${field} must be a positive whole number (>= 1)`];
  return [];
}

/**
 * Fails if value is absent OR not a positive integer.
 */
export function isRequiredPositiveInteger(field, value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [`${field} is required`];
  }
  return isPositiveInteger(field, value);
}

// ─── Range ────────────────────────────────────────────────────────────────────

/**
 * Fails if value is present but is outside [min, max] (inclusive).
 * @param {string} field
 * @param {*}      value
 * @param {number} min
 * @param {number} max
 */

export function isInRange(field, value, min, max) {
  const numErr = isNumber(field, value);
  if (numErr.length) return numErr;
  if (value === null || value === undefined) return [];
  const n = Number(value);
  if (n < min || n > max) return [`${field} must be between ${min} and ${max}`];
  return [];
}
