import { useState } from "react";
import type {
  Project,
  MilestoneStatus,
  SlaStatus,
  RiskSeverity,
  RiskStatus,
  TaskStatus,
  ProjectTask,
} from "../types";
import { personById, ROLES, progressOf, CURRENT_PM_ID, RFPS } from "../data/seed";
import { Avatar } from "../components/ui";
import { PdfViewerModal } from "../components/PdfViewerModal";
import { buildSubmittedHtml } from "../lib/exportDoc";
import {
  Target,
  Calendar,
  ListChecks,
  Users,
  ShieldCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  ExternalLink,
} from "../lib/icons";

type Sub = "overview" | "timeline" | "tasks" | "team" | "risks";

const SUBS: { id: Sub; label: string; icon: typeof Target }[] = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "team", label: "Team", icon: Users },
  { id: "risks", label: "SLAs & Risks", icon: ShieldCheck },
];

const TASK_ORDER: TaskStatus[] = ["To do", "In progress", "Done"];
const RISK_CYCLE: RiskStatus[] = ["Open", "Mitigating", "Closed"];

// ---- neutral pills ----
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

type SubProps = {
  project: Project;
  onUpdate: (p: Project) => void;
  onToast: (m: string) => void;
};

// ---- Overview ----
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

type DocViewer = {
  url: string;
  title: string;
  subtitle?: string;
  isBlob: boolean;
};

