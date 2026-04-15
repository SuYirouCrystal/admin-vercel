"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import {
  coercePrimaryKey,
  pickFirstField,
  toRowArray,
  valueAsString,
  type Row,
} from "@/lib/data-helpers";
import { requireFlavorAdmin } from "@/lib/auth";
import {
  buildFlavorPayload,
  buildStepPayload,
  flavorViewModel,
  getPromptChainSchema,
} from "@/lib/schema";

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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function rethrowRedirectError(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

async function actorContext() {
  const { adminClient, profile } = await requireFlavorAdmin();
  const schema = await getPromptChainSchema(adminClient);

  return {
    adminClient,
    actorId: profile.id,
    schema,
  };
}

function flavorNameKey(
  schema: Awaited<ReturnType<typeof actorContext>>["schema"],
  name: string
) {
  return schema.flavorNameColumn === "slug" ? slugify(name) : name.trim().toLowerCase();
}

async function buildUniqueFlavorName(
  adminClient: Awaited<ReturnType<typeof actorContext>>["adminClient"],
  schema: Awaited<ReturnType<typeof actorContext>>["schema"],
  baseName: string
) {
  const lookupColumn = schema.flavorNameColumn ?? schema.flavorIdColumn;
  const { data, error } = await adminClient.from("humor_flavors").select(lookupColumn);

  if (error) {
    throw new Error(error.message);
  }

  const existingNames = new Set(
    toRowArray(data)
      .map((row) => valueAsString(pickFirstField(row, [lookupColumn, "name", "slug"])).trim())
      .filter(Boolean)
      .map((name) =>
        schema.flavorNameColumn === "slug" ? name.toLowerCase() : name.toLowerCase()
      )
  );

  let attempt = 1;
  while (attempt < 10_000) {
    const candidate = attempt === 1 ? `${baseName} Copy` : `${baseName} Copy ${attempt}`;
    const key = flavorNameKey(schema, candidate);

    if (!existingNames.has(key)) {
      return candidate;
    }

    attempt += 1;
  }

  throw new Error("Unable to generate a unique duplicate flavor name.");
}

type StepRow = {
  id: string | number;
  step_order: number | null;
};

async function listFlavorSteps(
  adminClient: Awaited<ReturnType<typeof actorContext>>["adminClient"],
  schema: Awaited<ReturnType<typeof actorContext>>["schema"],
  flavorId: string | number
) {
  if (!schema.stepFlavorIdColumn) {
    throw new Error("Could not determine the humor flavor step foreign-key column.");
  }

  let query = adminClient
    .from("humor_flavor_steps")
    .select("*")
    .eq(schema.stepFlavorIdColumn, flavorId);

  if (schema.stepOrderColumn) {
    query = query.order(schema.stepOrderColumn, { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Row[]).map((row) => ({
    id: coercePrimaryKey(pickFirstField(row, [schema.stepIdColumn]), "Step"),
    step_order: Number(
      `${pickFirstField(row, [schema.stepOrderColumn, "step_order", "sort_order"]) ?? ""}`
    ) || null,
  })) as StepRow[];
}

async function normalizeStepOrder(
  adminClient: Awaited<ReturnType<typeof actorContext>>["adminClient"],
  schema: Awaited<ReturnType<typeof actorContext>>["schema"],
  actorId: string,
  flavorId: string | number,
  orderedSteps?: StepRow[]
) {
  const orderColumn = schema.stepOrderColumn;

  if (!orderColumn) {
    throw new Error("Could not determine the humor flavor step order column.");
  }

  const steps = orderedSteps ?? (await listFlavorSteps(adminClient, schema, flavorId));

  await Promise.all(
    steps.map((step, index) =>
      adminClient
        .from("humor_flavor_steps")
        .update({
          [orderColumn]: index + 1,
          modified_by_user_id: actorId,
        })
        .eq(schema.stepIdColumn, step.id)
    )
  );
}

async function buildCreateStepInsertPayload(
  adminClient: Awaited<ReturnType<typeof actorContext>>["adminClient"],
  schema: Awaited<ReturnType<typeof actorContext>>["schema"],
  actorId: string,
  flavorId: string | number,
  stepOrder: number,
  promptText: string
) {
  const basePayload = buildStepPayload(
    schema,
    { flavorId, stepOrder, promptText },
    actorId,
    "create"
  );

  const excludedColumns = new Set([
    schema.stepIdColumn,
    "id",
    "created_datetime_utc",
    "modified_datetime_utc",
    "created_at",
    "updated_at",
    "created_by_user_id",
    "modified_by_user_id",
    schema.stepFlavorIdColumn,
    schema.stepOrderColumn,
    schema.stepPromptColumn,
  ]);

  let templateQuery = adminClient.from("humor_flavor_steps").select("*").limit(1);

  if (schema.stepFlavorIdColumn) {
    templateQuery = templateQuery.eq(schema.stepFlavorIdColumn, flavorId);
  }

  if (schema.stepOrderColumn) {
    templateQuery = templateQuery.order(schema.stepOrderColumn, { ascending: true });
  }

  let { data: templateData } = await templateQuery;

  if (!templateData?.length) {
    const fallbackQuery = schema.stepOrderColumn
      ? adminClient.from("humor_flavor_steps").select("*").limit(1).order(schema.stepOrderColumn, { ascending: true })
      : adminClient.from("humor_flavor_steps").select("*").limit(1);

    const fallback = await fallbackQuery;
    templateData = fallback.data ?? null;
  }

  const template = Array.isArray(templateData) && templateData[0] && typeof templateData[0] === "object"
    ? (templateData[0] as Row)
    : null;

  if (!template) {
    return basePayload;
  }

  const clonedDefaults: Row = {};
  for (const column of schema.stepColumns) {
    if (!excludedColumns.has(column) && column in template) {
      clonedDefaults[column] = template[column];
    }
  }

  return {
    ...clonedDefaults,
    ...basePayload,
  };
}

function cloneStepPayload(
  step: Row,
  schema: Awaited<ReturnType<typeof actorContext>>["schema"],
  actorId: string,
  flavorId: string | number,
  stepOrder: number
) {
  const payload: Row = {};
  const excludedColumns = new Set([
    schema.stepIdColumn,
    "id",
    "created_datetime_utc",
    "modified_datetime_utc",
    "created_at",
    "updated_at",
    "created_by_user_id",
    "modified_by_user_id",
  ]);

  for (const column of schema.stepColumns) {
    if (excludedColumns.has(column)) {
      continue;
    }

    if (column === schema.stepFlavorIdColumn) {
      payload[column] = flavorId;
      continue;
    }

    if (column === schema.stepOrderColumn) {
      payload[column] = stepOrder;
      continue;
    }

    if (column in step) {
      payload[column] = step[column];
    }
  }

  if (schema.stepColumns.includes("created_by_user_id")) {
    payload.created_by_user_id = actorId;
  }

  if (schema.stepColumns.includes("modified_by_user_id")) {
    payload.modified_by_user_id = actorId;
  }

  return payload;
}

export async function createFlavorAction(formData: FormData) {
  try {
    const { adminClient, actorId, schema } = await actorContext();
    const name = asTrimmedString(formData.get("name"), "Flavor name");
    const description = asOptionalString(formData.get("description"));

    const { data, error } = await adminClient
      .from("humor_flavors")
      .insert(buildFlavorPayload(schema, { name, description }, actorId, "create"))
      .select("*")
      .single<Row>();

    if (error) {
      throw new Error(error.message);
    }

    const createdId = coercePrimaryKey(
      pickFirstField(data, [schema.flavorIdColumn, "id", "humor_flavor_id"]),
      "Flavor"
    );

    revalidatePath("/");
    redirectWithMessage("success", "Humor flavor created.", createdId);
  } catch (error) {
    rethrowRedirectError(error);
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to create flavor."
    );
  }
}

export async function updateFlavorAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId, schema } = await actorContext();
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const name = asTrimmedString(formData.get("name"), "Flavor name");
    const description = asOptionalString(formData.get("description"));

    const { error } = await adminClient
      .from("humor_flavors")
      .update(buildFlavorPayload(schema, { name, description }, actorId, "update"))
      .eq(schema.flavorIdColumn, flavorKey);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Humor flavor updated.", flavorKey);
  } catch (error) {
    rethrowRedirectError(error);
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
    const { adminClient, schema } = await actorContext();
    const flavorKey = asDatabaseKey(flavorId, "Flavor");

    if (!schema.stepFlavorIdColumn) {
      throw new Error("Could not determine the humor flavor step foreign-key column.");
    }

    const { error: deleteStepsError } = await adminClient
      .from("humor_flavor_steps")
      .delete()
      .eq(schema.stepFlavorIdColumn, flavorKey);

    if (deleteStepsError) {
      throw new Error(deleteStepsError.message);
    }

    const { error } = await adminClient
      .from("humor_flavors")
      .delete()
      .eq(schema.flavorIdColumn, flavorKey);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Humor flavor deleted.");
  } catch (error) {
    rethrowRedirectError(error);
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to delete flavor.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}

