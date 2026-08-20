import { useMemo, useState } from "react";
import type { AwardedBid, Project, ProjectHealth } from "../types";
import { CURRENT_PM_ID, personById, progressOf } from "../data/seed";
import { SortHeader, OverflowButton } from "../components/ui";
import { Layers, Search, Landmark, ArrowRight } from "../lib/icons";

const HEALTH_DOT: Record<ProjectHealth, string> = {
  "On track": "bg-stone-700",
  "At risk": "border border-stone-400",
  Delayed: "bg-stone-300",
  Completed: "bg-stone-700",
};

function HealthPill({ health }: { health: ProjectHealth }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200">
      <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_DOT[health]}`} />
      {health}
    </span>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-navy" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-stone-500">{value}%</span>
    </div>
  );
}

type SortKey = "name" | "client" | "phase" | "progress" | "health";

function AwardedBanner({
  awards,
  onIntake,
}: {
  awards: AwardedBid[];
  onIntake: (id: string) => void;
}) {
  if (awards.length === 0) return null;
  return (
    <div className="mb-5 rounded-xl border border-cream-line bg-cream-soft p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-navy ring-1 ring-cream-line">
          <Landmark width={16} height={16} />
        </span>
        <div>
          <div className="text-sm font-bold text-ink">
            {awards.length} awarded {awards.length === 1 ? "bid" : "bids"} awaiting
            setup
          </div>
          <div className="text-xs text-stone-500">
            Won and routed to you by the awarding authority
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {awards.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{a.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-stone-400">
                {a.id} · {a.client} · {a.value}
              </p>
            </div>
            <button
              onClick={() => onIntake(a.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-navy-dark"
            >
              Set up project
              <ArrowRight width={14} height={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectsScreen({
  projects,
  awardedBids,
  onOpen,
  onIntake,
  onLocked,
}: {
  projects: Project[];
  awardedBids: AwardedBid[];
  onOpen: (id: string) => void;
  onIntake: (id: string) => void;
  onLocked: () => void;
}) {
  const pm = personById(CURRENT_PM_ID)!;
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function sortBy(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = projects.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q),
    );
    const val = (p: Project) =>
      sortKey === "progress"
        ? progressOf(p)
        : sortKey === "name"
          ? p.name
          : sortKey === "client"
            ? p.client
            : sortKey === "phase"
              ? p.phase
              : p.health;
    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [projects, query, sortKey, sortDir]);

  const needAttention = projects.filter(
    (p) => p.health === "At risk" || p.health === "Delayed",
  ).length;

  const header = (label: string, key: SortKey) => (
    <SortHeader
      label={label}
      onClick={() => sortBy(key)}
      active={sortKey === key}
      dir={sortDir}
    />
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-[1180px] px-6 py-8 sm:px-8">
        {/* Stats banner */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-stone-100/70 px-5 py-4">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy ring-1 ring-stone-200">
              <Layers width={20} height={20} />
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Portfolio
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-ink">
                  {projects.length}
                </span>
                <span className="text-sm text-stone-500">
                  {needAttention} need attention
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Project Manager
            </div>
            <div className="text-sm font-bold text-ink">{pm.name}</div>
          </div>
        </div>

        {/* Awarded bids awaiting setup */}
        <AwardedBanner awards={awardedBids} onIntake={onIntake} />

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects by name or client"
            className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-stone-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200">
                {header("Project", "name")}
                {header("Client", "client")}
                {header("Phase", "phase")}
                <SortHeader label="Timeline" />
                {header("Progress", "progress")}
                {header("Health", "health")}
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((p) => (
                <tr key={p.id} className="group transition hover:bg-stone-50/70">
                  <td className="max-w-[320px] px-5 py-4 align-top">
                    <button
                      onClick={() => (p.detailed ? onOpen(p.id) : onLocked())}
                      className="text-left text-sm font-semibold text-navy hover:underline"
                    >
                      {p.name}
                    </button>
                    <div className="mt-1 font-mono text-[11px] text-stone-400">
                      {p.id} · {p.value}
                    </div>
                  </td>
                  <td className="max-w-[220px] px-5 py-4 align-top text-sm text-stone-600">
                    {p.client}
                  </td>
                  <td className="px-5 py-4 align-top text-sm whitespace-nowrap text-stone-700">
                    {p.phase}
                  </td>
                  <td className="px-5 py-4 align-top text-sm whitespace-nowrap text-stone-500">
                    {p.start} – {p.end}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Progress value={progressOf(p)} />
                  </td>
                  <td className="px-5 py-4 align-top">
                    <HealthPill health={p.health} />
                  </td>
                  <td className="px-2 py-4 align-top">
                    <OverflowButton />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-sm text-stone-400"
                  >
                    No projects match your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
