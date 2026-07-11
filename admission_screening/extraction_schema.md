# AI Extraction JSON Schema

This is the exact contract between the **Extract from PDF** button and the OpenAI vision
model call in the Client Script (checkpoint 2). It is not itself code — it's the reviewable
spec checkpoint 1 asks for, so the shape can be confirmed before the script is written.

## Request (checkpoint 2 behaviour, described here for context)

1. Staff attach `application_pdf` (and optionally `supporting_pdf`) and click **Extract from
   PDF**.
2. The Client Script reads the file(s) from their Frappe file URL and sends them to the
   **vision model** configured in AI Settings (browser `localStorage`, never a DocType
   field), with a system instruction that the model must return **only** the JSON object
   below — no prose, no markdown fences.
3. The raw response is stored verbatim in `extracted_json` (read-only, audit trail) and
   parsed into the editable Applicant Details fields.
4. `extraction_status` is set to `Extracted` on success, `Extraction Failed` on any
   parse/network/auth error (with a clear on-screen message — never a silent failure), or
   stays `Not Extracted` until first attempted. If staff edit any Applicant Details field
   by hand — whether extraction succeeded, failed, or was never run — `extraction_status`
   becomes `Manually Entered` on save.
5. **Nothing downstream runs automatically.** Run Assessment is a separate, explicit staff
   action, so extracted values are always human-reviewed first.

## Response shape (what the model must return)

```json
{
  "applicant_name": "string or null",
  "date_of_birth": "YYYY-MM-DD or null",
  "nationality": "string or null",
  "residence_status": "string or null",
  "program_applied": "string or null",
  "course_type": "string or null",
  "student_type": "string or null",
  "highest_qualification": "string or null",
  "english_test": "string or null",
  "english_score": "string or null",
  "work_experience_years": "number or null",
  "extraction_notes": "string or null"
}
```

Field-by-field mapping to the DocType (1:1 with `admission_eligibility_assessment.json`):

| JSON key | DocType field | Notes |
|---|---|---|
| `applicant_name` | `applicant_name` | Full name as printed on the document. |
| `date_of_birth` | `date_of_birth` | **Must be ISO `YYYY-MM-DD`.** The prompt should instruct the model to convert whatever date format appears (e.g. `12/05/2001`, `5 Dec 2001`) into ISO before returning it, since Frappe's Date field requires ISO on `frm.set_value`. |
| `nationality` | `nationality` | As stated on the document (passport/NRIC/ID page, application form, etc.). |
| `residence_status` | `residence_status` | Free text as found (e.g. "Foreigner", "Singapore PR"); not constrained to the old Select options since this is now unlinked from Student Applicant. |
| `program_applied` | `program_applied` | The programme/course name as written on the application form. |
| `course_type` | `course_type` | **Should be steered toward a controlled vocabulary** — see below. |
| `student_type` | `student_type` | e.g. "Full-Time" / "Part-Time", as stated. |
| `highest_qualification` | `highest_qualification` | The single highest qualification found across any transcripts/certificates in the document — should match (or be close to) an entry in `ACADEMIC_EQUIVALENCY.qualificationToTier` in `mer_rules.skeleton.js`. |
| `english_test` | `english_test` | Name of the English qualification found (e.g. "IELTS", "GCE O-Level", "None found"). |
| `english_score` | `english_score` | The raw score/band/grade as printed (e.g. "6.5", "C6"). Kept as a string since scales differ (IELTS band vs. TOEFL integer vs. a letter grade). |
| `work_experience_years` | `work_experience_years` | Total relevant work experience, summed across any employment history shown, in years (decimal allowed, e.g. `3.5`). `null` if none found. |
| `extraction_notes` | *(not a DocType field — shown to staff only)* | Anything the model is unsure about, or couldn't find. Surfaced in the on-screen extraction result so staff know what to double-check, not written to any field. |

## Course type controlled vocabulary (cross-reference)

`course_type` should be nudged toward the same course-category vocabulary used in
`mer_rules.skeleton.js`'s `MER_RULES` (14 categories: Preparatory AEIS / O-Level / A-Level;
English Certificate L1 / L2 / L3; IELTS Preparation; General Management; Business
Management Diploma / Advanced Diploma / Postgraduate; Tourism & Hospitality; Applied AI
Diploma / Advanced Diploma). The exact strings the model should be told to use will be the
same strings you give me for `COURSE_TYPE_KEY_MAP` (checklist item D in
`mer_rules.skeleton.js`) — once those are confirmed, the extraction prompt in checkpoint 2
will list them verbatim as the allowed values, and `course_type` stays a free-text `Data`
field so an unexpected/unlisted value never blocks saving — it just won't match a rule
until staff correct it.

## Failure handling (checkpoint 2 behaviour, described here for context)

- **No AI key / AI disabled**: Extract from PDF is not offered as a silent no-op — clicking
  it shows a clear message directing staff to AI Settings, or to fill in Applicant Details
  by hand and proceed straight to Run Assessment.
- **Network/CORS error calling OpenAI directly from the browser**: shown verbatim to staff
  with a note that this environment may need a Server Script proxy — never silently
  swallowed, never falls back to inventing data.
- **Model returns non-JSON or an incomplete object**: `extraction_status = Extraction
  Failed`, raw response still saved to `extracted_json` for review, all Applicant Details
  fields left as-is (or blank on a first attempt) for manual entry.
- **Partial extraction** (some keys found, others `null`): treated as success — populate
  what was found, leave the rest blank for staff to fill in, status still `Extracted`.
