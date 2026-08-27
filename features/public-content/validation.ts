export const PUBLIC_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isPublicUuid(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_UUID_PATTERN.test(value);
}

export function isNonBlankPublicText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isOptionalPublicText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function normalizeOptionalPublicText(value: string | null) {
  return value?.trim() || null;
}

export function isValidPublicDisplayOrder(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parsePublicNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  allowNull: false,
): { valid: true; value: number } | { valid: false; value: null };
export function parsePublicNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  allowNull: true,
): { valid: true; value: number | null } | { valid: false; value: null };
export function parsePublicNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  allowNull: boolean,
) {
  if (allowNull && value === null) {
    return { valid: true, value: null } as const;
  }
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return { valid: false, value: null } as const;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    return { valid: false, value: null } as const;
  }

  return { valid: true, value: number } as const;
}

export function isValidPublicTimestamp(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value.trim() === "") return false;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  if (!dateMatch) {
    return false;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  if (!daysInMonth || day < 1 || day > daysInMonth) return false;
  return Number.isFinite(Date.parse(value));
}

export function normalizeOptionalPublicHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;

  try {
    const parsedUrl = new URL(normalized);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? normalized
      : null;
  } catch {
    return null;
  }
}
