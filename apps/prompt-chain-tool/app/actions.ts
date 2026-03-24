"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireFlavorAdmin } from "@/lib/auth";

function asTrimmedString(value: FormDataEntryValue | null, fieldName: string) {
  const nextValue = typeof value === "string" ? value.trim() : "";

  if (!nextValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return nextValue;
}

function asOptionalString(value: FormDataEntryValue | null) {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return nextValue || null;
}

function asDatabaseKey(value: FormDataEntryValue | null, fieldName: string) {
  const rawValue = asTrimmedString(value, fieldName);

  if (/^-?\d+$/.test(rawValue)) {
    const parsed = Number(rawValue);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return rawValue;
}

function redirectWithMessage(
  type: "success" | "error",
  message: string,
  flavorId?: string | number | null
): never {
  const params = new URLSearchParams({
    [type]: message.slice(0, 220),
  });

  if (flavorId !== null && typeof flavorId !== "undefined" && `${flavorId}`.trim()) {
    params.set("flavor", `${flavorId}`);
  }

  redirect(`/?${params.toString()}`);
}

async function actorContext() {
  const { adminClient, profile } = await requireFlavorAdmin();

  return {
    adminClient,
    actorId: profile.id,
  };
}

type StepRow = {
  id: string | number;
  step_order: number | null;
};

async function listFlavorSteps(
  adminClient: Awaited<ReturnType<typeof actorContext>>["adminClient"],
  flavorId: string | number
) {
  const { data, error } = await adminClient
    .from("humor_flavor_steps")
    .select("id, step_order")
    .eq("flavor_id", flavorId)
    .order("step_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StepRow[];
}

async function normalizeStepOrder(
  adminClient: Awaited<ReturnType<typeof actorContext>>["adminClient"],
  actorId: string,
  flavorId: string | number,
  orderedSteps?: StepRow[]
) {
  const steps = orderedSteps ?? (await listFlavorSteps(adminClient, flavorId));

  await Promise.all(
    steps.map((step, index) =>
      adminClient
        .from("humor_flavor_steps")
        .update({
          step_order: index + 1,
          modified_by_user_id: actorId,
        })
        .eq("id", step.id)
    )
  );
}

export async function createFlavorAction(formData: FormData) {
  try {
    const { adminClient, actorId } = await actorContext();
    const name = asTrimmedString(formData.get("name"), "Flavor name");
    const description = asOptionalString(formData.get("description"));

    const { data, error } = await adminClient
      .from("humor_flavors")
      .insert({
        name,
        description,
        created_by_user_id: actorId,
        modified_by_user_id: actorId,
      })
      .select("id")
      .single<{ id: string | number }>();

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Humor flavor created.", data?.id);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to create flavor."
    );
  }
}

export async function updateFlavorAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId } = await actorContext();
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const name = asTrimmedString(formData.get("name"), "Flavor name");
    const description = asOptionalString(formData.get("description"));

    const { error } = await adminClient
      .from("humor_flavors")
      .update({
        name,
        description,
        modified_by_user_id: actorId,
      })
      .eq("id", flavorKey);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Humor flavor updated.", flavorKey);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to update flavor.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}

export async function deleteFlavorAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient } = await actorContext();
    const flavorKey = asDatabaseKey(flavorId, "Flavor");

    const { error: deleteStepsError } = await adminClient
      .from("humor_flavor_steps")
      .delete()
      .eq("flavor_id", flavorKey);

    if (deleteStepsError) {
      throw new Error(deleteStepsError.message);
    }

    const { error } = await adminClient
      .from("humor_flavors")
      .delete()
      .eq("id", flavorKey);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Humor flavor deleted.");
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to delete flavor.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}

export async function createStepAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId } = await actorContext();
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const promptText = asTrimmedString(formData.get("promptText"), "Step prompt");

    const existingSteps = await listFlavorSteps(adminClient, flavorKey);
    const nextOrder = existingSteps.length + 1;

    const { error } = await adminClient.from("humor_flavor_steps").insert({
      flavor_id: flavorKey,
      step_order: nextOrder,
      prompt_text: promptText,
      created_by_user_id: actorId,
      modified_by_user_id: actorId,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Step created.", flavorKey);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to create step.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}

export async function updateStepAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId } = await actorContext();
    const stepId = asDatabaseKey(formData.get("stepId"), "Step");
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const promptText = asTrimmedString(formData.get("promptText"), "Step prompt");

    const { error } = await adminClient
      .from("humor_flavor_steps")
      .update({
        prompt_text: promptText,
        modified_by_user_id: actorId,
      })
      .eq("id", stepId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Step updated.", flavorKey);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to update step.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}

export async function deleteStepAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId } = await actorContext();
    const stepId = asDatabaseKey(formData.get("stepId"), "Step");
    const flavorKey = asDatabaseKey(flavorId, "Flavor");

    const { error } = await adminClient
      .from("humor_flavor_steps")
      .delete()
      .eq("id", stepId);

    if (error) {
      throw new Error(error.message);
    }

    await normalizeStepOrder(adminClient, actorId, flavorKey);

    revalidatePath("/");
    redirectWithMessage("success", "Step deleted.", flavorKey);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to delete step.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}

export async function moveStepAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId } = await actorContext();
    const stepId = asDatabaseKey(formData.get("stepId"), "Step");
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const direction = asTrimmedString(formData.get("direction"), "Direction");
    const orderedSteps = await listFlavorSteps(adminClient, flavorKey);
    const currentIndex = orderedSteps.findIndex((step) => `${step.id}` === `${stepId}`);

    if (currentIndex === -1) {
      throw new Error("Step not found for this flavor.");
    }

    const swapIndex =
      direction === "up" ? currentIndex - 1 : direction === "down" ? currentIndex + 1 : -1;

    if (swapIndex < 0 || swapIndex >= orderedSteps.length) {
      redirectWithMessage("success", "Step order already up to date.", flavorKey);
    }

    const nextSteps = [...orderedSteps];
    const [movedStep] = nextSteps.splice(currentIndex, 1);
    nextSteps.splice(swapIndex, 0, movedStep);

    await normalizeStepOrder(adminClient, actorId, flavorKey, nextSteps);

    revalidatePath("/");
    redirectWithMessage("success", "Step reordered.", flavorKey);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to reorder step.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}
