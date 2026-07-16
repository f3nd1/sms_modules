from typing import Literal

import frappe
from educ_sg.educ_sg.doctype.confidential_master_list.confidential_master_list import which_func,mask_date,shuffle,mask_emails,replace_with_placeholder
from educ_sg.public.override_method.get_html_and_style import custom_get_html_and_style
def child_masking_print(to_be_masked,doc,df):
    if frappe.db.exists("Confidential Master List",{"disabled": 0,"name": df.options}) and df.options!="Confidential Master List":
        sensitive_doc = frappe.get_doc("Confidential Master List",df.options)
        sensitive_fields = [sensitive_field for sensitive_field in sensitive_doc.sensitive_fields if sensitive_field.category]
        meta = frappe.get_meta(df.options)
        for field in sensitive_fields:
            sensitive_field = field.field
            sensitive_fieldtype = meta.get_field(sensitive_field)
            category = field.category
            masking_format = frappe.db.get_value("Confidential Rule List", {"category": category}, "required_masking_format")
            mask = which_func[masking_format]

            if sensitive_fieldtype.fieldtype in ["Date","Link","Select","Int","Float","Currency","Percent","Rating"] or (mask == mask_date or mask==shuffle or mask==mask_emails):

                try:
                    for ct in getattr(doc,df.fieldname):
                        formatted_date = ''
                        # if hasattr(ct,sensitive_field) and mask == mask_date and sensitive_fieldtype.fieldtype=="Date":
                        #     dt = datetime.strptime(getattr(ct,sensitive_field), "%Y-%m-%d")
                        #     formatted_date = dt.strftime("%d %B %Y")

                        to_be_masked.append({'masking': mask, 'field': field, 'doctype_type': "child",'type': sensitive_fieldtype.fieldtype, 'label': sensitive_fieldtype.label,'value': formatted_date if sensitive_fieldtype.fieldtype=="Date" else (getattr(ct,sensitive_field) if hasattr(ct,sensitive_field) else '') , 'real_date': getattr(ct,sensitive_field) if hasattr(ct,sensitive_field) else ''})

                except TypeError as e:
                    print(e)
                    if "'NoneType'" in str(e):
                        pass
    return doc,to_be_masked
