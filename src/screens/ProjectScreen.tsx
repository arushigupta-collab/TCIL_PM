import { useState } from "react";
import type {
  Project,
  MilestoneStatus,
  SlaStatus,
  RiskSeverity,
  RiskStatus,
  TaskStatus,
  ProjectTask,
  Vendor,
  VendorStatus,
  VendorDocType,
  VendorFinance,
  PaymentStatus,
  FinancialSecurity,
  SecurityStatus,
} from "../types";
import { personById, ROLES, progressOf, CURRENT_PM_ID, RFPS } from "../data/seed";
import { formatINR } from "../lib/format";
import { Avatar } from "../components/ui";
import { PdfViewerModal } from "../components/PdfViewerModal";
import {
  buildSubmittedHtml,
  buildContractHtml,
  buildAddendumHtml,
  buildChangeDocHtml,
  buildInvoicesHtml,
  buildVendorDocHtml,
  VENDOR_DOC_TITLE,
} from "../lib/exportDoc";
import {
  Target,
  Calendar,
  ListChecks,
  Users,
  ShieldCheck,
  Building,
  Lock,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  ExternalLink,
  X,
} from "../lib/icons";

type Sub =
  | "overview"
  | "timeline"
  | "tasks"
  | "team"
  | "vendors"
  | "securities"
  | "risks";

const SUBS: { id: Sub; label: string; icon: typeof Target }[] = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "team", label: "Team", icon: Users },
  { id: "vendors", label: "Vendors", icon: Building },
  { id: "securities", label: "Securities", icon: Lock },
  { id: "risks", label: "SLAs & Risks", icon: ShieldCheck },
];

const VENDOR_TONE: Record<VendorStatus, "strong" | "mid" | "weak"> = {
  Active: "strong",
  Onboarding: "mid",
  Completed: "weak",
};

const PAYMENT_TONE: Record<PaymentStatus, "strong" | "mid" | "weak"> = {
  Paid: "strong",
  Due: "mid",
  Scheduled: "weak",
  "On hold": "weak",
};

const PAYMENT_CYCLE: PaymentStatus[] = ["Scheduled", "Due", "Paid"];

const SECURITY_TONE: Record<SecurityStatus, "strong" | "mid" | "weak"> = {
  Active: "strong",
  Submitted: "mid",
  Released: "weak",
  Expired: "weak",
};

const SECURITY_CYCLE: SecurityStatus[] = ["Submitted", "Active", "Released"];

