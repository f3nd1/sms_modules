// =============================================================================
// Worked example: reproduces the original "Quality Monitoring Record - Inline
// Editor with AI Draft" client script exactly, using the generalized AGU_AI
// engine (templates/agu-ai-draft.js) instead of hardcoded field names.
//
// Requires TWO Client Scripts enabled on "Quality Monitoring Record":
//   1. templates/agu-ai-draft.js  (the AGU_AI engine — shared across DocTypes)
//   2. This file                  (the config for this DocType)
// =============================================================================

frappe.ui.form.on("Quality Monitoring Record", {
    refresh(frm) {
        if (!frm.doc.name) return;
        if (!frm.fields_dict.qmr_inline_editor) {
            frm.add_custom_field({ fieldtype: "HTML", fieldname: "qmr_inline_editor", label: "Inline Editor" });
        }
        AGU_AI.mount(frm, frm.fields_dict.qmr_inline_editor.$wrapper, QMR_AI_CONFIG);
    }
});

const QMR_AI_CONFIG = {
    id: "qmr_items",
    table: "items",
    row_noun: "activity",
    row_label: (row) => row.activity_name || "Untitled Activity",
    status_field: "action_status",
    status_class_map: {
        Planned: "planned",
        "In Progress": "in-progress",
        Completed: "completed",
        Deferred: "deferred"
    },

    fields: [
        { fieldname: "activity_name", label: "Activity Name", type: "text" },
        { fieldname: "feedback_source", label: "Feedback Source", type: "text" },
        { fieldname: "frequency", label: "Frequency", type: "select",
          options: ["Monthly", "Quarterly", "Annually", "Biannual", "Biennially", "Each Semester"] },
        { fieldname: "timing", label: "Timing", type: "select",
          options: ["Department Meeting", "Management Review", "Quarterly Review", "Annual Audit"] },
        { fieldname: "ownership", label: "Ownership", type: "text" },
        { fieldname: "kpi_metric", label: "KPI Metric", type: "text" },

        { type: "section", label: "KPI Results and Evaluation" },
        { fieldname: "kpi_target_value", label: "KPI Target Value", type: "number" },
        { fieldname: "kpi_actual_value", label: "KPI Actual Value", type: "number" },
        { fieldname: "uom", label: "KPI UOM", type: "text" },
        { fieldname: "action_status", label: "Action Status", type: "select",
          options: ["Planned", "In Progress", "Completed", "Deferred"] },

        { fieldname: "kpi_target_desc", label: "KPI Target Description", type: "textarea",
          wide: true, ai: true, only_if_blank: true },
        { fieldname: "evaluation_text", label: "Evaluation Text", type: "textarea", wide: true, ai: true,
          icon: "⭐",
          placeholder: "Describe results, trends, and analysis, grounded in the procedure and numbers..." },
        { fieldname: "improvement_action", label: "Improvement Action", type: "textarea", wide: true, ai: true,
          icon: "🔧",
          placeholder: "Maintain... or a Quality Action if below target..." }
    ],

    // Subset of `fields` above that the AI actually writes. json_key defaults
    // to fieldname, so the system_prompt below can just use these names.
    draft_fields: [
        { fieldname: "kpi_target_desc", only_if_blank: true },
        { fieldname: "evaluation_text" },
        { fieldname: "improvement_action" }
    ],

    grounding: {
        doctype: "Quality Procedure",
        match_field: "custom_criterion_reference",
        match_value: (frm) => frm.doc.criterion,
        match_label: (frm) => frm.doc.criterion,
        text_field: "custom_ppd_text_format",
        field_label: "Criterion"
    },

    // Deterministic ask-before-draft gate. Fires for any activity with both a
    // target and an actual number and no explanation recorded yet for it -
    // whether the KPI is short, over, or exactly met.
    context_gate: {
        target_field: "kpi_target_value",
        actual_field: "kpi_actual_value",
        uom_field: "uom"
    },

    // The DocType has one record-level note; AGU_AI tags each activity's
    // answer as "[Activity Name] ..." and only ever shows an activity its own
    // tagged lines plus any untagged (record-wide) lines.
    shared_note: {
        field: "overall_note",
        tag: (row) => row.activity_name
    },

    context_fields: (frm, row) => ({
        criterion: frm.doc.criterion,
        department: frm.doc.department,
        period: (frm.doc.period_from || "") + " to " + (frm.doc.period_to || ""),
        activity_name: row.activity_name,
        feedback_source: row.feedback_source,
        kpi_metric: row.kpi_metric,
        ownership: row.ownership
    }),

    system_prompt(payload) {
        return [
            "You draft KPI Target Description (only if it is blank), Evaluation Text and Improvement Action for a Quality Monitoring Record activity at United Ceres College (UCC), a Singapore private education institution preparing for an EduTrust audit.",
            "",
            "You are given, in priority order: grounding_text (how UCC does it, authoritative for steps and evidence), the activity details in this payload, the KPI target and actual (see payload.fields for target/actual descriptions and payload.kpi_target_value/kpi_actual_value passed via context_fields where applicable), and shared_note, whatever explanation exists specifically for this activity plus any general remarks not tied to one activity.",
            "",
            "GROUNDING RULES (critical):",
            "- Your draft must be consistent with grounding_text: reference its actual steps, evidence types and responsibilities. Do not describe generic controls it does not mention.",
            "- Every specific claim must be supported by the KPI actual or shared_note / manual_reason. Do not invent events, numbers, dates, names or evidence.",
            "- When generic_mode is false and there is no explanation for the variance, do not invent a cause. Refuse instead.",
            "",
            'REFUSAL FORMAT: return {"status":"need_input","missing":["..."],"question":"one plain question asking for the specific fact needed"}.',
            "",
            'WHEN YOU CAN DRAFT, return {"status":"ok","evaluation_text":"...","improvement_action":"...","kpi_target_desc":"include only if fields.kpi_target_desc.needs_draft is true, otherwise omit"}.',
            "",
            "BE CONCISE. The KPI target and actual values already appear in their own fields on the form. Do NOT restate both raw numbers. Summarise the direction and size of the gap and its cause instead.",
            "",
            "STYLE:",
            "- UK British spelling. Never use em dashes.",
            "- Evaluation Text: 1 to 2 short sentences, factual, grounded in grounding_text and the recorded reason.",
            "- Target met exactly: one sentence confirming it was met, citing the procedure's evidence type.",
            "- Below or above target: state the gap and the cause concisely. Never write a fully positive narrative over a shortfall unless the note explains why it is not a concern.",
            "- Improvement Action: 1 sentence. Maintain current controls when the target was met or the note confirms the variance is benign; otherwise a specific Quality Action with owner and deadline.",
            "- generic_mode true: write a brief, neutral statement of the result against target with NO invented cause. Never refuse in generic_mode.",
            "- Terminology: teacher not instructor, Quality Action not corrective action plan, SQ for Strategic and Quality Management, Providers capitalised.",
            "Return JSON only."
        ].join("\n");
    },

    selfcheck_prompt() {
        return [
            "You are a strict reviewer of a Quality Monitoring evaluation for UCC.",
            "Check the DRAFT against these rules and the inputs:",
            "1. UK British spelling, no em dashes.",
            "2. Every factual claim is supported by the KPI actual or the note. No invented events, numbers, names or dates. In generic_mode there must be NO invented cause at all.",
            "3. Concise: the raw target and actual numbers are not restated verbatim.",
            "4. A shortfall is acknowledged plainly, not glossed over as benign, unless the note explains why it is not a concern.",
            "5. The evaluation reflects this activity and grounding_text.",
            "6. Improvement Action uses Maintain only when the target was met or the note confirms the variance is benign; otherwise a specific Quality Action with owner and deadline.",
            "7. No placeholder [...] text.",
            'If all pass return {"ok":true}. If any fail return {"ok":false,"evaluation_text":"corrected","improvement_action":"corrected"}.',
            "Return JSON only."
        ].join("\n");
    },

    on_after_draft(row) {
        if (row.review_status === "Reviewed") row.review_status = "Under Review";
    }
};
