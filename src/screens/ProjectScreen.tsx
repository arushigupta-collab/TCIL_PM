import { useState } from "react";
import type {
  Project,
  MilestoneStatus,
  SlaStatus,
  RiskSeverity,
  TaskStatus,
} from "../types";
import { personById, ROLES } from "../data/seed";
import { Avatar } from "../components/ui";
import {
  Target,
  Calendar,
  ListChecks,
  Users,
  ShieldCheck,
} from "../lib/icons";

type Sub = "overview" | "timeline" | "tasks" | "team" | "risks";

const SUBS: { id: Sub; label: string; icon: typeof Target }[] = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "team", label: "Team", icon: Users },
  { id: "risks", label: "SLAs & Risks", icon: ShieldCheck },
];

// ---- neutral pills (dot-differentiated, no green/amber/red) ----

const DOT: Record<string, string> = {
  strong: "bg-stone-700",
  mid: "border border-stone-400 bg-transparent",
  weak: "bg-stone-300",
};

function NeutralPill({ label, tone }: { label: string; tone: keyof typeof DOT }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
      {label}
    </span>
  );
}

const milestoneTone: Record<MilestoneStatus, keyof typeof DOT> = {
  Completed: "strong",
  "In progress": "mid",
  Upcoming: "weak",
};
const slaTone: Record<SlaStatus, keyof typeof DOT> = {
  Met: "strong",
  "At risk": "mid",
  Breach: "weak",
};
const severityTone: Record<RiskSeverity, keyof typeof DOT> = {
  High: "strong",
  Medium: "mid",
  Low: "weak",
};

// ---- sub-views ----

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-ink">
        {value}
      </div>
    </div>
  );
}

function Overview({ project }: { project: Project }) {
  const next = project.milestones?.find((m) => m.status !== "Completed");
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Current phase" value={project.phase} />
        <Metric label="Progress" value={`${project.percentComplete}% complete`} />
        <Metric label="Health" value={project.health} />
        <Metric label="Contract term" value={project.contractTerm ?? "—"} />
        <Metric label="Contract value" value={project.value} />
        <Metric
          label="Next milestone"
          value={next ? `${next.name} · ${next.due}` : "—"}
        />
      </div>
      {project.summary ? (
        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-ink">Summary</h3>
          <p className="mt-2 text-[15px] leading-7 text-stone-700">
            {project.summary}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Timeline({ project }: { project: Project }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <ol className="relative ml-2 border-l border-stone-200">
        {(project.milestones ?? []).map((m, i) => (
          <li key={i} className="mb-6 ml-6 last:mb-0">
            <span
              className={`absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
                m.status === "Completed"
                  ? "bg-stone-700"
                  : m.status === "In progress"
                    ? "border-2 border-stone-500 bg-stone-200"
                    : "border-2 border-stone-300 bg-white"
              }`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-ink">{m.name}</h4>
              <NeutralPill label={m.status} tone={milestoneTone[m.status]} />
            </div>
            <p className="mt-0.5 text-xs text-stone-500">{m.window}</p>
            <p className="mt-0.5 text-xs font-medium text-stone-600">
              Due {m.due}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "To do", label: "To do" },
  { id: "In progress", label: "In progress" },
  { id: "Done", label: "Done" },
];

function Tasks({ project }: { project: Project }) {
  const tasks = project.tasks ?? [];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
                {col.label}
              </span>
              <span className="rounded-md bg-stone-200 px-1.5 text-[11px] font-semibold text-stone-600">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((t) => {
                const person = personById(t.assigneeId);
                return (
                  <div
                    key={t.id}
                    className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm"
                  >
                    <p className="text-[13px] font-medium leading-snug text-ink">
                      {t.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      {person ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar
                            initials={person.initials}
                            classes="bg-navy text-white"
                            size="sm"
                          />
                          <span className="text-[11px] text-stone-500">
                            {person.name.split(" ")[0]}
                          </span>
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-[11px] text-stone-400">{t.due}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Team({ project }: { project: Project }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(project.team ?? []).map((m) => {
        const person = personById(m.personId);
        if (!person) return null;
        return (
          <div
            key={m.personId}
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <Avatar
              initials={person.initials}
              classes={ROLES[m.roleId].avatarClasses}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{person.name}</p>
              <p className="truncate text-xs text-stone-500">{m.title}</p>
            </div>
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
              {m.allocation}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SlasAndRisks({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      {/* SLAs */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">Service levels</h3>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-2.5">Metric</th>
                <th className="px-4 py-2.5">Target</th>
                <th className="px-4 py-2.5">Current</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(project.slas ?? []).map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-stone-600">{s.target}</td>
                  <td className="px-4 py-3 text-stone-600">{s.current}</td>
                  <td className="px-4 py-3">
                    <NeutralPill label={s.status} tone={slaTone[s.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risks */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">Risks & issues</h3>
        <ul className="space-y-2.5">
          {(project.risks ?? []).map((r, i) => (
            <li
              key={i}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-ink">{r.title}</h4>
                <div className="flex items-center gap-2">
                  <NeutralPill label={r.severity} tone={severityTone[r.severity]} />
                  <span className="text-xs font-medium text-stone-500">
                    {r.status}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
                {r.note}
              </p>
              <p className="mt-1 text-[11px] text-stone-400">Owner · {r.owner}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ProjectScreen({ project }: { project: Project }) {
  const [sub, setSub] = useState<Sub>("overview");

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      {/* Header */}
      <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 font-mono text-[11px] text-stone-400">
              {project.id} · {project.client}
            </div>
            <h1 className="text-xl font-bold leading-snug text-ink">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {project.contractTerm} · {project.value} · PM {project.pm}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-inset ring-stone-200">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-700" />
            {project.health}
          </span>
        </div>

        {/* Sub-tab nav */}
        <div className="mt-4 flex flex-wrap gap-1 border-t border-stone-100 pt-3">
          {SUBS.map((s) => {
            const Icon = s.icon;
            const active = s.id === sub;
            return (
              <button
                key={s.id}
                onClick={() => setSub(s.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-stone-100 font-semibold text-ink"
                    : "font-medium text-stone-500 hover:text-ink"
                }`}
              >
                <Icon width={15} height={15} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-view */}
      {sub === "overview" && <Overview project={project} />}
      {sub === "timeline" && <Timeline project={project} />}
      {sub === "tasks" && <Tasks project={project} />}
      {sub === "team" && <Team project={project} />}
      {sub === "risks" && <SlasAndRisks project={project} />}
    </div>
  );
}
