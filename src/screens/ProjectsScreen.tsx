import type { Project, ProjectHealth } from "../types";
import { PROJECTS, CURRENT_PM_ID, personById } from "../data/seed";
import { SortHeader, OverflowButton } from "../components/ui";
import { Layers } from "../lib/icons";

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

export function ProjectsScreen({
  onOpen,
  onLocked,
}: {
  onOpen: (id: string) => void;
  onLocked: () => void;
}) {
  const pm = personById(CURRENT_PM_ID)!;
  const needAttention = PROJECTS.filter(
    (p) => p.health === "At risk" || p.health === "Delayed",
  ).length;

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
                  {PROJECTS.length}
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

        {/* Table */}
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200">
                <SortHeader label="Project" />
                <SortHeader label="Client" />
                <SortHeader label="Phase" />
                <SortHeader label="Timeline" />
                <SortHeader label="Progress" />
                <SortHeader label="Health" />
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {PROJECTS.map((p: Project) => (
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
                    <Progress value={p.percentComplete} />
                  </td>
                  <td className="px-5 py-4 align-top">
                    <HealthPill health={p.health} />
                  </td>
                  <td className="px-2 py-4 align-top">
                    <OverflowButton />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