function DocButton({
  badge,
  label,
  sub,
  onClick,
}: {
  badge: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 text-left transition hover:border-navy/40 hover:bg-stone-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
        <FileText width={18} height={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500 ring-1 ring-inset ring-stone-200">
            {badge}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-stone-500">{sub}</span>
      </span>
      <ExternalLink
        width={15}
        height={15}
        className="shrink-0 text-stone-300 transition group-hover:text-navy"
      />
    </button>
  );
}

function Overview({ project }: { project: Project }) {
  const [viewer, setViewer] = useState<DocViewer | null>(null);
  const pct = progressOf(project);
  const tasks = project.tasks ?? [];
  const tasksDone = tasks.filter((t) => t.status === "Done").length;
  const msDone = (project.milestones ?? []).filter(
    (m) => m.status === "Completed",
  ).length;
  const next = project.milestones?.find((m) => m.status !== "Completed");
  const rfp = RFPS[0];

  function openRfp() {
    setViewer({
      url: rfp.documentUrl,
      title: rfp.documentName ?? "RFP document",
      subtitle: `${rfp.title} · Original tender`,
      isBlob: false,
    });
  }

  function openSubmitted() {
    const blob = new Blob([buildSubmittedHtml()], { type: "text/html" });
    setViewer({
      url: URL.createObjectURL(blob),
      title: "Submitted bid response",
      subtitle: `${project.name} · Awarded proposal`,
      isBlob: true,
    });
  }

  function closeViewer() {
    if (viewer?.isBlob) URL.revokeObjectURL(viewer.url);
    setViewer(null);
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink">Overall progress</span>
          <span className="text-sm font-semibold text-stone-600">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-navy transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {msDone} of {project.milestones?.length ?? 0} milestones complete ·{" "}
          {tasksDone} of {tasks.length} tasks done
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Current phase" value={project.phase} />
        <Metric label="Health" value={project.health} />
        <Metric
          label="Next milestone"
          value={next ? `${next.name} · ${next.due}` : "All complete"}
        />
        <Metric label="Contract term" value={project.contractTerm ?? "—"} />
        <Metric label="Contract value" value={project.value} />
        <Metric label="Timeline" value={`${project.start} – ${project.end}`} />
      </div>
      {project.summary ? (
        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-ink">Summary</h3>
          <p className="mt-2 text-[15px] leading-7 text-stone-700">
            {project.summary}
          </p>
          {project.id === "PRJ-001" ? (
            <div className="mt-4 border-t border-stone-100 pt-4">
              <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Bid documents
              </h4>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <DocButton
                  badge="PDF"
                  label="View RFP document"
                  sub="Original tender from the authority"
                  onClick={openRfp}
                />
                <DocButton
                  badge="DOC"
                  label="View submitted response"
                  sub="The proposal that won this project"
                  onClick={openSubmitted}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {viewer ? (
        <PdfViewerModal
          url={viewer.url}
          title={viewer.title}
          subtitle={viewer.subtitle}
          onClose={closeViewer}
        />
      ) : null}
    </div>
  );
}

// ---- Timeline (mark complete) ----
function Timeline({ project, onUpdate, onToast }: SubProps) {
  function complete(index: number) {
    const ms = (project.milestones ?? []).map((m) => ({ ...m }));
    ms[index].status = "Completed";
    const nextIdx = ms.findIndex((m) => m.status === "Upcoming");
    let phase = "Completed";
    if (nextIdx !== -1) {
      ms[nextIdx].status = "In progress";
      phase = ms[nextIdx].name;
    }
    const allDone = ms.every((m) => m.status === "Completed");
    onUpdate({
      ...project,
      milestones: ms,
      phase,
      health: allDone ? "Completed" : project.health,
    });
    onToast(`Milestone completed: ${ms[index].name}`);
  }

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
              <div className="flex items-center gap-2">
                <NeutralPill label={m.status} tone={milestoneTone[m.status]} />
                {m.status === "In progress" ? (
                  <button
                    onClick={() => complete(i)}
                    className="flex items-center gap-1 rounded-md bg-navy px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-navy-dark"
                  >
                    <Check width={12} height={12} />
                    Mark complete
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-stone-500">{m.window}</p>
            <p className="mt-0.5 text-xs font-medium text-stone-600">Due {m.due}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---- Tasks (kanban, move + add) ----
function Tasks({ project, onUpdate, onToast }: SubProps) {
  const [newTitle, setNewTitle] = useState("");
  const tasks = project.tasks ?? [];

  function moveTask(id: string, dir: 1 | -1) {
    const next = tasks.map((t) => {
      if (t.id !== id) return t;
      const idx = TASK_ORDER.indexOf(t.status);
      const ni = Math.min(TASK_ORDER.length - 1, Math.max(0, idx + dir));
      return { ...t, status: TASK_ORDER[ni] };
    });
    onUpdate({ ...project, tasks: next });
  }

  function addTask() {
    const title = newTitle.trim();
    if (!title) return;
    const task: ProjectTask = {
      id: `t-${Date.now()}`,
      title,
      assigneeId: CURRENT_PM_ID,
      status: "To do",
      due: "Unscheduled",
    };
    onUpdate({ ...project, tasks: [...tasks, task] });
    setNewTitle("");
    onToast("Task added");
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TASK_ORDER.map((col) => {
        const items = tasks.filter((t) => t.status === col);
        return (
          <div
            key={col}
            className="rounded-xl border border-stone-200 bg-stone-50/60 p-3"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
                {col}
              </span>
              <span className="rounded-md bg-stone-200 px-1.5 text-[11px] font-semibold text-stone-600">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((t) => {
                const person = personById(t.assigneeId);
                const idx = TASK_ORDER.indexOf(t.status);
                return (
                  <div
                    key={t.id}
                    className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm"
                  >
                    <p className="text-[13px] font-medium leading-snug text-ink">
                      {t.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {person ? (
                          <Avatar
                            initials={person.initials}
                            classes="bg-navy text-white"
                            size="sm"
                          />
                        ) : null}
                        <span className="text-[11px] text-stone-400">{t.due}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => moveTask(t.id, -1)}
                          disabled={idx === 0}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Move back"
                        >
                          <ChevronLeft width={14} height={14} />
                        </button>
                        <button
                          onClick={() => moveTask(t.id, 1)}
                          disabled={idx === TASK_ORDER.length - 1}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-stone-200 text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Move forward"
                        >
                          <ChevronRight width={14} height={14} />
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })}
              {col === "To do" ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="Add a task…"
                    className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[13px] text-ink placeholder:text-stone-400 focus:border-navy focus:outline-none"
                  />
                  <button
                    onClick={addTask}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy text-white transition hover:bg-navy-dark"
                    aria-label="Add task"
                  >
                    <Plus width={16} height={16} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Team ----
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

// ---- SLAs & Risks (cycle risk status) ----
function SlasAndRisks({ project, onUpdate, onToast }: SubProps) {
  function cycleRisk(index: number) {
    const risks = (project.risks ?? []).map((r) => ({ ...r }));
    const cur = RISK_CYCLE.indexOf(risks[index].status);
    const nextStatus = RISK_CYCLE[(cur + 1) % RISK_CYCLE.length];
    risks[index].status = nextStatus;
    onUpdate({ ...project, risks });
    onToast(`Risk moved to ${nextStatus}`);
  }

  return (
    <div className="space-y-6">
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Risks & issues</h3>
          <span className="text-xs text-stone-400">
            Click a status to advance it
          </span>
        </div>
        <ul className="space-y-2.5">
          {(project.risks ?? []).map((r, i) => (
            <li
              key={i}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-ink">{r.title}</h4>
                <div className="flex items-center gap-2">
                  <NeutralPill
                    label={r.severity}
                    tone={severityTone[r.severity]}
                  />
                  <button
                    onClick={() => cycleRisk(i)}
                    className="rounded-md border border-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
                  >
                    {r.status}
                  </button>
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

export function ProjectScreen({
  project,
  onUpdate,
  onToast,
}: {
  project: Project;
  onUpdate: (p: Project) => void;
  onToast: (m: string) => void;
}) {
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

      {sub === "overview" && <Overview project={project} />}
      {sub === "timeline" && (
        <Timeline project={project} onUpdate={onUpdate} onToast={onToast} />
      )}
      {sub === "tasks" && (
        <Tasks project={project} onUpdate={onUpdate} onToast={onToast} />
      )}
      {sub === "team" && <Team project={project} />}
      {sub === "risks" && (
        <SlasAndRisks project={project} onUpdate={onUpdate} onToast={onToast} />
      )}
    </div>
  );
}
