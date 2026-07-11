// =============================================================================
// Admission Eligibility Assessment — MER & equivalency rules
// =============================================================================
//
// SOURCED FROM REAL DATA (2026-07-11):
//   - Per-program entry requirements: UCC's own "Module.xlsx" Program sheet
//     (33 real program records, provided by the user). Every number below is
//     transcribed verbatim from that sheet's "Entry Requirements" column.
//   - Academic/English equivalency tables: UCC's "Academic Level and English
//     Proficiency Benchmarks" reference page content, pasted directly by the
//     user (the live URL blocks automated fetching, so this was the only way
//     to get it). Transcribed verbatim, including the 18-row proficiency
//     descriptor table and the two country-specific high-school-grade tables.
//
// This is still NOT the Client Script — it is the data object that gets
// pasted into the `// === EDIT THRESHOLDS HERE ===` section at the top of
// admission_eligibility_assessment.js. Keeping it in its own file makes it
// easy to review/edit the numbers without touching the engine logic.
//
// MERGE DECISIONS (confirmed with the user):
//   - E-Learning variants merged into their non-E-Learning counterpart: their
//     entry requirements text is identical in every case in the source data
//     (delivery mode only, not an eligibility difference).
//   - Mandarin-medium variants kept as SEPARATE entries from their
//     English-medium counterpart, because their language requirement is
//     genuinely different (Mandarin-medium schooling / HSK4, not an English
//     test) — see the "MANDARIN PROGRAMMES" note near MER_RULES.
//   - The 7 AEIS grade-level variants (Primary 2 through Secondary 3) are
//     merged into one PREP_AEIS entry: their eligibility text is identical
//     across all 7 (only the target placement grade differs, which is a
//     scheduling detail captured by `program_applied`, not an eligibility
//     gate).
//   - Postgraduate Certificate and Postgraduate Diploma are kept SEPARATE
//     even though their entry-requirements text happens to be identical,
//     because they are different awards a student applies to specifically.
//
// STILL FLAGGED — see inline ASK/VERIFY comments:
//   - ADAAI (Advanced Diploma in Applied AI) has no stated Minimum Age in the
//     source, unlike its sibling ADBA (17). Left null rather than assumed.
//   - "Preparatory Course for IELTS" requires IELTS 5.5 to enrol, the same
//     bar as Certificate in English Level 3 — this looks unusual for a
//     course meant to prepare candidates FOR the IELTS test, but is
//     transcribed exactly as given. Worth double-checking with UCC.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. ACADEMIC_EQUIVALENCY
//    Tier ladder + qualification-name lookup. Sourced from the pasted
//    "Educational Qualification Equivalency" table (country/system ->
//    Secondary vs Pre-University leaving qualification) plus the generic
//    Diploma/Degree/Postgrad tiers implied throughout the Program sheet's
//    entry-requirements text (e.g. "A Diploma from any institution",
//    "3-Year Bachelor's degree").
// -----------------------------------------------------------------------------

