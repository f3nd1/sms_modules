// =============================================================================
// AGU_AI — reusable, config-driven per-child-table AI drafting engine
// =============================================================================
//
// This is the generalized form of the "Quality Monitoring Record" inline
// editor + AI draft script: same mechanics, but every DocType-specific detail
// (child table, field names, grounding DocType, prompts, style rules) lives in
// a config object instead of being hardcoded. Attach it to any child table on
// any DocType without rewriting the engine.
//
// -----------------------------------------------------------------------------
// TWO WAYS TO USE IT
// -----------------------------------------------------------------------------
//   A) STANDALONE — same shape as the original QMR script. In refresh():
//        AGU_AI.mount(frm, frm.fields_dict.<html_field>.$wrapper, MY_CONFIG);
//
//   B) COMPOSED WITH AGU (agu-form-template.js) — add an `ai` block to any
//      table_groups entry in AGU.sections[]:
//        { label: "Activities", table: "items", ai: MY_CONFIG_WITHOUT_ID_TABLE }
//      AGU renders the AI card editor above the (still available, collapsible)
//      native grid for that table, matching the "Use the grid below only when
//      raw data editing is needed" pattern.
//
// -----------------------------------------------------------------------------
// MECHANICS PRESERVED FROM THE ORIGINAL SCRIPT (do not weaken these)
// -----------------------------------------------------------------------------
//   - Every draft is grounded in a live-fetched external DocType record
//     (config.grounding). No matching/empty grounding text -> refuses to draft.
//   - Deterministic ask-before-draft gate: any row with both a target and an
//     actual number, and no recorded reason yet, is never drafted silently -
//     the reviewer is asked first, every time, whether the KPI is short, over
//     or exactly met. "Draft generic" is a first-class path, not a fallback.
//   - The API key lives in sessionStorage only (never a form field, never
//     localStorage), is shape-checked (sk-...) before use, and is cleared
//     automatically on a 401 from OpenAI.
//   - Optional two-pass drafting: draft, then a strict self-check pass that
//     can correct the draft before it is applied.
//   - Nothing is ever auto-saved. Every write sets in-memory doc values and
//     calls frm.dirty() only; the human clicks Save.
//   - "Draft all empty" runs sequentially with a live progress dialog
//     (progress bar, per-row result log, Stop button, final summary of what
//     was skipped and why).
//
// Requires an HTML field on the target DocType (standalone) or is invoked by
// agu-form-template.js into a generated slot (composed).
// =============================================================================

