import type { Vendor, VendorDocType } from "../types";
import {
  RFPS,
  SECTIONS,
  AUTHOR_CONTENT,
  COMPILED_FORMS,
  COMPANY,
  ROLES,
  DEFAULT_ASSIGNEE,
  personById,
} from "../data/seed";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const AUTHORITY = "Maharashtra IT Corporation Ltd (MahaIT)";

// ---------------------------------------------------------------------------
// Shared document shell (one styled A4-ish page template for every mock doc)
// ---------------------------------------------------------------------------

const DOC_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; line-height: 1.55; margin: 0 auto; padding: 48px 56px; max-width: 900px; }
  .cover { border-bottom: 3px solid #1e3a5f; padding-bottom: 28px; margin-bottom: 36px; }
  .eyebrow { font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #6b7280; font-weight: bold; }
  h1 { font-family: Arial, sans-serif; font-size: 30px; line-height: 1.2; margin: 12px 0 6px; color: #111; }
  .ref { font-family: "Courier New", monospace; font-size: 13px; color: #4b5563; }
  .status { font-family: Arial, sans-serif; display:inline-block; margin-top:14px; font-size:12px; font-weight:600; color:#1e3a5f; border:1px solid #cbd5e1; border-radius:9999px; padding:3px 12px; }
  table.cover-facts { font-family: Arial, sans-serif; font-size: 13px; margin-top: 18px; border-collapse: collapse; width: 100%; }
  table.cover-facts th { text-align: left; color: #6b7280; font-weight: 600; padding: 4px 16px 4px 0; white-space: nowrap; vertical-align: top; width: 210px; }
  table.cover-facts td { padding: 4px 0; }
  h2 { font-family: Arial, sans-serif; font-size: 19px; color: #1e3a5f; margin: 34px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
  h3 { font-family: Arial, sans-serif; font-size: 15px; color: #111; margin: 24px 0 2px; }
  p { margin: 0 0 12px; text-align: justify; }
  p.meta { font-family: Arial, sans-serif; font-size: 12px; color: #6b7280; font-style: italic; margin-bottom: 8px; }
  ol.toc, ol.clauses { font-family: Arial, sans-serif; }
  ol.clauses > li { margin-bottom: 12px; }
  .part { font-family: Arial, sans-serif; font-size: 22px; color: #111; margin: 44px 0 4px; }
  table.data { font-family: Arial, sans-serif; font-size: 13px; border-collapse: collapse; width: 100%; margin: 8px 0 4px; }
  table.data th, table.data td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; vertical-align: top; }
  table.data th { background: #f3f4f6; color: #374151; font-weight: 600; }
  table.data td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  table.data tr.total td { font-weight: 700; background: #faf9f7; }
  .sign { font-family: Arial, sans-serif; display: flex; gap: 48px; margin-top: 40px; }
  .sign > div { flex: 1; }
  .sign .line { border-top: 1px solid #9ca3af; margin-top: 44px; padding-top: 6px; font-size: 12px; color: #4b5563; }
  .foot { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-family: Arial, sans-serif; font-size: 11px; color: #9ca3af; text-align: center; }
`;

function docPage(opts: {
  eyebrow: string;
  h1: string;
  ref?: string;
  status?: string;
  facts?: { label: string; value: string }[];
  body: string;
  foot?: string;
}): string {
  const facts = (opts.facts ?? [])
    .map((f) => `<tr><th>${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(opts.h1)}</title>
<style>${DOC_CSS}</style></head>
<body>
  <div class="cover">
    <div class="eyebrow">${esc(opts.eyebrow)}</div>
    <h1>${esc(opts.h1)}</h1>
    ${opts.ref ? `<div class="ref">${esc(opts.ref)}</div>` : ""}
    ${opts.status ? `<span class="status">${esc(opts.status)}</span>` : ""}
    ${facts ? `<table class="cover-facts">${facts}</table>` : ""}
  </div>
  ${opts.body}
  <div class="foot">${esc(opts.foot ?? "EMB GLOBAL · Project Management")}</div>
</body></html>`;
}

function signatures(): string {
  return `<div class="sign">
    <div><div class="line">For and on behalf of<br/><b>${esc(COMPANY.legalName)}</b><br/>${esc(COMPANY.signatory)}, ${esc(COMPANY.signatoryDesignation)}</div></div>
    <div><div class="line">For and on behalf of<br/><b>${esc(AUTHORITY)}</b><br/>Authorised Signatory</div></div>
  </div>`;
}

// ---------------------------------------------------------------------------
// The proposal that was submitted for the awarded bid
// ---------------------------------------------------------------------------

export function buildSubmittedHtml(): string {
  const rfp = RFPS[0];

  const sectionsHtml = SECTIONS.map((s, i) => {
    const paras =
      s.kind === "author" ? (AUTHOR_CONTENT[s.id] ?? []) : s.content;
    let body: string;
    if (s.id === "table-of-content") {
      body = `<ol class="toc">${paras.map((p) => `<li>${esc(p.text)}</li>`).join("")}</ol>`;
    } else {
      body = paras.map((p) => `<p>${esc(p.text)}</p>`).join("");
    }
    return `<section><h2>${i + 1}. ${esc(s.title)}</h2>${body}</section>`;
  }).join("");

  const formsHtml = COMPILED_FORMS.map((f) => {
    const roleId = f.contributor;
    const person = roleId ? personById(DEFAULT_ASSIGNEE[roleId]) : undefined;
    const owner = person
      ? `${person.name}${roleId ? ` — ${ROLES[roleId].name}` : ""}`
      : "";
    let table: string;
    if (f.kind === "fields") {
      table = `<table class="data">${(f.fields ?? [])
        .map((fl) => `<tr><th>${esc(fl.label)}</th><td>${esc(fl.value)}</td></tr>`)
        .join("")}</table>`;
    } else {
      table = `<table class="data"><tr><th>Item</th><th>Status</th><th>Reference</th></tr>${(f.rows ?? [])
        .map(
          (r) =>
            `<tr><td>${esc(r.item)}</td><td>${esc(r.status)}</td><td>${esc(r.ref)}</td></tr>`,
        )
        .join("")}</table>`;
    }
    return `<section><h3>${esc(f.annexure)} — ${esc(f.title)}</h3><p class="meta">Prepared by ${esc(owner)}</p>${table}</section>`;
  }).join("");

  return docPage({
    eyebrow: "EMB GLOBAL · Submitted Bid Response",
    h1: rfp.title,
    ref: rfp.tenderRef,
    status: "Submitted & Awarded",
    facts: [
      { label: "Bidder", value: COMPANY.legalName },
      { label: "Issuing Authority", value: rfp.authority },
      { label: "Submitted On", value: rfp.due },
      { label: "Total Bid Value", value: COMPANY.bidValue },
    ],
    body: `<div class="part">Proposal</div>${sectionsHtml}<div class="part">Statutory Annexures</div>${formsHtml}`,
    foot: "Submitted response · EMB GLOBAL",
  });
}

// ---------------------------------------------------------------------------
// Contract (Master Services Agreement)
// ---------------------------------------------------------------------------

export function buildContractHtml(): string {
  const clauses = [
    ["Parties and Effective Date", `This Master Services Agreement ("Agreement") is made between ${AUTHORITY} ("Purchaser") and ${COMPANY.legalName} ("System Integrator"), and takes effect from 01 October 2025 ("Effective Date"), pursuant to the Letter of Intent issued against tender reference ${RFPS[0].tenderRef}.`],
    ["Scope of Services", "The System Integrator shall design, develop, migrate, deploy, operate and maintain the Aaple Sarkar 2.0 citizen services platform, including onboarding of Standard and Gateway Departments, integrations with UIDAI, DigiLocker, MahaDBT and the payment gateway, migration of existing user profiles, and the chatbot, IVR and call-centre stack, in accordance with the accepted Technical Proposal."],
    ["Contract Value and Payment", `The total contract value is ${COMPANY.bidValue}. Payments shall be released against the milestone curve: 10% on submission of the Performance Bank Guarantee, team onboarding and the Detailed Project Plan; 5% each for the System Requirements Specification and design of the Citizen, Department and CRTS portals; 15% for RTS 1.0 data migration; 15% for notified-service onboarding; and 10% for transition. Cloud, OEM licence and State API Development Team charges are billed quarterly against invoices.`],
    ["Term", "The Agreement remains in force for 45 months, comprising 9 months of implementation and 36 months of operations, support and maintenance, unless terminated earlier in accordance with the termination provisions."],
    ["Service Levels", "The System Integrator shall meet the Service Levels set out in the SLA schedule, including 99.5% portal uptime per calendar month, a minimum of 1,00,000 concurrent users, and an API response of 0.30 ms, and shall bear the service-credit penalties defined for any shortfall."],
    ["Performance Bank Guarantee", "The System Integrator shall furnish an unconditional Performance Bank Guarantee of 10% of the contract value within 30 days of the Letter of Intent, valid for 180 days beyond the operations period, encashable on material breach or where cumulative penalties reach the value of the guarantee."],
    ["Key Personnel", "Named Key Personnel shall be committed full time and shall not be changed without the Purchaser's prior written consent. Any replacement shall be of equal or better credentials, with a four-week handover overlap. A rolling attrition rate above 10% triggers the agreed remedy."],
    ["Intellectual Property and Data", "All intellectual property, source code and data created for the Purchaser under this Agreement vest in the Purchaser. Source code shall be placed in escrow and handed over with knowledge transfer at the end of the term. The System Integrator shall comply with all applicable data protection obligations."],
    ["Exit Management", "On expiry or termination, the System Integrator shall provide exit management and transition assistance to the Purchaser or its nominated agency, ensuring continuity of the citizen services without disruption."],
  ];

  const body = `<ol class="clauses">${clauses
    .map((c) => `<li><h3>${esc(c[0])}</h3><p>${esc(c[1])}</p></li>`)
    .join("")}</ol>${signatures()}`;

  return docPage({
    eyebrow: "EMB GLOBAL · Master Services Agreement",
    h1: "Master Services Agreement",
    ref: "MSA/MAHAIT/RTS2.0/2025",
    status: "Executed",
    facts: [
      { label: "Purchaser", value: AUTHORITY },
      { label: "System Integrator", value: COMPANY.legalName },
      { label: "Effective Date", value: "01 October 2025" },
      { label: "Contract Value", value: COMPANY.bidValue },
      { label: "Term", value: "45 months (9 implementation + 36 O&M)" },
    ],
    body,
    foot: "Master Services Agreement · confidential",
  });
}

// ---------------------------------------------------------------------------
// Addendum
// ---------------------------------------------------------------------------

export function buildAddendumHtml(): string {
  const body = `
    <h2>Recitals</h2>
    <p>This Addendum No. 1 ("Addendum") amends the Master Services Agreement dated 01 October 2025 (ref. MSA/MAHAIT/RTS2.0/2025) between ${esc(AUTHORITY)} and ${esc(COMPANY.legalName)}. All capitalised terms carry the meaning given to them in the Agreement.</p>
    <h2>Amendments</h2>
    <ol class="clauses">
      <li><h3>Additional Scope</h3><p>The parties agree to onboard 24 additional notified services beyond the original catalogue, to be delivered within the implementation phase without change to the go-live gate.</p></li>
      <li><h3>Revised UAT Window</h3><p>The User Acceptance Testing window is extended by 10 working days to accommodate the additional services. The consequential dates in the project timeline stand revised accordingly.</p></li>
      <li><h3>Commercial Effect</h3><p>The additional scope is valued at INR 6,20,00,000 (inclusive of GST), raising the total contract value to INR 4,44,40,00,000. The milestone payment for notified-service onboarding is adjusted pro rata.</p></li>
      <li><h3>Performance Bank Guarantee</h3><p>The System Integrator shall enhance the Performance Bank Guarantee to 10% of the revised contract value within 15 days of execution of this Addendum.</p></li>
    </ol>
    <h2>General</h2>
    <p>Save as expressly amended by this Addendum, all other terms and conditions of the Agreement remain in full force and effect. This Addendum shall be read as an integral part of the Agreement.</p>
    ${signatures()}`;

  return docPage({
    eyebrow: "EMB GLOBAL · Contract Addendum",
    h1: "Addendum No. 1 to the MSA",
    ref: "ADD-1/MAHAIT/RTS2.0/2026",
    status: "Executed",
    facts: [
      { label: "Amends", value: "MSA/MAHAIT/RTS2.0/2025" },
      { label: "Date of Addendum", value: "12 January 2026" },
      { label: "Revised Contract Value", value: "INR 4,44,40,00,000 (incl. GST)" },
      { label: "Effect", value: "24 additional services; UAT window extended by 10 working days" },
    ],
    body,
    foot: "Contract Addendum · confidential",
  });
}

// ---------------------------------------------------------------------------
// Change Document (Change Control Note)
// ---------------------------------------------------------------------------

export function buildChangeDocHtml(): string {
  const impact = [
    ["Scope", "Add Marathi-language IVR on the Bhashini NLU stack and expand doorstep delivery through the VLE network to five additional divisions."],
    ["Timeline", "No change to the go-live gate; two weeks of parallel effort absorbed within the current development window."],
    ["Effort", "Estimated 96 person-days across solution, development and delivery."],
    ["Cost", "INR 1,85,00,000 (inclusive of GST), billed against the notified-service onboarding milestone."],
  ];

  const approvals = [
    ["Raised by", "Kavya Iyer — Cloud & Data Architect", "28 Dec 2025"],
    ["Reviewed by", "Arjun Kulkarni — Project Director", "02 Jan 2026"],
    ["Approved by", "MahaIT Change Advisory Board", "08 Jan 2026"],
  ];

  const body = `
    <h2>Change Description</h2>
    <p>This Change Control Note records a change requested by the Purchaser to extend citizen-access channels for Aaple Sarkar 2.0. The change introduces a Marathi-language IVR built on the Bhashini regional-language NLU and expands doorstep delivery through the Village Level Entrepreneur network into five additional divisions.</p>
    <h2>Reason for Change</h2>
    <p>Field feedback during the SRS and design gates indicated strong demand for voice-first access in Marathi and for doorstep delivery in under-served divisions. The change improves accessibility and adoption without altering the core architecture.</p>
    <h2>Impact Assessment</h2>
    <table class="data"><tr><th>Dimension</th><th>Assessment</th></tr>${impact
      .map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`)
      .join("")}</table>
    <h2>Approvals</h2>
    <table class="data"><tr><th>Role</th><th>Name</th><th>Date</th></tr>${approvals
      .map(
        (r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`,
      )
      .join("")}</table>`;

  return docPage({
    eyebrow: "EMB GLOBAL · Change Control Note",
    h1: "Change Control Note CCN-002",
    ref: "CCN-002/MAHAIT/RTS2.0",
    status: "Approved",
    facts: [
      { label: "Project", value: "Aaple Sarkar 2.0 Implementation" },
      { label: "Raised", value: "28 December 2025" },
      { label: "Approved", value: "08 January 2026" },
      { label: "Cost Impact", value: "INR 1,85,00,000 (incl. GST)" },
    ],
    body,
    foot: "Change Control Note · confidential",
  });
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function buildInvoicesHtml(): string {
  const rows = [
    ["INV-2025-001", "15 Oct 2025", "Mobilisation, PBG & Detailed Project Plan (10%)", "40,00,00,000", "7,20,00,000", "47,20,00,000", "Paid"],
    ["INV-2025-002", "30 Oct 2025", "SRS sign-off (5%)", "18,00,00,000", "3,24,00,000", "21,24,00,000", "Paid"],
    ["INV-2025-003", "20 Nov 2025", "Solution Design sign-off (5%)", "18,00,00,000", "3,24,00,000", "21,24,00,000", "Paid"],
    ["INV-2025-004", "31 Dec 2025", "Cloud, OEM licence & State API team (Q1)", "3,00,00,000", "54,00,000", "3,54,00,000", "Paid"],
    ["INV-2026-005", "31 Jan 2026", "Cloud, OEM licence & State API team (Q2)", "3,00,00,000", "54,00,000", "3,54,00,000", "Submitted"],
  ];

  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td class="num">${esc(r[3])}</td><td class="num">${esc(r[4])}</td><td class="num">${esc(r[5])}</td><td>${esc(r[6])}</td></tr>`,
    )
    .join("");

  const body = `
    <p>Statement of invoices raised by ${esc(COMPANY.legalName)} against the Aaple Sarkar 2.0 Implementation contract (MSA/MAHAIT/RTS2.0/2025). All amounts in INR; GST shown separately as required under the contract.</p>
    <table class="data">
      <tr><th>Invoice No.</th><th>Date</th><th>Against</th><th>Amount</th><th>GST</th><th>Total</th><th>Status</th></tr>
      ${bodyRows}
      <tr class="total"><td colspan="3">Total invoiced to date</td><td class="num">82,00,00,000</td><td class="num">14,76,00,000</td><td class="num">96,76,00,000</td><td></td></tr>
    </table>
    <h2>Account Summary</h2>
    <table class="cover-facts">
      <tr><th>Total invoiced (incl. GST)</th><td>INR 96,76,00,000</td></tr>
      <tr><th>Received</th><td>INR 93,22,00,000</td></tr>
      <tr><th>Outstanding</th><td>INR 3,54,00,000 (INV-2026-005, under review)</td></tr>
      <tr><th>Contract value</th><td>${esc(COMPANY.bidValue)}</td></tr>
    </table>`;

  return docPage({
    eyebrow: "EMB GLOBAL · Invoice Statement",
    h1: "Invoice Statement",
    ref: "AR/MAHAIT/RTS2.0",
    status: "As of 31 Jan 2026",
    facts: [
      { label: "Billed to", value: AUTHORITY },
      { label: "From", value: COMPANY.legalName },
      { label: "GSTIN", value: COMPANY.gstin },
      { label: "Invoices raised", value: "5" },
    ],
    body,
    foot: "Invoice statement · confidential",
  });
}

// ---------------------------------------------------------------------------
// Vendor (subcontractor / supplier) documents
// ---------------------------------------------------------------------------

const VENDOR_DOC_TITLE: Record<VendorDocType, string> = {
  "work-order": "Work Order",
  agreement: "Subcontract Agreement",
  compliance: "Compliance Certificate",
  invoices: "Vendor Invoices",
};

function vendorSignatures(vendor: Vendor): string {
  return `<div class="sign">
    <div><div class="line">For the Prime Contractor<br/><b>${esc(COMPANY.legalName)}</b><br/>${esc(COMPANY.signatory)}, ${esc(COMPANY.signatoryDesignation)}</div></div>
    <div><div class="line">For the Vendor<br/><b>${esc(vendor.name)}</b><br/>${esc(vendor.contact.name)}, ${esc(vendor.contact.title)}</div></div>
  </div>`;
}

export function buildVendorDocHtml(vendor: Vendor, type: VendorDocType): string {
  const commonFacts = [
    { label: "Vendor", value: vendor.name },
    { label: "Category", value: vendor.category },
    { label: "Prime Contractor", value: COMPANY.legalName },
    { label: "Reference", value: vendor.poRef },
  ];

  if (type === "work-order") {
    const body = `
      <h2>Engagement</h2>
      <p>${esc(COMPANY.legalName)} ("Prime Contractor") engages ${esc(vendor.name)} ("Vendor") as a subcontractor under the Aaple Sarkar 2.0 Implementation contract (MSA/MAHAIT/RTS2.0/2025). This Work Order authorises the Vendor to commence the scope set out below.</p>
      <h2>Scope of Supply</h2>
      <p>${esc(vendor.scope)}</p>
      <h2>Commercial</h2>
      <table class="data">
        <tr><th>Order value</th><td>${esc(vendor.contractValue)} (inclusive of GST)</td></tr>
        <tr><th>Effective from</th><td>${esc(vendor.since)}</td></tr>
        <tr><th>Payment terms</th><td>Net 30 days from certified invoice, against accepted deliverables</td></tr>
        <tr><th>Back-to-back SLAs</th><td>Vendor SLAs flow down from the prime contract and mirror the applicable service credits</td></tr>
      </table>
      ${vendorSignatures(vendor)}`;
    return docPage({
      eyebrow: "EMB GLOBAL · Vendor Work Order",
      h1: "Work Order",
      ref: vendor.poRef,
      status: vendor.status === "Onboarding" ? "Issued" : "Active",
      facts: commonFacts,
      body,
      foot: "Vendor work order · confidential",
    });
  }

  if (type === "agreement") {
    const clauses = [
      ["Scope and Deliverables", `The Vendor shall deliver the following as a subcontractor to the Prime Contractor: ${vendor.scope}`],
      ["Term", "This agreement runs coterminous with the Prime Contractor's obligations under the Master Services Agreement, unless terminated earlier for cause."],
      ["Service Levels", "The Vendor accepts back-to-back service levels flowing down from the prime contract, including the applicable availability, response and quality targets, and the associated service credits."],
      ["Confidentiality and Data", "The Vendor shall keep all Purchaser and citizen data confidential, process it only for the engagement, and comply with the data protection obligations of the prime contract."],
      ["Intellectual Property", "All intellectual property created for the engagement flows down to the Purchaser in the same manner as under the prime contract. The Vendor retains no residual rights in Purchaser deliverables."],
      ["Compliance", `The Vendor warrants that it holds and maintains the certifications relevant to its scope (${vendor.certifications.join(", ")}) for the duration of the engagement.`],
    ];
    const body = `<ol class="clauses">${clauses
      .map((c) => `<li><h3>${esc(c[0])}</h3><p>${esc(c[1])}</p></li>`)
      .join("")}</ol>${vendorSignatures(vendor)}`;
    return docPage({
      eyebrow: "EMB GLOBAL · Subcontract Agreement",
      h1: "Subcontract Agreement",
      ref: vendor.poRef.replace("WO/", "SCA/"),
      status: "Executed",
      facts: [
        ...commonFacts,
        { label: "Order value", value: vendor.contractValue },
      ],
      body,
      foot: "Subcontract agreement · confidential",
    });
  }

  if (type === "compliance") {
    const certRows = vendor.certifications
      .map(
        (c) =>
          `<tr><td>${esc(c)}</td><td>Valid</td><td>Verified on file</td></tr>`,
      )
      .join("");
    const body = `
      <p>This certificate records the compliance status of ${esc(vendor.name)} as a subcontractor to ${esc(COMPANY.legalName)} for the Aaple Sarkar 2.0 Implementation.</p>
      <h2>Statutory</h2>
      <table class="data">
        <tr><th>GSTIN</th><td>${esc(vendor.gstin)}</td></tr>
        <tr><th>Registered location</th><td>${esc(vendor.location)}</td></tr>
        <tr><th>Non-blacklisting</th><td>Self-declared and verified</td></tr>
      </table>
      <h2>Certifications</h2>
      <table class="data">
        <tr><th>Certification</th><th>Status</th><th>Evidence</th></tr>
        ${certRows}
      </table>
      <p class="meta">Issued by the Prime Contractor's vendor governance office.</p>`;
    return docPage({
      eyebrow: "EMB GLOBAL · Vendor Compliance",
      h1: "Compliance Certificate",
      ref: vendor.poRef.replace("WO/", "CMP/"),
      status: "Verified",
      facts: commonFacts,
      body,
      foot: "Vendor compliance certificate · confidential",
    });
  }

  // invoices
  const onboarding = vendor.status === "Onboarding";
  const rows = onboarding
    ? [["—", "—", "No invoices raised yet; vendor is onboarding", "—", "—"]]
    : [
        [`${vendor.poRef.split("/").pop()}-I1`, vendor.since, "Mobilisation / first deliverable", "Paid", "20% of order value"],
        [`${vendor.poRef.split("/").pop()}-I2`, "Quarterly", "Recurring service charge (Q1)", "Paid", "Quarterly"],
        [`${vendor.poRef.split("/").pop()}-I3`, "Quarterly", "Recurring service charge (Q2)", "Submitted", "Quarterly"],
      ];
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`,
    )
    .join("");
  const body = `
    <p>Invoices raised by ${esc(vendor.name)} against ${esc(vendor.poRef)}. Order value ${esc(vendor.contractValue)} (inclusive of GST).</p>
    <table class="data">
      <tr><th>Invoice No.</th><th>Date</th><th>Against</th><th>Status</th><th>Basis</th></tr>
      ${bodyRows}
    </table>
    ${
      onboarding
        ? `<p class="meta">Billing begins once the vendor's first deliverable is accepted.</p>`
        : ""
    }`;
  return docPage({
    eyebrow: "EMB GLOBAL · Vendor Invoices",
    h1: "Vendor Invoices",
    ref: vendor.poRef.replace("WO/", "AR/"),
    status: onboarding ? "No invoices yet" : "Active",
    facts: commonFacts,
    body,
    foot: "Vendor invoice statement · confidential",
  });
}

export { VENDOR_DOC_TITLE };
