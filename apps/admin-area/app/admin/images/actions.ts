"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  coercePrimaryKey,
  getErrorMessage,
  parseObjectPayload,
  type Row,
} from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";

function redirectWithMessage(type: "error" | "success", message: string): never {
  const params = new URLSearchParams({
    [type]: message.slice(0, 220),
  });

  redirect(`/admin/images?${params.toString()}`);
}

async function getAdminClient() {
  const { adminClient } = await requireSuperadmin();
  return adminClient;
}

function removeId(payload: Row) {
  delete payload.id;
}

export async function createImageAction(formData: FormData) {
  try {
    const payload = parseObjectPayload(formData.get("payload"));
    removeId(payload);

    if (!Object.keys(payload).length) {
      throw new Error("JSON payload cannot be empty.");
    }

    const adminClient = await getAdminClient();
    const { error } = await adminClient.from("images").insert(payload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/images");
    redirectWithMessage("success", "Image record created.");
  } catch (error) {
    redirectWithMessage("error", getErrorMessage(error));
  }
}

export async function updateImageAction(formData: FormData) {
  try {
    const id = coercePrimaryKey(formData.get("id"));
    const payload = parseObjectPayload(formData.get("payload"));
    removeId(payload);

    if (!Object.keys(payload).length) {
      throw new Error("JSON payload cannot be empty.");
    }

    const adminClient = await getAdminClient();
    const { error } = await adminClient.from("images").update(payload).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/images");
    redirectWithMessage("success", "Image record updated.");
  } catch (error) {
    redirectWithMessage("error", getErrorMessage(error));
  }
}

export async function deleteImageAction(formData: FormData) {
  try {
    const id = coercePrimaryKey(formData.get("id"));

    const adminClient = await getAdminClient();
    const { error } = await adminClient.from("images").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/images");
    redirectWithMessage("success", "Image record deleted.");
  } catch (error) {
    redirectWithMessage("error", getErrorMessage(error));
  }
}