// === EDIT THRESHOLDS HERE ===
const ACADEMIC_EQUIVALENCY = {
  tiers: [
    { key: "TIER_NONE", label: "No formal qualification / below Secondary", rank: 0 },
    { key: "TIER_SECONDARY", label: "Secondary / O-Level / IGCSE / GCSE equivalent (~10-12yr schooling milestone)", rank: 1 },
    { key: "TIER_PREU", label: "Pre-University / A-Level / high-school-leaving equivalent", rank: 2 },
    { key: "TIER_DIPLOMA", label: "Diploma equivalent", rank: 3 },
    { key: "TIER_ADV_DIPLOMA", label: "Advanced Diploma equivalent", rank: 4 },
    { key: "TIER_DEGREE", label: "Bachelor's Degree equivalent", rank: 5 },
    { key: "TIER_POSTGRAD", label: "Postgraduate / Master's equivalent", rank: 6 }
  ],
  // Sourced from UCC's own "Educational Qualification Equivalency" table
  // (Secondary School Leaving Qualification column -> TIER_SECONDARY,
  // Pre-University School Leaving Qualification column -> TIER_PREU), plus
  // generic Diploma/Degree/Postgrad catch-alls. `highest_qualification` is
  // free text (AI-extracted or staff-typed) — the Client Script should do a
  // case-insensitive substring match against these keys, since exact
  // phrasing will vary (e.g. "GCE 'O' Level" vs "GCE O-Level").
  qualificationToTier: {
    // --- Secondary / O-Level tier ---
    "GCE O-Level": "TIER_SECONDARY",
    "SG-Cambridge GCE O-Level": "TIER_SECONDARY",
    "GCSE": "TIER_SECONDARY",
    "IGCSE": "TIER_SECONDARY",
    "SPM": "TIER_SECONDARY",                          // Malaysia
    "HKDSE": "TIER_PREU",                              // Hong Kong — dual-purpose exam; source page lists it as
                                                        // BOTH the secondary and pre-university leaving qualification.
                                                        // Mapped to the higher tier (PREU) here since it also serves
                                                        // as the university-entrance qualification; VERIFY with UCC
                                                        // if a plain "HKDSE" pass should instead satisfy only TIER_SECONDARY.
    "Zhongkao": "TIER_SECONDARY",                       // China (PRC) lower-secondary entrance exam
    "Class 10": "TIER_SECONDARY",                       // India
    "CBSE Class 10": "TIER_SECONDARY",
    "ICSE": "TIER_SECONDARY",
    "IB MYP": "TIER_SECONDARY",                         // IB Middle Years Programme
    "CSEC": "TIER_SECONDARY",                           // Caribbean

    // --- Pre-University / A-Level tier ---
    "GCE A-Level": "TIER_PREU",
    "SG-Cambridge GCE A-Level": "TIER_PREU",
    "GCE A Levels": "TIER_PREU",
    "International A Level": "TIER_PREU",
    "IAL": "TIER_PREU",
    "STPM": "TIER_PREU",                                // Malaysia
    "Gaokao": "TIER_PREU",                              // China (PRC)
    "Class 12": "TIER_PREU",                            // India
    "CBSE Class 12": "TIER_PREU",
    "ISC": "TIER_PREU",
    "Brunei A-Level": "TIER_PREU",
    "Canadian High School Diploma": "TIER_PREU",
    "American High School Diploma": "TIER_PREU",
    "High School Diploma": "TIER_PREU",
    "Abitur": "TIER_PREU",                              // Germany
    "French Baccalaureat": "TIER_PREU",
    "Baccalaureat": "TIER_PREU",
    "European Baccalaureate": "TIER_PREU",
    "IB Diploma": "TIER_PREU",
    "IBDP": "TIER_PREU",
    "CAPE": "TIER_PREU",                                // Caribbean
    "Studentereksamen": "TIER_PREU",                    // Denmark
    "Australian Year 12": "TIER_PREU",
    "HSC": "TIER_PREU",                                 // Australia (NSW)
    "VCE": "TIER_PREU",                                 // Australia (VIC)
    "QCE": "TIER_PREU",                                 // Australia (QLD)
    "WACE": "TIER_PREU",                                // Australia (WA)
    "SACE": "TIER_PREU",                                // Australia (SA)
    "TCE": "TIER_PREU",                                 // Australia (TAS)
    "ACT SSC": "TIER_PREU",                             // Australia (ACT)

    // --- Diploma / Advanced Diploma / Degree / Postgrad ---
    "Diploma": "TIER_DIPLOMA",
    "Advanced Diploma": "TIER_ADV_DIPLOMA",
    "Bachelor's Degree": "TIER_DEGREE",
    "Bachelor Degree": "TIER_DEGREE",
    "Bachelor of Business Administration": "TIER_DEGREE",
    "Master's Degree": "TIER_POSTGRAD",
    "Master Degree": "TIER_POSTGRAD"
  }
};

// -----------------------------------------------------------------------------
// 2. ENGLISH_EQUIVALENCY
//    UCC's OWN published proficiency table — transcribed verbatim from the
//    "English Language Proficiency Requirements" section of the reference
//    page (18 descriptor rows, Expert user down to Did not attempt). This
//    REPLACES the earlier general-industry-concordance placeholder version:
//    every column below is UCC's real published mapping, not an external
//    estimate.
//
//    Columns: uccPlacementTest (0-100), ielts (1-9), pte (10-90),
//    toeflIbt (0-120), duolingo (10-160), igcseEl1 (IGCSE English as First
//    Language), igcseEl2 (IGCSE English as Second Language), oLevel (GCE
//    O-Level English). "NA" in the source means the test does not publish a
//    score at that descriptor level — kept as null here.
//
//    A single numeric value (not a range) means the source gave an exact
//    score for that row; ranges are given as [min, max] inclusive.
// -----------------------------------------------------------------------------

