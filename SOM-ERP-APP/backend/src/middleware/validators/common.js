/**
 * Global Common Validators
 * ─────────────────────────────────────────────────────────────────────────────
 

// ─── Presence ─────────────────────────────────────────────────────────────────

/**
 * Fails if value is null, undefined, or empty string after trimming.
 * @param {string} field  - field name shown in the error message
 * @param {*}      value  - value to check
 */

export function isRequired(field, value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [`${field} is required`];
  }
  return [];
}

/**
 * Fails if value is present but is not a non-empty string after trimming.
 * Use when the field is optional but must not be blank if provided.
 */

export function isNonEmptyIfPresent(field, value) {
  if (value === null || value === undefined) return [];
  if (String(value).trim() === "") return [`${field} must not be blank`];
  return [];
}

// ─── Type — UUID ──────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fails if value is present and is not a valid UUID v4 string.
 */
export function isUUID(field, value) {
  if (value === null || value === undefined) return [];
  if (!UUID_RE.test(String(value))) return [`${field} must be a valid UUID`];
  return [];
}

/**
 * Fails if value is absent OR not a valid UUID.
 */
export function isRequiredUUID(field, value) {
  return [...isRequired(field, value), ...isUUID(field, value)];
}

// ─── Type — Enum ──────────────────────────────────────────────────────────────

/**
 * Fails if value is not one of the allowed options.
 * @param {string}   field    - field name
 * @param {*}        value    - value to check
 * @param {string[]} options  - allowed values
 */
export function isEnum(field, value, options) {
  if (value === null || value === undefined) return [];
  if (!options.includes(value)) {
    return [
      `${field} must be one of: ${options.join(", ")}. Received: "${value}"`,
    ];
  }
  return [];
}

/**
 * Required + enum combined.
 */
export function isRequiredEnum(field, value, options) {
  const req = isRequired(field, value);
  if (req.length) return req; // no point checking enum if empty
  return isEnum(field, value, options);
}

// ─── Type — Boolean ───────────────────────────────────────────────────────────

/**
 * Fails if value is present and is not a boolean (or the strings 'true'/'false').
 */
export function isBoolean(field, value) {
  if (value === null || value === undefined) return [];
  if (typeof value === "boolean") return [];
  if (value === "true" || value === "false") return [];
  return [`${field} must be a boolean (true or false)`];
}

// ─── Arrays ───────────────────────────────────────────────────────────────────

/**
 * Fails if value is not an array.
 */
export function isArray(field, value) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) return [`${field} must be an array`];
  return [];
}

/**
 * Fails if value is not a non-empty array.
 */
export function isNonEmptyArray(field, value) {
  const arrErr = isArray(field, value);
  if (arrErr.length) return arrErr;
  if (value.length === 0) return [`${field} must contain at least one item`];
  return [];
}

// ─── Helper: build 400 response body ─────────────────────────────────────────

/**
 * Standardises the 400 response shape across all local middlewares.
 * @param {string[]} errors - collected error strings
 * @returns {{ success: false, errors: string[], message: string }}
 */
export function validationError(errors) {
  return {
    success: false,
    message: "Validation failed",
    errors,
  };
}
