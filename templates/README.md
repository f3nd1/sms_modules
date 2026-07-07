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
