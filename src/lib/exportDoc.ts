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

/** The proposal that was submitted for the awarded bid (assembled from seed). */
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
    const person = roleId
      ? personById(DEFAULT_ASSIGNEE[roleId])
      : undefined;
    const owner = person
      ? `${person.name}${roleId ? ` — ${ROLES[roleId].name}` : ""}`
      : "";
    let table: string;
    if (f.kind === "fields") {
      table = `<table class="form">${(f.fields ?? [])
        .map((fl) => `<tr><th>${esc(fl.label)}</th><td>${esc(fl.value)}</td></tr>`)
        .join("")}</table>`;
    } else {
      table = `<table class="form"><tr><th>Item</th><th>Status</th><th>Reference</th></tr>${(f.rows ?? [])
        .map(
          (r) =>
            `<tr><td>${esc(r.item)}</td><td>${esc(r.status)}</td><td>${esc(r.ref)}</td></tr>`,
        )
        .join("")}</table>`;
    }
    return `<section class="annex"><h3>${esc(f.annexure)} — ${esc(f.title)}</h3><p class="meta">Prepared by ${esc(owner)}</p>${table}</section>`;
  }).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>Submitted Response — ${esc(rfp.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; line-height: 1.55; margin: 0 auto; padding: 48px 56px; max-width: 900px; }
  .cover { border-bottom: 3px solid #1e3a5f; padding-bottom: 28px; margin-bottom: 36px; }
  .eyebrow { font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #6b7280; font-weight: bold; }
  h1 { font-family: Arial, sans-serif; font-size: 30px; line-height: 1.2; margin: 12px 0 6px; color: #111; }
  .ref { font-family: "Courier New", monospace; font-size: 13px; color: #4b5563; }
  .status { font-family: Arial, sans-serif; display:inline-block; margin-top:14px; font-size:12px; font-weight:600; color:#1e3a5f; border:1px solid #cbd5e1; border-radius:9999px; padding:3px 12px; }
  table.cover-facts { font-family: Arial, sans-serif; font-size: 13px; margin-top: 18px; border-collapse: collapse; width: 100%; }
  table.cover-facts th { text-align: left; color: #6b7280; font-weight: 600; padding: 4px 16px 4px 0; white-space: nowrap; vertical-align: top; width: 190px; }
  table.cover-facts td { padding: 4px 0; }
  h2 { font-family: Arial, sans-serif; font-size: 19px; color: #1e3a5f; margin: 34px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
  h3 { font-family: Arial, sans-serif; font-size: 15px; color: #111; margin: 24px 0 2px; }
  p { margin: 0 0 12px; text-align: justify; }
  p.meta { font-family: Arial, sans-serif; font-size: 12px; color: #6b7280; font-style: italic; margin-bottom: 8px; }
  ol.toc { font-family: Arial, sans-serif; }
  .part { font-family: Arial, sans-serif; font-size: 22px; color: #111; margin: 44px 0 4px; }
  table.form { font-family: Arial, sans-serif; font-size: 13px; border-collapse: collapse; width: 100%; margin: 8px 0 4px; }
  table.form th, table.form td { border: 1px solid #d1d5db; padding: 7px 10px; text-align: left; vertical-align: top; }
  table.form th { background: #f3f4f6; color: #374151; font-weight: 600; }
  .foot { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-family: Arial, sans-serif; font-size: 11px; color: #9ca3af; text-align: center; }
</style></head>
<body>
  <div class="cover">
    <div class="eyebrow">EMB GLOBAL · Submitted Bid Response</div>
    <h1>${esc(rfp.title)}</h1>
    <div class="ref">${esc(rfp.tenderRef ?? "")}</div>
    <span class="status">Submitted &amp; Awarded</span>
    <table class="cover-facts">
      <tr><th>Bidder</th><td>${esc(COMPANY.legalName)}</td></tr>
      <tr><th>Issuing Authority</th><td>${esc(rfp.authority)}</td></tr>
      <tr><th>Submitted On</th><td>${esc(rfp.due)}</td></tr>
      <tr><th>Total Bid Value</th><td>${esc(COMPANY.bidValue)}</td></tr>
    </table>
  </div>

  <div class="part">Proposal</div>
  ${sectionsHtml}

  <div class="part">Statutory Annexures</div>
  ${formsHtml}

  <div class="foot">Submitted response · EMB GLOBAL</div>
</body></html>`;
}