// === EDIT THRESHOLDS HERE ===
const ENGLISH_EQUIVALENCY = [
  { key: "EXPERT", label: "Expert user",
    uccPlacementTest: 100, ielts: 9, pte: 90, toeflIbt: [118, 120], duolingo: null,
    igcseEl1: "A*/9", igcseEl2: null, oLevel: null },
  { key: "VERY_GOOD_TO_EXPERT", label: "Very good to expert user",
    uccPlacementTest: 100, ielts: 8.5, pte: 85, toeflIbt: [115, 117], duolingo: 160,
    igcseEl1: "A*/8", igcseEl2: null, oLevel: null },
  { key: "VERY_GOOD", label: "Very good user",
    uccPlacementTest: 95, ielts: 8, pte: 80, toeflIbt: [110, 114], duolingo: [150, 155],
    igcseEl1: "A/7", igcseEl2: null, oLevel: "A1" },
  { key: "GOOD_TO_VERY_GOOD", label: "Good to very good user",
    uccPlacementTest: 90, ielts: 7.5, pte: 75, toeflIbt: [102, 109], duolingo: [140, 145],
    igcseEl1: "A/7", igcseEl2: null, oLevel: "A2" },
  { key: "GOOD", label: "Good user",
    uccPlacementTest: 85, ielts: 7, pte: 70, toeflIbt: [94, 101], duolingo: [130, 135],
    igcseEl1: "B/6", igcseEl2: null, oLevel: "B3" },
  { key: "COMPETENT_TO_GOOD", label: "Competent to good user",
    uccPlacementTest: 80, ielts: 6.5, pte: 65, toeflIbt: [79, 93], duolingo: [120, 125],
    igcseEl1: "B/6", igcseEl2: "A*/9", oLevel: "B4" },
  { key: "COMPETENT", label: "Competent user",
    uccPlacementTest: 75, ielts: 6, pte: 60, toeflIbt: [60, 78], duolingo: [110, 115],
    igcseEl1: "C/5", igcseEl2: "A*/8", oLevel: "C5" },
  { key: "MODEST_TO_COMPETENT", label: "Modest to competent user",
    uccPlacementTest: 70, ielts: 5.5, pte: 55, toeflIbt: [46, 59], duolingo: [95, 100],
    igcseEl1: "C/5", igcseEl2: "A/7", oLevel: "C6" },
  { key: "MODEST", label: "Modest user",
    uccPlacementTest: 55, ielts: 5, pte: 50, toeflIbt: [35, 45], duolingo: [80, 90],
    igcseEl1: "D/4", igcseEl2: "A/7", oLevel: "D7" },
  { key: "LIMITED_TO_MODEST", label: "Limited to modest user",
    uccPlacementTest: 50, ielts: 4.5, pte: 45, toeflIbt: [32, 34], duolingo: [65, 75],
    igcseEl1: "D/4", igcseEl2: "B/6", oLevel: "E8" },
  { key: "LIMITED", label: "Limited user",
    uccPlacementTest: 35, ielts: 4, pte: 40, toeflIbt: [29, 31], duolingo: [10, 60],
    igcseEl1: "E/3", igcseEl2: "B/6", oLevel: "F9" },
  { key: "EXTREMELY_LIMITED_1", label: "Extremely limited user",
    uccPlacementTest: 30, ielts: 3.5, pte: 35, toeflIbt: [25, 28], duolingo: null,
    igcseEl1: "E/3", igcseEl2: "C/5", oLevel: null },
  { key: "EXTREMELY_LIMITED_2", label: "Extremely limited user",
    uccPlacementTest: 25, ielts: 3, pte: 30, toeflIbt: [20, 24], duolingo: null,
    igcseEl1: "F/2", igcseEl2: "C/5", oLevel: null },
  { key: "INTERMITTENT_1", label: "Intermittent user",
    uccPlacementTest: 20, ielts: 2.5, pte: 25, toeflIbt: [14, 19], duolingo: null,
    igcseEl1: "F/2", igcseEl2: "D/4", oLevel: null },
  { key: "INTERMITTENT_2", label: "Intermittent user",
    uccPlacementTest: 15, ielts: 2, pte: 20, toeflIbt: [8, 13], duolingo: null,
    igcseEl1: "G/1", igcseEl2: "D/4", oLevel: null },
  { key: "NON_USER_1", label: "Non-user",
    uccPlacementTest: 10, ielts: 1.5, pte: 15, toeflIbt: [4, 7], duolingo: null,
    igcseEl1: "G/1", igcseEl2: "E/3", oLevel: null },
  { key: "NON_USER_2", label: "Non-user",
    uccPlacementTest: 5, ielts: 1, pte: 10, toeflIbt: [0, 3], duolingo: null,
    igcseEl1: "U/0", igcseEl2: "E/3", oLevel: null },
  { key: "DID_NOT_ATTEMPT", label: "Did not attempt",
    uccPlacementTest: 0, ielts: 0, pte: 0, toeflIbt: null, duolingo: null,
    igcseEl1: "U/0", igcseEl2: "F/2", oLevel: null }
];

