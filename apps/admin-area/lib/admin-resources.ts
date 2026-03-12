export type AdminResourceMode = "read" | "update" | "crud";

export type AdminResourceConfig = {
  slug: string;
  label: string;
  table: string;
  mode: AdminResourceMode;
  description: string;
};

export const ADMIN_RESOURCES: AdminResourceConfig[] = [
  {
    slug: "humor-flavors",
    label: "Humor Flavors",
    table: "humor_flavors",
    mode: "read",
    description: "Read humor flavor definitions.",
  },
  {
    slug: "humor-flavor-steps",
    label: "Humor Flavor Steps",
    table: "humor_flavor_steps",
    mode: "read",
    description: "Read humor flavor step records.",
  },
  {
    slug: "humor-mix",
    label: "Humor Mix",
    table: "humor_flavor_mix",
    mode: "update",
    description: "Read and update humor mix records.",
  },
  {
    slug: "terms",
    label: "Terms",
    table: "terms",
    mode: "crud",
    description: "Create, read, update, and delete terms.",
  },
  {
    slug: "caption-requests",
    label: "Caption Requests",
    table: "caption_requests",
    mode: "read",
    description: "Read caption request entries.",
  },
  {
    slug: "caption-examples",
    label: "Caption Examples",
    table: "caption_examples",
    mode: "crud",
    description: "Create, read, update, and delete caption examples.",
  },
  {
    slug: "llm-models",
    label: "LLM Models",
    table: "llm_models",
    mode: "crud",
    description: "Create, read, update, and delete LLM models.",
  },
  {
    slug: "llm-providers",
    label: "LLM Providers",
    table: "llm_providers",
    mode: "crud",
    description: "Create, read, update, and delete LLM providers.",
  },
  {
    slug: "llm-prompt-chains",
    label: "LLM Prompt Chains",
    table: "llm_prompt_chains",
    mode: "read",
    description: "Read LLM prompt chain definitions.",
  },
  {
    slug: "llm-responses",
    label: "LLM Responses",
    table: "llm_model_responses",
    mode: "read",
    description: "Read LLM response records.",
  },
  {
    slug: "signup-domains",
    label: "Allowed Signup Domains",
    table: "allowed_signup_domains",
    mode: "crud",
    description: "Create, read, update, and delete allowed signup domains.",
  },
  {
    slug: "whitelist-emails",
    label: "Whitelisted Emails",
    table: "whitelist_email_addresses",
    mode: "crud",
    description: "Create, read, update, and delete whitelisted email addresses.",
  },
];

export const ALLOWED_RESOURCE_TABLES = new Set(ADMIN_RESOURCES.map((resource) => resource.table));

export function getAdminResource(slug: string): AdminResourceConfig | null {
  return ADMIN_RESOURCES.find((resource) => resource.slug === slug) ?? null;
}
