// Shared domain types for the Bid Orchestrator prototype.

export type RfpStatus = "Pending Review" | "Accepted" | "Rejected";

export type Source = "GeM" | "CPPP" | "MahaTenders" | "Direct";

export type EligibilityStatus = "pass" | "warn" | "fail";

export interface EligibilityRow {
  status: EligibilityStatus;
  criterion: string;
  note: string;
}

export interface KeyFact {
  label: string;
  value: string;
}

/** A row in the inbox table. RFP-001 additionally carries the rich triage fields. */
export interface Rfp {
  id: string;
  title: string;
  source: Source;
  authority: string;
  due: string;
  value: string;
  status: RfpStatus;
  /** Only the primary RFP is fully seeded with triage + team data. */
  detailed: boolean;

  // Rich fields, primary RFP only.
  tenderRef?: string;
  sourceUrl?: string;
  /** Path to the served RFP PDF, opened in the in-app viewer. */
  documentUrl?: string;
  documentName?: string;
  keyFacts?: KeyFact[];
  aiSummary?: string[];
  aiSummaryCondensed?: string[];
  eligibility?: EligibilityRow[];
}

/** Stable identifiers for the six wizard roles. */
export type RoleId =
  | "bid-manager"
  | "solution-architect"
  | "legal-1"
  | "legal-2"
  | "finance"
  | "delivery";

export interface ActionItem {
  text: string;
  /** Source reference, e.g. "RFP §5.5, Annexure 24". May be empty. */
  ref: string;
}

export interface Role {
  id: RoleId;
  name: string;
  mandate: string;
  /** Plain-language brief on what this department must ensure. */
  brief: string;
  /** Relevant RFP source sections, rendered as chips. */
  sourceSections: string[];
  actionItems: ActionItem[];
  /** Annexures / forms this department must complete. */
  forms: string[];
  /** Submission summary shown on the Team Overview screen. */
  submission: string;
  submittedAt: string;
  /** Tailwind classes for the role's avatar chip. */
  avatarClasses: string;
}

export interface Person {
  id: string;
  name: string;
  title: string;
  capabilities: RoleId[];
  activeBids: number;
  initials: string;
}

/** Map of role id -> assigned person id (or null when unassigned). */
export type Assignments = Record<RoleId, string | null>;

// ---- Response Compiler ----

export type SectionStatus = "Not Started" | "In Progress" | "Completed";

export type SectionKind = "author" | "compiled";

export interface Paragraph {
  text: string;
  /** AI-generated paragraphs carry the highlight wash and hover actions. */
  ai: boolean;
}

export interface Section {
  id: string;
  title: string;
  kind: SectionKind;
  status: SectionStatus;
  /** For compiled sections, the role that contributed the content. */
  contributor?: RoleId;
  /** Seed prose. Author sections stay hidden until Generate with AI runs. */
  content: Paragraph[];
}

// ---- Sources page ----

export type SourceStatus = "Active" | "Paused";

export interface SourceRow {
  id: string;
  name: string;
  /** Platform badge label, e.g. GeM, CPPP, IREPS, MahaTenders, State portal. */
  platform: string;
  listingUrl: string;
  registeredId: string;
  loginNote: string;
  keywords: string[];
  status: SourceStatus;
  added: string;
}

// ---- Bid Manager forms (Team Overview auto-fill) ----

export interface FormField {
  label: string;
  value: string;
}

export type ChecklistStatus = "Yes" | "In progress" | "No" | "N/A";

export interface ChecklistRow {
  item: string;
  status: ChecklistStatus;
  ref: string;
}

export interface BidForm {
  id: string;
  annexure: string;
  title: string;
  kind: "fields" | "checklist";
  fields?: FormField[];
  rows?: ChecklistRow[];
  /** Role that filled the form (for provenance in the compiler). */
  contributor?: RoleId;
}

// ---- Context Sources file tree ----

export type FileKind = "pdf" | "docx" | "xlsx";

export interface ContextFile {
  id: string;
  name: string;
  kind: FileKind;
}

export interface ContextFolder {
  id: string;
  name: string;
  files: ContextFile[];
  folders?: ContextFolder[];
}

// ---- Project Management ----

