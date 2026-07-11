# DocType Setup — Admission Eligibility Assessment

Click-by-click instructions to create this DocType through the Frappe Desk UI only —
no bench, no fixtures import. Every field below matches
`admission_eligibility_assessment.json` 1:1, in the same order, so the two stay in sync.
If your Frappe build ever supports importing a DocType from JSON (e.g. via
Setup > Data Import for the `DocType` doctype itself, on instances where that is enabled),
you can use the JSON file directly instead of clicking through this guide.

**Data source:** this DocType has no link to `Student Applicant` and no Fetch From. Every
applicant fact is either extracted by AI from an uploaded PDF (via the Client Script's
"Extract from PDF" button — see `extraction_schema.md`) or typed in directly by staff. All
Applicant Details fields are plain, editable fields — nothing is read-only except the
values the Client Script itself computes or writes (Age, Extraction Status, the Result
section, and Audit).

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
9. **Title Field:** `applicant_name` (set this after the field exists — see step 2).
10. Do not Save yet — add the fields first (Frappe lets you build fields and save once).

## 2. Add fields (Fields tab, "+ Add Row" for each)

For every row: set **Label**, **Type**, then only the extra columns noted. Leave anything
not mentioned at its default.

### Section: Source Document

| # | Label | Type | Options | Reqd | Read Only | Notes |
|---|-------|------|---------|------|-----------|-------|
| 1 | Source Document | Section Break | | | | fieldname `section_break_source` |
| 2 | Application PDF | Attach | | ✅ | | fieldname `application_pdf`; check **In List View** |
| 3 | Supporting Document (optional) | Attach | | | | fieldname `supporting_pdf` |
| 4 | (blank) | Column Break | | | | fieldname `column_break_source_1` |
| 5 | Extraction Status | Select | (blank line)<br>`Not Extracted`<br>`Extracted`<br>`Extraction Failed`<br>`Manually Entered` | | ✅ | fieldname `extraction_status`; check **In List View**, **In Standard Filter**; set by the Client Script |
| 6 | Extracted JSON (raw AI output) | Code | options `JSON` | | ✅ | fieldname `extracted_json`; audit trail of the raw model response |

### Section: Applicant Details

| # | Label | Type | Options | Read Only | Notes |
|---|-------|------|---------|-----------|-------|
| 7 | Applicant Details | Section Break | | | fieldname `section_break_applicant` |
| 8 | (none) | HTML | see below | | fieldname `applicant_details_note`; a static hint banner — paste the exact `options` HTML from the JSON file (a one-line reminder that these fields are AI-filled but staff must review before assessing) |
| 9 | Applicant Name | Data | | | fieldname `applicant_name` |
| 10 | Date of Birth | Date | | | fieldname `date_of_birth` |
| 11 | Age | Int | | ✅ | fieldname `age`; computed by the Client Script |
| 12 | Nationality | Data | | | fieldname `nationality` |
| 13 | Residence Status | Data | | | fieldname `residence_status` |
| 14 | (blank) | Column Break | | | fieldname `column_break_applicant_1` |
| 15 | Program Applied | Data | | | fieldname `program_applied`; plain text, not a Link |
| 16 | Course Type | Data | | | fieldname `course_type`; plain text — see `mer_rules.skeleton.js` COURSE_TYPE_KEY_MAP for the controlled vocabulary it should be steered toward |
| 17 | Student Type | Data | | | fieldname `student_type` |
| 18 | Highest Qualification | Data | | | fieldname `highest_qualification` |
| 19 | English Test | Data | | | fieldname `english_test` |
| 20 | English Score | Data | | | fieldname `english_score` |
| 21 | Work Experience (Years) | Float | precision `1` | | fieldname `work_experience_years` |

### Section: Result (unchanged from the previous design)

| # | Label | Type | Options | Read Only | Notes |
|---|-------|------|---------|-----------|-------|
| 22 | Result | Section Break | | | fieldname `section_break_result` |
| 23 | Recommendation | Select | (blank line)<br>`Eligible`<br>`Not Eligible`<br>`Conditional – English Placement Required`<br>`Requires Interview`<br>`Requires Additional Documents`<br>`Manual Review` | ✅ | check **In List View**, **In Standard Filter**, **Bold** |
| 24 | Academic Status | Select | (blank line)<br>`Pass`<br>`Fail`<br>`Review` | ✅ | |
| 25 | English Status | Select | same as above | ✅ | |
| 26 | Age Status | Select | same as above | ✅ | |
| 27 | (blank) | Column Break | | | fieldname `column_break_result_1` |
| 28 | Proposed Alternative | Data | | ✅ | fallback course suggestion, plain text |
| 29 | Assessment Detail (JSON) | Code | options `JSON` | ✅ | machine-readable reasons/flags |
| 30 | Eligibility Result | Section Break | | | fieldname `section_break_html` |
| 31 | Eligibility Result | HTML | | | fieldname `eligibility_result_html` — this is the render target |

### Section: Audit (unchanged)

| # | Label | Type | Options | Read Only | Notes |
|---|-------|------|---------|-----------|-------|
| 32 | Audit | Section Break | | | fieldname `section_break_audit`; check **Collapsible** |
| 33 | Assessed On | Datetime | | ✅ | |
| 34 | Assessed By | Link | `User` | ✅ | |
| 35 | (blank) | Column Break | | | fieldname `column_break_audit_1` |
| 36 | Staff Override Notes | Text | | | free text, editable by staff |

## 3. Permissions

Under the **Permissions** tab, add a row for **System Manager** with Read/Write/Create/
Delete/Report/Export/Print/Email/Share all checked. Add any admissions-specific role your
site already uses (e.g. an "Admissions Officer" role) with at least Read/Write/Create —
this DocType intentionally ships with only System Manager so you choose who else gets
access.

## 4. Save

Click **Save**. Frappe will create the DocType and its fields exactly as listed above.

## No Student Applicant touch

Earlier drafts of this design linked to `Student Applicant`. That link has been removed
entirely per the revised spec — the PDF upload is now the sole data source, so there is
nothing to touch on `Student Applicant` at all (not even the optional dashboard link from
before).

## Next step

The Client Script is already written — `admission_eligibility_assessment.js` — and is
ready to use as-is, no more data to wait on:

1. Create the DocType exactly as described in this guide, then **Save**.
2. Go to **Setup > Client Script** (or search "Client Script" in the awesomebar) → **New**.
3. **DocType:** `Admission Eligibility Assessment`. **Enabled:** checked.
4. Paste the entire contents of `admission_eligibility_assessment.js` into the Script
   field, then **Save**.
5. Open a new Admission Eligibility Assessment record, attach a real applicant PDF to
   **Application PDF**, and confirm extraction fires automatically (via AI Settings — see
   the script's "AI Settings" button for the OpenAI key popup, stored only in this
   browser's `localStorage`). Review/correct the extracted fields, then click
   **Run Assessment** and confirm the Eligibility Result renders correctly.

The rules data (`ACADEMIC_EQUIVALENCY`, `ENGLISH_EQUIVALENCY`, `MER_RULES`,
`COURSE_TYPE_KEY_MAP`) is embedded directly in the Client Script, sourced from
`mer_rules.skeleton.js`. Five data points in that file are flagged `ASK/VERIFY` — genuine
gaps or ambiguities in the source reference material, not blockers — confirm them with UCC
admissions when convenient and update both `mer_rules.skeleton.js` and the matching
`// === EDIT THRESHOLDS HERE ===` block in the Client Script together.
