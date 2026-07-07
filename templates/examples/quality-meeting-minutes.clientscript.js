// =============================================================================
// Client Script: Quality Meeting — Minutes AI Draft
// DocType: Quality Meeting   Apply To: Form
//
// Adds an "✨ AI Draft" button to every row of the Minutes Workspace (card view
// AND table view). Clicking it drafts that row's Item (HTML) and Action, grounded
// in this meeting's own Agenda. Nothing is auto-saved — review, then Save.
//
// FULLY STANDALONE: a complete Client Script (starts with frappe.ui.form.on) that
// carries its own OpenAI drafting logic. It works entirely off the
// `custom_minutes_metadata` HTML field wrapper — it does NOT reference the QMU
// script's variables and needs NO edit to the QMU script. It watches that field
// for renders (MutationObserver) and injects the buttons after QMU draws the rows.
// =============================================================================

frappe.ui.form.on("Quality Meeting", {
  refresh(frm) {
    MinutesAI.init(frm);
  }
});

const MinutesAI = {
  KEY_SS: "qm_minutes_ai_key",
  MODEL_LS: "qm_minutes_ai_model",
  DEFAULT_MODEL: "gpt-4o-mini",

  // ---------- lifecycle ----------
  init(frm) {
    if (!frm || frm.doctype !== "Quality Meeting") return;
    const w = this.wrapper(frm);
    if (!w.length) return;

    this.setup_observer(frm);
    this.bind(frm);
    // QMU renders the minutes ~250ms after refresh; inject once it has settled,
    // in case the workspace is the active section on load.
    setTimeout(() => { try { this.inject(frm); } catch (e) {} }, 600);
  },

  wrapper(frm) {
    const f = frm.fields_dict.custom_minutes_metadata;
    return f && f.$wrapper ? f.$wrapper : $();
  },

  // Re-inject the buttons whenever QMU repaints the minutes DOM (view switch,
  // filter, add row, draft, section change, etc.). Guarded on the DOM node so we
  // only ever attach one observer to the stable field wrapper.
  setup_observer(frm) {
    const w = this.wrapper(frm);
    if (!w.length || w[0].__minutesai_observed) return;
    w[0].__minutesai_observed = true;

    const self = this;
    const obs = new MutationObserver(() => {
      if (self.__inject_scheduled) return;
      self.__inject_scheduled = true;
      setTimeout(() => {
        self.__inject_scheduled = false;
        try { self.inject(frm); } catch (e) {}
      }, 60);
    });
    obs.observe(w[0], { childList: true, subtree: true });
  },

  // ---------- button injection ----------
  inject(frm) {
    const w = this.wrapper(frm);
    if (!w.length) return;

    // Card view: prepend into the summary action row.
    w.find(".qmu-card[data-idx]").each(function () {
      const idx = $(this).attr("data-idx");
      const actions = $(this).find(".qmu-card-summary-actions").first();
      if (actions.length && !actions.find("[data-minutesai-draft]").length) {
        actions.prepend(
          `<button type="button" class="qmu-card-remove"
                   style="border-color:#8295bd;color:#33406a;background:#eef2fb"
                   data-minutesai-draft="${idx}"
                   title="Draft this minute's Item and Action from the agenda">✨ AI Draft</button>`
        );
      }
    });

    // Table view: prepend into the last (Edit) cell.
    w.find(".qmu-minutes-table tr[data-idx]").each(function () {
      const idx = $(this).attr("data-idx");
      const cell = $(this).find("td").last();
      if (cell.length && !cell.find("[data-minutesai-draft]").length) {
        cell.prepend(
          `<button type="button" class="qmu-btn qmu-btn-mini"
                   style="border-color:#8295bd;color:#33406a;margin-bottom:4px"
                   data-minutesai-draft="${idx}"
                   title="Draft this minute's Item and Action from the agenda">✨ AI</button>`
        );
      }
    });
  },

  // ---------- click handler ----------
  bind(frm) {
    const w = this.wrapper(frm);
    if (!w.length) return;

    w.off("click.minutesai", "[data-minutesai-draft]");
    w.on("click.minutesai", "[data-minutesai-draft]", async function (e) {
      e.preventDefault();
      e.stopPropagation(); // don't toggle the card <summary> or trigger the row dblclick

      const idx = $(this).attr("data-minutesai-draft");
      const $b = $(this);
      const original = $b.html();
      $b.text("Drafting…").prop("disabled", true);

      let restore = true;
      try {
        const r = await MinutesAI.draft_row(frm, idx);
        if (r === "ok") {
          // A re-render rebuilds the rows (and re-injects fresh buttons), so this
          // button instance is discarded — no need to restore it.
          restore = false;
          MinutesAI.refresh_view(frm);
          frappe.show_alert({ message: "Drafted. Review, then Save.", indicator: "blue" });
        } else if (r === "skipped") {
          frappe.show_alert({ message: "Skipped.", indicator: "orange" });
        }
      } catch (err) {
        frappe.msgprint("AI draft failed: " + (err && err.message ? err.message : err));
      } finally {
        if (restore) $b.html(original).prop("disabled", false);
      }
    });
  },

  // Force QMU to repaint the minutes so the drafted Item (Quill) and Action show,
  // by re-triggering the currently active view button — QMU's own handler
  // re-renders from frm.doc. No reference to the QMU object is needed.
  refresh_view(frm) {
    const w = this.wrapper(frm);
    const btn = w.find("#qmu-min-card-view.active, #qmu-min-table-view.active").first();
    if (btn.length) btn.trigger("click");
    else { try { this.inject(frm); } catch (e) {} }
  },

  // ---------- drafting ----------
  async draft_row(frm, idx) {
    const row = (frm.doc.ucc_minutes || []).find((r) => String(r.idx) === String(idx));
    if (!row) return "error";

    const agenda = this.agenda_text(frm);
    if (!agenda) {
      frappe.msgprint(
        "This meeting has no agenda items to ground the draft. Add agenda items " +
        "(or type the discussion note in the Item field) first, then try again."
      );
      return "no-proc";
    }

    const key = await this.get_key();
    if (!key) return "error";

    let out;
    try {
      out = await this.call_openai(key, this.messages(frm, row, agenda, {}));
    } catch (e) {
      if (e.status === 401) {
        this.clear_key();
        frappe.msgprint("OpenAI rejected the key (cleared). Click ✨ AI Draft again to re-enter it.");
        return "error";
      }
      throw e;
    }

    // The model can ask for more detail; collect a note (or draft generic), then redraft.
    if (out && out.status === "need_input") {
      const choice = await this.ask_reason(row, out.question);
      if (choice === null) return "skipped";
      try {
        out = await this.call_openai(key, this.messages(frm, row, agenda, choice));
      } catch (e) {
        if (e.status === 401) { this.clear_key(); frappe.msgprint("OpenAI rejected the key (cleared)."); return "error"; }
        throw e;
      }
      if (out && out.status === "need_input") {
        frappe.msgprint("Still not enough detail to draft this item. Add a note to the Item field and try again.");
        return "skipped";
      }
    }

    if (!out || out.status !== "ok") return "error";

    if (out.item) row.item = String(out.item);
    if (out.action) row.action = String(out.action);
    frm.dirty();
    return "ok";
  },

  // Reason dialog. Resolves to { reason } / { generic:true } / null (skipped).
  ask_reason(row, question) {
    const self = this;
    return new Promise((resolve) => {
      let settled = false;
      const label = self.strip(row.item).slice(0, 60) || ("item #" + row.idx);
      const d = new frappe.ui.Dialog({
        title: "Before drafting: " + label,
        fields: [
          {
            fieldtype: "HTML", fieldname: "q",
            options: `<div style="margin-bottom:10px;color:#1a3b6e;">${frappe.utils.escape_html(question || "Add a note for this item.")}</div>`
          },
          {
            label: "Note / reason", fieldname: "answer", fieldtype: "Small Text",
            description: "A short discussion note. Leave blank and click \"Draft generic\" if there is nothing specific to add."
          }
        ],
        primary_action_label: "Add note and draft",
        secondary_action_label: "Draft generic",
        secondary_action() {
          if (settled) return;
          settled = true;
          d.hide();
          resolve({ generic: true });
        },
        primary_action(values) {
          const answer = String((values && values.answer) || "").trim();
          if (!answer) { frappe.msgprint('Type a note, or click "Draft generic".'); return; }
          settled = true;
          d.hide();
          resolve({ reason: answer });
        }
      });
      d.$wrapper.on("hidden.bs.modal", () => { if (!settled) { settled = true; resolve(null); } });
      d.show();
    });
  },

  // ---------- grounding: this meeting's agenda ----------
  agenda_text(frm) {
    const rows = frm.doc.agenda || [];
    const skip = new Set([
      "name", "owner", "creation", "modified", "modified_by", "docstatus",
      "idx", "parent", "parentfield", "parenttype", "doctype"
    ]);
    const self = this;
    // NOTE: the `agenda` child DocType's real text fieldname is not confirmed, so
    // this joins every non-empty string field of each row. Once known (e.g.
    // `description` / `agenda_item`), replace the inner map with a single read.
    const lines = rows.map((r, i) => {
      const parts = Object.keys(r)
        .filter((k) => !skip.has(k) && k.indexOf("_") !== 0)
        .map((k) => r[k])
        .filter((v) => typeof v === "string" && self.strip(v))
        .map((v) => self.strip(v));
      const text = parts.join(" — ");
      return text ? (i + 1) + ". " + text : "";
    }).filter(Boolean);

    return lines.length ? "Agenda items for this meeting:\n" + lines.join("\n") : "";
  },

  // ---------- prompt ----------
  messages(frm, row, agenda, choice) {
    const system = [
      "You draft one meeting-minute entry for a Quality Meeting at United Ceres College (UCC), a Singapore private education institution preparing for an EduTrust audit.",
      "You are given the meeting AGENDA (authoritative basis for what was discussed), the meeting context, and this row's current note (current_item / current_action, which may be blank). current_item tells you which agenda topic THIS entry is about.",
      "Write two things for this single entry:",
      "- item: a concise minute of the discussion for this topic, as simple HTML (<p>, optionally a short <ul><li>). 1 to 4 sentences.",
      "- action: the follow-up action as ONE plain-text sentence (no HTML). If none, write 'No action required.'",
      "GROUNDING: base the minute on the agenda and current_item. Do NOT invent decisions, figures, names, dates, or outcomes not supported by them.",
      "If generic_mode is false and there is nothing concrete to write, do NOT invent. Refuse instead.",
      'REFUSAL: return {"status":"need_input","question":"one plain question asking for the note needed"}.',
      'OTHERWISE return {"status":"ok","item":"<p>...</p>","action":"..."}.',
      "STYLE: UK British spelling; never use em dashes; neutral minute-taking voice (past tense). Do not restate the meeting date/location in the item. Terminology: teacher not instructor, Quality Action not corrective action plan, Providers capitalised.",
      "generic_mode true: write a brief neutral minute of the topic with NO invented specifics, and never refuse.",
      "Return JSON only."
    ].join("\n");

    const payload = {
      agenda: agenda,
      generic_mode: !!(choice && choice.generic),
      manual_note: choice && choice.reason ? choice.reason : "",
      department: frm.doc.custom_department || "",
      series: frm.doc.series || "",
      meeting_date: frm.doc.eb_date || "",
      location: frm.doc.custom_meeting_location || "",
      meeting_focus: frm.doc.custom_highlights || "",
      current_item: this.strip(row.item),
      current_action: this.strip(row.action)
    };

    return [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload) }
    ];
  },

  // ---------- OpenAI ----------
  async call_openai(key, messages) {
    const model = localStorage.getItem(this.MODEL_LS) || this.DEFAULT_MODEL;
    const body = { model: model, response_format: { type: "json_object" }, messages: messages };
    if (/^(gpt-4o|gpt-4-|gpt-4\.1|gpt-3\.5)/.test(model)) {
      body.temperature = 0.2;
      body.max_tokens = 1500;
    } else {
      body.max_completion_tokens = 2000;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + this.clean_key(key), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      if (res.status === 401) this.clear_key();
      let detail = "";
      try { const j = await res.json(); detail = j.error && j.error.message ? j.error.message : ""; } catch (e) {}
      const err = new Error("OpenAI " + res.status + (detail ? ": " + detail : ""));
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
    if (!content) throw new Error("The model returned an empty response. Try gpt-4o-mini.");
    return JSON.parse(content);
  },

  // ---------- API key (session only, cleared on 401) ----------
  clear_key() {
    window._minutesAiKey = null;
    sessionStorage.removeItem(this.KEY_SS);
  },
  clean_key(v) {
    const invisible = [0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x2060, 0xfeff, 0x00ad]
      .map((c) => String.fromCharCode(c)).join("");
    return String(v || "").replace(new RegExp("[\\s" + invisible + "]+", "g"), "");
  },
  looks_like_openai_key(k) {
    return /^sk-/.test(k || "");
  },
  get_key() {
    const cached = this.clean_key(sessionStorage.getItem(this.KEY_SS));
    if (cached && this.looks_like_openai_key(cached)) { window._minutesAiKey = cached; return Promise.resolve(cached); }
    if (window._minutesAiKey && this.looks_like_openai_key(window._minutesAiKey)) return Promise.resolve(window._minutesAiKey);

    const self = this;
    return new Promise((resolve) => {
      const ask = () => {
        frappe.prompt(
          {
            label: "OpenAI API Key", fieldname: "key", fieldtype: "Text", reqd: 1,
            description: "From platform.openai.com/account/api-keys. Starts with sk-. Kept only for this browser session."
          },
          (v) => {
            const cleaned = self.clean_key(v.key);
            if (!self.looks_like_openai_key(cleaned)) {
              frappe.msgprint({
                title: "That does not look like an OpenAI key",
                message: "OpenAI secret keys start with <b>sk-</b>. Get it from " +
                  '<a href="https://platform.openai.com/account/api-keys" target="_blank">platform.openai.com/account/api-keys</a>.',
                indicator: "red"
              });
              ask();
              return;
            }
            window._minutesAiKey = cleaned;
            sessionStorage.setItem(self.KEY_SS, cleaned);
            resolve(cleaned);
          },
          "Enter API Key"
        );
      };
      ask();
    });
  },

  // ---------- util ----------
  strip(html) {
    return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
};
