"use strict";

// Human-readable labels for each artifact type used in artifacts.json.
const TYPE_LABELS = {
  orchestrator: "Exploitable Results",
  tool: "Tools",
  model: "Models",
  publication: "Publications",
  software: "Software",
  dataset: "Datasets",
  presentation: "Presentations",
};

const state = {
  artifacts: [],
  activeFilter: "all",
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  document.getElementById("year").textContent = String(new Date().getFullYear());

  try {
    const res = await fetch("artifacts.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderProject(data.project || {});
    state.artifacts = Array.isArray(data.artifacts) ? data.artifacts : [];
    buildGraph();
    renderFilters();
    renderArtifacts();
  } catch (err) {
    console.error("Failed to load artifacts.json:", err);
    const grid = document.getElementById("artifact-grid");
    grid.innerHTML =
      '<p class="empty-state">Could not load content. If you are viewing this file locally, serve it over HTTP (e.g. <code>python3 -m http.server</code>) — browsers block fetch() on file:// URLs.</p>';
  }
}

function renderProject(p) {
  setText("hero-programme", p.affiliation);
  setText("hero-title", p.heroTitle || p.name || "MATISSE");
  setText("hero-full", p.fullName);
  setText("hero-tagline", p.tagline);
  setHtml("about-text", paragraphs(p.about));
  setText("footer-funding", p.fundingNotice);

  if (p.affiliation) document.title = `${p.affiliation} — Artifacts within ${p.name || "MATISSE"}`;

  // Hero meta: small pills for programme, dates, and a link to the main site.
  const meta = document.getElementById("hero-meta");
  meta.innerHTML = "";
  if (p.programme) meta.appendChild(pill(p.programme));
  const period = [p.startDate, p.endDate].filter(Boolean).join(" – ");
  if (period) meta.appendChild(pill(period));
  if (p.grantNumber) meta.appendChild(pill(`Grant No. ${p.grantNumber}`));
  if (p.projectWebsite) {
    const a = document.createElement("a");
    a.className = "pill pill-link";
    a.href = p.projectWebsite;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Project website ↗";
    meta.appendChild(a);
  }
}

// Relationships are derived from the single source of truth: each artifact's
// `uses` array (parent -> child). We index it once into id->artifact and
// child->parents maps so cards can show derived "Part of" / "Combines" labels.
function buildGraph() {
  state.byId = new Map(state.artifacts.filter((a) => a.id).map((a) => [a.id, a]));
  state.parents = new Map();
  for (const a of state.artifacts) {
    if (!a.id || !Array.isArray(a.uses)) continue;
    for (const childId of a.uses) {
      if (!state.parents.has(childId)) state.parents.set(childId, []);
      state.parents.get(childId).push(a);
    }
  }
}

// Walk up the `uses` graph to the orchestrator(s) that own this artifact.
function orchestratorAncestors(a) {
  const titles = [];
  const seen = new Set();
  const visit = (node) => {
    for (const parent of state.parents.get(node.id) || []) {
      if (seen.has(parent.id)) continue;
      seen.add(parent.id);
      if (parent.type === "orchestrator") {
        if (!titles.includes(parent.title)) titles.push(parent.title);
      } else {
        visit(parent);
      }
    }
  };
  if (a.id) visit(a);
  return titles;
}

// Direct children this artifact combines (titles of its `uses` targets).
function childTitles(a) {
  return (Array.isArray(a.uses) ? a.uses : [])
    .map((id) => state.byId.get(id))
    .filter(Boolean)
    .map((c) => c.title);
}

function renderFilters() {
  const wrap = document.getElementById("filters");
  wrap.innerHTML = "";

  const present = new Set(state.artifacts.map((a) => a.type));
  const types = ["all", ...Object.keys(TYPE_LABELS).filter((t) => present.has(t))];

  for (const type of types) {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (type === state.activeFilter ? " is-active" : "");
    btn.type = "button";
    btn.textContent = type === "all" ? "All" : TYPE_LABELS[type];
    btn.setAttribute("aria-pressed", String(type === state.activeFilter));
    btn.addEventListener("click", () => {
      state.activeFilter = type;
      renderFilters();
      renderArtifacts();
    });
    wrap.appendChild(btn);
  }
}

function renderArtifacts() {
  const grid = document.getElementById("artifact-grid");
  const empty = document.getElementById("empty-state");
  grid.innerHTML = "";

  const items = state.artifacts
    .filter((a) => state.activeFilter === "all" || a.type === state.activeFilter)
    .sort((a, b) => (b.year || 0) - (a.year || 0));

  empty.hidden = items.length !== 0;

  for (const a of items) {
    grid.appendChild(card(a));
  }
}

function card(a) {
  const el = document.createElement("article");
  el.className = "card";
  if (a.id) el.id = `a-${a.id}`; // anchor target for diagram node clicks

  const typeLabel = (TYPE_LABELS[a.type] || a.type || "").replace(/s$/, "");
  const head = document.createElement("div");
  head.className = "card-head";
  head.innerHTML =
    `<span class="badge badge-${escapeHtml(a.type || "other")}">${escapeHtml(typeLabel)}</span>` +
    (a.year ? `<span class="card-year">${escapeHtml(String(a.year))}</span>` : "");
  el.appendChild(head);

  const h3 = document.createElement("h3");
  h3.className = "card-title";
  h3.textContent = a.title || "Untitled";
  el.appendChild(h3);

  if (a.subtitle) el.appendChild(meta("card-subtitle", a.subtitle));
  if (a.authors) el.appendChild(meta("card-authors", a.authors));
  if (a.venue) el.appendChild(meta("card-venue", a.venue));
  const partOf = orchestratorAncestors(a);
  if (partOf.length) {
    el.appendChild(relTag("Part of", partOf));
  }
  const combines = childTitles(a);
  if (combines.length) {
    el.appendChild(relTag("Combines", combines));
  }
  if (a.description) {
    const p = document.createElement("p");
    p.className = "card-desc";
    p.textContent = a.description;
    el.appendChild(p);
  }

  if (Array.isArray(a.links) && a.links.length) {
    const links = document.createElement("div");
    links.className = "card-links";
    for (const l of a.links) {
      if (!l || !l.url) continue;
      const link = document.createElement("a");
      link.href = l.url;
      link.textContent = l.label || l.url;
      if (/^https?:/i.test(l.url)) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      links.appendChild(link);
    }
    el.appendChild(links);
  }

  return el;
}

/* ---- small helpers ---- */

// "Part of <a> <b>" style relationship line with each item as a pill.
function relTag(label, items) {
  const p = document.createElement("p");
  p.className = "card-rel";
  p.append(`${label} `);
  for (const item of items) {
    const span = document.createElement("span");
    span.textContent = item;
    p.appendChild(span);
  }
  return p;
}

function meta(cls, text) {
  const p = document.createElement("p");
  p.className = cls;
  p.textContent = text;
  return p;
}

function pill(text) {
  const span = document.createElement("span");
  span.className = "pill";
  span.textContent = text;
  return span;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  if (text) el.textContent = text;
  else el.remove();
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (!el) return;
  if (html) el.innerHTML = html;
  else el.remove();
}

function paragraphs(text) {
  if (!text) return "";
  return String(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
