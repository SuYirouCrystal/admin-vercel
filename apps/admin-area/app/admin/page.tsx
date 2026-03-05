import { format } from "date-fns";

import {
  formatValue,
  pickFirstField,
  toRowArray,
  valueAsString,
  type Row,
} from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LeaderboardRow = {
  key: string;
  label: string;
  count: number;
};

function normalizeKey(raw: unknown): string {
  return valueAsString(raw).trim() || "unknown";
}

function rowUserId(row: Row): string {
  return normalizeKey(
    pickFirstField(row, ["user_id", "profile_id", "owner_id", "author_id", "id"])
  );
}

function rowImageId(row: Row): string {
  return normalizeKey(pickFirstField(row, ["image_id", "photo_id", "asset_id", "id"]));
}

function rowCreatedAt(row: Row): string {
  return valueAsString(pickFirstField(row, ["created_at", "inserted_at", "updated_at"]));
}

function displayProfileName(profile: Row): string {
  const name = valueAsString(
    pickFirstField(profile, ["full_name", "display_name", "username", "email"])
  );
  if (name) {
    return name;
  }

  return normalizeKey(pickFirstField(profile, ["id"]));
}

function buildLeaderboard(
  counts: Map<string, number>,
  profileLabelById: Map<string, string>
): LeaderboardRow[] {
  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: profileLabelById.get(key) ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function weekdayName(rawDate: string): string {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return format(date, "EEEE");
}

export default async function AdminDashboardPage() {
  const { adminClient } = await requireSuperadmin();

  const [profilesResult, imagesResult, captionsResult] = await Promise.all([
    adminClient.from("profiles").select("*").limit(4000),
    adminClient.from("images").select("*").limit(4000),
    adminClient.from("captions").select("*").limit(4000),
  ]);

  const profiles = toRowArray(profilesResult.data);
  const images = toRowArray(imagesResult.data);
  const captions = toRowArray(captionsResult.data);

  const profileLabelById = new Map<string, string>();
  for (const profile of profiles) {
    profileLabelById.set(normalizeKey(profile.id), displayProfileName(profile));
  }

  const imageOwners = new Map<string, number>();
  for (const image of images) {
    const key = rowUserId(image);
    imageOwners.set(key, (imageOwners.get(key) ?? 0) + 1);
  }

  const captionAuthors = new Map<string, number>();
  for (const caption of captions) {
    const key = rowUserId(caption);
    captionAuthors.set(key, (captionAuthors.get(key) ?? 0) + 1);
  }

  const captionsByImage = new Set(captions.map((caption) => rowImageId(caption)));
  const imagesWithCaptions = images.filter((image) => captionsByImage.has(rowImageId(image))).length;

  const weekdayCounts = new Map<string, number>();
  for (const image of images) {
    const createdAt = rowCreatedAt(image);
    if (!createdAt) {
      continue;
    }
    const label = weekdayName(createdAt);
    weekdayCounts.set(label, (weekdayCounts.get(label) ?? 0) + 1);
  }

  const busiestDay = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const newestImageDate = images
    .map((image) => rowCreatedAt(image))
    .filter(Boolean)
    .sort()
    .at(-1);

  const superadminCount = profiles.filter((profile) => profile.is_superadmin === true).length;
  const captionCoverage = images.length
    ? Math.round((imagesWithCaptions / images.length) * 100)
    : 0;
  const averageCaptionsPerImage = images.length
    ? (captions.length / images.length).toFixed(2)
    : "0.00";

  const uploaderLeaderboard = buildLeaderboard(imageOwners, profileLabelById);
  const captionerLeaderboard = buildLeaderboard(captionAuthors, profileLabelById);

  return (
    <main className="space-y-6 pb-10">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Profiles</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{profiles.length}</p>
          <p className="mt-2 text-sm text-slate-600">{superadminCount} superadmins</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Images</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{images.length}</p>
          <p className="mt-2 text-sm text-slate-600">{imagesWithCaptions} already captioned</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Captions</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{captions.length}</p>
          <p className="mt-2 text-sm text-slate-600">{averageCaptionsPerImage} per image</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Coverage</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{captionCoverage}%</p>
          <p className="mt-2 text-sm text-slate-600">Images with at least one caption</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-100 p-6 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">Trend Snapshot</p>
          <h2 className="mt-2 text-2xl font-bold text-teal-950">Operational pulse</h2>

          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-teal-900">
                <span>Caption coverage</span>
                <span>{captionCoverage}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/70">
                <div
                  className="h-3 rounded-full bg-teal-700 transition-all"
                  style={{ width: `${Math.max(captionCoverage, 4)}%` }}
                />
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-teal-200 bg-white/70 p-3">
                <dt className="text-xs text-teal-700 uppercase">Busiest upload day</dt>
                <dd className="mt-1 text-lg font-semibold text-teal-950">
                  {busiestDay ? `${busiestDay[0]} (${busiestDay[1]})` : "No data yet"}
                </dd>
              </div>
              <div className="rounded-xl border border-teal-200 bg-white/70 p-3">
                <dt className="text-xs text-teal-700 uppercase">Latest image timestamp</dt>
                <dd className="mt-1 text-sm font-semibold text-teal-950">
                  {newestImageDate ? formatValue(newestImageDate) : "No uploads yet"}
                </dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-6 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase">
            Data Quality Signal
          </p>
          <h2 className="mt-2 text-2xl font-bold text-amber-950">Uncaptioned inventory</h2>
          <p className="mt-3 text-sm text-amber-900">
            {Math.max(images.length - imagesWithCaptions, 0)} images still need captions.
          </p>
          <p className="mt-2 text-sm text-amber-900">
            Use the images tab to curate records or clean invalid uploads.
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Top uploaders</h3>
          <ul className="mt-4 space-y-3">
            {uploaderLeaderboard.length ? (
              uploaderLeaderboard.map((row) => (
                <li key={row.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{row.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                    {row.count}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">No upload activity yet.</li>
            )}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Top caption writers</h3>
          <ul className="mt-4 space-y-3">
            {captionerLeaderboard.length ? (
              captionerLeaderboard.map((row) => (
                <li key={row.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="text-sm font-medium text-slate-700">{row.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                    {row.count}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-500">No caption activity yet.</li>
            )}
          </ul>
        </article>
      </section>
    </main>
  );
}
