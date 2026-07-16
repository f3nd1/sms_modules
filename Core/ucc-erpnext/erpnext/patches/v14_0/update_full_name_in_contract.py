import frappe
from frappe import qb
from pymysql.err import OperationalError


def execute():
	con = qb.DocType("Contract")
	for c in (
		qb.from_(con)
		.select(con.name, con.party_type, con.party_name)
		.where(con.party_full_name.isnull())
		.run(as_dict=True)
	):
		if not c.party_type or not c.party_name:
			continue

		meta = frappe.get_meta(c.party_type)
		field = f"{c.party_type.lower()}_name"
		meta_fieldnames = {df.fieldname for df in getattr(meta, "fields", []) if df.fieldname}
		candidate_fields = []

		if field in meta_fieldnames:
			candidate_fields.append(field)

		if meta.title_field and meta.title_field not in candidate_fields:
			candidate_fields.append(meta.title_field)

		if "name" not in candidate_fields:
			candidate_fields.append("name")
		for fieldname in candidate_fields:
			try:
				res = frappe.db.get_value(c.party_type, c.party_name, fieldname)
			except OperationalError as err:
				# skip fields that don't exist in the database schema
				if err.args and err.args[0] == 1054:
					continue
				raise
			if res:
				frappe.db.set_value("Contract", c.name, "party_full_name", res)
				break
