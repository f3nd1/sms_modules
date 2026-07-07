// =============================================================================
// Worked example: per-row "AI Draft" for the Quality Meeting Minutes Workspace.
//
// This is a HEADLESS AGU_AI config. Unlike the standalone QMR example, AGU_AI
// does NOT render its own card UI here — the Quality Meeting "QMU" client script
// keeps its bespoke Minutes Workspace (card + table + drawer) and just calls
// AGU_AI.draft_row / AGU_AI.ask_and_redraft behind an "AI Draft" button on each
// row. See the INTEGRATION section at the bottom.
//
// Requires TWO Client Scripts enabled on "Quality Meeting":
//   1. templates/agu-ai-draft.js   (the AGU_AI engine — shared, unmodified)
//   2. The QMU client script        (which defines MINUTES_AI_CONFIG below and
//                                     wires the per-row buttons; see INTEGRATION)
//
// Grounding is IN-DOCUMENT: each draft is grounded in this meeting's own Agenda
// (`agenda` child table) via config.grounding.resolve(frm), not an external
// DocType. config.headless = true tells the engine never to fall back to its own
// grounding dialog (which assumes AGU_AI's own rendered UI).
// =============================================================================

const MINUTES_AI_CONFIG = {
    id: "quality_meeting_minutes",
    table: "ucc_minutes",
    headless: true,
    row_noun: "minute",
    row_label: (row) =>
        (String(row.item || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80))
        || "Untitled item",

    // Both fields are (re)written by the model. `item` is returned as simple HTML
    // (the Minutes editor is Quill), `action` as a single plain sentence.
    draft_fields: [
        { fieldname: "item" },
        { fieldname: "action" }
    ],

    grounding: {
        label: "Agenda",
        field_label: "Agenda",
        empty_message:
            "This meeting has no agenda items to ground the draft. Add agenda items " +
            "(or type the discussion note in the Item field) first, then try again.",

        // Allow drafting before the meeting is saved: the agenda is read from the
        // in-memory doc, so a stable-but-present match value is enough for caching.
        match_value: (frm) => frm.doc.name || "unsaved",

        // In-document grounding: build the grounding text from this meeting's own
        // Agenda child table.
        //
        // NOTE: the `agenda` child DocType's exact text fieldname is not confirmed,
        // so this defensively joins every non-empty string field of each agenda row
        // (skipping Frappe meta fields). Once the real agenda-text field is known
        // (e.g. `description` / `agenda_item`), replace the inner map with a single
        // field read for a tighter prompt.
        resolve: (frm) => {
            const rows = frm.doc.agenda || [];
            const skip = new Set([
                "name", "owner", "creation", "modified", "modified_by", "docstatus",
                "idx", "parent", "parentfield", "parenttype", "doctype",
                "__islocal", "__unsaved"
            ]);
            const strip = (v) => String(v == null ? "" : v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

            const lines = rows.map((r, i) => {
                const parts = Object.keys(r)
                    .filter((k) => !skip.has(k) && !k.startsWith("_"))
                    .map((k) => r[k])
                    .filter((v) => typeof v === "string" && strip(v))
                    .map(strip);
                const text = parts.join(" — ");
                return text ? `${i + 1}. ${text}` : "";
            }).filter(Boolean);

            return {
                text: lines.length ? "Agenda items for this meeting:\n" + lines.join("\n") : "",
                name: `Agenda (${rows.length} item${rows.length === 1 ? "" : "s"})`
            };
        }
    },

    // Context passed to the model so it knows which agenda topic this specific row
    // is about, plus the meeting frame.
    context_fields: (frm, row) => {
        const strip = (v) => String(v == null ? "" : v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return {
            department: frm.doc.custom_department,
            series: frm.doc.series,
            meeting_date: frm.doc.eb_date,
            location: frm.doc.custom_meeting_location,
            meeting_focus: frm.doc.custom_highlights,
            current_item: strip(row.item),
            current_action: strip(row.action)
        };
    },

    // No context_gate and no shared_note: minutes have no KPI numbers, so the
    // deterministic ask-before-draft gate stays off. The model may still return
    // {status:"need_input"}, which routes through AGU_AI.ask_and_redraft's reason
    // dialog (the typed reason is passed to the redraft as manual_reason).

    system_prompt(payload) {
        return [
            "You draft one meeting-minute entry for a Quality Meeting at United Ceres College (UCC), a Singapore private education institution preparing for an EduTrust audit.",
            "",
            "You are given: grounding_text (this meeting's AGENDA, the authoritative basis for what was discussed), the meeting context (department, series, date, location, meeting_focus), and this row's current_item / current_action (a rough note from the minute-taker, which may be blank). current_item, when present, tells you which agenda topic THIS entry is about.",
            "",
            "Write two things for this single entry:",
            "- item: a concise minute of the discussion for this topic, as simple HTML (use <p> and, if helpful, a short <ul><li>). 1 to 4 sentences. Factual record of what was discussed/decided.",
            "- action: the follow-up action, as ONE plain-text sentence (no HTML). If genuinely none, write 'No action required.'",
            "",
            "GROUNDING RULES (critical):",
            "- Base the minute on grounding_text (the agenda) and current_item. Do NOT invent decisions, figures, names, dates, or outcomes that are not supported by the agenda or the note.",
            "- If the agenda and current_item together give nothing concrete to write about, do NOT invent content. Refuse instead.",
            "",
            'REFUSAL FORMAT: return {"status":"need_input","question":"one plain question asking for the specific note or agenda detail needed"}.',
            "",
            'WHEN YOU CAN DRAFT, return {"status":"ok","item":"<p>...</p>","action":"..."}.',
            "",
            "STYLE:",
            "- UK British spelling. Never use em dashes.",
            "- Neutral, factual minute-taking voice (past tense, e.g. 'The board reviewed...', 'It was agreed that...').",
            "- Do not restate the meeting date/location inside the item; those are separate fields.",
            "- Terminology: teacher not instructor, Quality Action not corrective action plan, Providers capitalised for third-party service providers.",
            "Return JSON only."
        ].join("\n");
    }

    // selfcheck_prompt intentionally omitted for v1 (add a strict reviewer pass here
    // later if house-style enforcement is needed, as in the QMR example).
};

// =============================================================================
// INTEGRATION — three edits to the QMU ("Quality Meeting UI") client script.
// These are documentation only; apply them in the QMU Client Script itself.
// =============================================================================
//
// (1) TABLE VIEW — in QMU.render_minutes_table(), the last ("Edit") cell:
//
//     <td>
//       <button type="button" class="qmu-btn qmu-btn-mini qmu-btn-ai"
//               data-qmu-min-ai-draft="${r.idx}" title="Draft this minute's Item and Action from the agenda">✨ AI</button>
//       <button type="button" class="qmu-btn qmu-btn-mini" data-qmu-min-open-drawer="${r.idx}">Edit</button>
//     </td>
//
// (2) CARD VIEW — in QMU.render_minutes_cards(), inside .qmu-card-summary-actions
//     (before or after the Remove button):
//
//     <button type="button" class="qmu-btn qmu-btn-mini qmu-btn-ai"
//             data-qmu-min-ai-draft="${r.idx}" title="Draft this minute's Item and Action from the agenda">✨ AI Draft</button>
//
// (3) bind_minutes() — add ONE delegated handler (stopPropagation so a card
//     <summary> does not toggle and a table row dblclick does not fire):
//
//     target.off("click.qmu-min", "[data-qmu-min-ai-draft]");
//     target.on("click.qmu-min", "[data-qmu-min-ai-draft]", async function (e) {
//       e.preventDefault(); e.stopPropagation();
//       if (typeof AGU_AI === "undefined") { frappe.msgprint("AGU_AI engine not loaded. Enable the agu-ai-draft.js Client Script."); return; }
//       const idx = $(this).attr("data-qmu-min-ai-draft");
//       const $b = $(this), label = $b.text();
//       $b.text("Drafting…").prop("disabled", true);
//       try {
//         let r = await AGU_AI.draft_row(frm, MINUTES_AI_CONFIG, idx);
//         if (r && r.status === "need_input") {
//           const row = (frm.doc.ucc_minutes || []).find(x => String(x.idx) === String(idx));
//           r = await AGU_AI.ask_and_redraft(frm, MINUTES_AI_CONFIG, idx, MINUTES_AI_CONFIG.row_label(row || {}), r.question);
//         }
//         if (r === "ok") { QMU.render_minutes(frm); frappe.show_alert({ message: "Drafted. Review, then Save.", indicator: "blue" }); }
//         else if (r === "skipped") { frappe.show_alert({ message: "Skipped.", indicator: "orange" }); }
//       } finally { $b.text(label).prop("disabled", false); }
//     });
//
// (4) Optional CSS accent for the button (add to QMU.inject_css()):
//     ".qmu-btn-ai{border-color:#8295bd;color:#3b4a72}",
//     ".qmu-btn-ai:hover{background:#eef2fb}",
//
// (5) Define MINUTES_AI_CONFIG (above) at the top of the QMU script, and enable
//     agu-ai-draft.js as a second Client Script on Quality Meeting.
// =============================================================================