/** Summary figures derived from the payment schedule (the source of truth). */
function financeSummary(f: VendorFinance) {
  const paidToDate = f.schedule
    .filter((p) => p.status === "Paid")
    .reduce((s, p) => s + p.amountValue, 0);
  const invoicedToDate = f.schedule
    .filter((p) => p.status !== "Scheduled")
    .reduce((s, p) => s + p.amountValue, 0);
  const outstanding = invoicedToDate - paidToDate;
  const nextPayment = f.schedule.find((p) => p.status !== "Paid");
  const advance = f.schedule.find((p) => /^Advance/.test(p.label));
  const retentionHeld = Math.round(
    paidToDate * (parseFloat(f.retentionPercent) / 100 || 0),
  );
  return { paidToDate, invoicedToDate, outstanding, nextPayment, advance, retentionHeld };
}

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
      url: rfp.documentUrl ?? "/RTS2-RFP-AapleSarkar-2.0.pdf",
      title: rfp.documentName ?? "RFP document",
      subtitle: `${rfp.title} · Original tender`,
      isBlob: false,
    });
  }

  function openHtml(title: string, subtitle: string, html: string) {
    const blob = new Blob([html], { type: "text/html" });
    setViewer({ url: URL.createObjectURL(blob), title, subtitle, isBlob: true });
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
            <>
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
                    onClick={() =>
                      openHtml(
                        "Submitted bid response",
                        `${project.name} · Awarded proposal`,
                        buildSubmittedHtml(),
                      )
                    }
                  />
                </div>
              </div>
              <div className="mt-4 border-t border-stone-100 pt-4">
                <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  Contract & delivery
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <DocButton
                    badge="DOC"
                    label="View Contract"
                    sub="Master Services Agreement"
                    onClick={() =>
                      openHtml(
                        "Contract",
                        "Master Services Agreement",
                        buildContractHtml(),
                      )
                    }
                  />
                  <DocButton
                    badge="DOC"
                    label="View Addendum"
                    sub="Amendments to the contract"
                    onClick={() =>
                      openHtml(
                        "Addendum",
                        "Addendum No. 1 to the MSA",
                        buildAddendumHtml(),
                      )
                    }
                  />
                  <DocButton
                    badge="DOC"
                    label="View Change Document"
                    sub="Change control note"
                    onClick={() =>
                      openHtml(
                        "Change Document",
                        "Change Control Note CCN-002",
                        buildChangeDocHtml(),
                      )
                    }
                  />
                  <DocButton
                    badge="XLS"
                    label="View Invoices"
                    sub="Invoice statement & account"
                    onClick={() =>
                      openHtml(
                        "Invoices",
                        "Invoice statement",
                        buildInvoicesHtml(),
                      )
                    }
                  />
                </div>
              </div>
            </>
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

// ---- Vendors (subcontractors / suppliers) ----
const VENDOR_DOC_TYPES: VendorDocType[] = [
  "work-order",
  "agreement",
  "compliance",
  "invoices",
];
const VENDOR_DOC_SUB: Record<VendorDocType, string> = {
  "work-order": "Authorised scope & commercials",
  agreement: "Back-to-back subcontract terms",
  compliance: "Statutory & certification status",
  invoices: "Billing against the work order",
};

function VendorModal({
  vendor,
  onClose,
  onAdvancePayment,
}: {
  vendor: Vendor;
  onClose: () => void;
  onAdvancePayment: (paymentId: string) => void;
}) {
  const [docViewer, setDocViewer] = useState<DocViewer | null>(null);
  const fin = financeSummary(vendor.finance);

  function openDoc(type: VendorDocType) {
    const blob = new Blob([buildVendorDocHtml(vendor, type)], {
      type: "text/html",
    });
    setDocViewer({
      url: URL.createObjectURL(blob),
      title: `${vendor.name} · ${VENDOR_DOC_TITLE[type]}`,
      subtitle: vendor.category,
      isBlob: true,
    });
  }
  function closeDoc() {
    if (docViewer?.isBlob) URL.revokeObjectURL(docViewer.url);
    setDocViewer(null);
  }

  const facts: [string, string][] = [
    ["Purchase / work order", vendor.poRef],
    ["Order value", vendor.contractValue],
    ["GSTIN", vendor.gstin],
    ["Location", vendor.location],
    ["Engaged since", vendor.since],
    ["Status", vendor.status],
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="animate-fade absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div className="animate-drawer relative flex h-full w-full max-w-md flex-col overflow-y-auto scroll-slim bg-canvas shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stone-200 bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
              <Building width={20} height={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-snug text-ink">
                {vendor.name}
              </h2>
              <p className="text-xs text-stone-500">{vendor.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-ink"
            aria-label="Close"
          >
            <X width={18} height={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <NeutralPill label={vendor.status} tone={VENDOR_TONE[vendor.status]} />
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Scope
            </h3>
            <p className="text-[13px] leading-relaxed text-stone-700">
              {vendor.scope}
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Vendor details
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] text-stone-400">{label}</dt>
                  <dd className="text-[13px] font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 border-t border-stone-100 pt-3">
              <dt className="text-[11px] text-stone-400">Certifications</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {vendor.certifications.map((c) => (
                  <span
                    key={c}
                    className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 ring-1 ring-inset ring-stone-200"
                  >
                    {c}
                  </span>
                ))}
              </dd>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Finance
            </h3>
            {/* Summary tiles */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-[11px] text-stone-400">Order value</dt>
                <dd className="text-[13px] font-medium text-ink">
                  {vendor.contractValue}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-stone-400">Advance</dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  {fin.advance ? (
                    <>
                      <span className="text-[13px] font-medium text-ink">
                        {formatINR(fin.advance.amountValue)}
                      </span>
                      <NeutralPill
                        label={fin.advance.status}
                        tone={PAYMENT_TONE[fin.advance.status]}
                      />
                    </>
                  ) : (
                    <span className="text-[13px] text-stone-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-stone-400">Invoiced to date</dt>
                <dd className="text-[13px] font-medium text-ink">
                  {formatINR(fin.invoicedToDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-stone-400">Paid to date</dt>
                <dd className="text-[13px] font-medium text-ink">
                  {formatINR(fin.paidToDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-stone-400">Outstanding</dt>
                <dd className="text-[13px] font-medium text-ink">
                  {formatINR(fin.outstanding)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-stone-400">Retention held</dt>
                <dd className="text-[13px] font-medium text-ink">
                  {formatINR(fin.retentionHeld)}
                </dd>
              </div>
            </dl>

            {/* Next payment */}
            {fin.nextPayment ? (
              <div className="mt-3 rounded-lg border border-cream-line bg-cream-soft p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Next payment
                  </span>
                  <NeutralPill
                    label={fin.nextPayment.status}
                    tone={PAYMENT_TONE[fin.nextPayment.status]}
                  />
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {fin.nextPayment.label}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {fin.nextPayment.due}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-ink">
                    {formatINR(fin.nextPayment.amountValue)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-stone-500">All payments settled.</p>
            )}

            {/* Payment schedule */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                  Payment schedule
                </span>
                <span className="text-[11px] text-stone-400">
                  Click to advance status
                </span>
              </div>
              <div className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
                {vendor.finance.schedule.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onAdvancePayment(p.id)}
                    className="flex w-full items-center justify-between gap-2 bg-white px-3 py-2.5 text-left transition hover:bg-stone-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {p.label}
                      </span>
                      <span className="block text-[11px] text-stone-400">
                        {p.due}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">
                        {formatINR(p.amountValue)}
                      </span>
                      <NeutralPill label={p.status} tone={PAYMENT_TONE[p.status]} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Contact
            </h3>
            <p className="text-sm font-semibold text-ink">{vendor.contact.name}</p>
            <p className="text-xs text-stone-500">{vendor.contact.title}</p>
            <p className="mt-1 text-[13px] text-navy">{vendor.contact.email}</p>
            <p className="text-[13px] text-stone-600">{vendor.contact.phone}</p>
          </div>

          <div>
            <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Vendor documents
            </h3>
            <div className="grid gap-2.5">
              {VENDOR_DOC_TYPES.map((type) => (
                <DocButton
                  key={type}
                  badge={type === "invoices" ? "XLS" : "DOC"}
                  label={VENDOR_DOC_TITLE[type]}
                  sub={VENDOR_DOC_SUB[type]}
                  onClick={() => openDoc(type)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {docViewer ? (
        <PdfViewerModal
          url={docViewer.url}
          title={docViewer.title}
          subtitle={docViewer.subtitle}
          onClose={closeDoc}
        />
      ) : null}
    </div>
  );
}

function Vendors({ project, onUpdate, onToast }: SubProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const vendors = project.vendors ?? [];
  const active = vendors.find((v) => v.id === activeId) ?? null;

  function advancePayment(vendorId: string, paymentId: string) {
    let label: PaymentStatus = "Scheduled";
    const next = vendors.map((v) => {
      if (v.id !== vendorId) return v;
      const schedule = v.finance.schedule.map((p) => {
        if (p.id !== paymentId) return p;
        const cur = PAYMENT_CYCLE.indexOf(p.status);
        label = PAYMENT_CYCLE[(cur + 1) % PAYMENT_CYCLE.length];
        return { ...p, status: label };
      });
      return { ...v, finance: { ...v.finance, schedule } };
    });
    onUpdate({ ...project, vendors: next });
    onToast(`Payment marked ${label}`);
  }

  if (vendors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-400">
        No vendors engaged on this project yet.
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-xs text-stone-500">
        Subcontractors and suppliers this project's work is awarded to. Select a
        vendor to view their details and documents.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {vendors.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveId(v.id)}
            className="group flex flex-col rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-navy/40 hover:shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
                <Building width={18} height={18} />
              </span>
              <NeutralPill label={v.status} tone={VENDOR_TONE[v.status]} />
            </div>
            <p className="mt-3 text-sm font-bold text-ink">{v.name}</p>
            <p className="text-xs font-medium text-stone-500">{v.category}</p>
            <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-stone-600">
              {v.scope}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
              <span className="text-xs font-semibold text-ink">
                {v.contractValue}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-navy group-hover:underline">
                View details
                <ExternalLink width={13} height={13} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <VendorModal
          vendor={active}
          onClose={() => setActiveId(null)}
          onAdvancePayment={(paymentId) => advancePayment(active.id, paymentId)}
        />
      ) : null}
    </>
  );
}

// ---- Securities (EMD / PBG financial instruments) ----
function SecurityCard({
  s,
  onAdvance,
}: {
  s: FinancialSecurity;
  onAdvance: () => void;
}) {
  const facts: [string, string][] = [
    ["Instrument", s.instrument],
    ["Basis", s.basis],
    ["Issuing bank", s.issuingBank],
    ["Reference no.", s.refNo],
    ["Submitted", s.submittedOn],
    ["Valid till", s.validTill],
  ];
  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
            <Lock width={18} height={18} />
          </span>
          <div>
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500 ring-1 ring-inset ring-stone-200">
              {s.kind}
            </span>
            <p className="mt-1 text-sm font-bold text-ink">{s.fullName}</p>
          </div>
        </div>
        <button
          onClick={onAdvance}
          className="rounded-md border border-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
          title="Click to advance status"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${DOT[SECURITY_TONE[s.status]]}`} />
            {s.status}
          </span>
        </button>
      </div>

      <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
        {s.amount}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-stone-100 pt-3">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-stone-400">{label}</dt>
            <dd className="text-[13px] font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-stone-500">{s.note}</p>
    </div>
  );
}

function Securities({ project, onUpdate, onToast }: SubProps) {
  const securities = project.securities ?? [];

  function advanceSecurity(id: string) {
    let label: SecurityStatus = "Submitted";
    const next = securities.map((s) => {
      if (s.id !== id) return s;
      const cur = SECURITY_CYCLE.indexOf(s.status);
      label = SECURITY_CYCLE[(cur + 1) % SECURITY_CYCLE.length];
      return { ...s, status: label };
    });
    onUpdate({ ...project, securities: next });
    onToast(`Security marked ${label}`);
  }

  if (securities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-400">
        No financial securities recorded for this project.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-cream-line bg-cream-soft p-4">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck width={16} height={16} className="text-navy" />
          <h3 className="text-sm font-bold text-ink">Financial securities</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-stone-600">
          EMD and PBG are financial-security instruments used in public
          procurement and government tenders (GeM, MahaTenders) to ensure fair
          bidding and contract performance. The{" "}
          <span className="font-semibold text-ink">Earnest Money Deposit</span> is
          furnished with the bid to guarantee a genuine offer, and the{" "}
          <span className="font-semibold text-ink">
            Performance Bank Guarantee
          </span>{" "}
          is furnished after award to secure delivery against the contract.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {securities.map((s) => (
          <SecurityCard
            key={s.id}
            s={s}
            onAdvance={() => advanceSecurity(s.id)}
          />
        ))}
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
      {sub === "vendors" && (
        <Vendors project={project} onUpdate={onUpdate} onToast={onToast} />
      )}
      {sub === "securities" && (
        <Securities project={project} onUpdate={onUpdate} onToast={onToast} />
      )}
      {sub === "risks" && (
        <SlasAndRisks project={project} onUpdate={onUpdate} onToast={onToast} />
      )}
    </div>
  );
}
