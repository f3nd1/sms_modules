// =============================================================================
// Client Script: Quality Meeting — Minutes AI Draft
// DocType: Quality Meeting   Apply To: Form
//
// Adds an "✨ AI Draft" button to every row of the Minutes Workspace (card view
// AND table view). Clicking it opens a DRAFT BOX where you type the raw points
// for the Item and Action; the AI rewrites them into formal minute style. It only
// formats what you type — it never invents facts, names, figures, owners or
// deadlines. Nothing is auto-saved — review, then Save.
//
// Each Item is seeded (via "Copy Agenda to Minutes") with the agenda title in
// BOLD. That bold heading is PRESERVED: the AI writes only the discussion body
// underneath it, never replacing or repeating the title.
//
// FULLY STANDALONE: a complete Client Script (starts with frappe.ui.form.on) that
// carries its own OpenAI logic. It works entirely off the custom_minutes_metadata
// HTML field wrapper — no reference to the QMU script's variables, no edit to it.
// A MutationObserver re-injects the buttons after every QMU repaint.
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
    setTimeout(() => { try { this.inject(frm); } catch (e) {} }, 600);
  },

  wrapper(frm) {
    const f = frm.fields_dict.custom_minutes_metadata;
    return f && f.$wrapper ? f.$wrapper : $();
  },

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

    w.find(".qmu-card[data-idx]").each(function () {
      const idx = $(this).attr("data-idx");
      const actions = $(this).find(".qmu-card-summary-actions").first();
      if (actions.length && !actions.find("[data-minutesai-draft]").length) {
        actions.prepend(
          `<button type="button" class="qmu-card-remove"
                   style="border-color:#8295bd;color:#33406a;background:#eef2fb"
                   data-minutesai-draft="${idx}"
                   title="Draft this minute's Item and Action from your notes">✨ AI Draft</button>`
        );
      }
    });

    w.find(".qmu-minutes-table tr[data-idx]").each(function () {
      const idx = $(this).attr("data-idx");
      const cell = $(this).find("td").last();
      if (cell.length && !cell.find("[data-minutesai-draft]").length) {
        cell.prepend(
          `<button type="button" class="qmu-btn qmu-btn-mini"
                   style="border-color:#8295bd;color:#33406a;margin-bottom:4px"
                   data-minutesai-draft="${idx}"
                   title="Draft this minute's Item and Action from your notes">✨ AI</button>`
        );
      }
    });
  },

  // ---------- click handler → open the draft box ----------
  bind(frm) {
    const w = this.wrapper(frm);
    if (!w.length) return;

    w.off("click.minutesai", "[data-minutesai-draft]");
    w.on("click.minutesai", "[data-minutesai-draft]", function (e) {
      e.preventDefault();
      e.stopPropagation(); // don't toggle the card <summary> or trigger the row dblclick
      const idx = $(this).attr("data-minutesai-draft");
      MinutesAI.open_draft_dialog(frm, idx);
    });
  },

  // Re-trigger the active view button so QMU repaints from frm.doc after a draft.
  refresh_view(frm) {
    const w = this.wrapper(frm);
    const btn = w.find("#qmu-min-card-view.active, #qmu-min-table-view.active").first();
    if (btn.length) btn.trigger("click");
    else { try { this.inject(frm); } catch (e) {} }
  },

  // Split the Item into its bold agenda heading (copied from the Agenda) and the
  // rest. The heading is PRESERVED verbatim; the AI only writes the body below it.
  split_item_heading(item_html) {
    try {
      const div = document.createElement("div");
      div.innerHTML = String(item_html || "");
      const bold = div.querySelector("strong, b");
      if (bold) {
        const t = (bold.textContent || "").trim();
        if (t) {
          return {
            heading_html: "<p><strong>" + frappe.utils.escape_html(t) + "</strong></p>",
            heading_text: t
          };
        }
      }
    } catch (e) {}
    return { heading_html: "", heading_text: "" };
  },

  // ---------- the draft box ----------
  open_draft_dialog(frm, idx) {
    const row = (frm.doc.ucc_minutes || []).find((r) => String(r.idx) === String(idx));
    if (!row) { frappe.msgprint("Minute row not found."); return; }

    const self = this;
    const heading = this.split_item_heading(row.item);

    // Prefill the discussion box with any body already present (heading removed).
    const full = this.strip(row.item);
    let body_existing = full;
    if (heading.heading_text) {
      const i = full.indexOf(heading.heading_text);
      body_existing = i >= 0 ? (full.slice(0, i) + full.slice(i + heading.heading_text.length)).trim() : full;
    }

    const heading_note = heading.heading_text
      ? "The bold agenda heading <strong>" + frappe.utils.escape_html(heading.heading_text) +
        "</strong> is kept, and it drives what this minute is about. Add any discussion points below " +
        "(optional) — the AI writes the body underneath the heading. Substantive items also get a " +
        "<i>Lesson Learned</i> and <i>Preventive Measure</i>."
      : "No bold agenda heading detected on this item, so type the discussion points and the AI will draft the whole Item.";

    const d = new frappe.ui.Dialog({
      title: "AI Draft — Minute #" + row.idx,
      size: "large",
      fields: [
        {
          fieldtype: "HTML",
          options:
            "<div style='color:#667085;margin-bottom:8px;font-size:12.5px;line-height:1.5'>" +
            heading_note + "<br>The AI rewrites your points in formal minute style " +
            "(<i>“Ms Tan reported…”, “The board discussed…”, “It was agreed that…”</i>) and adds nothing you did not write." +
            "</div>"
        },
        {
          label: "Discussion — what was reported / discussed / agreed (optional)",
          fieldname: "item_notes",
          fieldtype: "Text",
          default: body_existing,
          description: "Optional — the heading alone can drive the minute. Raw points are fine, e.g. \"Jane reported Q2 intake 45; board discussed shortfall; agreed to add 2 fairs\"."
        },
        {
          label: "Action — follow-up (who / by when)",
          fieldname: "action_notes",
          fieldtype: "Small Text",
          default: self.strip(row.action),
          description: "Leave blank (or with no owner/date) and it becomes \"All to take note.\" Otherwise e.g. \"Admissions to run 2 fairs by 30 Sep\"."
        }
      ],
      primary_action_label: "Draft",
      async primary_action(values) {
        const item_notes = String((values && values.item_notes) || "").trim();
        const action_notes = String((values && values.action_notes) || "").trim();
        if (!item_notes && !action_notes && !heading.heading_text) {
          frappe.msgprint("Type the discussion points (or give this item a bold agenda heading) to draft from.");
          return;
        }
        const $pb = d.get_primary_btn();
        $pb.prop("disabled", true).text("Drafting…");
        try {
          const ok = await self.do_draft(frm, row, heading, item_notes, action_notes);
          if (ok) {
            d.hide();
            self.refresh_view(frm);
            frappe.show_alert({ message: "Drafted. Review, then Save.", indicator: "blue" });
          } else {
            $pb.prop("disabled", false).text("Draft");
          }
        } catch (e) {
          frappe.msgprint("AI draft failed: " + (e && e.message ? e.message : e));
          $pb.prop("disabled", false).text("Draft");
        }
      }
    });
    d.show();
  },

  async do_draft(frm, row, heading, item_notes, action_notes) {
    const key = await this.get_key();
    if (!key) return false;

    let out;
    try {
      out = await this.call_openai(key, this.messages(frm, row, heading, item_notes, action_notes));
    } catch (e) {
      if (e.status === 401) {
        this.clear_key();
        frappe.msgprint("OpenAI rejected the key (cleared). Click Draft again to re-enter it.");
        return false;
      }
      throw e;
    }

    if (!out) return false;

    // Keep the bold heading, append the drafted body underneath it.
    const body = typeof out.item_body !== "undefined" && out.item_body !== null ? String(out.item_body) : "";
    if (heading.heading_html || body) {
      row.item = (heading.heading_html || "") + body;
    }
    if (typeof out.action !== "undefined" && out.action !== null) row.action = String(out.action);
    frm.dirty();
    return true;
  },

  // ---------- the minute-writing skill ----------
  messages(frm, row, heading, item_notes, action_notes) {
    const system = [
      "You are a minute-taker for a Quality Meeting at United Ceres College (UCC), a Singapore private education institution operating under ISO 9001, ISO 27001 and EduTrust. You write the BODY of one minute entry for the agenda item given as 'topic', incorporating the user's item_notes when provided.",
      "",
      "The item already has a bold heading (the agenda title) = 'topic'. It stays on the form. Do NOT repeat, restate or re-title it. Write only the BODY beneath it.",
      "",
      "USE THE TOPIC to shape an appropriate, professional minute. You MAY write conventional meeting language suited to the topic. You must NOT fabricate SPECIFIC facts that are not in item_notes: no invented personal names, exact figures, monetary amounts, specific dates, named systems, or specific decisions. Generic professional minute prose about the topic is allowed; invented specifics are not.",
      "",
      "Return JSON only: {\"item_body\":\"<HTML body, no heading>\",\"action\":\"<plain text>\"}.",
      "",
      "PROCEDURAL / CEREMONIAL topics — write standard minute language and DO NOT add Lesson Learned or Preventive Measure:",
      "- Welcome / Introduction: e.g. 'The meeting commenced with a welcome to all attendees. The purpose of the meeting was to review key operational, compliance, regulatory, HR, system and quality matters requiring management awareness or follow-up.'",
      "- Apologies / Attendance; Confirmation of Previous Minutes.",
      "- AOB / Any Other Business: e.g. 'There being no further matters raised, the meeting proceeded to close.' (or minute any items listed in item_notes).",
      "- Conclusion / Next Meeting / Adjournment: e.g. 'The meeting was adjourned.' Add the next meeting date/time ONLY if provided.",
      "",
      "SUBSTANTIVE topics (issues, audits, reviews, incidents, improvements, findings, complaints, risks): write the discussion body, THEN add two labelled paragraphs:",
      "  <p><strong>Lesson Learned:</strong> ...</p>",
      "  <p><strong>Preventive Measure:</strong> ...</p>",
      "Keep these grounded in the topic and item_notes and professional; do not fabricate specific figures, names or dates. If the topic genuinely does not warrant them, omit them.",
      "",
      "ITEM BODY — house style:",
      "- Third person, past tense, factual and neutral.",
      "- Attribute points to the speaker/role WHEN item_notes names one: 'Ms Tan reported that...', 'The Chair noted...'. If no speaker is named, use an impersonal form: 'It was noted that...', 'The meeting reviewed...'.",
      "- Standard minute verbs: reported, presented, informed, raised, discussed, reviewed, noted, clarified, agreed, resolved, recommended, endorsed, approved, deferred.",
      "- Keep any figures, dates and times exactly as written in item_notes.",
      "- Simple HTML: <p>, <ul>, <li>, <strong>. No <h*> or bold title line. UK British spelling. Never use em dashes.",
      "",
      "ACTION — house style (STRICT, no assumptions):",
      "- If there is no concrete follow-up task, output exactly: All to take note.",
      "- Task WITH an owner (person, role or department) AND a deadline: '[Owner] to [task] by [deadline].'",
      "- Task with the owner OR the deadline missing: include only what is provided, never invent the rest. (owner but no date -> '[Owner] to [task].'; date but no owner -> '[task] by [deadline].')",
      "- Task with NEITHER an owner nor a deadline: output exactly: All to take note.",
      "- One sentence. Plain text, no HTML.",
      "",
      "meeting_date and meeting_time are context only: use them for temporal phrasing ONLY if the notes/topic refer to a date/time.",
      "Return JSON only."
    ].join("\n");

    const payload = {
      topic: (heading && heading.heading_text) || "",
      item_notes: item_notes || "",
      action_notes: action_notes || "",
      meeting_date: frm.doc.eb_date || "",
      meeting_time: frm.doc.time || ""
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
