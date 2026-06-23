/**
 * Global Date Validators
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates date fields: parseable, future, range.
 * Each function returns an error array — empty means valid.
 *
 * Usage in local middleware:
 *   import { isValidDate, isFutureDate } from '../../../../middleware/validators/date.js'
 */

// ─── Parseable ────────────────────────────────────────────────────────────────

/**
 * Fails if value is present but cannot be parsed into a valid Date.
 * Accepts ISO strings, timestamps, or anything new Date() can handle.
 */
export function isValidDate(field, value) {
  if (value === null || value === undefined) return [];
  const d = new Date(value);
  if (isNaN(d.getTime())) return [`${field} must be a valid date`];
  return [];
}

/**
 * Fails if value is absent OR is not a valid date.
 */
export function isRequiredDate(field, value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [`${field} is required`];
  }
  return isValidDate(field, value);
}

// ─── Relative ─────────────────────────────────────────────────────────────────

/**
 * Fails if value is present, is a valid date, but is in the past.
 * "Today" (same calendar day) is considered valid.
 */
export function isFutureOrToday(field, value) {
  const dateErr = isValidDate(field, value);
  if (dateErr.length) return dateErr;
  if (value === null || value === undefined) return [];

  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return [`${field} must be today or a future date`];
  return [];
}

/**
 * Fails if value is present, is a valid date, but is in the future.
 * Useful for received_date, invoice_date — should not be future.
 */
export function isPastOrToday(field, value) {
  const dateErr = isValidDate(field, value);
  if (dateErr.length) return dateErr;
  if (value === null || value === undefined) return [];

  const d = new Date(value);
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d >= tomorrow) return [`${field} must be today or a past date`];
  return [];
}

// ─── Range ────────────────────────────────────────────────────────────────────

/**
 * Fails if 'from' and 'to' are both valid dates but 'from' is after 'to'.
 * @param {string} fromField
 * @param {*}      fromValue
 * @param {string} toField
 * @param {*}      toValue
 */
export function isValidDateRange(fromField, fromValue, toField, toValue) {
  if (!fromValue || !toValue) return [];
  const from = new Date(fromValue);
  const to = new Date(toValue);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return []; // let isValidDate catch those
  if (from > to) return [`${fromField} must be before ${toField}`];
  return [];
}
