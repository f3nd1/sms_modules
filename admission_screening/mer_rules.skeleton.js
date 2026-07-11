// =============================================================================
// Admission Eligibility Assessment — MER & equivalency rules (SKELETON)
// =============================================================================
//
// This is NOT the Client Script yet. It is the reviewable data structure for
// checkpoint 1: every course category, academic tier, and English band the
// engine will use, with every actual number left as an explicit placeholder
// (`null`) plus an `// ASK:` comment saying exactly what's needed.
//
// Once you fill in the values below (directly in this file, or by telling me
// the numbers so I can fill them in), this becomes the literal
// `// === EDIT THRESHOLDS HERE ===` object at the top of the Client Script in
// checkpoint 2 — same shape, same keys, just with real values instead of null.
//
// Nothing here talks to ERPNext or OpenAI. It is pure data.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. MER_RULES — one entry per course/course-type.
//    Course categories below are taken from your own task description. Keys are
//    placeholder identifiers (left column of COURSE_TYPE_KEY_MAP maps your real
//    Course Type / Program record names onto these keys — see section 4).
// -----------------------------------------------------------------------------

// === EDIT THRESHOLDS HERE ===
const MER_RULES = {
  PREP_AEIS: {
    label: "Preparatory — AEIS",
    minimumAge: null,                      // ASK: minimum age to enrol?
    requiredAcademicLevel: null,           // ASK: tier key from ACADEMIC_EQUIVALENCY (section 2), or null if none required
    requiredEnglishBand: null,             // ASK: band key from ENGLISH_EQUIVALENCY (section 3), or null if none required
    workExperienceAlternativeYears: null,  // ASK: years of work experience that can substitute for the academic requirement (or null = not applicable for this course)
    alternativeCourse: null                // ASK: fallback/foundation course to propose if MER not met
  },
  PREP_OLEVEL: {
    label: "Preparatory — O-Level",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  PREP_ALEVEL: {
    label: "Preparatory — A-Level",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  ENGLISH_L1: {
    label: "English Certificate — Level 1",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,             // ASK: likely the lowest band, or null (this course IS the entry point)
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  ENGLISH_L2: {
    label: "English Certificate — Level 2",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,             // ASK: presumably requires passing/completing L1 — how should that be checked? (see note at bottom)
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  ENGLISH_L3: {
    label: "English Certificate — Level 3",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  ENGLISH_IELTS_PREP: {
    label: "IELTS Preparation Course",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  GENERAL_MANAGEMENT: {
    label: "General Management",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,  // ASK: is this course specifically a mature-candidate / work-experience pathway?
    alternativeCourse: null
  },
  BIZ_DIPLOMA: {
    label: "Business Management — Diploma",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null                // ASK: General Management, or an English pathway course?
  },
  BIZ_ADV_DIPLOMA: {
    label: "Business Management — Advanced Diploma",
    minimumAge: null,
    requiredAcademicLevel: null,           // ASK: does this require the UCC Diploma specifically, or any equivalent Diploma?
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null                // ASK: presumably BIZ_DIPLOMA
  },
  BIZ_POSTGRAD: {
    label: "Business Management — Postgraduate",
    minimumAge: null,
    requiredAcademicLevel: null,           // ASK: Bachelor's degree required? Or Adv Diploma + years of work experience (mature entry)?
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,  // ASK: years of relevant work experience accepted in lieu of a degree?
    alternativeCourse: null                // ASK: presumably BIZ_ADV_DIPLOMA
  },
  TOURISM_HOSPITALITY: {
    label: "Tourism & Hospitality",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  AI_DIPLOMA: {
    label: "Applied AI — Diploma",
    minimumAge: null,
    requiredAcademicLevel: null,
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null
  },
  AI_ADV_DIPLOMA: {
    label: "Applied AI — Advanced Diploma",
    minimumAge: null,
    requiredAcademicLevel: null,           // ASK: requires AI_DIPLOMA specifically, or any equivalent Diploma?
    requiredEnglishBand: null,
    workExperienceAlternativeYears: null,
    alternativeCourse: null                // ASK: presumably AI_DIPLOMA
  }
};

// -----------------------------------------------------------------------------
// 2. ACADEMIC_EQUIVALENCY — ordered tiers (lowest to highest), plus a lookup from
//    a raw qualification name (as it lands in the DocType's own
//    `highest_qualification` field — filled by AI extraction from the uploaded
//    PDF, then staff-editable) to a tier key. `requiredAcademicLevel` above
//    should reference one of these tier `key`s.
// -----------------------------------------------------------------------------

// === EDIT THRESHOLDS HERE ===
const ACADEMIC_EQUIVALENCY = {
  tiers: [
    { key: "TIER_NONE", label: "No formal qualification / Primary", rank: 0 },
    { key: "TIER_SECONDARY", label: "Secondary / O-Level / IGCSE equivalent", rank: 1 },
    { key: "TIER_PREU", label: "Pre-University / A-Level / High School Diploma equivalent", rank: 2 },
    { key: "TIER_DIPLOMA", label: "Diploma equivalent", rank: 3 },
    { key: "TIER_ADV_DIPLOMA", label: "Advanced Diploma equivalent", rank: 4 },
    { key: "TIER_DEGREE", label: "Bachelor's Degree equivalent", rank: 5 },
    { key: "TIER_POSTGRAD", label: "Postgraduate / Master's equivalent", rank: 6 }
  ],
  // ASK: what qualification-name strings are likely to show up in
  // `highest_qualification` (as extracted from applicants' transcripts/certificates,
  // or typed by staff) — e.g. "GCE O-Level", "SPM", "High School Diploma", "STPM",
  // "Bachelor of Business Administration", ...? List them and I will map each to a
  // tier key above. A few common examples are sketched (commented out) below —
  // uncomment and correct once confirmed, or replace entirely. The extraction
  // prompt in checkpoint 2 can also be steered to prefer these exact strings.
  qualificationToTier: {
    // "GCE O-Level": "TIER_SECONDARY",
    // "IGCSE": "TIER_SECONDARY",
    // "GCE A-Level": "TIER_PREU",
    // "High School Diploma": "TIER_PREU",
    // "Diploma": "TIER_DIPLOMA",
    // "Advanced Diploma": "TIER_ADV_DIPLOMA",
    // "Bachelor's Degree": "TIER_DEGREE",
    // "Master's Degree": "TIER_POSTGRAD"
  }
};

// -----------------------------------------------------------------------------
// 3. ENGLISH_EQUIVALENCY — one row per proficiency band, seven columns as named
//    in the task spec. `requiredEnglishBand` above should reference a row's `key`.
//    Every numeric value is a placeholder. Ranges should be given as [min, max]
//    (inclusive) or a single accepted grade/string for IGCSE / GCE O-Level.
// -----------------------------------------------------------------------------

// === EDIT THRESHOLDS HERE ===
const ENGLISH_EQUIVALENCY = [
  {
    key: "BAND_NONE",
    label: "No English requirement / UCC Placement Test pathway",
    uccPlacementTest: null,   // ASK: e.g. [0, 39]  (scale is 0-100 per the reference guide)
    ielts: null,              // ASK: e.g. [0, 4.0] (scale is 1-9)
    pte: null,                // ASK: (scale is 10-90)
    toeflIbt: null,           // ASK: (scale is 0-120)
    duolingo: null,           // ASK: (scale is 10-160)
    igcse: null,              // ASK: grade string, or "not applicable"
    oLevel: null              // ASK: grade string, or "not applicable"
  },
  {
    key: "BAND_ELEMENTARY",
    label: "Elementary (e.g. English Certificate L1 entry)",
    uccPlacementTest: null,
    ielts: null,
    pte: null,
    toeflIbt: null,
    duolingo: null,
    igcse: null,
    oLevel: null
  },
  {
    key: "BAND_PRE_INTERMEDIATE",
    label: "Pre-Intermediate (e.g. L2 entry)",
    uccPlacementTest: null,
    ielts: null,
    pte: null,
    toeflIbt: null,
    duolingo: null,
    igcse: null,
    oLevel: null
  },
  {
    key: "BAND_INTERMEDIATE",
    label: "Intermediate (e.g. L3 entry / IELTS Prep entry)",
    uccPlacementTest: null,
    ielts: null,
    pte: null,
    toeflIbt: null,
    duolingo: null,
    igcse: null,
    oLevel: null
  },
  {
    key: "BAND_UPPER_INTERMEDIATE",
    label: "Upper-Intermediate (typical Diploma-level entry)",
    uccPlacementTest: null,
    ielts: null,              // ASK: is this the "IELTS 5.5 or equivalent" band mentioned publicly for diploma entry?
    pte: null,
    toeflIbt: null,
    duolingo: null,
    igcse: null,
    oLevel: null
  },
  {
    key: "BAND_ADVANCED",
    label: "Advanced (typical Degree/Postgrad-level entry)",
    uccPlacementTest: null,
    ielts: null,
    pte: null,
    toeflIbt: null,
    duolingo: null,
    igcse: null,
    oLevel: null
  }
];

// -----------------------------------------------------------------------------
// 4. COURSE_TYPE_KEY_MAP — maps the value in this DocType's own `course_type`
//    field (a plain Data field — AI-extracted from the uploaded PDF, then
//    staff-editable; there is no Student Applicant link anymore) onto a key in
//    MER_RULES above. Because `course_type` is free text rather than a
//    validated Link, the left-hand side here should be the exact controlled
//    vocabulary you want staff/the AI extraction prompt to use — see
//    extraction_schema.md's "Course type controlled vocabulary" section, which
//    references these same strings. The Client Script (checkpoint 2) should do
//    a best-effort (case-insensitive / partial) match against these keys,
//    since free text can still drift from the exact string.
// -----------------------------------------------------------------------------

// === EDIT THRESHOLDS HERE ===
const COURSE_TYPE_KEY_MAP = {
  // "<course_type string to standardise on>": "PREP_AEIS",
  // "<course_type string to standardise on>": "PREP_OLEVEL",
  // "<course_type string to standardise on>": "PREP_ALEVEL",
  // "<course_type string to standardise on>": "ENGLISH_L1",
  // "<course_type string to standardise on>": "ENGLISH_L2",
  // "<course_type string to standardise on>": "ENGLISH_L3",
  // "<course_type string to standardise on>": "ENGLISH_IELTS_PREP",
  // "<course_type string to standardise on>": "GENERAL_MANAGEMENT",
  // "<course_type string to standardise on>": "BIZ_DIPLOMA",
  // "<course_type string to standardise on>": "BIZ_ADV_DIPLOMA",
  // "<course_type string to standardise on>": "BIZ_POSTGRAD",
  // "<course_type string to standardise on>": "TOURISM_HOSPITALITY",
  // "<course_type string to standardise on>": "AI_DIPLOMA",
  // "<course_type string to standardise on>": "AI_ADV_DIPLOMA"
  // ASK: the exact course_type strings you want to standardise on, one per row
  // above — a fixed controlled vocabulary here keeps both the AI extraction
  // prompt and the rules lookup reliable.
};

// =============================================================================
// ✅ CHECKLIST — what's needed to move to checkpoint 2 (the full engine)
// =============================================================================
// A. Per course in MER_RULES (14 entries): minimumAge, requiredAcademicLevel
//    (a tier key), requiredEnglishBand (a band key), workExperienceAlternativeYears
//    (or "not applicable"), alternativeCourse.
// B. ACADEMIC_EQUIVALENCY.qualificationToTier: the qualification-name strings likely
//    to appear in `highest_qualification` (AI-extracted or staff-typed), each
//    mapped to a tier.
// C. ENGLISH_EQUIVALENCY: every cell in all 6 rows x 7 columns (or tell me to use
//    the general IELTS/TOEFL/PTE/Duolingo industry concordance figures I already
//    have as a starting point for those four columns specifically, still flagged
//    as unconfirmed against UCC's own published table).
// D. COURSE_TYPE_KEY_MAP: the exact course_type strings you want to standardise on
//    (a controlled vocabulary used both to steer the AI extraction prompt in
//    extraction_schema.md and to key the rules lookup), one per MER_RULES key.
// E. Two open policy questions flagged inline above: (1) how L2/L3 English
//    Certificate progression checks prior-level completion, if at all; (2) whether
//    Advanced Diploma / Postgrad require the specific UCC lower qualification or
//    any equivalent.
//
// You can answer inline in chat, or edit this file directly and hand it back —
// either way, once filled in this file becomes the rules object inside the
// Client Script.
// =============================================================================