// Supplementary: country-specific high-school-English-grade -> IELTS/CEFR
// cross-reference, for applicants whose only evidence is a school-subject
// grade rather than a standalone English test. Two tracks per the source
// page: native-English-speaking-country schooling vs. non-native. Use
// whichever track matches the applicant's `nationality` / schooling country
// found in the uploaded document; if genuinely ambiguous, prefer the
// non-native table (the more conservative / harder-to-satisfy one) and flag
// for staff review rather than silently picking the easier table.
const SCHOOL_GRADE_TO_IELTS = {
  nativeEnglishCountries: [
    // UK, US, Canada, Australia, NZ
    { ieltsMin: 8.5, ieltsMax: 9.0, cefr: "C2", label: "Mastery / Proficient", middleSchool: "Distinction / A*", highSchool: "Excellent / Grade 9" },
    { ieltsMin: 7.0, ieltsMax: 8.0, cefr: "C1", label: "Advanced", middleSchool: "High Merit / A", highSchool: "Very Good / Grade 7-8" },
    { ieltsMin: 5.5, ieltsMax: 6.5, cefr: "B2", label: "Upper Intermediate", middleSchool: "Merit / B", highSchool: "Good / Grade 5-6" },
    { ieltsMin: 4.0, ieltsMax: 5.0, cefr: "B1", label: "Intermediate", middleSchool: "Pass / C", highSchool: "Satisfactory / Grade 4" }
  ],
  nonNativeEnglishCountries: [
    { ieltsMin: 8.5, ieltsMax: 9.0, cefr: "C2", label: "Near-native", middleSchool: "Exceeds MS curriculum", highSchool: "A / A+ (85-100%)" },
    { ieltsMin: 7.5, ieltsMax: 8.0, cefr: "C1+", label: "Advanced academic", middleSchool: "A+ (85-100%)", highSchool: "A / A- (80-89%)" },
    { ieltsMin: 6.5, ieltsMax: 7.0, cefr: "C1", label: "Effective academic", middleSchool: "A / A- (80-89%)", highSchool: "B+ / A- (70-79%)" },
    { ieltsMin: 6.0, ieltsMax: 6.5, cefr: "B2+", label: "Upper-intermediate", middleSchool: "B+ (70-74%)", highSchool: "B (65-69%)" },
    { ieltsMin: 5.5, ieltsMax: 6.0, cefr: "B2", label: "Independent user", middleSchool: "B (65-69%)", highSchool: "C+ / B- (55-64%)" },
    { ieltsMin: 5.0, ieltsMax: 5.5, cefr: "B1+", label: "Threshold", middleSchool: "C+ (55-59%)", highSchool: "C (50-54%)" },
    { ieltsMin: 4.5, ieltsMax: 5.0, cefr: "B1", label: "Limited", middleSchool: "C / Pass", highSchool: "D / Pass" },
    { ieltsMin: null, ieltsMax: 4.5, cefr: "A2-", label: "Insufficient", middleSchool: "Fail", highSchool: "Fail" }
  ]
};

// -----------------------------------------------------------------------------
// 3. School Level Equivalency by Age
//    Age -> Singapore Primary/Secondary level -> international Grade level.
//    Used mainly for placing school-age applicants into the right AEIS
//    sub-level (Primary 2 through Secondary 3) and for age-plausibility
//    checks on Preparatory course applications, not for the main MER pass/
//    fail logic. Kept as reference data; the Client Script can use it when
//    interpreting `program_applied` for AEIS applicants.
// -----------------------------------------------------------------------------
const SCHOOL_LEVEL_BY_AGE = [
  { ageMin: 6, ageMax: 7, sg: "Primary 1", intl: "Grade 1 (Elementary)" },
  { ageMin: 7, ageMax: 8, sg: "Primary 2", intl: "Grade 2 (Elementary)" },
  { ageMin: 8, ageMax: 9, sg: "Primary 3", intl: "Grade 3 (Elementary)" },
  { ageMin: 9, ageMax: 10, sg: "Primary 4", intl: "Grade 4 (Elementary)" },
  { ageMin: 10, ageMax: 11, sg: "Primary 5", intl: "Grade 5 (Elementary)" },
  { ageMin: 11, ageMax: 12, sg: "Primary 6", intl: "Grade 6 (Elementary)", majorExam: true },
  { ageMin: 12, ageMax: 13, sg: "Secondary 1", intl: "Grade 7 (Middle)" },
  { ageMin: 13, ageMax: 14, sg: "Secondary 2", intl: "Grade 8 (Middle)" },
  { ageMin: 14, ageMax: 15, sg: "Secondary 3", intl: "Grade 9 (Middle)", majorExam: true },
  { ageMin: 15, ageMax: 16, sg: "Secondary 4", intl: "Grade 10 (High)", majorExam: true },
  { ageMin: 16, ageMax: 17, sg: "Pre-University 1", intl: "Grade 11 (High)" },
  { ageMin: 17, ageMax: 18, sg: "Pre-University 2", intl: "Grade 12 (High)", majorExam: true },
  { ageMin: 18, ageMax: 19, sg: "Polytechnic Year 3 or Tertiary", intl: "Higher Education" }
];

// -----------------------------------------------------------------------------
// 4. MER_RULES — one entry per (merged) program. Keys are used by
//    COURSE_TYPE_KEY_MAP (section 5) to route a free-text `course_type` value
//    onto the right rule set.
//
//    Shape per entry:
//      label                — display name (the canonical / English-medium title)
//      minimumAge           — number, or null if not stated in the source
//      academic: {
//        minTier             — ACADEMIC_EQUIVALENCY tier key implied by the
//                               "OR completed N years of formal education /
//                               equivalent qualifications" catch-all path
//        oLevelSubjectsMin    — minimum number of GCE O-Level subject passes
//                               accepted as an alternate path (null if N/A)
//        yearsFormalEducationMin — years-of-education alternate path (null if N/A)
//        altCourseCompletion  — MER_RULES key of a UCC course whose completion
//                               satisfies this academic requirement (null if N/A)
//        workExperienceAlternativeYears — "no qualifications but N years work
//                               experience, subject to interview" path (null if N/A)
//      }
//      english: {
//        minIelts             — minimum IELTS band (or equivalent, via
//                               ENGLISH_EQUIVALENCY) — null if no English
//                               requirement stated
//        minUccPlacement       — minimum UCC Placement Test score (0-100)
//        altCourseCompletion   — MER_RULES key of a UCC English course whose
//                               completion satisfies this requirement (null if N/A)
//        altNote               — free-text alternate path that doesn't fit the
//                               above (e.g. "pass in English in high school"),
//                               shown to staff as guidance, not machine-checked
//      }
//      matureApplicant: { minAge, minYears } | null
//        — an alternate whole-package admission route present on several
//          courses ("candidates who are at least 30 years of age with at
//          least 8 years of working experience may apply as Mature
//          Applicants"). Always routes to Requires Interview, never a
//          silent Eligible, per the source text's own "must submit resume /
//          supporting documents as proof" requirement.
//      alternativeCourse — MER_RULES key of the fallback/foundation course to
//        propose when this course's MER is not met (never a dead end)
// -----------------------------------------------------------------------------

