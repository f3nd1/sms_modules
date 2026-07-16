export default class Tab {
	constructor(layout, df, frm, tab_link_container, tabs_content) {
		this.layout = layout;
		this.df = df || {};
		this.frm = frm;

		// For child table row forms, use the child doctype, not parent frm.doctype
		this.doctype =
			this.layout?.grid_row?.doc?.doctype || this.df.parent || this.frm?.doctype;

		this.label = this.df && this.df.label;
		this.tab_link_container = tab_link_container;
		this.tabs_content = tabs_content;
		this.make();
		this.setup_listeners();
		this.refresh();
	}

	make() {
		// Make tab ids unique per row form instance
		const row_name =
			this.layout?.grid_row?.doc?.name || this.layout?.grid_row?.doc?.idx || "row";

		const id = frappe.scrub(
			`${this.doctype}-${row_name}-${this.df.fieldname}`,
			"-"
		);

		this.tab_link = $(`
			<li class="nav-item">
				<button class="nav-link ${this.df.active ? "active" : ""}" id="${id}-tab"
					data-toggle="tab"
					data-fieldname="${this.df.fieldname}"
					href="#${id}"
					role="tab"
					aria-controls="${id}">
					${__(this.label)}
				</button>
			</li>
		`).appendTo(this.tab_link_container);

		this.wrapper = $(`<div class="tab-pane fade show ${this.df.active ? "active" : ""}"
			id="${id}" role="tabpanel" aria-labelledby="${id}-tab">`).appendTo(this.tabs_content);
	}

	refresh() {
		if (!this.df) return;

		let hide = this.df.hidden || this.df.hidden_due_to_dependency;

		if (!hide && this.frm && !this.frm.get_perm(this.df.permlevel || 0, "read")) {
			hide = true;
		}

		if (!hide) {
			hide = true;
			if (
				this.wrapper.find(
					".form-section:not(.hide-control, .empty-section), .form-dashboard-section:not(.hide-control, .empty-section)"
				).length
			) {
				hide = false;
			}
		}

		this.toggle(!hide);
	}

	toggle(show) {
		this.tab_link.toggleClass("hide", !show);
		this.wrapper.toggleClass("hide", !show);
		this.tab_link.toggleClass("show", show);
		this.wrapper.toggleClass("show", show);
		this.hidden = !show;
	}

	show() {
		this.tab_link.show();
	}

	hide() {
		this.tab_link.hide();
	}

	add_field(fieldobj) {
		fieldobj.tab = this;
	}

	replace_field(fieldobj) {
		fieldobj.tab = this;
	}

	set_active() {
		this.tab_link.find(".nav-link").tab("show");
		this.wrapper.addClass("show");

		// For child row forms, keep active tab local
		if (this.layout?.grid_row_form) {
			this.layout.grid_row_form.active_tab_fieldname = this.df.fieldname;
		} else {
			this.frm?.set_active_tab?.(this);
		}
	}

	is_active() {
		return this.wrapper.hasClass("active");
	}

	is_hidden() {
		return this.wrapper.hasClass("hide") && this.tab_link.hasClass("hide");
	}

	setup_listeners() {
		this.tab_link.find(".nav-link").on("shown.bs.tab", () => {
			if (this.layout?.grid_row_form) {
				this.layout.grid_row_form.active_tab_fieldname = this.df.fieldname;
			} else {
				this.frm?.set_active_tab?.(this);
			}
		});
	}
}