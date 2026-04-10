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
import { mergeMessageIntoPath, stripQuery } from "@/lib/pagination";

function safeReturnTo(rawPath: unknown): string {
  const value = valueAsString(rawPath).trim();
  if (value.startsWith("/admin/images")) {
    return value;
  }
  return "/admin/images";
}

function redirectWithMessage(
  returnTo: string,
  type: "error" | "success",
  message: string
): never {
  redirect(mergeMessageIntoPath(returnTo, type, message));
}

async function getAdminContext() {
  const { adminClient, profile } = await requireSuperadmin();

  return {
    adminClient,
    actorId: valueAsString(profile.id),
  };
}

function removeId(payload: Row) {
  delete payload.id;
}

export async function createImageAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"));

  try {
    const payload = parseObjectPayload(formData.get("payload"));
    removeId(payload);

    if (!Object.keys(payload).length) {
      throw new Error("JSON payload cannot be empty.");
    }

    const { adminClient, actorId } = await getAdminContext();
    const { error } = await adminClient.from("images").insert({
      ...payload,
      created_by_user_id: actorId,
      modified_by_user_id: actorId,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(stripQuery(returnTo));
    redirectWithMessage(returnTo, "success", "Image record created.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", getErrorMessage(error));
  }
}

export async function updateImageAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"));

  try {
    const id = coercePrimaryKey(formData.get("id"));
    const payload = parseObjectPayload(formData.get("payload"));
    removeId(payload);

    if (!Object.keys(payload).length) {
      throw new Error("JSON payload cannot be empty.");
    }

    const { adminClient, actorId } = await getAdminContext();
    const { error } = await adminClient
      .from("images")
      .update({
        ...payload,
        modified_by_user_id: actorId,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(stripQuery(returnTo));
    redirectWithMessage(returnTo, "success", "Image record updated.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", getErrorMessage(error));
  }
}

export async function deleteImageAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get("returnTo"));

  try {
    const id = coercePrimaryKey(formData.get("id"));

    const { adminClient } = await getAdminContext();
    const { error } = await adminClient.from("images").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(stripQuery(returnTo));
    redirectWithMessage(returnTo, "success", "Image record deleted.");
  } catch (error) {
    redirectWithMessage(returnTo, "error", getErrorMessage(error));
  }
}