def get_print(
	doctype=None,
	name=None,
	print_format=None,
	style=None,
	as_pdf=False,
	doc=None,
	output=None,
	no_letterhead=0,
	password=None,
	pdf_options=None,
	letterhead=None,
	pdf_generator: Literal["wkhtmltopdf", "chrome"] | None = None,
):
	"""Get Print Format for given document.
	:param doctype: DocType of document.
	:param name: Name of document.
	:param print_format: Print Format name. Default 'Standard',
	:param style: Print Format style.
	:param as_pdf: Return as PDF. Default False.
	:param password: Password to encrypt the pdf with. Default None
	:param pdf_generator: PDF generator to use. Default 'wkhtmltopdf'
	"""

	"""
	local.form_dict.pdf_generator is set from before_request hook (print designer app) for download_pdf endpoint
	if it is not set (internal function call) then set it
	"""
	import copy

	from frappe.utils.pdf import get_pdf
	from frappe.website.serve import get_response_without_exception_handling

	local = frappe.local
	if "pdf_generator" not in local.form_dict:
		# if arg is passed, use that, else get setting from print format
		if pdf_generator is None:
			pdf_generator = (
				frappe.get_cached_value("Print Format", print_format, "pdf_generator") or "wkhtmltopdf"
			)
		local.form_dict.pdf_generator = pdf_generator

	original_form_dict = copy.deepcopy(local.form_dict)
	try:
		local.form_dict.doctype = doctype
		local.form_dict.name = name
		local.form_dict.format = print_format
		local.form_dict.style = style
		local.form_dict.doc = doc
		local.form_dict.no_letterhead = no_letterhead
		local.form_dict.letterhead = letterhead

		pdf_options = pdf_options or {}
		if password:
			pdf_options["password"] = password

		response = get_response_without_exception_handling("printview", 200)
		html = str(response.data, "utf-8")
        # masking section ----------------------------------------------------------------------------------------------->
		import json
		try:
			for names in json.loads(frappe.local.request.args.get("name")):
				docdoc=frappe.get_doc(doctype,names)
				to_be_masked = []
				child_doctypes=frappe.get_all("DocField", {"fieldtype": "Table", "parent": doctype}, ['options','fieldname'])
				custom_child_doctypes=frappe.get_all("Custom Field", {"fieldtype": "Table", "dt": doctype}, ['options','fieldname'])

				for child in child_doctypes:
					if frappe.db.exists("Confidential Master List",child['options']) and child['options']!="Confidential Master List":
						docdoc,to_be_masked=child_masking_print(to_be_masked,docdoc,child)
				for child in custom_child_doctypes:
					if frappe.db.exists("Confidential Master List",child['options']) and child['options']!="Confidential Master List":
						docdoc,to_be_masked=child_masking_print(to_be_masked,docdoc,child)

				if frappe.db.exists("Confidential Master List", {"disabled": 0,"name": doctype}) and doctype!="Confidential Master List":
					sensitive_doc = frappe.get_doc("Confidential Master List",doctype)
					sensitive_fields = [sensitive_field for sensitive_field in sensitive_doc.sensitive_fields if sensitive_field.category]

					meta = frappe.get_meta(doctype)
					for field in sensitive_fields:
						sensitive_field = field.field
						category = field.category
						masking_format = frappe.db.get_value("Confidential Rule List", {"category": category}, "required_masking_format")
						mask = which_func[masking_format]

						sensitive_fieldtype = meta.get_field(sensitive_field)
						try:
							formatted_date = ''
							to_be_masked.append({'masking': mask, 'field': field, 'doctype_type': "parent", 'type': sensitive_fieldtype.fieldtype,'label': sensitive_fieldtype.label, 'value': (getattr(docdoc,sensitive_field) if hasattr(docdoc,sensitive_field) else ''), 'real_date': getattr(docdoc,sensitive_field) if hasattr(docdoc,sensitive_field) else ''})

						except TypeError as e:
							if "'NoneType'" in str(e):
								pass
				for data in to_be_masked:
					if data['masking'] == mask_date and data['value']:
						if data['real_date']:
							html = html.replace(str(data['real_date']),data['masking'](data['real_date']) if data['masking'] != replace_with_placeholder else data['masking'](data['field'].label,data['value']))
						html = html.replace(str(data['value']),data['masking'](data['real_date']) if data['masking'] != replace_with_placeholder else data['masking'](data['field'].label,data['value']))

					if data['value']:
						html = html.replace(str(data['value']),data['masking'](data['value']) if data['masking'] != replace_with_placeholder else data['masking'](data['field'].label,data['value']))

						if data['type']=="Date" and data['masking'] == mask_date:
							formatted_date = data['real_date'].strftime("%d %B %Y")
							html = html.replace(str(formatted_date),data['masking'](data['real_date']) if data['masking'] != replace_with_placeholder else data['masking'](data['field'].label,data['value']))
		except Exception as e:
			frappe.log_error(e)
			pass


		# end masking section ----------------------------------------------------------------------------------------------->

	finally:
		local.form_dict = original_form_dict
	if not as_pdf:
		return html

	if local.form_dict.pdf_generator != "wkhtmltopdf":
		hook_func = frappe.get_hooks("pdf_generator")
		for hook in hook_func:
			"""
			check pdf_generator value in your hook function.
			if it matches run and return pdf else return None
			"""
			pdf = frappe.call(
				hook,
				print_format=print_format,
				html=html,
				options=pdf_options,
				output=output,
				pdf_generator=local.form_dict.pdf_generator,
			)
			# if hook returns a value, assume it was the correct pdf_generator and return it
			if pdf:
				return pdf
	for hook in frappe.get_hooks("on_print_pdf"):
		frappe.call(hook, doctype=doctype, name=name, print_format=print_format)

	return get_pdf(html, options=pdf_options, output=output)
