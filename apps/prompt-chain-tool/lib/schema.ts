import { coercePrimaryKey, pickFirstField, toRowArray, valueAsString, type Row } from "@/lib/data-helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

type ColumnRow = {
  table_name: string;
  column_name: string;
};

const TABLES = ["humor_flavors", "humor_flavor_steps", "images", "captions"] as const;

function pickColumn(columns: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

function humanizeSlug(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type PromptChainSchema = {
  flavorColumns: string[];
  flavorIdColumn: string;
  flavorNameColumn: string | null;
  flavorDescriptionColumn: string | null;
  flavorOrderColumn: string | null;
  stepColumns: string[];
  stepIdColumn: string;
  stepFlavorIdColumn: string | null;
  stepOrderColumn: string | null;
  stepPromptColumn: string | null;
  imageColumns: string[];
  imageIdColumn: string;
  imageUrlColumn: string | null;
  imageDescriptionColumn: string | null;
  imageIsCommonUseColumn: string | null;
  imageOrderColumn: string | null;
  captionColumns: string[];
  captionIdColumn: string;
  captionFlavorIdColumn: string | null;
  captionContentColumn: string | null;
  captionImageIdColumn: string | null;
  captionCreatedAtColumn: string | null;
};

export type FlavorView = {
  id: string | number;
  name: string;
  description: string | null;
  raw: Row;
};

export type StepView = {
  id: string | number;
  flavorId: string | number | null;
  stepOrder: number | null;
  promptText: string;
  raw: Row;
};

export type ImageView = {
  id: string;
  url: string | null;
  imageDescription: string | null;
  isCommonUse: boolean;
};

export type CaptionView = {
  id: string;
  content: string | null;
  imageId: string | null;
  createdAt: string | null;
};

export async function getPromptChainSchema(adminClient: AdminClient): Promise<PromptChainSchema> {
  const { data, error } = await adminClient
    .schema("information_schema")
    .from("columns")
    .select("table_name, column_name")
    .eq("table_schema", "public")
    .in("table_name", [...TABLES]);

  if (error) {
    throw new Error(`Unable to inspect prompt-chain schema: ${error.message}`);
  }

  const byTable = new Map<string, string[]>();
  for (const row of (data ?? []) as ColumnRow[]) {
    const columns = byTable.get(row.table_name) ?? [];
    columns.push(row.column_name);
    byTable.set(row.table_name, columns);
  }

  const flavorColumns = byTable.get("humor_flavors") ?? [];
  const stepColumns = byTable.get("humor_flavor_steps") ?? [];
  const imageColumns = byTable.get("images") ?? [];
  const captionColumns = byTable.get("captions") ?? [];

  return {
    flavorColumns,
    flavorIdColumn: pickColumn(flavorColumns, ["id", "humor_flavor_id"]) ?? "id",
    flavorNameColumn: pickColumn(flavorColumns, [
      "name",
      "humor_flavor_name",
      "title",
      "label",
      "slug",
    ]),
    flavorDescriptionColumn: pickColumn(flavorColumns, [
      "description",
      "humor_flavor_description",
      "details",
      "summary",
    ]),
    flavorOrderColumn: pickColumn(flavorColumns, [
      "name",
      "humor_flavor_name",
      "slug",
      "created_datetime_utc",
      "created_at",
      "modified_datetime_utc",
      "updated_at",
    ]),
    stepColumns,
    stepIdColumn: pickColumn(stepColumns, ["id", "humor_flavor_step_id"]) ?? "id",
    stepFlavorIdColumn: pickColumn(stepColumns, ["flavor_id", "humor_flavor_id"]),
    stepOrderColumn: pickColumn(stepColumns, [
      "step_order",
      "sort_order",
      "order_index",
      "step_number",
      "sequence_number",
      "position",
      "order_by",
    ]),
    stepPromptColumn: pickColumn(stepColumns, [
      "llm_user_prompt",
      "llm_system_prompt",
      "description",
      "prompt_text",
      "step_text",
      "prompt",
      "text",
      "instruction",
      "content",
    ]),
    imageColumns,
    imageIdColumn: pickColumn(imageColumns, ["id", "image_id"]) ?? "id",
    imageUrlColumn: pickColumn(imageColumns, ["url", "image_url", "public_url", "src"]),
    imageDescriptionColumn: pickColumn(imageColumns, [
      "image_description",
      "description",
      "alt_text",
      "caption",
    ]),
    imageIsCommonUseColumn: pickColumn(imageColumns, [
      "is_common_use",
      "is_common",
      "common_use",
    ]),
    imageOrderColumn: pickColumn(imageColumns, [
      "created_datetime_utc",
      "created_at",
      "modified_datetime_utc",
      "updated_at",
    ]),
    captionColumns,
    captionIdColumn: pickColumn(captionColumns, ["id", "caption_id"]) ?? "id",
    captionFlavorIdColumn: pickColumn(captionColumns, ["humor_flavor_id", "flavor_id"]),
    captionContentColumn: pickColumn(captionColumns, [
      "content",
      "caption",
      "text",
      "generated_caption",
      "candidate_caption",
      "body",
    ]),
    captionImageIdColumn: pickColumn(captionColumns, ["image_id", "photo_id", "asset_id"]),
    captionCreatedAtColumn: pickColumn(captionColumns, [
      "created_datetime_utc",
      "created_at",
      "inserted_at",
    ]),
  };
}

function withAuditFields(payload: Row, columns: string[], actorId: string, mode: "create" | "update") {
  if (mode === "create" && columns.includes("created_by_user_id")) {
    payload.created_by_user_id = actorId;
  }

  if (columns.includes("modified_by_user_id")) {
    payload.modified_by_user_id = actorId;
  }

  return payload;
}

export function buildFlavorPayload(
  schema: PromptChainSchema,
  values: { name: string; description: string | null },
  actorId: string,
  mode: "create" | "update"
) {
  if (!schema.flavorNameColumn) {
    throw new Error("Could not determine the humor flavor name column.");
  }

  const payload: Row = {
    [schema.flavorNameColumn]:
      schema.flavorNameColumn === "slug" ? slugify(values.name) || "untitled-flavor" : values.name,
  };

  if (schema.flavorDescriptionColumn) {
    payload[schema.flavorDescriptionColumn] = values.description;
  }

  return withAuditFields(payload, schema.flavorColumns, actorId, mode);
}

export function buildStepPayload(
  schema: PromptChainSchema,
  values: { flavorId?: string | number; stepOrder?: number; promptText: string },
  actorId: string,
  mode: "create" | "update"
) {
  if (!schema.stepPromptColumn) {
    throw new Error("Could not determine the humor flavor step text column.");
  }

  const payload: Row = {
    [schema.stepPromptColumn]: values.promptText,
  };

  if (mode === "create") {
    if (!schema.stepFlavorIdColumn) {
      throw new Error("Could not determine the humor flavor step foreign-key column.");
    }

    payload[schema.stepFlavorIdColumn] = values.flavorId;

    if (schema.stepOrderColumn && typeof values.stepOrder === "number") {
      payload[schema.stepOrderColumn] = values.stepOrder;
    }
  }

  return withAuditFields(payload, schema.stepColumns, actorId, mode);
}

export function flavorViewModel(row: Row, schema: PromptChainSchema): FlavorView {
  const id = coercePrimaryKey(pickFirstField(row, [schema.flavorIdColumn]), "Flavor");
  const name =
    valueAsString(pickFirstField(row, [schema.flavorNameColumn, "name", "humor_flavor_name"])).trim() ||
    `Flavor ${id}`;
  const description =
    valueAsString(
      pickFirstField(row, [schema.flavorDescriptionColumn, "description", "humor_flavor_description"])
    ).trim() || null;

  return {
    id,
    name: schema.flavorNameColumn === "slug" ? humanizeSlug(name) : name,
    description,
    raw: row,
  };
}

export function stepViewModel(row: Row, schema: PromptChainSchema): StepView {
  const id = coercePrimaryKey(pickFirstField(row, [schema.stepIdColumn]), "Step");
  const flavorIdRaw = pickFirstField(row, [
    schema.stepFlavorIdColumn,
    "flavor_id",
    "humor_flavor_id",
  ]);
  const orderValue = pickFirstField(row, [
    schema.stepOrderColumn,
    "step_order",
    "sort_order",
    "order_index",
  ]);
  const parsedOrder = Number(valueAsString(orderValue));
  const promptText =
    valueAsString(
      pickFirstField(row, [schema.stepPromptColumn, "prompt_text", "step_text", "prompt", "text"])
    ) || "(empty step)";
  const flavorIdValue =
    flavorIdRaw === null || typeof flavorIdRaw === "undefined"
      ? null
      : coercePrimaryKey(flavorIdRaw, "Flavor");

  return {
    id,
    flavorId: flavorIdValue,
    stepOrder: Number.isFinite(parsedOrder) ? parsedOrder : null,
    promptText,
    raw: row,
  };
}

export function imageViewModel(row: Row, schema: PromptChainSchema): ImageView {
  const id = valueAsString(pickFirstField(row, [schema.imageIdColumn, "id", "image_id"]));

  return {
    id,
    url: valueAsString(pickFirstField(row, [schema.imageUrlColumn, "url", "image_url"])) || null,
    imageDescription:
      valueAsString(
        pickFirstField(row, [schema.imageDescriptionColumn, "image_description", "description"])
      ) || null,
    isCommonUse: Boolean(
      pickFirstField(row, [schema.imageIsCommonUseColumn, "is_common_use", "is_common", "common_use"])
    ),
  };
}

export function captionViewModel(row: Row, schema: PromptChainSchema): CaptionView {
  const id = valueAsString(pickFirstField(row, [schema.captionIdColumn, "id", "caption_id"])) || JSON.stringify(row);

  return {
    id,
    content:
      valueAsString(
        pickFirstField(row, [
          schema.captionContentColumn,
          "content",
          "caption",
          "text",
          "generated_caption",
        ])
      ) || null,
    imageId:
      valueAsString(pickFirstField(row, [schema.captionImageIdColumn, "image_id", "photo_id"])) || null,
    createdAt:
      valueAsString(
        pickFirstField(row, [schema.captionCreatedAtColumn, "created_datetime_utc", "created_at"])
      ) || null,
  };
}

export async function fetchPromptChainRows(adminClient: AdminClient, schema: PromptChainSchema) {
  let flavorQuery = adminClient.from("humor_flavors").select("*").limit(250);
  if (schema.flavorOrderColumn) {
    flavorQuery = flavorQuery.order(schema.flavorOrderColumn, { ascending: true });
  }

  let stepQuery = adminClient.from("humor_flavor_steps").select("*").limit(500);
  if (schema.stepOrderColumn) {
    stepQuery = stepQuery.order(schema.stepOrderColumn, { ascending: true });
  }

  let imageQuery = adminClient.from("images").select("*").limit(36);
  if (schema.imageOrderColumn) {
    imageQuery = imageQuery.order(schema.imageOrderColumn, { ascending: false });
  }

  const [flavorsResult, stepsResult, imagesResult] = await Promise.all([flavorQuery, stepQuery, imageQuery]);

  if (flavorsResult.error) {
    throw new Error(flavorsResult.error.message);
  }

  if (stepsResult.error) {
    throw new Error(stepsResult.error.message);
  }

  if (imagesResult.error) {
    throw new Error(imagesResult.error.message);
  }

  return {
    flavors: toRowArray(flavorsResult.data).map((row) => flavorViewModel(row, schema)),
    steps: toRowArray(stepsResult.data).map((row) => stepViewModel(row, schema)),
    images: toRowArray(imagesResult.data).map((row) => imageViewModel(row, schema)),
  };
}

export async function listRecentCaptions(
  adminClient: AdminClient,
  schema: PromptChainSchema,
  flavorId: string | number
) {
  if (!schema.captionFlavorIdColumn) {
    return [];
  }

  let captionQuery = adminClient
    .from("captions")
    .select("*")
    .eq(schema.captionFlavorIdColumn, flavorId)
    .limit(18);

  if (schema.captionCreatedAtColumn) {
    captionQuery = captionQuery.order(schema.captionCreatedAtColumn, { ascending: false });
  }

  const { data, error } = await captionQuery;

  if (error) {
    throw new Error(error.message);
  }

  return toRowArray(data).map((row) => captionViewModel(row, schema));
}
