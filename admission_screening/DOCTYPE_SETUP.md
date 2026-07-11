# DocType Setup — Admission Eligibility Assessment

Click-by-click instructions to create this DocType through the Frappe Desk UI only —
no bench, no fixtures import. Every field below matches
`admission_eligibility_assessment.json` 1:1, in the same order, so the two stay in sync.
If your Frappe build ever supports importing a DocType from JSON (e.g. via
Setup > Data Import for the `DocType` doctype itself, on instances where that is enabled),
you can use the JSON file directly instead of clicking through this guide.

## 1. Create the DocType record

1. Go to **Setup > DocType List** (or search "DocType" in the awesomebar) → **New**.
2. **Name:** `Admission Eligibility Assessment`
3. **Module:** `Educ Sg` (or your preferred module — adjust `module` in the JSON to match
   if you pick a different one).
4. **Naming Rule:** `Expression (old style)`
5. **Autoname:** `AEA-.YYYY.-.#####`
6. Leave **Is Submittable**, **Is Child Table**, **Is Single** unchecked.
7. Check **Track Changes** (audit trail on edits).
8. **Sort Field:** `Modified`, **Sort Order:** `Descending`.
9. **Title Field:** `student_applicant` (set this after the field exists — see step 2).
10. Do not Save yet — add the fields first (Frappe lets you build fields and save once).

## 2. Add fields (Fields tab, "+ Add Row" for each)

For every row: set **Label**, **Type**, then only the extra columns noted. Leave anything
not mentioned at its default.

### Section: Applicant

| # | Label | Type | Options | Fetch From | Reqd | Read Only | Notes |
|---|-------|------|---------|------------|------|-----------|-------|
| 1 | Applicant | Section Break | | | | | fieldname `section_break_applicant` |
| 2 | Student Applicant | Link | `Student Applicant` | | ✅ | | fieldname `student_applicant`; check **In List View** and **In Standard Filter** |
| 3 | Applicant Name | Data | | `student_applicant.first_name` | | ✅ | |
| 4 | (blank) | Column Break | | | | | fieldname `column_break_applicant_1` |
| 5 | Program | Link | `Program` | `student_applicant.program` | | ✅ | |
| 6 | Course Type | Link | `Course Type` | `student_applicant.custom_course_type` | | ✅ | |
| 7 | Student Type | Data | | `student_applicant.student_type` | | ✅ | |
| 8 | Application Status | Data | | `student_applicant.application_status` | | ✅ | |

### Section: Facts

| # | Label | Type | Options | Fetch From | Read Only | Notes |
|---|-------|------|---------|------------|-----------|-------|
| 9 | Facts | Section Break | | | | fieldname `section_break_facts` |
| 10 | Date of Birth | Date | | `student_applicant.date_of_birth` | ✅ | |
| 11 | Age | Int | | | ✅ | filled by the Client Script |
| 12 | Nationality | Data | | `student_applicant.nationality` | ✅ | |
| 13 | Residence Status | Data | | `student_applicant.residence_status` | ✅ | |
| 14 | (blank) | Column Break | | | | fieldname `column_break_facts_1` |
| 15 | Highest Qualification | Data | | | ✅ | filled by the Client Script from Educational Background |
| 16 | English Test | Data | | | ✅ | filled by the Client Script |
| 17 | English Score | Data | | | ✅ | filled by the Client Script |
| 18 | Work Experience (Years) | Float | precision `1` | | ✅ | summed by the Client Script from Employment History |

### Section: Result

| # | Label | Type | Options | Read Only | Notes |
|---|-------|------|---------|-----------|-------|
| 19 | Result | Section Break | | | fieldname `section_break_result` |
| 20 | Recommendation | Select | (blank line, then each option on its own line)<br>`Eligible`<br>`Not Eligible`<br>`Conditional – English Placement Required`<br>`Requires Interview`<br>`Requires Additional Documents`<br>`Manual Review` | ✅ | check **In List View**, **In Standard Filter**, **Bold** |
| 21 | Academic Status | Select | (blank line)<br>`Pass`<br>`Fail`<br>`Review` | ✅ | |
| 22 | English Status | Select | same as above | ✅ | |
| 23 | Age Status | Select | same as above | ✅ | |
| 24 | (blank) | Column Break | | | fieldname `column_break_result_1` |
| 25 | Proposed Alternative | Data | | ✅ | fallback course suggestion, plain text |
| 26 | Assessment Detail (JSON) | Code | options `JSON` | ✅ | machine-readable reasons/flags |
| 27 | Eligibility Result | Section Break | | | fieldname `section_break_html` |
| 28 | Eligibility Result | HTML | | | fieldname `eligibility_result_html` — this is the render target |

### Section: Audit

| # | Label | Type | Options | Read Only | Notes |
|---|-------|------|---------|-----------|-------|
| 29 | Audit | Section Break | | | fieldname `section_break_audit`; check **Collapsible** |
| 30 | Assessed On | Datetime | | ✅ | |
| 31 | Assessed By | Link | `User` | ✅ | |
| 32 | (blank) | Column Break | | | fieldname `column_break_audit_1` |
| 33 | Staff Override Notes | Text | | | free text, editable by staff |

## 3. Permissions

Under the **Permissions** tab, add a row for **System Manager** with Read/Write/Create/
Delete/Report/Export/Print/Email/Share all checked. Add any admissions-specific role your
site already uses (e.g. an "Admissions Officer" role) with at least Read/Write/Create —
this DocType intentionally ships with only System Manager so you choose who else gets
access.

## 4. Save

Click **Save**. Frappe will create the DocType and its fields exactly as listed above.

## 5. The one allowed touch to Student Applicant

The task spec allows exactly one optional, non-invasive touch to `Student Applicant`: a
**Dashboard Link** back to this DocType (so staff viewing an applicant can jump to their
assessment(s)), NOT a new field. To add it:

1. Open **Student Applicant** in DocType List → **Customize Form** (this uses the Customize
   Form / Property Setter mechanism, which does not alter the standard DocType's own
   fields — it is UI-only and reversible).
2. Under **Actions and Links > Links**, add a row: **Link DocType** = `Admission
   Eligibility Assessment`, **Link Fieldname** = `student_applicant`, **Group** =
   `Admissions` (or similar).
3. Save.

This is purely a dashboard connection (like the "Students" link you already have on the
Agent DocType) — it does not add, remove, or modify any field on Student Applicant.

## Next step

Do **not** build the Client Script yet. Checkpoint 2 (the rules engine) needs the real
MER thresholds and English/academic equivalency values — see
`mer_rules.skeleton.js` in this folder for exactly what's still needed.