// MANDARIN PROGRAMMES NOTE: Mandarin-medium variants replace the English
// requirement with a Mandarin-medium-schooling / HSK4 requirement. This
// DocType has no Mandarin-proficiency field (english_test/english_score are
// the only language fields), so for Mandarin entries `english` below is left
// null (not applicable) and `mandarinNote` carries the real requirement text
// for staff to check manually — the Client Script should surface this as a
// flag in assessment_detail rather than attempting to auto-verify it.

// === EDIT THRESHOLDS HERE ===
const MER_RULES = {
  // ---- Preparatory ----
  PREP_AEIS: {
    label: "Preparatory Course for AEIS (all grade levels: Primary 2 - Secondary 3)",
    minimumAge: 14,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "At least Secondary 2 (or equivalent) academic standing." },
    english: { minIelts: null, minUccPlacement: null, altCourseCompletion: null,
      altNote: "At least Secondary 2 proficiency in English, OR required score in UCC's internal placement test, OR equivalent." },
    matureApplicant: null,
    alternativeCourse: "ENGLISH_L2"
  },
  PREP_OLEVEL: {
    label: "Preparatory Course for GCE O-Level",
    minimumAge: 14,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "At least a Secondary 2 (Singapore) or Grade 8 education (other countries)." },
    english: { minIelts: 4.5, minUccPlacement: 50, altCourseCompletion: null,
      altNote: "OR a minimum score of 50 in English Language/English Literature in an education system where the medium of instruction is English." },
    matureApplicant: null,
    alternativeCourse: "ENGLISH_L2"
  },
  PREP_ALEVEL: {
    label: "Preparatory Course for GCE A-Level",
    minimumAge: 16,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 1, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "At least one GCE O-Level pass EXCLUDING English (Singapore) or Grade 10 school leaving certificate (other countries)." },
    english: { minIelts: 5.5, minUccPlacement: 70, altCourseCompletion: null,
      altNote: "OR a minimum score of C6 in English for the GCE O-Level examinations." },
    matureApplicant: null,
    alternativeCourse: "PREP_OLEVEL"
  },

  // ---- English Certificates ----
  ENGLISH_GENERAL: {
    label: "Certificate in English Language",
    minimumAge: 14,
    academic: { minTier: "TIER_NONE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null, altNote: "No prior academic qualification required." },
    english: { minIelts: 4.5, minUccPlacement: 40, altCourseCompletion: null, altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: "ENGLISH_L1"
  },
  ENGLISH_L1: {
    label: "Certificate in English Level 1",
    minimumAge: 15,
    academic: { minTier: "TIER_NONE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null, altNote: "No prior academic qualification required." },
    english: { minIelts: 3.5, minUccPlacement: 30, altCourseCompletion: null, altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: null // entry-level course, no lower English fallback in the catalogue
  },
  ENGLISH_L2: {
    label: "Certificate in English Level 2",
    minimumAge: 15,
    academic: { minTier: "TIER_NONE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null, altNote: "No prior academic qualification required." },
    english: { minIelts: 4.5, minUccPlacement: 50, altCourseCompletion: "ENGLISH_L1", altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: "ENGLISH_L1"
  },
  ENGLISH_L3: {
    label: "Certificate in English Level 3",
    minimumAge: 15,
    academic: { minTier: "TIER_NONE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null, altNote: "No prior academic qualification required." },
    english: { minIelts: 5.5, minUccPlacement: 70, altCourseCompletion: "ENGLISH_L2", altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: "ENGLISH_L2"
  },
  ENGLISH_IELTS_PREP: {
    label: "Preparatory Course for IELTS",
    minimumAge: 15,
    academic: { minTier: "TIER_NONE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null, altNote: "No prior academic qualification required." },
    // ASK/VERIFY: source states IELTS 5.5 / UCC Placement Test 50 to ENTER a
    // course meant to prepare candidates FOR the IELTS test — unusually high
    // for a prep course (note the UCC-placement-test threshold of 50 here is
    // also inconsistent with the 70 used for CEL3, which requires the same
    // IELTS 5.5). Transcribed exactly as given; please confirm with UCC.
    english: { minIelts: 5.5, minUccPlacement: 50, altCourseCompletion: null, altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: "ENGLISH_L2"
  },

  // ---- General Management ----
  GENERAL_MANAGEMENT: {
    label: "Certificate in General Management",
    minimumAge: 16,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 1, yearsFormalEducationMin: 9, altCourseCompletion: null, workExperienceAlternativeYears: 3,
      altNote: "Passed any 1 subject in GCE O-Level, OR completed 9 years of formal education, OR equivalent qualifications, OR no qualifications but at least 3 years work experience (subject to interview)." },
    english: { minIelts: 4.5, minUccPlacement: 50, altCourseCompletion: "ENGLISH_L2", altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: "ENGLISH_L2"
  },
  GENERAL_MANAGEMENT_MANDARIN: {
    label: "Certificate in General Management (Mandarin)",
    minimumAge: 16,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 1, yearsFormalEducationMin: 9, altCourseCompletion: null, workExperienceAlternativeYears: 3,
      altNote: "Same academic path as the English-medium Certificate in General Management." },
    english: null,
    mandarinNote: "Completed 9-year formal education with Mandarin as the medium of instruction. (No English test required — verify Mandarin-medium schooling manually; this DocType has no dedicated Mandarin-proficiency field.)",
    matureApplicant: null,
    alternativeCourse: null
  },

  // ---- Business Management ----
  BIZ_DIPLOMA: {
    label: "Diploma in Business Management",
    minimumAge: 17,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 3, yearsFormalEducationMin: 12, altCourseCompletion: "GENERAL_MANAGEMENT", workExperienceAlternativeYears: 5,
      altNote: "Passed any 3 subjects in GCE O-Level, OR completed 12 years of formal education, OR completed UCC's Certificate in General Management, OR equivalent qualifications, OR no qualifications but at least 5 years work experience (subject to interview)." },
    english: { minIelts: 5.5, minUccPlacement: 70, altCourseCompletion: "ENGLISH_L3", altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: "GENERAL_MANAGEMENT"
  },
  BIZ_DIPLOMA_MANDARIN: {
    label: "Diploma in Business Management (Mandarin)",
    minimumAge: 17,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 3, yearsFormalEducationMin: 12, altCourseCompletion: "GENERAL_MANAGEMENT", workExperienceAlternativeYears: 5,
      altNote: "Same academic path as the English-medium Diploma in Business Management." },
    english: null,
    mandarinNote: "Completed 12-year formal education with Mandarin as the medium of instruction. (No English test required — verify manually.)",
    matureApplicant: null,
    alternativeCourse: "GENERAL_MANAGEMENT_MANDARIN"
  },
  BIZ_ADV_DIPLOMA: {
    label: "Advanced Diploma in Business Administration",
    minimumAge: 17,
    academic: { minTier: "TIER_DIPLOMA", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "A Diploma from any institution, OR GCE A-Levels or equivalent." },
    english: { minIelts: 6.0, minUccPlacement: 75, altCourseCompletion: null, altNote: "OR a pass in English in high school." },
    matureApplicant: { minAge: 30, minYears: 8 },
    alternativeCourse: "BIZ_DIPLOMA"
  },
  BIZ_POSTGRAD_CERT: {
    label: "Postgraduate Certificate in Business Administration",
    minimumAge: 20,
    academic: { minTier: "TIER_DEGREE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "At least a 3-Year Bachelor's degree in any discipline." },
    english: { minIelts: 5.5, minUccPlacement: 70, altCourseCompletion: "ENGLISH_L3", altNote: "OR any other equivalent qualification in English." },
    matureApplicant: { minAge: null, minYears: 8, altNote: "Matured candidate with no qualifications but at least 8 years of working experience, subject to interview. No explicit minimum age stated for this route (unlike the 30yo Mature Applicant path on Diploma-tier courses) — VERIFY with UCC." },
    alternativeCourse: "BIZ_ADV_DIPLOMA"
  },
  BIZ_POSTGRAD_CERT_MANDARIN: {
    label: "Postgraduate Certificate in Business Administration (Mandarin)",
    minimumAge: 20,
    academic: { minTier: "TIER_DEGREE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "Same academic path as the English-medium Postgraduate Certificate." },
    english: null,
    mandarinNote: "Completed 12 years of formal education with Mandarin as the medium of instruction, OR achieved a minimum of HSK4 in the Chinese Proficiency Test. (No English test required — verify manually.)",
    matureApplicant: { minAge: null, minYears: 8, altNote: "Same Mature Applicant route as the English-medium Postgraduate Certificate." },
    alternativeCourse: "BIZ_ADV_DIPLOMA"
  },
  BIZ_POSTGRAD_DIPLOMA: {
    label: "Postgraduate Diploma in Business Administration",
    minimumAge: 20,
    academic: { minTier: "TIER_DEGREE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "At least a 3-Year Bachelor's degree in any discipline." },
    english: { minIelts: 5.5, minUccPlacement: 70, altCourseCompletion: "ENGLISH_L3", altNote: "OR any other equivalent qualification in English." },
    matureApplicant: { minAge: null, minYears: 8, altNote: "Matured candidate with no qualifications but at least 8 years of working experience, subject to interview. No explicit minimum age stated — VERIFY with UCC." },
    alternativeCourse: "BIZ_ADV_DIPLOMA"
  },
  BIZ_POSTGRAD_DIPLOMA_MANDARIN: {
    label: "Postgraduate Diploma in Business Administration (Mandarin)",
    minimumAge: 20,
    academic: { minTier: "TIER_DEGREE", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "Same academic path as the English-medium Postgraduate Diploma." },
    english: null,
    mandarinNote: "Completed 12 years of formal education with Mandarin as the medium of instruction, OR achieved a minimum of HSK4 in the Chinese Proficiency Test. (No English test required — verify manually.)",
    matureApplicant: { minAge: null, minYears: 8, altNote: "Same Mature Applicant route as the English-medium Postgraduate Diploma." },
    alternativeCourse: "BIZ_ADV_DIPLOMA"
  },

  // ---- Tourism & Hospitality ----
  TOURISM_HOSPITALITY: {
    label: "Diploma in Tourism and Hospitality Management",
    minimumAge: 17,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 3, yearsFormalEducationMin: 12, altCourseCompletion: "GENERAL_MANAGEMENT", workExperienceAlternativeYears: 5,
      altNote: "Passed any 3 subjects in GCE O-Level, OR completed 12 years of formal education, OR completed UCC's General Management course, OR equivalent qualifications, OR no qualifications but at least 5 years work experience (subject to interview)." },
    english: { minIelts: 5.5, minUccPlacement: 70, altCourseCompletion: "ENGLISH_L3", altNote: "OR equivalent qualifications." },
    matureApplicant: null,
    alternativeCourse: "GENERAL_MANAGEMENT"
  },
  TOURISM_HOSPITALITY_MANDARIN: {
    label: "Diploma in Tourism and Hospitality Management (Mandarin)",
    minimumAge: 17,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 3, yearsFormalEducationMin: 12, altCourseCompletion: "GENERAL_MANAGEMENT", workExperienceAlternativeYears: 5,
      altNote: "Same academic path as the English-medium Diploma in Tourism and Hospitality Management." },
    english: null,
    mandarinNote: "Completed 12-year formal education with Mandarin as the medium of instruction. (No English test required — verify manually.)",
    matureApplicant: null,
    alternativeCourse: "GENERAL_MANAGEMENT_MANDARIN"
  },

  // ---- Applied AI ----
  AI_DIPLOMA: {
    label: "Diploma in Applied Artificial Intelligence (AI)",
    minimumAge: 17,
    academic: { minTier: "TIER_SECONDARY", oLevelSubjectsMin: 3, yearsFormalEducationMin: 12, altCourseCompletion: "GENERAL_MANAGEMENT", workExperienceAlternativeYears: null,
      altNote: "Passed any 3 subjects in GCE O-Level, OR completed 12 years of formal education, OR completed UCC's Certificate in General Management." },
    english: { minIelts: 5.5, minUccPlacement: 70, altCourseCompletion: "ENGLISH_L3", altNote: "OR completed UCC's Certificate in English Language." },
    matureApplicant: { minAge: 30, minYears: 8 },
    alternativeCourse: "GENERAL_MANAGEMENT"
  },
  AI_ADV_DIPLOMA: {
    label: "Advanced Diploma in Applied Artificial Intelligence (AI)",
    // ASK/VERIFY: no explicit Minimum Age is stated in the source for this
    // programme, unlike its sibling ADBA (Advanced Diploma in Business
    // Administration, which states 17). Left null rather than assumed —
    // please confirm whether 17 (matching ADBA) should also apply here.
    minimumAge: null,
    academic: { minTier: "TIER_DIPLOMA", oLevelSubjectsMin: null, yearsFormalEducationMin: null, altCourseCompletion: null, workExperienceAlternativeYears: null,
      altNote: "A Diploma from any institution, OR GCE A-Levels or equivalent." },
    english: { minIelts: 6.0, minUccPlacement: 75, altCourseCompletion: null, altNote: "OR a pass in English in high school." },
    matureApplicant: { minAge: 30, minYears: 8 },
    alternativeCourse: "AI_DIPLOMA"
  }
};

// -----------------------------------------------------------------------------
// 5. COURSE_TYPE_KEY_MAP — every real program name/abbreviation from UCC's
//    Program sheet (including the merged E-Learning variants and the 7 AEIS
//    grade-level variants), mapped onto the MER_RULES key that governs it.
//    This is the exact controlled vocabulary the AI extraction prompt
//    (extraction_schema.md) should be steered toward for `course_type`.
// -----------------------------------------------------------------------------

// === EDIT THRESHOLDS HERE ===
const COURSE_TYPE_KEY_MAP = {
  "Advanced Diploma in Applied Artificial Intelligence (AI)": "AI_ADV_DIPLOMA",
  "Advanced Diploma in Business Administration": "BIZ_ADV_DIPLOMA",
  "Certificate in English Language": "ENGLISH_GENERAL",
  "Certificate in English Level 1": "ENGLISH_L1",
  "Certificate in English Level 2": "ENGLISH_L2",
  "Certificate in English Level 3": "ENGLISH_L3",
  "Certificate in General Management": "GENERAL_MANAGEMENT",
  "Certificate in General Management (E-Learning)": "GENERAL_MANAGEMENT",
  "Certificate in General Management (Mandarin)": "GENERAL_MANAGEMENT_MANDARIN",
  "Certificate in General Management (Mandarin) (E-Learning)": "GENERAL_MANAGEMENT_MANDARIN",
  "Diploma in Applied Artificial Intelligence (AI)": "AI_DIPLOMA",
  "Diploma in Business Management": "BIZ_DIPLOMA",
  "Diploma in Business Management (E-Learning)": "BIZ_DIPLOMA",
  "Diploma in Business Management (Mandarin)": "BIZ_DIPLOMA_MANDARIN",
  "Diploma in Business Management (Mandarin) (E-Learning)": "BIZ_DIPLOMA_MANDARIN",
  "Diploma in Tourism and Hospitality Management": "TOURISM_HOSPITALITY",
  "Diploma in Tourism and Hospitality Management (E-Learning)": "TOURISM_HOSPITALITY",
  "Diploma in Tourism and Hospitality Management (Mandarin)": "TOURISM_HOSPITALITY_MANDARIN",
  "Diploma in Tourism and Hospitality Management (Mandarin) (E-Learning)": "TOURISM_HOSPITALITY_MANDARIN",
  "Postgraduate Certificate in Business Administration": "BIZ_POSTGRAD_CERT",
  "Postgraduate Certificate in Business Administration (Mandarin)": "BIZ_POSTGRAD_CERT_MANDARIN",
  "Postgraduate Diploma in Business Administration": "BIZ_POSTGRAD_DIPLOMA",
  "Postgraduate Diploma in Business Administration (Mandarin)": "BIZ_POSTGRAD_DIPLOMA_MANDARIN",
  "Preparatory Course for Admission Exercise for International Students (AEIS) - Primary 2": "PREP_AEIS",
  "Preparatory Course for Admission Exercise for International Students (AEIS) - Primary 3": "PREP_AEIS",
  "Preparatory Course for Admission Exercise for International Students (AEIS) - Primary 4": "PREP_AEIS",
  "Preparatory Course for Admission Exercise for International Students (AEIS) - Primary 5": "PREP_AEIS",
  "Preparatory Course for Admission Exercise for International Students (AEIS) - Secondary 1": "PREP_AEIS",
  "Preparatory Course for Admission Exercise for International Students (AEIS) - Secondary 2": "PREP_AEIS",
  "Preparatory Course for Admission Exercise for International Students (AEIS) - Secondary 3": "PREP_AEIS",
  "Preparatory Course for International English Language Testing System (IELTS)": "ENGLISH_IELTS_PREP",
  "Preparatory Course for Singapore-Cambridge General Certificate of Education Advanced Level (GCE A-Level)": "PREP_ALEVEL",
  "Preparatory Course for Singapore-Cambridge General Certificate of Education Ordinary Level (GCE O-Level)": "PREP_OLEVEL"
};

// =============================================================================
// STATUS — everything needed for the Client Script is now in this file:
//   - MER_RULES: 21 real programs (verbatim from UCC's Module.xlsx), fully
//     structured with academic/English/mature-applicant paths and a fallback
//     alternativeCourse for every entry.
//   - ACADEMIC_EQUIVALENCY: tier ladder + ~35 real qualification-name mappings.
//   - ENGLISH_EQUIVALENCY: UCC's own real 18-row proficiency table (replaces
//     the earlier general-industry-concordance placeholder).
//   - COURSE_TYPE_KEY_MAP: all 33 real program names -> 21 MER_RULES keys.
//
// REMAINING FLAGS (not blockers — the engine can be built with sensible
// defaults for these, listed here for UCC to confirm/correct later):
//   1. AI_ADV_DIPLOMA.minimumAge — not stated in source, left null.
//   2. BIZ_POSTGRAD_CERT / BIZ_POSTGRAD_DIPLOMA (+ Mandarin) mature-applicant
//      path has no stated minimum age (unlike the 30yo path on Diploma-tier
//      courses) — left null in matureApplicant.minAge.
//   3. ENGLISH_IELTS_PREP's entry bar (IELTS 5.5 to enrol in an IELTS-prep
//      course) looks unusually high and its UCC Placement Test threshold (50)
//      is inconsistent with ENGLISH_L3's threshold (70) despite requiring the
//      same IELTS 5.5 — transcribed exactly as given, flagged for UCC to
//      double-check.
//   4. HKDSE mapped to TIER_PREU (its dual-purpose nature per the source
//      table) — flagged in case a plain HKDSE pass should map to
//      TIER_SECONDARY instead in some contexts.
//   5. Mandarin-medium programmes: English requirement fields left null;
//      their real requirement (Mandarin-medium schooling / HSK4) is captured
//      in `mandarinNote` for staff review rather than machine-checked, since
//      this DocType has no Mandarin-proficiency field.
//
// Proceeding to write admission_eligibility_assessment.js using this data.
// =============================================================================
