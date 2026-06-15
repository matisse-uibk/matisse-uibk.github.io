# matisse-uibk.github.io

Website for the **University of Innsbruck** team's artifacts within the
[MATISSE](https://matisse-kdt.eu) Chips JU project.

Live at: <https://matisse-uibk.github.io/>

## How it works

Plain static HTML/CSS — no build step. The entire site is driven by one data
file, so you can update content without touching HTML.

| File             | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `index.html`     | Page structure (rarely needs editing)              |
| `style.css`      | Styling                                            |
| `app.js`         | Renders `artifacts.json` into cards + builds the diagram |
| `artifacts.json` | **Edit this** — the single source of truth for everything |
| `assets/`        | Logos, images, PDFs                                |

## Adding an artifact

Open `artifacts.json` and add an object to the `"artifacts"` array:

```json
{
  "id": "MYTOOL",
  "title": "My Tool",
  "type": "tool",
  "subtitle": "What it does, in a few words",
  "description": "One or two sentences.",
  "uses": ["M_SOME_MODEL"],
  "links": [
    { "label": "GitHub", "url": "https://github.com/..." },
    { "label": "Paper", "url": "https://doi.org/..." }
  ]
}
```

- `id` is the node id used in the diagram and as the card anchor. Keep it short
  and unique (e.g. `T2C`, `KPIROB`, `M_KPI`).
- `type` is one of: `orchestrator` (Exploitable Results), `tool`, `model`,
  `publication`, `software`, `dataset`, `presentation`. It sets the card badge
  and the diagram node color.
  (To add a new type, add it to `TYPE_LABELS` in `app.js`, a `.badge-<type>`
  rule in `style.css`, and — if it should appear in the diagram — a tier in
  `TIER_STYLE` in `index.html`.)
- **`uses`** is the one place relationships live: a list of the `id`s this
  artifact builds on (its children). It draws the diagram arrows
  (`this --> child`), and the cards **derive** their labels from it — "Part of"
  (the orchestrator reached by walking `uses` upward) and "Combines" (the
  direct children). There is no separate `partOf` field; don't add one.
- `subtitle`, `uses`, `links`, `authors`, `venue` are all optional. A node can
  have any number of `links` (or none — orchestrators are often just a
  composition of other tools).
- Artifacts are sorted newest-first by `year`. Filter buttons appear
  automatically for whichever types are present.

Project-level text (tagline, about, funding notice, contact email, grant
number, dates) lives in the `"project"` block at the top of `artifacts.json`.
Empty `""` fields are simply hidden.

## The "Artifacts at a glance" diagram

The overview diagram is **generated from `artifacts.json`** at runtime — there
is no separate diagram file. The `buildDiagram()` function in `index.html`
turns the artifacts into a [Mermaid](https://mermaid.js.org/) flowchart:

- one node per artifact (`id` + `title` + optional `subtitle`),
- node color from `type` (blue = exploitable results, gold = tools, white =
  models; defined in `TIER_STYLE` in `index.html`),
- one arrow per `uses` entry,
- a click on each node that jumps to its card.

So to change the diagram you only edit `artifacts.json` (`uses` for arrows,
`type` for colors). Mermaid and the pan/zoom library load from a CDN, so there
is still no build step.

## Preview locally

Browsers block `fetch()` on `file://`, so serve over HTTP:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Push to `main`. In the repo's **Settings → Pages**, set the source to
**Deploy from a branch** → `main` / `/ (root)`. GitHub publishes it within a
minute or two. The `.nojekyll` file disables Jekyll processing.
