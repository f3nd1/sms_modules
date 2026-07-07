// =============================================================================
// AGU — Agent-style Form UI Template  (canonical reference)
// =============================================================================
//
// This is the reference implementation for taking over a Frappe DocType form
// with a custom single-field UI. Copy it to build the same experience for any
// DocType. Do NOT re-create native inputs — this template RELOCATES the live
// Frappe controls into custom slots, so validation, links, grids, and doctype
// events keep working.
//
// -----------------------------------------------------------------------------
// HOW TO REUSE (the seams that change per DocType)
// -----------------------------------------------------------------------------
//   1. frappe.ui.form.on("<DocType>", {...})   — bind to the target DocType.
//   2. AGU.html_fieldname                        — the HTML field that hosts the UI.
//   3. AGU.sections[]                            — the layout map (nav + panels).
//   4. AGU.native_date_fields                    — dates rendered as <input type=date>.
//   5. The six hero fact() tiles in render()     — top-right summary stats.
//   6. validate()                                — per-DocType required-field rules.
//
// -----------------------------------------------------------------------------
// KEY MECHANICS (preserve these when adapting)
// -----------------------------------------------------------------------------
//   * Field embedding via move + restore. embed_fields() appends the live
//     field.$wrapper into [data-agu-slot]; restore_fields() moves it back
//     (original parent/next recorded in __agu_moved) before every re-render.
//   * Nothing disappears. append_unmapped_fields() sweeps frm.fields_dict and
//     dumps any real, non-layout, non-excluded, visible field that isn't placed
//     into Internal > "Other Fields" (with a console.warn).
//   * Chrome suppression. hide_original_sections (tabs/sections/field wrappers),
//     close_erpnext_sidebar (full-width main), hide_frappe_connections.
//   * Table UX. Multiple child tables per section => switchable tabs with counts,
//     per-section active-table memory (__agu_table), collapse memory
//     (__agu_collapsed_tables), and the "Hide/Show Table" pattern. Grid is moved
//     into .agu-grid-slot then grid.refresh().
//   * Grid-row modal + save safety. CSS promotes .grid-row-open to a fixed modal
//     with backdrop; outside-click dispatches Escape; before_save closes open
//     rows; re-render is blocked while a row is open.
//   * State on frm.__agu_* : __agu_section, __agu_table, __agu_collapsed_tables,
//     __agu_moved, __agu_full_width.
//
// Client Script: Agent UI  |  DocType: Agent  |  HTML Field Required: custom_html_render
// =============================================================================

frappe.ui.form.on("Agent", {
    refresh(frm) {
        AGU.init(frm);
    },

    after_save(frm) {
        setTimeout(() => AGU.init(frm), 150);
    },

    before_save(frm) {
        AGU.close_open_grid_row();
    },

    validate(frm) {
        const agent_name = frm.doc.agent_or_company_name;

        if (!agent_name || !String(agent_name).trim()) {
            frappe.throw("Please enter Agent Name or Company.");
        }

        frm.set_value("agent_or_company_name", String(agent_name).trim());
    }
});