const AGU_AI = {
    // ---- shared, cross-config state ----
    KEY_SS: "agu_ai_key",
    _groundingCache: {},

    // =========================================================
    // CONFIG SHAPE (documented here; see templates/README.md and
    // templates/examples/quality-monitoring-record.config.js for a full
    // worked example that reproduces the original QMR script exactly)
    // =========================================================
    //
    // {
    //   id: "unique_id",                 // required in standalone use; namespaces
    //                                     // localStorage settings (model, self-check,
    //                                     // hide-tips) and the on-page CSS/DOM hooks.
    //                                     // In composed use, AGU fills this in from the
    //                                     // section key + table fieldname if omitted.
    //   table: "items",                  // required: child table fieldname
    //   row_label: (row) => row.activity_name || "Untitled",
    //   row_noun: "activity",            // optional, default "record" — used in copy
    //   status_field: "action_status",   // optional: drives header colour class
    //   status_class_map: { "Planned":"planned", "In Progress":"in-progress",
    //                        "Completed":"completed", "Deferred":"deferred" },
    //
    //   fields: [                        // ALL fields shown on the card, in order.
    //     { fieldname:"activity_name", label:"Activity Name", type:"text" },
    //     { type:"section", label:"KPI Results and Evaluation" },   // divider
    //     { fieldname:"kpi_target_value", label:"KPI Target Value", type:"number" },
    //     { fieldname:"kpi_target_desc", label:"KPI Target Description",
    //       type:"textarea", ai:true, only_if_blank:true },
    //     { fieldname:"evaluation_text", label:"Evaluation Text", type:"textarea",
    //       ai:true, icon:"⭐", placeholder:"..." },
    //   ],
    //   // fields marked ai:true AND present in draft_fields are written by the model.
    //
    //   draft_fields: [                  // subset of `fields` the AI actually writes
    //     { fieldname:"kpi_target_desc", only_if_blank:true },   // json_key defaults
    //     { fieldname:"evaluation_text" },                        // to fieldname
    //     { fieldname:"improvement_action" }
    //   ],
    //
    //   grounding: {
    //     doctype: "Quality Procedure",
    //     match_field: "custom_criterion_reference",   // field on the grounding doctype
    //     match_value: (frm) => frm.doc.criterion,       // value to match against it
    //     match_label: (frm) => frm.doc.criterion,       // optional, for messages
    //     text_field: "custom_ppd_text_format",          // authoritative SOP text field
    //     field_label: "Criterion"                        // optional, for error copy
    //   },
    //
    //   context_gate: {                   // optional; omit to disable the gate entirely
    //     target_field: "kpi_target_value",
    //     actual_field: "kpi_actual_value",
    //     uom_field: "uom"                // optional
    //   },
    //
    //   shared_note: {                    // optional but required for context_gate to
    //     field: "overall_note",          // remember "already explained" across redraws
    //     tag: (row) => row.activity_name
    //   },
    //
    //   context_fields: (frm, row) => ({ department: frm.doc.department, ... }),
    //
    //   system_prompt: (payload) => "...",   // required: string or function(payload)
    //   selfcheck_prompt: () => "...",       // optional: enables the self-check pass
    //   empty_test: (row) => !row.evaluation_text || !row.improvement_action, // optional
    //   on_after_draft: (row) => { ... },    // optional hook, e.g. reset a review_status
    //   on_write: (frm) => { ... }           // optional hook, e.g. grid.refresh()
    // }

    // ---- small helpers ----
    strip(html) {
        return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    },
    esc(v) {
        return frappe.utils.escape_html(String(v == null ? "" : v));
    },
    opt(arr, cur) {
        return (arr || []).map((x) => `<option ${x === cur ? "selected" : ""}>${x}</option>`).join("");
    },
    is_legacy_model(model) {
        return /^(gpt-4o|gpt-4-|gpt-4\.1|gpt-3\.5)/.test(model || "");
    },
    model_ls(id) { return `agu_ai_model__${id}`; },
    selfcheck_ls(id) { return `agu_ai_self_check__${id}`; },
    hide_tips_ls(id) { return `agu_ai_hide_tips__${id}`; },
    get_model(id) {
        return localStorage.getItem(this.model_ls(id)) || "gpt-4o-mini";
    },

    // ---- key: prompted once per browser session, shared across all configs,
    // cleared on 401 ----
    clear_key() {
        window._aguAiKey = null;
        sessionStorage.removeItem(this.KEY_SS);
    },
    // See original QMR clean_key() comment: strips real whitespace plus invisible
    // Unicode (zero-width chars, BOM, soft hyphen) that a pasted key can carry and
    // that would otherwise corrupt an Authorization header or cause a silent 401.
    clean_key(v) {
        const invisible = [0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x2060, 0xfeff, 0x00ad]
            .map((code) => String.fromCharCode(code))
            .join("");
        const pattern = new RegExp("[\\s" + invisible + "]+", "g");
        return String(v || "").replace(pattern, "");
    },
    looks_like_openai_key(k) {
        return /^sk-/.test(k || "");
    },
    get_key() {
        const cached = this.clean_key(sessionStorage.getItem(this.KEY_SS));
        if (cached && this.looks_like_openai_key(cached)) {
            window._aguAiKey = cached;
            return Promise.resolve(window._aguAiKey);
        }
        if (window._aguAiKey && this.looks_like_openai_key(window._aguAiKey)) return Promise.resolve(window._aguAiKey);

        const self = this;
        return new Promise((resolve) => {
            const ask = () => {
                frappe.prompt(
                    {
                        label: "OpenAI API Key", fieldname: "key", fieldtype: "Text", reqd: 1,
                        description: "From platform.openai.com/account/api-keys. Starts with sk-. Not a Google, " +
                            "Anthropic or other service's key."
                    },
                    (v) => {
                        const cleaned = self.clean_key(v.key);
                        if (!self.looks_like_openai_key(cleaned)) {
                            frappe.msgprint({
                                title: "That does not look like an OpenAI key",
                                message:
                                    "OpenAI secret keys start with <b>sk-</b>. What you entered starts with \"" +
                                    self.esc(cleaned.slice(0, 6)) +
                                    "\", which looks like it may be from a different service. Get the right key from " +
                                    '<a href="https://platform.openai.com/account/api-keys" target="_blank">platform.openai.com/account/api-keys</a>.',
                                indicator: "red"
                            });
                            ask();
                            return;
                        }
                        window._aguAiKey = cleaned;
                        sessionStorage.setItem(self.KEY_SS, cleaned);
                        resolve(cleaned);
                    },
                    "Enter API Key"
                );
            };
            ask();
        });
    },

    // ---- grounding: resolved from the current doc (config.grounding.resolve)
    // OR fetched live from config.grounding.doctype ----
    async get_grounding(frm, config, match_value, opts) {
        opts = opts || {};
        const cache_key = `${config.id}::${match_value}`;
        if (!opts.refresh && this._groundingCache[cache_key]) return this._groundingCache[cache_key];

        // In-document grounding: derive the text from the current form (e.g. an
        // agenda child table) instead of fetching an external record. When a
        // resolve() is supplied it fully replaces the external fetch below.
        if (typeof config.grounding.resolve === "function") {
            let result = { text: "", name: null };
            try {
                const resolved = config.grounding.resolve(frm, opts) || {};
                result = { text: this.strip(resolved.text || ""), name: resolved.name || null };
            } catch (e) {
                console.warn("grounding.resolve failed:", e.message);
            }
            this._groundingCache[cache_key] = result;
            return result;
        }

        let result = { text: "", name: null };
        try {
            // Only fetch the docname from the list query - a second field can come
            // back blank under field-level permission restrictions even when the
            // record matched, so the text is read via a full document fetch below.
            const list = await frappe.db.get_list(config.grounding.doctype, {
                filters: { [config.grounding.match_field]: match_value },
                fields: ["name"],
                limit: 1
            });
            if (list && list.length) {
                const name = list[0].name;
                const r = await frappe.call({ method: "frappe.client.get", args: { doctype: config.grounding.doctype, name } });
                const doc = r && r.message;
                result = { text: this.strip((doc && doc[config.grounding.text_field]) || ""), name };
            }
        } catch (e) {
            console.warn(`Could not load ${config.grounding.doctype}:`, e.message);
        }
        this._groundingCache[cache_key] = result;
        return result;
    },
    no_grounding_message(config, match_value, proc) {
        // Resolve mode (in-document grounding): no external record to open/create.
        if (typeof config.grounding.resolve === "function") {
            if (config.grounding.empty_message) return config.grounding.empty_message;
            const label = config.grounding.label || "grounding source";
            return `No ${label} available to ground the draft. Add it first, then try again.`;
        }
        const doctype = config.grounding.doctype;
        return proc.name
            ? `The ${doctype} record ${proc.name} was found for "${match_value}", but its text field ` +
              `(${config.grounding.text_field}) is empty. Fill it in on that record.`
            : `No ${doctype} record found matching "${match_value}". Click "Grounding & model" to check or create one.`;
    },

    // ---- scope a shared note field to a single row (optional feature) ----
    scoped_note(frm, config, row) {
        if (!config.shared_note) return "";
        const raw = String(frm.doc[config.shared_note.field] || "");
        if (!raw.trim()) return "";
        const tag = config.shared_note.tag(row);
        const tagRe = /^\[([^\]]+)\]\s*/;
        const mine = [], general = [];
        raw.split("\n").forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            const m = trimmed.match(tagRe);
            if (m) {
                if (tag && m[1].trim() === String(tag).trim()) mine.push(trimmed.replace(tagRe, ""));
            } else {
                general.push(trimmed);
            }
        });
        return general.concat(mine).join("\n");
    },

    // ---- deterministic context gate ----
    has_number(v) {
        return v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v));
    },
    needs_context(frm, config, row) {
        if (!config.context_gate || !config.shared_note) return false;
        const { target_field, actual_field } = config.context_gate;
        if (!this.has_number(row[target_field]) || !this.has_number(row[actual_field])) return false;
        return !String(this.scoped_note(frm, config, row) || "").trim();
    },
    fmt_val(v, uom) {
        if (!this.has_number(v)) return String(v == null ? "" : v);
        const u = uom ? (String(uom).trim() === "%" ? "%" : " " + String(uom).trim()) : "";
        return String(v) + u;
    },
    context_question(config, row) {
        const { target_field, actual_field, uom_field } = config.context_gate;
        const t = Number(row[target_field]), a = Number(row[actual_field]);
        const name = (config.row_label && config.row_label(row)) || `this ${config.row_noun || "record"}`;
        const uom = uom_field ? row[uom_field] : null;
        const av = this.fmt_val(row[actual_field], uom), tv = this.fmt_val(row[target_field], uom);
        if (a === t) {
            return `For "${name}", the actual (${av}) met the target (${tv}). Add any remark you want reflected, ` +
                `or leave blank to draft a standard confirmation.`;
        }
        const dir = a - t < 0 ? "below" : "above";
        const gap = this.fmt_val(Math.abs(a - t), uom);
        return `For "${name}", the actual (${av}) is ${gap} ${dir} the target (${tv}). What caused this difference?`;
    },
    detect_pattern(config, row) {
        if (!config.context_gate) return undefined;
        const { target_field, actual_field } = config.context_gate;
        const t = row[target_field], a = row[actual_field];
        if (a !== null && a !== undefined && a === 0 && t !== null && t !== undefined && t > 0) return "nil";
        if (t !== null && t !== undefined && a !== null && a !== undefined && a < t) return "short";
        return "met";
    },

    // ---- OpenAI ----
    async fetch_models(key) {
        const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${this.clean_key(key)}` }
        });
        if (!res.ok) {
            if (res.status === 401) this.clear_key();
            let detail = "";
            try {
                const err = await res.json();
                detail = err.error && err.error.message ? err.error.message : "";
            } catch (e) {}
            throw new Error(`OpenAI ${res.status}${detail ? ": " + detail : ""}`);
        }
        const data = await res.json();
        return (data.data || [])
            .map((m) => m.id)
            .filter(
                (id) =>
                    (/^gpt-/.test(id) || /^o[0-9]/.test(id)) &&
                    !/audio|realtime|search|transcribe|tts|image|instruct|embedding|moderation/.test(id)
            )
            .sort();
    },
    async call_openai(key, model, messages) {
        const body = { model, response_format: { type: "json_object" }, messages };
        if (this.is_legacy_model(model)) {
            body.temperature = 0.15;
            body.max_tokens = 1500;
        } else {
            body.max_completion_tokens = 4000;
        }
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${this.clean_key(key)}`, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            if (res.status === 401) this.clear_key();
            let detail = "";
            try {
                const err = await res.json();
                detail = err.error && err.error.message ? err.error.message : "";
            } catch (e) {}
            const e = new Error(`OpenAI ${res.status}: ${detail}`);
            e.status = res.status;
            throw e;
        }
        const data = await res.json();
        const content =
            data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
        if (!content) throw new Error("The model returned an empty response. Try gpt-4o-mini.");
        return JSON.parse(content);
    },

    // ---- draft one row (by idx) ----
    async draft_row(frm, config, idx, opts) {
        opts = opts || {};
        const match_value = config.grounding.match_value(frm);
        if (!match_value) {
            if (!opts.silent) frappe.msgprint(`This record has no ${config.grounding.field_label || "grounding value"} set.`);
            return "error";
        }
        const match_label = config.grounding.match_label ? config.grounding.match_label(frm) : match_value;
        const proc = await this.get_grounding(frm, config, match_value);
        if (!proc.text) {
            if (!opts.silent) {
                frappe.msgprint(this.no_grounding_message(config, match_value, proc));
                // The built-in grounding dialog assumes AGU_AI's own rendered UI; when
                // driven headlessly by an external UI there is nothing to render into.
                if (!config.headless) this.open_grounding(frm, config);
            }
            return "no-proc";
        }
        const rows = frm.doc[config.table] || [];
        const row = rows.find((r) => String(r.idx) === String(idx));
        if (!row) return "error";

        // Deterministic gate: ask before spending an API call, unless bypassed by
        // the caller's chosen "generic" path.
        if (!opts.generic && this.needs_context(frm, config, row)) {
            return { status: "need_input", question: this.context_question(config, row) };
        }

        const key = await this.get_key();
        if (!key) return "error";
        const model = this.get_model(config.id);
        const self_check = !!config.selfcheck_prompt && localStorage.getItem(this.selfcheck_ls(config.id)) !== "false";

        const fields_payload = {};
        (config.draft_fields || []).forEach((f) => {
            const blank = !String(row[f.fieldname] || "").trim();
            fields_payload[f.fieldname] = {
                value: f.only_if_blank && blank ? "(none supplied, propose one)" : row[f.fieldname],
                only_if_blank: !!f.only_if_blank,
                needs_draft: f.only_if_blank ? blank : true
            };
        });

        const payload = Object.assign(
            {
                grounding_text: proc.text,
                grounding_label: match_label,
                generic_mode: !!opts.generic,
                pattern: this.detect_pattern(config, row),
                fields: fields_payload,
                shared_note: config.shared_note ? (this.scoped_note(frm, config, row) || "(none provided)") : undefined
            },
            config.context_fields ? config.context_fields(frm, row) : {}
        );
        if (opts.manual_reason) payload.manual_reason = opts.manual_reason;

        const system_prompt = typeof config.system_prompt === "function" ? config.system_prompt(payload) : config.system_prompt;

        let out;
        try {
            out = await this.call_openai(key, model, [
                { role: "system", content: system_prompt },
                { role: "user", content: JSON.stringify(payload) }
            ]);
        } catch (e) {
            if (e.status === 401) {
                if (!opts.silent)
                    frappe.msgprint(
                        "OpenAI rejected the key (401" + (e.message ? ": " + e.message.replace(/^OpenAI 401:\s*/, "") : "") +
                        "). It has been cleared. Click Draft again to re-enter it."
                    );
                return "401";
            }
            if (/Invalid value/.test(e.message || "")) {
                this.clear_key();
                if (!opts.silent)
                    frappe.msgprint(
                        "Your OpenAI key had a stray space or line break in it, which the browser rejects. " +
                        "It has been cleared; click Draft again and re-enter it on one line."
                    );
                return "error";
            }
            if (!opts.silent) frappe.msgprint("AI draft failed: " + e.message);
            return "error";
        }

        if (out.status === "need_input") {
            return { status: "need_input", question: out.question };
        }

        const applied = {};
        (config.draft_fields || []).forEach((f) => {
            const key_name = f.json_key || f.fieldname;
            if (out[key_name] === undefined) return;
            const blank = !String(row[f.fieldname] || "").trim();
            if (f.only_if_blank && !blank) return; // never overwrite a filled-in value
            applied[f.fieldname] = String(out[key_name]).trim();
        });

        if (self_check) {
            try {
                const draft_obj = {};
                (config.draft_fields || []).forEach((f) => {
                    const key_name = f.json_key || f.fieldname;
                    draft_obj[key_name] = applied[f.fieldname] !== undefined ? applied[f.fieldname] : row[f.fieldname];
                });
                const chk = await this.call_openai(key, model, [
                    { role: "system", content: config.selfcheck_prompt() },
                    { role: "user", content: JSON.stringify({ inputs: payload, draft: draft_obj }) }
                ]);
                if (chk && chk.ok === false) {
                    (config.draft_fields || []).forEach((f) => {
                        const key_name = f.json_key || f.fieldname;
                        if (chk[key_name] !== undefined) applied[f.fieldname] = String(chk[key_name]).trim();
                    });
                }
            } catch (e) {
                console.warn("Self-check skipped:", e.message);
            }
        }

        Object.keys(applied).forEach((fieldname) => { row[fieldname] = applied[fieldname]; });
        if (config.on_after_draft) config.on_after_draft(row);
        frm.dirty();
        if (config.on_write) config.on_write(frm);
        return "ok";
    },

    // ---- ask why the KPI differs (or why the model refused), then redraft ----
    // Resolves once this row is settled: "ok" | "error" | "401" | "skipped".
    // Two ways forward: type a reason (appended to shared_note if configured,
    // otherwise passed as a one-off manual_reason), or "Draft generic". Closing
    // the dialog without choosing is a skip, so a bulk run never hangs.
    ask_and_redraft(frm, config, idx, row_name, question, opts) {
        opts = opts || {};
        const self = this;
        return new Promise((resolve) => {
            let settled = false;
            const d = new frappe.ui.Dialog({
                title: "Before drafting: " + (row_name || `${config.row_noun || "record"} #${idx}`),
                fields: [
                    {
                        fieldtype: "HTML", fieldname: "q_html",
                        options: `<div style="margin-bottom:10px;color:#1a3b6e;">${self.esc(question || "Add any reason or remark for this row.")}</div>`
                    },
                    {
                        label: "Reason or remark", fieldname: "answer", fieldtype: "Small Text",
                        description: "A short cause or note. Leave blank and click \"Draft generic\" if there is " +
                            "nothing specific to record."
                    }
                ],
                primary_action_label: "Add reason and draft",
                secondary_action_label: "Draft generic (no specific reason)",
                async secondary_action() {
                    if (settled) return;
                    settled = true;
                    d.hide();
                    resolve(await self.draft_row(frm, config, idx, { silent: opts.silent, generic: true }));
                },
                async primary_action(values) {
                    const answer = String(values.answer || "").trim();
                    if (!answer) {
                        frappe.msgprint('Type a short reason, or click "Draft generic (no specific reason)" below.');
                        return;
                    }
                    settled = true;
                    d.get_primary_btn().prop("disabled", true).text("Drafting...");
                    let manual_reason;
                    if (config.shared_note) {
                        // row_name is the same label config.shared_note.tag(row) would produce
                        // (both derive from config.row_label), so it is reused directly here.
                        const prefix = row_name ? "[" + row_name + "] " : "";
                        const existing = String(frm.doc[config.shared_note.field] || "").trim();
                        const updated = existing ? existing + "\n" + prefix + answer : prefix + answer;
                        await frm.set_value(config.shared_note.field, updated);
                    } else {
                        manual_reason = answer;
                    }
                    d.hide();
                    const r = await self.draft_row(frm, config, idx, { silent: opts.silent, manual_reason });
                    if (r && r.status === "need_input") {
                        resolve(await self.ask_and_redraft(frm, config, idx, row_name, r.question, opts));
                    } else {
                        resolve(r);
                    }
                }
            });
            d.$wrapper.on("hidden.bs.modal", () => { if (!settled) { settled = true; resolve("skipped"); } });
            d.show();
        });
    },

    default_empty_test(config) {
        const required = (config.draft_fields || []).filter((f) => !f.only_if_blank);
        return (row) => required.some((f) => !String(row[f.fieldname] || "").trim());
    },

    async draft_all_empty(frm, config) {
        const self = this;
        const rows = frm.doc[config.table] || [];
        const empty_test = config.empty_test || this.default_empty_test(config);
        const targets = rows.filter(empty_test);
        if (!targets.length) {
            frappe.msgprint(`No empty ${config.row_noun || "record"}s. Nothing to draft.`);
            return;
        }

        const match_value = config.grounding.match_value(frm);
        if (!match_value) { frappe.msgprint(`This record has no ${config.grounding.field_label || "grounding value"} set.`); return; }
        const proc = await this.get_grounding(frm, config, match_value);
        if (!proc.text) {
            frappe.msgprint(this.no_grounding_message(config, match_value, proc));
            if (!config.headless) this.open_grounding(frm, config);
            return;
        }
        const key = await this.get_key();
        if (!key) return;

        const prog = this.progress_dialog(targets.length);
        let drafted = 0;
        const skipped = [];
        let cancelled = false;
        prog.on_cancel(() => { cancelled = true; });
        try {
            for (let i = 0; i < targets.length; i++) {
                if (cancelled) break;
                const row = targets[i];
                const name = (config.row_label && config.row_label(row)) || `#${row.idx}`;
                prog.step(i, name);
                let r = await this.draft_row(frm, config, row.idx, { silent: true });
                if (r && r.status === "need_input") {
                    prog.waiting(name, r.question);
                    r = await this.ask_and_redraft(frm, config, row.idx, name, r.question, { silent: true });
                }
                if (r === "ok") { drafted++; prog.result(name, "ok"); }
                else if (r === "401") { prog.result(name, "401"); break; }
                else if (r === "no-proc") { skipped.push({ a: name, q: "No grounding record set." }); prog.result(name, "no-proc"); break; }
                else if (r === "skipped") { skipped.push({ a: name, q: "Skipped." }); prog.result(name, "skipped"); }
                else { prog.result(name, "error"); }
                await new Promise((x) => setTimeout(x, 300));
            }
        } finally {
            this.render(frm, this._lastWrapper[config.id], config);
            let summary = `Drafted ${drafted} of ${targets.length}${cancelled ? " (stopped early)" : ""}.`;
            if (skipped.length)
                summary +=
                    " <b>Skipped:</b><ul style='margin:6px 0 0;padding-left:18px;'>" +
                    skipped.map((s) => `<li><b>${this.esc(s.a)}:</b> ${this.esc(s.q)}</li>`).join("") +
                    "</ul><div style='margin-top:4px;'>Click <b>Draft</b> on each of those cards to try again.</div>";
            summary += "<div style='margin-top:6px;'>Nothing is saved yet. Review, then Save.</div>";
            prog.finish(summary, skipped.length ? "orange" : "green");
        }
    },

    // ---- live progress dialog for "Draft all empty" ----
    progress_dialog(total) {
        const self = this;
        const d = new frappe.ui.Dialog({ title: "Drafting", size: "large" });
        d.$body.html(`
<div style="font-size:13px;">
  <div style="background:#eef2f8;border-radius:6px;height:12px;overflow:hidden;margin-bottom:4px;">
    <div class="aguai-pbar" style="background:#1a3b6e;height:100%;width:0%;transition:width .3s;"></div>
  </div>
  <div class="aguai-pcount" style="text-align:right;color:#777;font-size:11.5px;margin-bottom:8px;">0 of ${total}</div>
  <div class="aguai-pcurrent" style="margin-bottom:8px;color:#1a3b6e;font-weight:600;">Starting...</div>
  <ol class="aguai-plog" style="margin:0;padding-left:20px;line-height:1.8;max-height:240px;overflow:auto;"></ol>
  <div class="aguai-psummary" style="margin-top:10px;"></div>
</div>`);
        d.$wrapper.find(".modal-header .btn-modal-close, .modal-header .close").hide();
        let onCancel = null;
        d.set_primary_action("Stop", () => {
            if (onCancel) onCancel();
            d.get_primary_btn().prop("disabled", true).text("Stopping...");
        });
        d.show();

        const $bar = d.$body.find(".aguai-pbar");
        const $count = d.$body.find(".aguai-pcount");
        const $current = d.$body.find(".aguai-pcurrent");
        const $log = d.$body.find(".aguai-plog");
        const label = {
            ok: (n) => `<li style="color:#2e7d32;">&#10003; <b>${self.esc(n)}</b> drafted</li>`,
            need_input: (n, q) => `<li style="color:#e65100;">&#9873; <b>${self.esc(n)}</b> needs input: ${self.esc(q || "")}</li>`,
            skipped: (n) => `<li style="color:#8a6d00;">&#8709; <b>${self.esc(n)}</b> skipped</li>`,
            error: (n) => `<li style="color:#c62828;">&#10007; <b>${self.esc(n)}</b> could not be drafted</li>`,
            "no-proc": (n) => `<li style="color:#c62828;">&#10007; <b>${self.esc(n)}</b> stopped: no grounding record set</li>`,
            "401": (n) => `<li style="color:#c62828;">&#10007; <b>${self.esc(n)}</b> stopped: OpenAI rejected the key</li>`
        };

        return {
            step(i, name) {
                $count.text(`${i} of ${total}`);
                $bar.css("width", Math.round((i / total) * 100) + "%");
                $current.html(`Drafting ${i + 1} of ${total}: <span style="font-weight:400;">${self.esc(name || "record")}</span> &nbsp;<span style="color:#999;font-weight:400;">(waiting for the AI...)</span>`);
            },
            waiting(name, question) {
                $current.html(
                    `<span style="color:#e65100;">&#9873; Needs your input for ${self.esc(name || "this record")}:</span> ` +
                    `<span style="font-weight:400;">${self.esc(question || "")}</span>`
                );
            },
            result(name, status, q) {
                const fn = label[status] || label.error;
                $log.append(fn(name, q));
                $log.scrollTop($log[0].scrollHeight);
            },
            on_cancel(fn) { onCancel = fn; },
            finish(summaryHtml, indicator) {
                $bar.css("width", "100%");
                $count.text(`${total} of ${total}`);
                $current.html('<span style="color:#2e7d32;">&#10003; Done. Review the drafts below, then Save the form.</span>');
                const colour = indicator === "orange" ? "#e65100" : "#2e7d32";
                d.$body.find(".aguai-psummary").html(`<div style="border-top:1px solid #e5e9f0;padding-top:8px;color:${colour};">${summaryHtml}</div>`);
                d.get_primary_btn().prop("disabled", false).text("Close").off("click").on("click", () => d.hide());
                d.$wrapper.find(".modal-header .btn-modal-close, .modal-header .close").show();
            }
        };
    },

    // ---- grounding & model dialog ----
    async open_grounding(frm, config) {
        const match_value = config.grounding.match_value(frm);
        if (!match_value) {
            frappe.msgprint(`This record has no ${config.grounding.field_label || "grounding value"} set.`);
            return;
        }
        const self = this;
        const preset = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-5.4", "gpt-5.4-pro"];
        const saved_model = this.get_model(config.id);
        if (!preset.includes(saved_model)) preset.unshift(saved_model);
        const model_options = window._aguAiModels && window._aguAiModels.length ? window._aguAiModels : preset;
        const proc = await this.get_grounding(frm, config, match_value);

        const d = new frappe.ui.Dialog({
            title: "Grounding & model for " + match_value,
            size: "large",
            fields: [
                { label: "Model", fieldname: "model", fieldtype: "Select", options: model_options.join("\n"), default: saved_model },
                { label: "Fetch available models", fieldname: "fetch_models", fieldtype: "Button" },
                config.selfcheck_prompt ? {
                    label: "Self-check pass (reviews and corrects its own draft)",
                    fieldname: "self_check", fieldtype: "Check",
                    default: localStorage.getItem(self.selfcheck_ls(config.id)) !== "false" ? 1 : 0
                } : null,
                { fieldtype: "Section Break", label: `Grounding text (from ${config.grounding.doctype})` },
                {
                    label: proc.name ? `Loaded from ${config.grounding.doctype} ${proc.name}` : `No matching ${config.grounding.doctype} record`,
                    fieldname: "procedure", fieldtype: "Small Text", read_only: 1,
                    default: proc.text || "(none found)"
                },
                { label: "Refresh from " + config.grounding.doctype, fieldname: "refresh_proc", fieldtype: "Button" },
                { label: proc.name ? "Open " + config.grounding.doctype + " record" : "Create " + config.grounding.doctype + " record", fieldname: "open_proc", fieldtype: "Button" }
            ].filter(Boolean),
            primary_action_label: "Save model settings",
            primary_action(values) {
                localStorage.setItem(self.model_ls(config.id), values.model || "gpt-4o-mini");
                if (config.selfcheck_prompt) localStorage.setItem(self.selfcheck_ls(config.id), values.self_check ? "true" : "false");
                d.hide();
                frappe.show_alert({ message: "Model settings saved.", indicator: "green" });
                self.render(frm, self._lastWrapper[config.id], config);
            }
        });

        d.fields_dict.fetch_models.$input.on("click", async () => {
            const key = await self.get_key();
            if (!key) return;
            const $btn = d.fields_dict.fetch_models.$input;
            const orig = $btn.text();
            $btn.text("Fetching...").prop("disabled", true);
            try {
                const list = await self.fetch_models(key);
                if (!list.length) throw new Error("No chat models returned.");
                window._aguAiModels = list;
                d.set_df_property("model", "options", list.join("\n"));
                const cur = d.get_value("model");
                if (!list.includes(cur)) d.set_value("model", list.find((m) => /^gpt-4o-mini/.test(m)) || list[0]);
                frappe.show_alert({ message: `Loaded ${list.length} models.`, indicator: "green" });
            } catch (e) {
                frappe.msgprint("Could not fetch models: " + e.message);
            } finally {
                $btn.text(orig).prop("disabled", false);
            }
        });

        d.fields_dict.refresh_proc.$input.on("click", async () => {
            const $btn = d.fields_dict.refresh_proc.$input;
            const orig = $btn.text();
            $btn.text("Refreshing...").prop("disabled", true);
            try {
                const fresh = await self.get_grounding(frm, config, match_value, { refresh: true });
                d.set_value("procedure", fresh.text || "(none found)");
                d.set_df_property(
                    "procedure", "label",
                    fresh.name ? `Loaded from ${config.grounding.doctype} ${fresh.name}` : `No matching ${config.grounding.doctype} record`
                );
                d.set_df_property("open_proc", "label", fresh.name ? "Open " + config.grounding.doctype + " record" : "Create " + config.grounding.doctype + " record");
                frappe.show_alert({ message: fresh.text ? "Refreshed." : "Still no matching record.", indicator: fresh.text ? "green" : "orange" });
                self.render(frm, self._lastWrapper[config.id], config);
            } finally {
                $btn.text(orig).prop("disabled", false);
            }
        });

        d.fields_dict.open_proc.$input.on("click", () => {
            d.hide();
            const cache_key = `${config.id}::${match_value}`;
            const latest = self._groundingCache[cache_key];
            if (latest && latest.name) {
                frappe.set_route("Form", config.grounding.doctype, latest.name);
            } else {
                frappe.new_doc(config.grounding.doctype, { [config.grounding.match_field]: match_value });
            }
        });

        d.show();
    },

    // ---- plain-English step guide ----
    steps_html(config) {
        const noun = config.row_noun || "record";
        return `
<ol style="margin:0;padding-left:18px;line-height:1.7;font-size:13px;">
  <li><b>Make sure the grounding record exists.</b> The text comes automatically from the
      <b>${this.esc(config.grounding.doctype)}</b> record that matches this document. Click <b>Grounding &amp; model</b>
      to check it is loaded, or to open/create that record if it is missing.</li>
  <li><b>Write the text.</b> Click <b>Draft</b> on any card to fill just that one, or <b>Draft all empty</b>
      to do every ${this.esc(noun)} that is still blank. The first time, it asks for your OpenAI key (kept only for
      this browser session).</li>
  <li><b>Before it drafts, it always asks you first.</b> A box shows the result and asks for the reason or remark.
      Type a short reason and it drafts a concise note grounded in that reason. If there is nothing specific to
      record, click <b>Draft generic</b> and it writes a brief neutral note without inventing anything.</li>
  <li><b>Check, then save.</b> Read what it wrote, edit anything you want, then click <b>Save</b>. Nothing is saved
      until you do.</li>
</ol>`;
    },
    how_to(frm, config) {
        const self = this;
        const hidden = localStorage.getItem(this.hide_tips_ls(config.id)) === "true";
        const d = new frappe.ui.Dialog({
            title: "How to use AI Draft",
            size: "large",
            primary_action_label: hidden ? "Show the blue tip box again" : "Close",
            primary_action() {
                if (hidden) {
                    localStorage.removeItem(self.hide_tips_ls(config.id));
                    if (frm) self.render(frm, self._lastWrapper[config.id], config);
                    frappe.show_alert({ message: "The tip box is back at the top.", indicator: "green" });
                }
                d.hide();
            }
        });
        d.$body.html(this.steps_html(config));
        d.show();
    },
    tips_banner(config) {
        if (localStorage.getItem(this.hide_tips_ls(config.id)) === "true") return "";
        return `
<div class="aguai-tips">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <b style="color:#1a3b6e;">First time here? Three quick steps:</b>
    <button class="aguai-btn" data-hidetips style="margin-left:auto;">Got it, hide this</button>
  </div>
  <ol style="margin:0;padding-left:18px;line-height:1.6;">
    <li><b>Grounding &amp; model</b> (top): confirm the ${this.esc(config.grounding.doctype)} record is loaded.</li>
    <li>Click <b>Draft</b> on a card (or <b>Draft all empty</b>). Before drafting it asks for the reason or remark;
        type a short reason, or choose <b>Draft generic</b>.</li>
    <li>Review the drafted text and <b>Save</b>. Nothing is saved until you do.</li>
  </ol>
  <div style="margin-top:5px;"><a href="#" data-howto style="font-size:12px;">See the full step by step</a></div>
</div>`;
    },

    // ---- field rendering ----
    field_html(field, row) {
        if (field.type === "section") {
            return `<div class="section-h">${this.esc(field.label)}</div>`;
        }
        const wide = field.wide !== undefined ? field.wide : field.type === "textarea";
        const val = row[field.fieldname];
        const icon = field.ai && field.icon ? field.icon + " " : "";
        const label = icon + field.label;
        let input;
        if (field.type === "select") {
            input = `<select class="aguai-input" data-fn="${field.fieldname}" data-idx="${row.idx}">${this.opt(field.options, val)}</select>`;
        } else if (field.type === "textarea") {
            input = `<textarea class="aguai-input" data-fn="${field.fieldname}" data-idx="${row.idx}" placeholder="${this.esc(field.placeholder || "")}">${this.esc(val)}</textarea>`;
        } else if (field.type === "number") {
            input = `<input type="number" step="any" class="aguai-input" data-fn="${field.fieldname}" data-idx="${row.idx}" value="${val ?? ""}">`;
        } else {
            input = `<input class="aguai-input" data-fn="${field.fieldname}" data-idx="${row.idx}" value="${this.esc(val)}">`;
        }
        return `<div class="${wide ? "aguai-field" : "aguai-col aguai-field"}"><label>${this.esc(label)}</label>${input}</div>`;
    },
    card_fields_html(fields, row) {
        let html = "";
        let buffer = [];
        const flush = () => {
            if (buffer.length) {
                html += `<div class="aguai-grid">${buffer.join("")}</div>`;
                buffer = [];
            }
        };
        (fields || []).forEach((f) => {
            if (f.type === "section") { flush(); html += this.field_html(f, row); return; }
            const wide = f.wide !== undefined ? f.wide : f.type === "textarea";
            if (wide) { flush(); html += this.field_html(f, row); }
            else buffer.push(this.field_html(f, row));
        });
        flush();
        return html;
    },
    header_class(config, row) {
        if (!config.status_field) return "";
        const status = row[config.status_field];
        const map = config.status_class_map || {};
        return map[status] ? `aguai-header-${map[status]}` : "";
    },

    // ---- render the inline card editor ----
    async render(frm, wrapper, config) {
        if (!wrapper || !wrapper.length) return;
        this._lastWrapper = this._lastWrapper || {};
        this._lastWrapper[config.id] = wrapper;

        const rows = frm.doc[config.table] || [];
        const match_value = config.grounding.match_value(frm) || "";
        const proc = match_value ? await this.get_grounding(frm, config, match_value) : { text: "", name: null };
        const has_grounding = !!proc.text;
        const noun = config.row_noun || "record";
        const self = this;

        this.inject_css();

        const toolbar = `
<div class="aguai-toolbar">
  <button class="aguai-btn primary" data-draftall title="Fill the AI fields for every ${this.esc(noun)} that is still blank in this table. If one needs more information, it will ask you, one at a time.">Draft all empty</button>
  <button class="aguai-btn" data-grounding title="Check the grounding text and pick the AI model.">Grounding &amp; model</button>
  <button class="aguai-btn" data-howto title="A short step by step, in plain language.">How to use</button>
  <span class="aguai-ground ${has_grounding ? "aguai-ground-ok" : "aguai-ground-no"}"
        title="${match_value ? (has_grounding ? "Loaded from " + this.esc(config.grounding.doctype) + " " + this.esc(proc.name) + "." : this.esc(this.no_grounding_message(config, match_value, proc))) : ""}">
    ${match_value
        ? (has_grounding
            ? "Grounding loaded for " + this.esc(match_value)
            : (proc.name
                ? config.grounding.doctype + " " + this.esc(proc.name) + " has no text (drafting is blocked)"
                : "No " + this.esc(config.grounding.doctype) + " for " + this.esc(match_value) + " (drafting is blocked)"))
        : `No ${this.esc(config.grounding.field_label || "grounding value")} on this record`}
  </span>
  <span class="aguai-muted">Model: ${this.esc(this.get_model(config.id))}</span>
</div>`;

        const banner = this.tips_banner(config);

        if (!rows.length) {
            wrapper.html(banner + toolbar + `<div style="padding:10px;border:1px dashed #ccd5e0;border-radius:6px;background:#fafbfd;color:#7b7b7b;font-size:13px;">No ${this.esc(noun)}s yet.</div>`);
            this.wire(frm, wrapper, config);
            return;
        }

        let html = banner + toolbar;
        rows.forEach((row, i) => {
            const name = (config.row_label && config.row_label(row)) || `${noun} #${i + 1}`;
            html += `
<div class="aguai-card" data-idx="${row.idx}">
  <div class="aguai-header ${this.header_class(config, row)}">
    <span>#${i + 1}. ${this.esc(name)}</span>
    <button class="aguai-draft" data-draft="${row.idx}" title="Let the AI write this ${this.esc(noun)}'s AI fields, grounded in the ${this.esc(config.grounding.doctype)} record. Review before saving.">Draft</button>
  </div>
  <div class="aguai-body">
    ${this.card_fields_html(config.fields, row)}
  </div>
</div>`;
        });

        wrapper.html(html);
        this.wire(frm, wrapper, config);
    },

    inject_css() {
        if (document.getElementById("aguai-css")) return;
        const css = `
<style id="aguai-css">
  .aguai-card{border:1px solid #d8dee9;border-radius:6px;background:#fff;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.04);}
  .aguai-header{background:#f5f7fa;border-radius:6px 6px 0 0;padding:8px 12px;font-weight:600;color:#1a3b6e;font-size:13px;display:flex;align-items:center;gap:8px;}
  .aguai-header-planned{background:#eaf4ff;color:#1a3b6e;}
  .aguai-header-in-progress{background:#fff8e1;color:#8a6d00;}
  .aguai-header-completed{background:#e8f5e9;color:#2e7d32;}
  .aguai-header-deferred{background:#fdecea;color:#c62828;}
  .aguai-body{padding:12px 14px;}
  .aguai-body .section-h{color:#1a3b6e;font-weight:600;margin:12px 0 6px;font-size:13px;}
  .aguai-grid{display:flex;flex-wrap:wrap;gap:10px;}
  .aguai-col{flex:1 1 300px;min-width:250px;}
  .aguai-field{margin-bottom:10px;}
  .aguai-field label{display:block;font-weight:500;font-size:12px;color:#1a3b6e;margin-bottom:2px;}
  .aguai-input,textarea.aguai-input,select.aguai-input{width:100%;border:1px solid #ccd5e0;border-radius:4px;padding:6px;font-size:12.5px;background:#fff;}
  textarea.aguai-input{min-height:60px;resize:vertical;}
  .aguai-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#fff;border:1px solid #d8dee9;border-radius:6px;padding:8px 10px;margin-bottom:10px;}
  .aguai-btn{border:1px solid #1a3b6e;color:#1a3b6e;background:#fff;border-radius:4px;padding:5px 10px;font-size:12px;cursor:pointer;}
  .aguai-btn:hover{background:#eef2f8;}
  .aguai-btn.primary{background:#1a3b6e;color:#fff;}
  .aguai-draft{margin-left:auto;border:1px solid #1a3b6e;color:#1a3b6e;background:#fff;border-radius:4px;padding:3px 10px;font-size:11.5px;cursor:pointer;white-space:nowrap;}
  .aguai-draft:hover{background:#eef2f8;}
  .aguai-ground{font-size:12px;padding:2px 9px;border-radius:8px;}
  .aguai-ground-ok{background:#e8f5e9;color:#2e7d32;}
  .aguai-ground-no{background:#fff3e0;color:#e65100;}
  .aguai-muted{color:#777;font-size:12px;}
  .aguai-tips{background:#eef4ff;border:1px solid #c5d2ea;border-radius:6px;padding:10px 12px;margin-bottom:10px;font-size:12.5px;color:#24303f;}
</style>`;
        document.head.insertAdjacentHTML("beforeend", css);
    },

    // ---- attach handlers once per render (off then on, no stacking) ----
    wire(frm, wrapper, config) {
        const self = this;
        const getRow = (idx) => (frm.doc[config.table] || []).find((r) => String(r.idx) === String(idx));

        // Commit on "input" (every keystroke), not just "change", so an async
        // re-render triggered elsewhere while mid-edit never reverts an
        // uncommitted keystroke.
        wrapper.off("input.aguai change.aguai").on("input.aguai change.aguai", "input, select, textarea", function () {
            const idx = $(this).data("idx"), fn = $(this).data("fn");
            const row = getRow(idx);
            if (!row || !fn) return;
            let val = $(this).val();
            const field_def = (config.fields || []).find((f) => f.fieldname === fn);
            if (field_def && field_def.type === "number") {
                val = val === "" ? null : parseFloat(val);
                if (typeof val === "number" && Number.isNaN(val)) return;
            }
            row[fn] = val;
            frm.dirty();
            if (config.on_write) config.on_write(frm);
        });

        wrapper.off("click.aguai").on("click.aguai", "[data-draft],[data-draftall],[data-grounding],[data-howto],[data-hidetips]", async function (e) {
            const $b = $(this);
            if ($b.is("[data-howto]")) { e.preventDefault(); self.how_to(frm, config); return; }
            if ($b.is("[data-hidetips]")) { localStorage.setItem(self.hide_tips_ls(config.id), "true"); self.render(frm, wrapper, config); return; }
            if ($b.is("[data-grounding]")) { self.open_grounding(frm, config); return; }
            if ($b.is("[data-draftall]")) { self.draft_all_empty(frm, config); return; }
            const idx = $b.data("draft");
            const label = $b.text();
            $b.text("Drafting...").prop("disabled", true);
            try {
                let r = await self.draft_row(frm, config, idx);
                if (r && r.status === "need_input") {
                    const row = getRow(idx);
                    const name = row && config.row_label ? config.row_label(row) : null;
                    $b.text("Needs input...");
                    r = await self.ask_and_redraft(frm, config, idx, name, r.question);
                }
                if (r === "ok") { self.render(frm, wrapper, config); frappe.show_alert({ message: "Drafted. Review, then Save.", indicator: "blue" }); }
                else if (r === "skipped") { frappe.show_alert({ message: "Skipped.", indicator: "orange" }); }
            } finally {
                $b.text(label).prop("disabled", false);
            }
        });
    },

    // ---- public entry point ----
    mount(frm, wrapper, config) {
        if (!config || !config.id || !config.table) {
            console.error("AGU_AI.mount: config.id and config.table are required.", config);
            return;
        }
        if (!config.grounding || typeof config.grounding.match_value !== "function") {
            console.error("AGU_AI.mount: config.grounding.match_value(frm) is required.", config);
            return;
        }
        if (!config.system_prompt) {
            console.error("AGU_AI.mount: config.system_prompt is required.", config);
            return;
        }
        this.render(frm, wrapper, config);
    }
};
