# AGU Form UI Template

`agu-form-template.js` is the canonical reference for taking over a Frappe
DocType form with a custom single-field UI (hero header + sticky side-nav +
grouped field panels + switchable child-table grids). It is the pattern used by
the **Agent** DocType and should be the starting point for any other DocType
that needs the same look.

## The core idea

`custom_html_render` (an HTML field) becomes the **only** visible field. The
`AGU` object hides every native section and **relocates the live Frappe controls**
into custom slots — it does not rebuild inputs — so validation, link fields,
child-table grids, and all doctype events keep working exactly as Frappe intends.

## Install (per DocType)

1. Add an **HTML field** named `custom_html_render` to the DocType.
2. Create a **Client Script** (Apply To: Form) targeting that DocType and paste
   the adapted template.

## The seams that change per DocType

| Seam | What to change |
|------|----------------|
| `frappe.ui.form.on("Agent", …)` | Target DocType name |
| `AGU.html_fieldname` | The HTML host field (default `custom_html_render`) |
| `AGU.sections[]` | The whole layout map: nav items + field groups + table groups |
| `AGU.native_date_fields` | Date fields rendered as raw `<input type="date">` |
| Hero `fact()` tiles in `render()` | The six top-right summary stats |
| `validate()` | Per-DocType required-field rules |

## Section config shape

```js
{
    key: "details",                 // unique id (side-nav + state)
    title: "1. Agent Details",      // panel heading + nav label
    nav_note: "Identity and status",// grey subtitle in the side-nav
    subtitle: "…",                  // panel description line
    groups: [                       // grouped scalar fields
        { label: "Agent Identity", fields: ["status", "agent_or_company_name", …] }
    ],
    table_groups: [                 // child tables (switchable tabs if >1)
        { label: "Commission Table", table: "registration", collapsed: false }
    ]
}
```

## Mechanics to preserve when adapting

- **Move + restore, never re-create.** `embed_fields()` moves `field.$wrapper`
  into `[data-agu-slot]`; `restore_fields()` returns it to its original DOM spot
  (recorded in `__agu_moved`) before each re-render.
- **Nothing disappears.** `append_unmapped_fields()` sweeps `frm.fields_dict`
  and appends any real field missing from the config into **Internal → "Other
  Fields"** (logged via `console.warn`). Update `unmapped_excluded_fieldnames`
  for fields you deliberately want to drop.
- **Chrome suppression.** `hide_original_sections`, `close_erpnext_sidebar`,
  `hide_frappe_connections`.
- **Table UX.** Per-section active-table memory (`__agu_table`), collapse memory
  (`__agu_collapsed_tables`), and the "Hide/Show Table" pattern; grid is moved
  into `.agu-grid-slot` then `grid.refresh()`.
- **Grid-row modal + save safety.** CSS promotes `.grid-row-open` into a fixed
  centered modal with backdrop; outside-click dispatches `Escape`; `before_save`
  closes open rows; **re-render is blocked while a row is open**.
- **State** lives on `frm.__agu_*` and lifecycle runs on `refresh → init`
  (250 ms) and `after_save → init` (150 ms).

## Accent palette

- Gold accent: `#ce9e5d`
- Slate accent: `#8295bd`
- Card border: `#B8B8B8`
- Everything else uses Frappe theme vars (`--text-color`, `--border-color`, …)
  so it follows light/dark.

---

# AGU_AI — AI Drafting Module

`agu-ai-draft.js` is the canonical reference for adding governed, grounded AI
drafting to a child table's fields — the pattern originally built for the
**Quality Monitoring Record** DocType (per-activity KPI evaluation and
improvement-action drafting). It is a **separate, composable module**: it
does not lay out a form, it drives one child table's card editor and the AI
calls behind it. Use it standalone (own DocType, own HTML field) or attach it
to a `table_groups` entry inside `agu-form-template.js`'s `AGU.sections[]`.

## The core idea

Every draft is grounded in a live-fetched record from another DocType (the
"grounding" record — e.g. an SOP/procedure). If no grounding text is found,
it refuses to draft, full stop. Before drafting any row that has both a
target and an actual number, it stops and asks the reviewer for the reason —
every time, whether the number is short, over, or exactly on target — unless
the reviewer explicitly chooses "Draft generic". Nothing is ever auto-saved;
every write only sets in-memory values and calls `frm.dirty()`.

## Install — standalone (own DocType)

1. Add an **HTML field** to the DocType (any fieldname).
2. Enable **two** Client Scripts on that DocType: `agu-ai-draft.js` (the
   engine, shared and unmodified across DocTypes) and your own config script
   that calls `AGU_AI.mount(frm, wrapper, MY_CONFIG)` in `refresh()`.