const AGU = {
    html_fieldname: "custom_html_render",

    native_date_fields: [
        "date_of_registration",
        "expiry_date",
        "custom_ra_application_form_date",
        "date",
        "processed_date",
        "approved_date",
        "onboarding_survey_date",
        "resignation_letter_date",
        "relieving_date",
        "exit_interview_held_on"
    ],

    unmapped_excluded_fieldnames: [
        "amended_from",
        "_assign",
        "_comments",
        "_liked_by",
        "_seen",
        "_user_tags",
        "owner",
        "creation",
        "modified",
        "modified_by",
        "docstatus",
        "idx",
        "html_jeft",
        "html_lxzc"
    ],

    sections: [
        {
            key: "details",
            title: "1. Agent Details",
            nav_note: "Identity and status",
            subtitle: "Agent status, company details, registration information, and commission table.",
            groups: [
                {
                    label: "Agent Identity",
                    fields: [
                        "status",
                        "applying_as_company",
                        "agent_or_company_name",
                        "date_of_registration",
                        "expiry_date",
                        "custom_ra_application_form_date"
                    ]
                },
                {
                    label: "Registration Details",
                    fields: [
                        "registration_no",
                        "place_of_registration",
                        "countries_of_recruitment"
                    ]
                },
                {
                    label: "Contact Details",
                    fields: [
                        "telephone_no",
                        "email",
                        "fax_no",
                        "full_address",
                        "registered_address"
                    ]
                }
            ],
            table_groups: [
                {
                    label: "Commission Table",
                    table: "registration"
                }
            ]
        },
        {
            key: "contact_profiles",
            title: "2. Contact Profiles",
            nav_note: "CEO and company profile",
            subtitle: "CEO, manager, contact officer, and company profile information.",
            groups: [
                {
                    label: "Contact Profile Control",
                    fields: [
                        "ceo_differ"
                    ]
                },
                {
                    label: "CEO / Manager",
                    fields: [
                        "ceo_first_name",
                        "ceo_last_name",
                        "ceo_position",
                        "gender"
                    ]
                },
                {
                    label: "Contact Officer",
                    fields: [
                        "co_first_name",
                        "co_last_name",
                        "co_position",
                        "co_gender"
                    ]
                },
                {
                    label: "Company Profile",
                    fields: [
                        "company_description",
                        "company_experience"
                    ]
                }
            ]
        },
        {
            key: "experience",
            title: "3. Experience",
            nav_note: "Recruitment experience",
            subtitle: "Singapore and overseas recruitment experience, including yearly recruitment capacity.",
            groups: [
                {
                    label: "Singapore Institutions",
                    fields: [
                        "has_representation",
                        "recruited_students_yearly"
                    ]
                },
                {
                    label: "Other Countries",
                    fields: [
                        "has_experience",
                        "outside_sg"
                    ]
                },
                {
                    label: "UCC Yearly Target",
                    fields: [
                        "1st_quarter_target",
                        "2nd_quarter_target",
                        "3rd_quarter_target",
                        "4th_quarter_target"
                    ]
                }
            ],
            table_groups: [
                {
                    label: "Singapore School Representation",
                    table: "school_representation"
                },
                {
                    label: "Other Country Recruitment",
                    table: "school_recruit"
                },
                {
                    label: "UCC Yearly Recruitment",
                    table: "students_ucc_yearly"
                }
            ]
        },
        {
            key: "recruitment",
            title: "4. Recruitment",
            nav_note: "Methods and payment",
            subtitle: "Recruitment methods, service fee details, and banking information.",
            groups: [
                {
                    label: "Recruitment Methods",
                    fields: [
                        "exhibition",
                        "online_marketing",
                        "seminar_talk",
                        "school_talk",
                        "one_to_one",
                        "advertisement",
                        "others",
                        "please_specify",
                        "details_service_fees"
                    ]
                },
                {
                    label: "Banking Information",
                    fields: [
                        "agent_bank_branch",
                        "agent_account_number",
                        "agent_bank_address",
                        "agent_swift_code",
                        "agent_account_name"
                    ]
                },
                {
                    label: "Intermediary Bank Details",
                    fields: [
                        "agent_inter_bank_branch",
                        "agent_inter_swift_code",
                        "agent_inter_account_name",
                        "agent_inter_bank_address"
                    ]
                }
            ]
        },
        {
            key: "misc",
            title: "5. Miscellaneous",
            nav_note: "Referee and documents",
            subtitle: "Referee details, uploaded documents, and declaration information.",
            groups: [
                {
                    label: "Referee Details",
                    fields: [
                        "referee_name",
                        "referee_position",
                        "referee_phone",
                        "referee_organization",
                        "referee_email",
                        "relationship_to_applicant"
                    ]
                },
                {
                    label: "Document Submission",
                    fields: [
                        "business_registration",
                        "company_profile",
                        "additional_documents"
                    ]
                },
                {
                    label: "Declaration",
                    fields: [
                        "name_of_applicant",
                        "date",
                        "nric_passport",
                        "signature"
                    ]
                }
            ],
            table_groups: [
                {
                    label: "Submission Documents",
                    table: "table_vsbe"
                }
            ]
        },
        {
            key: "approval",
            title: "6. Approval and Onboarding",
            nav_note: "Approval and checklist",
            subtitle: "Processing, approval, provider rating, onboarding checklist, and selection rating.",
            groups: [
                {
                    label: "Approval",
                    fields: [
                        "employee",
                        "processing_officer",
                        "processing_officer_name",
                        "processed_date",
                        "approved_by",
                        "approved_by_full_name",
                        "approved_date"
                    ]
                },
                {
                    label: "Selection Rating",
                    fields: [
                        "share_values_rating",
                        "legal_rating",
                        "partnership_rating",
                        "collaborative_rating",
                        "financial_rating",
                        "communication_rating",
                        "cultural_rating",
                        "support_rating",
                        "sustainability_rating"
                    ]
                },
                {
                    label: "Provider Rating Summary",
                    fields: [
                        "provider_rating",
                        "average_identification_and_selection_score",
                        "remarks"
                    ]
                },
                {
                    label: "Onboarding",
                    fields: [
                        "checklist_template",
                        "checklist_inline_editor"
                    ]
                }
            ],
            table_groups: [
                {
                    label: "Provider Rating Records",
                    table: "rating"
                },
                {
                    label: "Onboarding Checklist",
                    table: "onboarding_checklist"
                }
            ]
        },
        {
            key: "monitor",
            title: "7. Monitor and Review",
            nav_note: "Performance monitoring",
            subtitle: "Agent training, review logs, service performance indicators, student feedback, and exit management.",
            groups: [
                {
                    label: "Training and Onboarding",
                    fields: [
                        "done_consent_and_onboarding_survey",
                        "onboarding_survey_date"
                    ]
                },
                {
                    label: "Monitoring Summary",
                    fields: [
                        "monitoring_summary",
                        "text_editor_pftn"
                    ]
                },
                {
                    label: "Exit Management",
                    fields: [
                        "resignation_letter_date",
                        "relieving_date",
                        "exit_interview_held_on",
                        "exit_interview",
                        "reason_for_leaving",
                        "feedback"
                    ]
                }
            ],
            table_groups: [
                {
                    label: "Training Log",
                    table: "training_log"
                },
                {
                    label: "Agent Rating List",
                    table: "agent_rating_list"
                },
                {
                    label: "Service Performance Indicators",
                    table: "agent_monitoring_childtable"
                },
                {
                    label: "Renewal Evaluation",
                    table: "table_tczl"
                },
                {
                    label: "Student Feedback",
                    table: "student_feedback"
                }
            ]
        },
        {
            key: "internal",
            title: "8. Internal",
            nav_note: "Credentials and risk",
            subtitle: "Internal notification, LMS credentials, ownership, contract, risk assessment, and commission details.",
            groups: [
                {
                    label: "Agent Credentials",
                    fields: [
                        "username",
                        "password",
                        "welcome_email_sent",
                        "contract",
                        "nda"
                    ]
                },
                {
                    label: "Ownership and Search Type",
                    fields: [
                        "agent_owner",
                        "agent_search_type",
                        "supplier",
                        "identification_types"
                    ]
                },
                {
                    label: "Letter Head and Commission",
                    fields: [
                        "letter_head",
                        "fc_commission",
                        "sc_commission"
                    ]
                }
            ],
            table_groups: [
                {
                    label: "Notify Users",
                    table: "notify_users"
                },
                {
                    label: "Risk Assessment",
                    table: "risk_assessment"
                },
                {
                    label: "Risk Management",
                    table: "risk_management"
                }
            ]
        }
    ],

    init(frm) {
        if (!frm || frm.doctype !== "Agent") return;

        this.inject_css();
        this.close_erpnext_sidebar(frm);

        setTimeout(() => {
            this.append_unmapped_fields(frm);
            this.hide_original_sections(frm);
            this.hide_frappe_connections(frm);
            this.render(frm);
            this.bind(frm);
        }, 250);
    },

    close_open_grid_row() {
        const open_rows = $(".agu-grid-slot .grid-row-open:visible");

        if (!open_rows.length) return;

        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
            which: 27,
            bubbles: true
        }));
    },

    render_current_if_ready(frm) {
        if (!frm || frm.doctype !== "Agent") return;
        if (!frm.fields_dict || !frm.fields_dict[this.html_fieldname]) return;
        if ($(".agu-grid-slot .grid-row-open:visible").length) return;

        clearTimeout(frm.__agu_rerender_timer);

        frm.__agu_rerender_timer = setTimeout(() => {
            this.append_unmapped_fields(frm);
            this.hide_frappe_connections(frm);
            this.render(frm);
            this.bind(frm);
        }, 150);
    },

    close_erpnext_sidebar(frm) {
        try {
            const wrapper = frm.page && frm.page.wrapper ? frm.page.wrapper : frm.$wrapper;

            wrapper.find(".layout-side-section")
                .removeClass("show")
                .css({ display: "none" });

            wrapper.find(".layout-main-section-wrapper")
                .css({
                    "margin-left": "0",
                    width: "100%",
                    "max-width": "100%",
                    flex: "1"
                });

            wrapper.find(".layout-main-section")
                .css({
                    width: "100%",
                    "max-width": "100%"
                });
        } catch (e) {
            console.warn("Agent UI sidebar close skipped:", e);
        }
    },

    hide_frappe_connections(frm) {
        try {
            const wrapper = frm.page && frm.page.wrapper ? frm.page.wrapper : frm.$wrapper;

            wrapper.find(".form-dashboard, .form-dashboard-section, .form-links, .document-links").each(function () {
                const text = $(this).text().replace(/\s+/g, " ").trim();

                if (
                    text.startsWith("Connections") ||
                    text.includes("Student")
                ) {
                    $(this).hide();
                }
            });
        } catch (e) {
            console.warn("Agent UI connections hide skipped:", e);
        }
    },

    hide_original_sections(frm) {
        const target_area = frm.$wrapper.find(".form-layout").first();

        frm.$wrapper.find(".form-tabs, .nav-tabs").hide();

        target_area.find(".form-section").each(function () {
            if ($(this).find(`[data-fieldname="${AGU.html_fieldname}"]`).length) return;
            $(this).hide();
        });

        Object.keys(frm.fields_dict || {}).forEach(fieldname => {
            if (fieldname === AGU.html_fieldname) return;

            const field = frm.fields_dict[fieldname];

            if (field && field.$wrapper) {
                field.$wrapper.hide();
            }
        });
    },

    append_unmapped_fields(frm) {
        this.sections.forEach(section => {
            section.groups = (section.groups || []).filter(group => !group.__auto_unmapped);
        });

        const configured = {};
        const layout_fieldtypes = [
            "Section Break",
            "Column Break",
            "Tab Break",
            "Fold"
        ];

        this.sections.forEach(section => {
            (section.groups || []).forEach(group => {
                (group.fields || []).forEach(fieldname => {
                    configured[fieldname] = true;
                });
            });

            (section.table_groups || []).forEach(group => {
                if (group.table) configured[group.table] = true;
            });
        });

        const unmapped = [];

        Object.keys(frm.fields_dict || {}).forEach(fieldname => {
            const field = frm.fields_dict[fieldname];

            if (!field || !field.df) return;
            if (fieldname === this.html_fieldname) return;
            if (configured[fieldname]) return;
            if (layout_fieldtypes.includes(field.df.fieldtype)) return;
            if (field.df.hidden) return;
            if (this.unmapped_excluded_fieldnames.includes(fieldname)) return;
            if (field.df.read_only && !this.has_value(frm, fieldname)) return;

            unmapped.push(fieldname);
        });

        if (!unmapped.length) return;

        console.warn("Agent UI unmapped fields added to Internal > Other Fields:", unmapped);

        const internal = this.sections.find(section => section.key === "internal");

        if (!internal) return;

        internal.groups = internal.groups || [];

        internal.groups.push({
            label: "Other Fields",
            fields: unmapped,
            __auto_unmapped: true
        });
    },

    render(frm) {
        const target = this.target(frm);

        if (!target.length) return;
        if ($(".agu-grid-slot .grid-row-open:visible").length) return;

        this.restore_fields(frm);
        target.empty();

        const current_section = frm.__agu_section || this.sections[0].key;
        const active = this.sections.find(section => section.key === current_section) || this.sections[0];

        target.html(`
            <div class="agu">
                <div class="agu-hero">
                    <div class="agu-hero-left">
                        <div class="agu-hero-tools">
                            <button type="button" class="agu-burger-btn" data-agu-toggle-fullscreen title="Toggle full width">
                                ☰
                            </button>

                            <div>
                                <div class="agu-kicker">Agent</div>
                                <div class="agu-title">${this.e(frm.doc.agent_or_company_name || frm.doc.name || "New Agent")}</div>
                                <div class="agu-subject">
                                    ${this.e(frm.doc.name || "-")}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="agu-facts">
                        ${this.fact("Status", frm.doc.status || "-")}
                        ${this.fact("Type", frm.doc.applying_as_company ? "Company" : "Individual")}
                        ${this.fact("Country", frm.doc.place_of_registration || "-")}
                        ${this.fact("Students", this.row_count(frm, "student_feedback"))}
                        ${this.fact("Monitoring", this.row_count(frm, "agent_monitoring_childtable"))}
                        ${this.fact("Risk", this.row_count(frm, "risk_assessment"))}
                    </div>
                </div>

                <div class="agu-shell">
                    <aside class="agu-side">
                        ${this.sections.map(section => this.side_item(frm, section, section.key === active.key)).join("")}
                    </aside>

                    <main class="agu-main">
                        ${this.section_view(frm, active)}
                    </main>
                </div>
            </div>
        `);

        this.embed_fields(frm, active);
        this.mount_ai_tables(frm, active);
        this.hide_frappe_connections(frm);
    },

    // Mounts AGU_AI (templates/agu-ai-draft.js) into the currently displayed
    // table_group's .agu-ai-slot, when that group has an `ai` config. Only the
    // active table group of the active section is ever in the DOM, so this
    // mirrors the same "which group is showing" resolution active_table_view()
    // uses, then defers to AGU_AI for everything past that point.
    mount_ai_tables(frm, section) {
        if (typeof AGU_AI === "undefined") {
            if ((section.table_groups || []).some(g => g.ai)) {
                console.warn("AGU: a table_group has an `ai` config but AGU_AI (agu-ai-draft.js) is not loaded.");
            }
            return;
        }

        const target = this.target(frm);
        const groups = (section.table_groups || []).filter(g => g.table && frm.fields_dict[g.table]);
        if (!groups.length) return;

        const first_table = groups[0].table;
        const saved_table = frm.__agu_table && frm.__agu_table[section.key] ? frm.__agu_table[section.key] : null;
        const saved_table_is_valid = groups.some(g => g.table === saved_table);
        const active_table = saved_table_is_valid ? saved_table : first_table;
        const group = groups.find(g => g.table === active_table) || groups[0];

        if (!group || !group.ai) return;

        const slot = target.find(`[data-agu-ai-slot="${group.table}"]`);
        if (!slot.length) return;

        const config = Object.assign({}, group.ai, {
            id: group.ai.id || `${section.key}__${group.table}`,
            table: group.table,
            on_write: (frm2) => {
                const grid = frm2.fields_dict[group.table] && frm2.fields_dict[group.table].grid;
                if (grid) grid.refresh();
                if (group.ai.on_write) group.ai.on_write(frm2);
            }
        });

        AGU_AI.mount(frm, slot, config);
    },

    section_view(frm, section) {
        let content = "";

        if (section.groups && section.groups.length) {
            content += section.groups.map((group, index) => {
                const slots = (group.fields || []).map(fieldname => {
                    if (!frm.fields_dict[fieldname]) return "";

                    if (this.should_use_native_date(frm, fieldname)) {
                        return this.native_date_slot(frm, fieldname);
                    }

                    return `
                        <div class="agu-slot ${this.is_wide(frm, fieldname) ? "agu-wide" : ""}"
                             data-agu-slot="${fieldname}">
                        </div>
                    `;
                }).join("");

                if (!slots.trim()) return "";

                return `
                    <div class="agu-group ${index === 0 ? "agu-group-first" : ""}">
                        <div class="agu-group-head">
                            <span>${this.e(group.label)}</span>
                        </div>

                        <div class="agu-control-grid">
                            ${slots}
                        </div>
                    </div>
                `;
            }).join("");
        }

        if (section.table_groups && section.table_groups.length) {
            content += this.table_content(frm, section);
        }

        return `
            <div class="agu-panel">
                <div class="agu-panel-head">
                    <h3>${this.e(section.title)}</h3>
                    <p>${this.e(section.subtitle || "")}</p>
                </div>

                ${content || `<div class="agu-empty">No configured fields found for this section.</div>`}
            </div>
        `;
    },

    table_content(frm, section) {
        const valid_tables = (section.table_groups || []).filter(group => {
            return group.table && frm.fields_dict[group.table];
        });

        if (!valid_tables.length) return "";

        const table_switch_html = valid_tables.length > 1
            ? `
                <div class="agu-table-switch">
                    ${valid_tables.map(group => this.table_tab(frm, section, group)).join("")}
                </div>
            `
            : "";

        return `
            ${table_switch_html}

            <div class="agu-table-body">
                ${this.active_table_view(frm, section, valid_tables)}
            </div>
        `;
    },

    table_tab(frm, section, group) {
        const first_table = section.table_groups[0] && section.table_groups[0].table;

        const saved_table = frm.__agu_table && frm.__agu_table[section.key]
            ? frm.__agu_table[section.key]
            : null;

        const saved_table_is_valid = (section.table_groups || []).some(item => {
            return item.table === saved_table;
        });

        const active_table = saved_table_is_valid ? saved_table : first_table;

        const field = frm.fields_dict[group.table];
        const rows = field ? (frm.doc[group.table] || []) : [];
        const active = group.table === active_table;

        return `
            <button type="button"
                    class="agu-table-tab ${active ? "active" : ""}"
                    data-agu-table-tab="${group.table}"
                    data-agu-table-section="${section.key}">
                <span>${this.e(group.label)}</span>
                <b>${rows.length}</b>
            </button>
        `;
    },

    active_table_view(frm, section, valid_tables) {
        const table_groups = valid_tables || section.table_groups || [];

        if (!table_groups.length) return "";

        const first_table = table_groups[0] && table_groups[0].table;

        const saved_table = frm.__agu_table && frm.__agu_table[section.key]
            ? frm.__agu_table[section.key]
            : null;

        const saved_table_is_valid = table_groups.some(item => {
            return item.table === saved_table;
        });

        const active_table = saved_table_is_valid ? saved_table : first_table;
        const group = table_groups.find(item => item.table === active_table) || table_groups[0];

        if (!group) return "";

        const field = frm.fields_dict[group.table];

        if (!field) {
            return `
                <div class="agu-empty">
                    Table field not found: ${this.e(group.table)}
                </div>
            `;
        }

        const rows = frm.doc[group.table] || [];
        const collapse_key = `${section.key}__${group.table}`;

        frm.__agu_collapsed_tables = frm.__agu_collapsed_tables || {};

        if (frm.__agu_collapsed_tables[collapse_key] === undefined) {
            // When a table has an AI Draft editor, the raw grid is secondary -
            // collapsed by default unless the config explicitly says otherwise.
            frm.__agu_collapsed_tables[collapse_key] = group.collapsed !== undefined ? !!group.collapsed : !!group.ai;
        }

        const is_collapsed = frm.__agu_collapsed_tables[collapse_key];

        // mount_ai_tables() fills this slot after the HTML below is inserted into
        // the DOM (see render()); it targets [data-agu-ai-slot] on this table.
        const ai_slot = group.ai ? `<div class="agu-ai-slot" data-agu-ai-slot="${group.table}"></div>` : "";

        return `
            <div class="agu-table-panel">
                <div class="agu-table-panel-head">
                    <div>
                        <strong>${this.e(group.label)}</strong>
                        <small>${rows.length} record${rows.length === 1 ? "" : "s"}</small>
                    </div>

                    <div class="agu-table-actions">
                        <div class="agu-table-note">
                            Use the grid below only when raw data editing is needed.
                        </div>

                        <button type="button"
                                class="agu-collapse-btn"
                                data-agu-collapse-key="${collapse_key}">
                            ${is_collapsed ? "Show Table" : "Hide Table"}
                        </button>
                    </div>
                </div>

                ${ai_slot}

                <div class="agu-collapsible-table ${is_collapsed ? "is-collapsed" : ""}">
                    <div class="agu-grid-slot ${rows.length > 0 ? "has-records" : "empty-grid"}"
                         data-agu-slot="${group.table}">
                    </div>
                </div>
            </div>
        `;
    },

    fact(label, value) {
        return `
            <div class="agu-fact">
                <span>${this.e(label)}</span>
                <strong>${this.e(value)}</strong>
            </div>
        `;
    },

    side_item(frm, section, active) {
        return `
            <button type="button"
                    class="agu-side-item ${active ? "active" : ""}"
                    data-agu-section="${section.key}">
                <span>
                    <strong>${this.e(section.title)}</strong>
                    <small>${this.e(section.nav_note || "")}</small>
                </span>
            </button>
        `;
    },

    embed_fields(frm, section) {
        const target = this.target(frm);

        frm.__agu_moved = frm.__agu_moved || {};

        this.section_fields(section).forEach(fieldname => {
            const field = frm.fields_dict[fieldname];

            if (this.should_use_native_date(frm, fieldname)) {
                return;
            }

            const slot = target.find(`[data-agu-slot="${fieldname}"]`);

            if (!slot.length || !field || !field.$wrapper) return;

            if (!frm.__agu_moved[fieldname]) {
                frm.__agu_moved[fieldname] = {
                    parent: field.$wrapper.parent(),
                    next: field.$wrapper.next()
                };
            }

            field.$wrapper.show();
            field.df.hidden = 0;
            slot.append(field.$wrapper);

            if (field.df && field.df.fieldtype === "Table" && field.grid) {
                field.grid.refresh();
            } else if (field.refresh) {
                field.refresh();
            }

            this.compact_field(field);
        });
    },

    restore_fields(frm) {
        if (!frm.__agu_moved) return;

        Object.keys(frm.__agu_moved).forEach(fieldname => {
            const info = frm.__agu_moved[fieldname];
            const field = frm.fields_dict[fieldname];

            if (!field || !field.$wrapper) return;

            if (info.next && info.next.length && info.next.parent().length) {
                field.$wrapper.insertBefore(info.next);
            } else if (info.parent && info.parent.length) {
                info.parent.append(field.$wrapper);
            }

            field.$wrapper.hide();
        });
    },

    compact_field(field) {
        if (!field || !field.$wrapper) return;

        field.$wrapper.addClass("agu-embedded-field");

        if (field.df && field.df.fieldtype === "Table") {
            field.$wrapper.addClass("agu-embedded-table");
        }

        if (field.df && field.df.fieldtype === "Text Editor") {
            field.$wrapper.addClass("agu-embedded-editor");
        }
    },

    bind(frm) {
        const target = AGU.target(frm);

        target.off("click", "[data-agu-toggle-fullscreen]");
        target.on("click", "[data-agu-toggle-fullscreen]", function(e) {
            e.preventDefault();
            e.stopPropagation();

            frm.__agu_full_width = !frm.__agu_full_width;

            target.find(".agu").toggleClass("agu-table-fullscreen", !!frm.__agu_full_width);
        });

        target.off("click", "[data-agu-section]");
        target.on("click", "[data-agu-section]", function(e) {
            e.preventDefault();
            e.stopPropagation();

            frm.__agu_section = $(e.currentTarget).data("agu-section");

            AGU.render(frm);
            AGU.bind(frm);
        });

        target.off("click", "[data-agu-table-tab]");
        target.on("click", "[data-agu-table-tab]", function(e) {
            e.preventDefault();
            e.stopPropagation();

            const button = $(e.currentTarget);
            const section_key = button.data("agu-table-section");
            const table_fieldname = button.data("agu-table-tab");

            frm.__agu_table = frm.__agu_table || {};
            frm.__agu_table[section_key] = table_fieldname;

            AGU.render(frm);
            AGU.bind(frm);
        });

        target.off("click", "[data-agu-collapse-key]");
        target.on("click", "[data-agu-collapse-key]", function(e) {
            e.preventDefault();
            e.stopPropagation();

            const collapse_key = $(e.currentTarget).attr("data-agu-collapse-key");

            frm.__agu_collapsed_tables = frm.__agu_collapsed_tables || {};
            frm.__agu_collapsed_tables[collapse_key] = !frm.__agu_collapsed_tables[collapse_key];

            AGU.render(frm);
            AGU.bind(frm);
        });

        target.off("change", ".agu-native-input");
        target.on("change", ".agu-native-input", function() {
            const fieldname = $(this).data("agu-native-fieldname");
            const value = $(this).val();

            if (!fieldname) return;

            frm.set_value(fieldname, value || null);
        });

        $(document).off("mousedown.agu_modal_close");
        $(document).on("mousedown.agu_modal_close", function(e) {
            const open_row = $(".agu-grid-slot .grid-row-open:visible").first();

            if (!open_row.length) return;

            const ignored_area = $(e.target).closest(
                ".awesomplete, .datepicker, .flatpickr-calendar, .select2-container, .dropdown-menu, .modal, .ql-tooltip"
            ).length > 0;

            if (ignored_area) return;

            const rect = open_row[0].getBoundingClientRect();

            const clicked_inside_box =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            if (clicked_inside_box) return;

            document.dispatchEvent(new KeyboardEvent("keydown", {
                key: "Escape",
                code: "Escape",
                keyCode: 27,
                which: 27,
                bubbles: true
            }));
        });
    },

    section_fields(section) {
        const fields = [];

        (section.groups || []).forEach(group => {
            (group.fields || []).forEach(fieldname => fields.push(fieldname));
        });

        (section.table_groups || []).forEach(group => {
            if (group.table) fields.push(group.table);
        });

        return fields;
    },

    has_value(frm, fieldname) {
        const value = frm.doc[fieldname];

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        return value !== undefined &&
            value !== null &&
            String(value).replace(/<[^>]*>/g, "").trim() !== "";
    },

    row_count(frm, fieldname) {
        const rows = frm.doc[fieldname] || [];

        if (!Array.isArray(rows)) return "0";

        return String(rows.length);
    },

    is_wide(frm, fieldname) {
        const field = frm.fields_dict[fieldname];

        if (!field || !field.df) return false;

        return [
            "Text",
            "Small Text",
            "Long Text",
            "Text Editor",
            "Code",
            "HTML",
            "Table",
            "Table MultiSelect",
            "Attach",
            "Attach Image",
            "Signature",
            "Read Only"
        ].includes(field.df.fieldtype);
    },

    should_use_native_date(frm, fieldname) {
        return this.native_date_fields.includes(fieldname);
    },

    native_date_slot(frm, fieldname) {
        const field = frm.fields_dict[fieldname];

        if (!field || !field.df) return "";

        const label = field.df.label || fieldname;
        let value = frm.doc[fieldname] || "";

        if (value && typeof moment !== "undefined") {
            const parsed = moment(value, ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "D-M-YYYY", "D/M/YYYY"], true);
            if (parsed.isValid()) {
                value = parsed.format("YYYY-MM-DD");
            }
        }

        return `
            <div class="agu-slot agu-native-slot">
                <label class="agu-native-label">
                    ${this.e(label)}${field.df.reqd ? ' <span style="color:#c62828">*</span>' : ''}
                </label>
                <input type="date"
                       class="agu-native-input"
                       data-agu-native-fieldname="${fieldname}"
                       value="${this.e(value)}">
            </div>
        `;
    },

    target(frm) {
        const html = frm.fields_dict[this.html_fieldname];

        if (html && html.$wrapper && html.$wrapper.length) {
            return html.$wrapper;
        }

        let fallback = frm.$wrapper.find(".agu-fallback");

        if (!fallback.length) {
            fallback = $('<div class="agu-fallback"></div>');
            frm.$wrapper.find(".form-layout").first().before(fallback);
        }

        return fallback;
    },

    e(value) {
        return frappe.utils.escape_html(String(value || ""));
    },

    inject_css() {
        if ($("#agu-css").length) return;

        const css = [
            ".agu{max-width:1180px;margin:0 auto 32px}",

            ".agu-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;padding:18px 20px;margin-bottom:16px;background:linear-gradient(135deg,#f5f8fc 0%,#ffffff 54%,#fff8eb 100%);border:1px solid #B8B8B8;border-radius:12px}",
            ".agu-hero-left{display:flex;flex-direction:column;gap:6px;min-width:0}",
            ".agu-hero-tools{display:flex;align-items:flex-start;gap:12px}",
            ".agu-burger-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid var(--border-color);border-radius:9px;background:#fff;cursor:pointer;font-size:17px;font-weight:700;color:var(--text-color)}",
            ".agu-burger-btn:hover{background:#f3f6fb;border-color:#8295bd}",
            ".agu-kicker{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em}",
            ".agu-title{font-size:25px;font-weight:750;color:var(--text-color);line-height:1.2}",
            ".agu-subject{font-size:13px;color:var(--text-muted)}",

            ".agu-facts{display:grid;grid-template-columns:repeat(3,minmax(110px,1fr));gap:8px;align-content:start;min-width:430px}",
            ".agu-fact{padding:9px 11px;border:1px solid var(--border-color);border-radius:9px;background:rgba(255,255,255,.65)}",
            ".agu-fact span{display:block;color:var(--text-muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}",
            ".agu-fact strong{display:block;margin-top:3px;font-size:13px;color:var(--text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",

            ".agu-shell{display:grid;grid-template-columns:250px minmax(0,1fr);gap:18px;align-items:start}",
            ".agu-side{display:flex;flex-direction:column;gap:10px;position:sticky;top:70px}",
            ".agu-side-item{display:flex;justify-content:space-between;align-items:center;text-align:left;width:100%;padding:11px 13px;border:1px solid var(--border-color);border-left:4px solid transparent;border-radius:10px;background:#fff;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s}",
            ".agu-side-item:hover{background:#f3f6fb;border-left-color:#8295bd}",
            ".agu-side-item.active{background:#f3f6fb;border:1px solid #8295bd;border-left:4px solid #ce9e5d;box-shadow:-1px 2px 5px rgba(0,0,0,.08)}",
            ".agu-side-item span{display:flex;flex-direction:column;gap:2px;min-width:0}",
            ".agu-side-item strong{font-size:13px;color:var(--text-color);white-space:normal;line-height:1.25}",
            ".agu-side-item small{font-size:11px;color:var(--text-muted);white-space:normal;line-height:1.25}",

            ".agu-panel{padding:20px;background:#fff;border:1px solid #B8B8B8;border-radius:12px}",
            ".agu-panel-head{margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-color)}",
            ".agu-panel-head h3{margin:0;font-size:22px;font-weight:700;color:var(--text-color)}",
            ".agu-panel-head p{margin:5px 0 0;color:var(--text-muted);font-size:13px}",

            ".agu.agu-table-fullscreen{max-width:none!important;width:100%!important;padding:0 8px!important}",
            ".agu.agu-table-fullscreen .agu-shell{grid-template-columns:1fr!important}",
            ".agu.agu-table-fullscreen .agu-side{display:none!important}",
            ".agu.agu-table-fullscreen .agu-main{width:100%!important;max-width:100%!important}",
            ".agu.agu-table-fullscreen .agu-panel{width:100%!important;max-width:100%!important}",

            ".agu-group{margin-top:18px}",
            ".agu-group-first{margin-top:0}",
            ".agu-group+.agu-group{padding-top:16px;border-top:1px dashed var(--border-color)}",
            ".agu-group-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}",
            ".agu-group-head:before{content:'';width:3px;height:14px;background:#8295bd;border-radius:2px}",
            ".agu-group-head span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#ffffff;background:#ce9e5d;padding:3px 10px;border-radius:20px;border:1px solid #ce9e5d}",

            ".agu-control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
            ".agu-wide{grid-column:1/-1}",
            ".agu-slot{min-width:0}",
            ".agu-slot .frappe-control{margin-bottom:0}",
            ".agu-slot .control-label{font-size:12px;font-weight:650;margin-bottom:4px}",
            ".agu-slot .form-control{min-height:32px}",
            ".agu-slot .control-input-wrapper{margin-bottom:0}",

            ".agu-native-slot{min-width:0}",
            ".agu-native-label{display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:var(--text-color)}",
            ".agu-native-input{width:100%;min-height:32px;border:1px solid var(--border-color);border-radius:6px;padding:5px 8px;font-size:13px;background:#fff;color:var(--text-color)}",
            ".agu-native-input:focus{border-color:#8295bd;outline:none;box-shadow:0 0 0 2px rgba(130,149,189,.18)}",

            ".agu-embedded-editor .ql-toolbar{border-radius:8px 8px 0 0}",
            ".agu-embedded-editor .ql-container{border-radius:0 0 8px 8px}",
            ".agu-embedded-editor .ql-editor{min-height:120px;font-size:13px}",

            ".agu-table-switch{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:22px;margin-bottom:18px}",
            ".agu-table-tab{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;background:#fff;cursor:pointer;text-align:left}",
            ".agu-table-tab:hover{background:#f3f6fb;border-color:#8295bd}",
            ".agu-table-tab.active{background:#f3f6fb;border:1px solid #8295bd;box-shadow:-1px 2px 5px rgba(0,0,0,.08)}",
            ".agu-table-tab span{font-size:13px;font-weight:650;white-space:normal;line-height:1.25}",
            ".agu-table-tab b{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:999px;background:var(--control-bg);font-size:12px;color:var(--text-color)}",

            ".agu-table-panel{border:1px solid var(--border-color);border-radius:12px;background:#fff;overflow:hidden}",
            ".agu-table-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:12px 14px;background:linear-gradient(135deg,#f1f5fb 0%,#ffffff 100%);border-bottom:1px solid var(--border-color)}",
            ".agu-table-panel-head strong{display:block;font-size:14px;color:var(--text-color)}",
            ".agu-table-panel-head small{display:block;margin-top:2px;font-size:12px;color:var(--text-muted)}",
            ".agu-ai-slot:not(:empty){padding:12px 14px;border-bottom:1px solid var(--border-color)}",
            ".agu-table-note{font-size:12px;color:var(--text-muted);text-align:right}",

            ".agu-grid-slot{padding:10px 12px}",
            ".agu-grid-slot .frappe-control{margin-bottom:0}",
            ".agu-grid-slot .grid-heading-row{background:#f8fbff}",
            ".agu-grid-slot .grid-row{min-height:34px}",
            ".agu-grid-slot .grid-static-col{padding-top:7px!important;padding-bottom:7px!important;font-size:12px}",
            ".agu-grid-slot .grid-body{max-height:360px;overflow:auto}",
            ".agu-grid-slot .grid-footer{padding-top:8px}",
            ".agu-grid-slot .rows{border-radius:8px;overflow:hidden}",

            ".agu-grid-slot .grid-row-open{position:fixed!important;top:8vh!important;left:8vw!important;width:84vw!important;height:84vh!important;z-index:1050!important;background:#fff!important;border:1px solid #B8B8B8!important;border-radius:14px!important;box-shadow:0 10px 32px rgba(0,0,0,.18)!important;overflow:auto!important;padding:18px!important}",
            ".agu-grid-slot .grid-row-open .form-in-grid{max-height:none!important;height:auto!important;overflow:visible!important}",
            ".agu-grid-slot .grid-row-open .grid-form-body{max-height:none!important;height:auto!important;overflow:visible!important}",
            ".agu-grid-slot .grid-row-open .row{margin-left:0!important;margin-right:0!important}",
            ".agu-grid-slot .grid-row-open .form-column{padding-left:16px!important;padding-right:16px!important}",
            ".agu-grid-slot .grid-row-open .section-body{padding:12px 0!important}",
            ".agu-grid-slot .grid-row-open .grid-form-heading{position:sticky!important;top:0!important;z-index:2!important;background:#fff!important;padding:10px 0 14px!important;border-bottom:1px solid var(--border-color)!important}",
            ".agu-grid-slot .grid-row-open .grid-form-tabs{position:sticky!important;top:58px!important;z-index:2!important;background:#fff!important;padding-top:8px!important}",
            ".agu-grid-slot .grid-row-open .ql-editor{min-height:180px!important}",
            ".agu-grid-slot .grid-row-open textarea.form-control{min-height:160px!important}",
            ".agu-grid-slot .grid-row-open .form-control{font-size:14px!important}",
            ".agu-grid-slot .grid-row-open .control-label{font-size:13px!important;font-weight:650!important}",
            ".agu-grid-slot .grid-row-open:after{content:'';position:fixed;inset:0;background:rgba(0,0,0,.20);z-index:-2}",

            ".agu-table-actions{display:flex;align-items:center;gap:10px;justify-content:flex-end}",
            ".agu-collapse-btn{padding:6px 11px;border:1px solid var(--border-color);border-radius:8px;background:#fff;cursor:pointer;font-size:12px;font-weight:650;color:var(--text-color)}",
            ".agu-collapse-btn:hover{background:#f3f6fb;border-color:#8295bd}",
            ".agu-collapsible-table.is-collapsed{display:none}",

            ".agu-empty{padding:16px;color:var(--text-muted);background:#f8fbff}",

            "@media(max-width:1000px){.agu-hero{display:block}.agu-facts{min-width:0;grid-template-columns:1fr 1fr;margin-top:14px}.agu-shell{grid-template-columns:1fr}.agu-side{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.agu-table-switch{grid-template-columns:1fr 1fr}.agu-control-grid{grid-template-columns:1fr}}",
            "@media(max-width:900px){.agu-grid-slot .grid-row-open{top:4vh!important;left:3vw!important;width:94vw!important;height:90vh!important;padding:14px!important}}",
            "@media(max-width:640px){.agu-facts{grid-template-columns:1fr}.agu-side{grid-template-columns:1fr}.agu-table-switch{grid-template-columns:1fr}}"
        ].join("");

        $("head").append(`<style id="agu-css">${css}</style>`);
    }
};
