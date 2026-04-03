export type Row = Record<string, unknown>;

export function toRowArray(value: unknown): Row[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Row => {
    return typeof item === "object" && item !== null && !Array.isArray(item);
  });
}

export function pickFirstField(row: Row, keys: Array<string | null | undefined>): unknown {
  for (const key of keys) {
    if (key && key in row) {
      return row[key];
    }
  }

  return undefined;
}

export function valueAsString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return "";
}

export function valueAsBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "t", "1", "yes", "y"].includes(normalized);
  }

  return false;
}

export function coercePrimaryKey(raw: unknown, fieldName = "Record ID"): string | number {
  const value = valueAsString(raw).trim();

  if (!value) {
    throw new Error(`${fieldName} is required.`);
  }

  if (/^-?\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return value;
}