export async function duplicateFlavorAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId, schema } = await actorContext();
    const flavorKey = asDatabaseKey(flavorId, "Flavor");

    if (!schema.stepFlavorIdColumn) {
      throw new Error("Could not determine the humor flavor step foreign-key column.");
    }

    const { data: sourceFlavor, error: sourceFlavorError } = await adminClient
      .from("humor_flavors")
      .select("*")
      .eq(schema.flavorIdColumn, flavorKey)
      .single<Row>();

    if (sourceFlavorError || !sourceFlavor) {
      throw new Error(sourceFlavorError?.message ?? "Flavor not found.");
    }

    const sourceFlavorView = flavorViewModel(sourceFlavor, schema);
    const uniqueName = await buildUniqueFlavorName(adminClient, schema, sourceFlavorView.name);

    const { data: createdFlavor, error: createFlavorError } = await adminClient
      .from("humor_flavors")
      .insert(
        buildFlavorPayload(
          schema,
          { name: uniqueName, description: sourceFlavorView.description },
          actorId,
          "create"
        )
      )
      .select("*")
      .single<Row>();

    if (createFlavorError || !createdFlavor) {
      throw new Error(createFlavorError?.message ?? "Unable to create duplicate flavor.");
    }

    const newFlavorId = coercePrimaryKey(
      pickFirstField(createdFlavor, [schema.flavorIdColumn, "id", "humor_flavor_id"]),
      "Flavor"
    );

    let stepQuery = adminClient
      .from("humor_flavor_steps")
      .select("*")
      .eq(schema.stepFlavorIdColumn, flavorKey);

    if (schema.stepOrderColumn) {
      stepQuery = stepQuery.order(schema.stepOrderColumn, { ascending: true });
    }

    const { data: sourceSteps, error: sourceStepsError } = await stepQuery;

    if (sourceStepsError) {
      throw new Error(sourceStepsError.message);
    }

    const stepRows = toRowArray(sourceSteps);

    if (stepRows.length) {
      const duplicateSteps = stepRows.map((step, index) =>
        cloneStepPayload(step, schema, actorId, newFlavorId, index + 1)
      );

      const { error: duplicateStepsError } = await adminClient
        .from("humor_flavor_steps")
        .insert(duplicateSteps);

      if (duplicateStepsError) {
        throw new Error(duplicateStepsError.message);
      }
    }

    revalidatePath("/");
    redirectWithMessage("success", `Humor flavor duplicated as ${uniqueName}.`, newFlavorId);
  } catch (error) {
    rethrowRedirectError(error);
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to duplicate flavor.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}

