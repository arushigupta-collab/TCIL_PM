import { useState } from "react";
import type { AwardedBid, Project } from "../types";
import { personById, ROLES, buildProjectFromAward } from "../data/seed";
import { Avatar } from "../components/ui";
import {
  Landmark,
  Route,
  Sparkle,
  Check,
  ArrowRight,
  Users,
  ShieldCheck,
  ListChecks,
  Calendar,
  Target,
  ChevronLeft,
} from "../lib/icons";

type Stage = "review" | "team";

const STEPS = [
  { label: "Awarded by Government", icon: Landmark },
  { label: "Routed to PM", icon: Route },
  { label: "PM Review", icon: Target },
  { label: "Build Team", icon: Users },
  { label: "Live on Dashboard", icon: Check },
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="mb-6 overflow-x-auto scroll-slim">
      <ol className="flex min-w-[720px] items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 transition ${
                    done
                      ? "bg-navy text-white ring-navy"
                      : active
                        ? "bg-cream text-navy ring-cream-line"
                        : "bg-white text-stone-300 ring-stone-200"
                  }`}
                >
                  {done ? <Check width={16} height={16} /> : <Icon width={16} height={16} />}
                </span>
                <span
                  className={`whitespace-nowrap text-xs font-semibold ${
                    done || active ? "text-ink" : "text-stone-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <span
                  className={`mx-3 h-px flex-1 ${done ? "bg-navy/40" : "bg-stone-200"}`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AutoSetupRow({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof Target;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
        <Icon width={16} height={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <p className="text-xs text-stone-500">{detail}</p>
      </div>
    </div>
  );
}

export function IntakeScreen({
  award,
  onCreate,
  onDecline,
}: {
  award: AwardedBid;
  onCreate: (p: Project) => void;
  onDecline: () => void;
}) {
  const [stage, setStage] = useState<Stage>("review");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(award.suggestedTeam.map((m) => m.personId)),
  );
  const [creating, setCreating] = useState(false);

  const current = stage === "review" ? 2 : 3;

  function toggle(personId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function createProject() {
    const team = award.suggestedTeam.filter((m) => selected.has(m.personId));
    setCreating(true);
    window.setTimeout(() => {
      onCreate(buildProjectFromAward(award, team));
    }, 1300);
  }

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8">
      <Stepper current={current} />

      {/* Award header */}
      <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-navy ring-1 ring-inset ring-cream-line">
                <Landmark width={13} height={13} />
                Awarded by Government
              </span>
              <span className="font-mono text-[11px] text-stone-400">
                {award.id} · {award.tenderRef}
              </span>
            </div>
            <h1 className="text-xl font-bold leading-snug text-ink">
              {award.name}
            </h1>
            <p className="mt-1 text-sm text-stone-500">{award.client}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Contract value
            </div>
            <div className="text-sm font-bold text-ink">{award.value}</div>
            <div className="mt-0.5 text-[11px] text-stone-400">
              Awarded {award.awardedOn} · {award.loiRef}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <Route width={14} height={14} className="text-navy" />
          Routed to{" "}
          <span className="font-semibold text-ink">
            {personById("arjun-kulkarni")?.name}
          </span>{" "}
          for delivery setup
        </div>
      </div>

      {stage === "review" ? (
        <>
          {/* AI summary */}
          <div className="mb-4 rounded-2xl border border-cream-line bg-cream-soft p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkle width={16} height={16} className="text-navy" />
              <h2 className="text-sm font-bold text-ink">
                AI summary from the tender document
              </h2>
            </div>
            <ul className="space-y-2">
              {award.aiSummary.map((line, i) => (
                <li key={i} className="flex gap-2 text-[14px] leading-7 text-stone-700">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Key facts */}
          <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-ink">Key facts</h2>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {award.keyFacts.map((f) => (
                <div key={f.label} className="flex flex-col">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                    {f.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Decision */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-600">
              Accept this award to build the delivery team and open the project.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onDecline}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                Decline
              </button>
              <button
                onClick={() => setStage("team")}
                className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-dark"
              >
                Accept & build team
                <ArrowRight width={15} height={15} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Team builder */}
          <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <Users width={16} height={16} className="text-navy" />
              <h2 className="text-sm font-bold text-ink">Build the delivery team</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-navy ring-1 ring-inset ring-cream-line">
                <Sparkle width={10} height={10} />
                AI-matched
              </span>
            </div>
            <p className="mb-4 text-xs text-stone-500">
              Suggested from the tender's manpower plan and matched to available
              specialists. Toggle anyone off before you create the project.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {award.suggestedTeam.map((m) => {
                const person = personById(m.personId);
                if (!person) return null;
                const on = selected.has(m.personId);
                return (
                  <button
                    key={m.personId}
                    onClick={() => toggle(m.personId)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      on
                        ? "border-navy/30 bg-white shadow-sm"
                        : "border-stone-200 bg-stone-50 opacity-60"
                    }`}
                  >
                    <Avatar
                      initials={person.initials}
                      classes={ROLES[m.roleId].avatarClasses}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{person.name}</p>
                      <p className="truncate text-xs text-stone-500">
                        {m.title} · {m.allocation}
                      </p>
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 transition ${
                        on
                          ? "bg-navy text-white ring-navy"
                          : "bg-white text-transparent ring-stone-300"
                      }`}
                    >
                      <Check width={13} height={13} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-setup preview */}
          <div className="mb-5 rounded-2xl border border-cream-line bg-cream-soft p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkle width={16} height={16} className="text-navy" />
              <h2 className="text-sm font-bold text-ink">
                Set up automatically from the document
              </h2>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <AutoSetupRow
                icon={Calendar}
                label={`${award.milestones.length} delivery milestones`}
                detail="Gates and due dates from the project timeline"
              />
              <AutoSetupRow
                icon={ListChecks}
                label={`${award.tasks.length} mobilisation tasks`}
                detail="Kick-off task board, pre-assigned"
              />
              <AutoSetupRow
                icon={ShieldCheck}
                label={`${award.slas.length} SLA targets`}
                detail="Service levels from the tender schedule"
              />
              <AutoSetupRow
                icon={Target}
                label={`${award.risks.length} risks flagged`}
                detail="AI-identified delivery risks to track"
              />
            </div>
          </div>

          {/* Create */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <button
              onClick={() => setStage("review")}
              className="flex items-center gap-1 text-sm font-semibold text-stone-500 transition hover:text-ink"
            >
              <ChevronLeft width={15} height={15} />
              Back to review
            </button>
            <button
              onClick={createProject}
              disabled={selected.size === 0 || creating}
              className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Sparkle width={15} height={15} className="animate-pulse" />
                  Creating project…
                </>
              ) : (
                <>
                  Create project & add to dashboard
                  <ArrowRight width={15} height={15} />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