export type ProjectHealth = "On track" | "At risk" | "Delayed" | "Completed";
export type MilestoneStatus = "Completed" | "In progress" | "Upcoming";
export type TaskStatus = "To do" | "In progress" | "Done";
export type RiskSeverity = "High" | "Medium" | "Low";
export type RiskStatus = "Open" | "Mitigating" | "Closed";
export type SlaStatus = "Met" | "At risk" | "Breach";

export interface Milestone {
  name: string;
  window: string;
  due: string;
  status: MilestoneStatus;
}

export interface ProjectTask {
  id: string;
  title: string;
  assigneeId: string;
  status: TaskStatus;
  due: string;
}

export interface Sla {
  name: string;
  target: string;
  current: string;
  status: SlaStatus;
}

export interface Risk {
  title: string;
  severity: RiskSeverity;
  status: RiskStatus;
  owner: string;
  note: string;
}

export interface TeamMember {
  personId: string;
  roleId: RoleId;
  title: string;
  allocation: string;
}

export type VendorStatus = "Active" | "Onboarding" | "Completed";
export type VendorDocType = "work-order" | "agreement" | "compliance" | "invoices";

export interface VendorContact {
  name: string;
  title: string;
  email: string;
  phone: string;
}

export type PaymentStatus = "Scheduled" | "Due" | "Paid" | "On hold";

export interface VendorPayment {
  id: string;
  label: string; // "Advance (10%)", "Q1 managed service", ...
  amountValue: number; // INR, numeric — source of truth for the summary
  due: string; // "On mobilisation" or a date
  status: PaymentStatus;
}

export interface VendorFinance {
  advancePercent: string; // "10%"
  retentionPercent: string; // "5%" (retention accrues on paid amounts)
  schedule: VendorPayment[];
}

export type SecurityKind = "EMD" | "PBG";
export type SecurityStatus = "Submitted" | "Active" | "Released" | "Expired";

/** A financial-security instrument (EMD / PBG) used in public procurement. */
export interface FinancialSecurity {
  id: string;
  kind: SecurityKind;
  fullName: string; // "Earnest Money Deposit"
  instrument: string; // "Bank Guarantee"
  amount: string; // "INR 1,00,00,000"
  basis: string; // "Fixed EMD (per tender)" | "10% of contract value"
  issuingBank: string;
  refNo: string;
  submittedOn: string;
  validTill: string;
  status: SecurityStatus;
  note: string; // one-line, what this instrument secures
}

/** A subcontractor / supplier the project work is awarded to. */
export interface Vendor {
  id: string;
  name: string;
  /** e.g. "Cloud Service Provider", "Security Audit (VAPT)". */
  category: string;
  scope: string;
  /** Purchase / work order reference. */
  poRef: string;
  contractValue: string;
  status: VendorStatus;
  gstin: string;
  location: string;
  since: string;
  certifications: string[];
  contact: VendorContact;
  finance: VendorFinance;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  phase: string;
  start: string;
  end: string;
  percentComplete: number;
  value: string;
  pm: string;
  health: ProjectHealth;
  /** Only the flagship project has the full detail workspace. */
  detailed: boolean;
  contractTerm?: string;
  summary?: string;
  milestones?: Milestone[];
  tasks?: ProjectTask[];
  team?: TeamMember[];
  slas?: Sla[];
  risks?: Risk[];
  vendors?: Vendor[];
  securities?: FinancialSecurity[];
}

/**
 * A bid the government has awarded externally, routed to the PM for setup.
 * On acceptance it seeds a full Project (milestones, tasks, SLAs and risks are
 * derived from the tender document and AI; the team is confirmed by the PM).
 */
export interface AwardedBid {
  id: string;
  /** Id the resulting project takes once it lands on the dashboard. */
  projectId: string;
  name: string;
  client: string;
  value: string;
  source: string;
  tenderRef: string;
  /** When the government issued the award. */
  awardedOn: string;
  /** Letter of Intent / award reference. */
  loiRef: string;
  contractTerm: string;
  start: string;
  end: string;
  summary: string;
  aiSummary: string[];
  keyFacts: { label: string; value: string }[];
  /** AI-suggested roster, matched from the tender's manpower plan. */
  suggestedTeam: TeamMember[];
  /** Auto-derived from the document / AI, applied on project creation. */
  milestones: Milestone[];
  tasks: ProjectTask[];
  slas: Sla[];
  risks: Risk[];
  vendors: Vendor[];
  securities: FinancialSecurity[];
}