export async function createStepAction(formData: FormData) {
  const flavorId = formData.get("flavorId");

  try {
    const { adminClient, actorId, schema } = await actorContext();
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const promptText = asTrimmedString(formData.get("promptText"), "Step prompt");

    const existingSteps = await listFlavorSteps(adminClient, schema, flavorKey);
    const nextOrder = existingSteps.length + 1;

    const insertPayload = await buildCreateStepInsertPayload(
      adminClient,
      schema,
      actorId,
      flavorKey,
      nextOrder,
      promptText
    );

    const { error } = await adminClient
      .from("humor_flavor_steps")
      .insert(insertPayload);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Step created.", flavorKey);
  } catch (error) {
    rethrowRedirectError(error);
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
    const { adminClient, actorId, schema } = await actorContext();
    const stepId = asDatabaseKey(formData.get("stepId"), "Step");
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const promptText = asTrimmedString(formData.get("promptText"), "Step prompt");

    const { error } = await adminClient
      .from("humor_flavor_steps")
      .update(buildStepPayload(schema, { promptText }, actorId, "update"))
      .eq(schema.stepIdColumn, stepId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    redirectWithMessage("success", "Step updated.", flavorKey);
  } catch (error) {
    rethrowRedirectError(error);
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
    const { adminClient, actorId, schema } = await actorContext();
    const stepId = asDatabaseKey(formData.get("stepId"), "Step");
    const flavorKey = asDatabaseKey(flavorId, "Flavor");

    const { error } = await adminClient
      .from("humor_flavor_steps")
      .delete()
      .eq(schema.stepIdColumn, stepId);

    if (error) {
      throw new Error(error.message);
    }

    await normalizeStepOrder(adminClient, schema, actorId, flavorKey);

    revalidatePath("/");
    redirectWithMessage("success", "Step deleted.", flavorKey);
  } catch (error) {
    rethrowRedirectError(error);
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
    const { adminClient, actorId, schema } = await actorContext();
    const stepId = asDatabaseKey(formData.get("stepId"), "Step");
    const flavorKey = asDatabaseKey(flavorId, "Flavor");
    const direction = asTrimmedString(formData.get("direction"), "Direction");
    const orderedSteps = await listFlavorSteps(adminClient, schema, flavorKey);
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

    await normalizeStepOrder(adminClient, schema, actorId, flavorKey, nextSteps);

    revalidatePath("/");
    redirectWithMessage("success", "Step reordered.", flavorKey);
  } catch (error) {
    rethrowRedirectError(error);
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Unable to reorder step.",
      typeof flavorId === "string" ? flavorId : null
    );
  }
}
