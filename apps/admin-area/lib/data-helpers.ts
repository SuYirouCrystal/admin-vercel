export type Row = Record<string, unknown>;

export function toRowArray(value: unknown): Row[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Row => {
    return typeof item === "object" && item !== null && !Array.isArray(item);
  });
}

export function pickFirstField(row: Row, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) {
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

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

export function coercePrimaryKey(raw: unknown): string | number {
  const value = valueAsString(raw).trim();

  if (!value) {
    throw new Error("Record ID is required.");
  }

  if (/^-?\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return value;
}

export function parseObjectPayload(raw: unknown): Row {
  if (typeof raw !== "string") {
    throw new Error("Payload must be a JSON object.");
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Payload must be a JSON object.");
  }

  return parsed as Row;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}