3. See `templates/examples/quality-monitoring-record.config.js` for a full
   worked example that reproduces the original QMR script exactly.

## Install — composed with AGU (inside a form-takeover layout)

Add an `ai` block to any `table_groups` entry in an `AGU.sections[]` config
(from `agu-form-template.js`):

```js
table_groups: [
    { label: "Training Log", table: "training_log", ai: MY_AI_CONFIG }
]
```

`AGU.mount_ai_tables()` renders the AI card editor above the table's native
grid, and defaults that grid to **collapsed** (raw-edit fallback, revealed
with the existing "Show Table" button) since the AI editor is now the
primary way to work with that table. Both scripts (`agu-form-template.js`
and `agu-ai-draft.js`) must be enabled on the DocType; `id`/`table` in the
`ai` config are filled in automatically from the section/table if omitted.

## Config shape

```js
{
    id: "qmr_items",                 // unique id: namespaces model/self-check/
                                      // tips settings in localStorage. Auto-filled
                                      // when composed with AGU.
    table: "items",                  // child table fieldname. Auto-filled when
                                      // composed with AGU.
    row_noun: "activity",            // optional, used in generated copy
    row_label: (row) => row.activity_name || "Untitled",

    status_field: "action_status",   // optional: drives the card header colour
    status_class_map: { "Planned": "planned", "Completed": "completed", … },

    fields: [                        // every field shown on the card, in order
        { fieldname: "activity_name", label: "Activity Name", type: "text" },
        { type: "section", label: "KPI Results and Evaluation" },   // divider
        { fieldname: "kpi_target_value", label: "KPI Target Value", type: "number" },
        { fieldname: "evaluation_text", label: "Evaluation Text", type: "textarea",
          ai: true, icon: "⭐", placeholder: "…" }
    ],                                // types: text | number | select | textarea | section

    draft_fields: [                  // subset of `fields` the AI writes
        { fieldname: "kpi_target_desc", only_if_blank: true },  // never overwrites a filled value
        { fieldname: "evaluation_text" },
        { fieldname: "improvement_action" }
    ],

    grounding: {
        doctype: "Quality Procedure",
        match_field: "custom_criterion_reference",  // field on the grounding doctype
        match_value: (frm) => frm.doc.criterion,       // value to match against it
        match_label: (frm) => frm.doc.criterion,       // optional, for messages
        text_field: "custom_ppd_text_format",          // authoritative SOP text field
        field_label: "Criterion"                        // optional, for error copy
    },

    context_gate: {                   // optional; omit to disable the ask-before-draft gate
        target_field: "kpi_target_value",
        actual_field: "kpi_actual_value",
        uom_field: "uom"
    },

    shared_note: {                    // optional but required for the gate to remember
        field: "overall_note",        // "already explained" across redraws
        tag: (row) => row.activity_name
    },

    context_fields: (frm, row) => ({ department: frm.doc.department, … }),

    system_prompt: (payload) => "…",   // required: string or function(payload)
    selfcheck_prompt: () => "…",       // optional: enables the self-check pass
    empty_test: (row) => !row.evaluation_text,  // optional override for "Draft all empty"
    on_after_draft: (row) => { … },    // optional, e.g. reset a review_status field
    on_write: (frm) => { … }           // optional, e.g. refresh a co-visible chart
}
```

## Mechanics to preserve when adapting

- **Grounding refusal is absolute.** No matching/empty grounding text means it
  will not draft — single row, per-card, or bulk.
- **Deterministic ask-before-draft gate**, not a model judgement call: any row
  with both `context_gate.target_field` and `actual_field` numbers and no
  recorded reason yet (via `shared_note`) is always paused for reviewer input
  first, whether the number is short, over, or exactly on target. "Draft
  generic" is a first-class path, never a fallback the model invents on its
  own.
- **API key**: `sessionStorage` only, shape-checked (`sk-…`) before use,
  cleared automatically on a 401, shared across all AGU_AI configs in the
  browser session (model choice and self-check toggle are namespaced per
  `id` instead).
- **`only_if_blank` draft fields are never overwritten** once filled — checked
  both before sending the payload and again before applying the response.
- **Self-check pass** (only if `selfcheck_prompt` is provided) reviews and can
  silently correct the first draft before it is applied.
- **"Draft all empty"** runs sequentially through a live progress dialog
  (progress bar, per-row result log, Stop button, final skipped-with-reasons
  summary) — pre-flight checks (grounding, key) run before the dialog opens
  so failures never hide behind an overlay.
- **Never auto-saves.** Every successful draft only mutates `frm.doc` and
  calls `frm.dirty()`; the human clicks Save.
