"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  coercePrimaryKey,
  getErrorMessage,
  parseObjectPayload,
  valueAsString,
  type Row,
} from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";
import { ALLOWED_RESOURCE_TABLES } from "@/lib/admin-resources";

function safePath(rawPath: unknown): string {
  const value = valueAsString(rawPath).trim();
  if (value.startsWith("/admin/resources/")) {
    return value;
  }
  return "/admin";
}

function safeTable(rawTable: unknown): string {
  const table = valueAsString(rawTable).trim();
  if (!ALLOWED_RESOURCE_TABLES.has(table)) {
    throw new Error("Table is not allowed for this admin action.");
  }
  return table;
}

function redirectWithMessage(path: string, type: "error" | "success", message: string): never {
  const params = new URLSearchParams({
    [type]: message.slice(0, 220),
  });

  redirect(`${path}?${params.toString()}`);
}

function removePrimaryKey(payload: Row, primaryKeyColumn: string) {
  delete payload[primaryKeyColumn];
}

export async function createResourceRecordAction(formData: FormData) {
  const path = safePath(formData.get("path"));

  try {
    const table = safeTable(formData.get("table"));
    const payload = parseObjectPayload(formData.get("payload"));
    delete payload.id;

    if (!Object.keys(payload).length) {
      throw new Error("JSON payload cannot be empty.");
    }

    const { adminClient } = await requireSuperadmin();
    const { error } = await adminClient.from(table).insert(payload);
    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(path);
    redirectWithMessage(path, "success", "Record created.");
  } catch (error) {
    redirectWithMessage(path, "error", getErrorMessage(error));
  }
}

export async function updateResourceRecordAction(formData: FormData) {
  const path = safePath(formData.get("path"));

  try {
    const table = safeTable(formData.get("table"));
    const primaryKeyColumn = valueAsString(formData.get("pkColumn")).trim();
    const primaryKeyValue = coercePrimaryKey(formData.get("pkValue"));
    const payload = parseObjectPayload(formData.get("payload"));

    if (!primaryKeyColumn) {
      throw new Error("Primary key column is required.");
    }

    removePrimaryKey(payload, primaryKeyColumn);

    if (!Object.keys(payload).length) {
      throw new Error("JSON payload cannot be empty.");
    }

    const { adminClient } = await requireSuperadmin();
    const { error } = await adminClient
      .from(table)
      .update(payload)
      .eq(primaryKeyColumn, primaryKeyValue);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(path);
    redirectWithMessage(path, "success", "Record updated.");
  } catch (error) {
    redirectWithMessage(path, "error", getErrorMessage(error));
  }
}

export async function deleteResourceRecordAction(formData: FormData) {
  const path = safePath(formData.get("path"));

  try {
    const table = safeTable(formData.get("table"));
    const primaryKeyColumn = valueAsString(formData.get("pkColumn")).trim();
    const primaryKeyValue = coercePrimaryKey(formData.get("pkValue"));

    if (!primaryKeyColumn) {
      throw new Error("Primary key column is required.");
    }

    const { adminClient } = await requireSuperadmin();
    const { error } = await adminClient
      .from(table)
      .delete()
      .eq(primaryKeyColumn, primaryKeyValue);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(path);
    redirectWithMessage(path, "success", "Record deleted.");
  } catch (error) {
    redirectWithMessage(path, "error", getErrorMessage(error));
  }
}
