// =============================================================================
// Client Script: Admission Eligibility Assessment
// DocType: Admission Eligibility Assessment   Apply To: Form
//
// FRONT-END ONLY. No custom app, no .py controller, no Server Script, no bench
// deploy. This single Client Script IS the engine: rule thresholds, PDF
// extraction, assessment logic, and the HTML render all live here.
//
// FLOW
//   1. Staff attach `application_pdf` -> extraction fires AUTOMATICALLY (the
//      `application_pdf` field trigger below) -> AEA.extract_from_pdf() calls
//      the OpenAI vision model and populates the Applicant Details fields.
//      Nothing downstream runs automatically — staff must review/correct the
//      extracted fields themselves.
//   2. Staff click "Run Assessment" (manual, separate button) -> AEA.run_
//      assessment() evaluates the MER rules against whatever is currently in
//      the Applicant Details fields (AI-extracted, staff-corrected, or fully
//      hand-typed — the engine does not care which), writes the verdict
//      fields, renders eligibility_result_html, and saves.
//   3. "AI Settings" button opens a popup persisted to browser localStorage
//      (key `ucc_ai_settings`) ONLY. The OpenAI key never touches a DocType
//      field, a server call of ours, or git.
//
// DATA SOURCE FOR THE RULES BELOW: transcribed verbatim from UCC's own
// Module.xlsx Program sheet (33 real programs) and the "Academic Level and
// English Proficiency Benchmarks" reference page (pasted by the user). See
// mer_rules.skeleton.js in this same folder for the full sourcing notes and
// the 5 flagged data gaps (search "ASK/VERIFY" below).
// =============================================================================

frappe.ui.form.on("Admission Eligibility Assessment", {
  refresh(frm) {
    AEA.bind(frm);
  },

  application_pdf(frm) {
    if (frm.doc.application_pdf) {
      AEA.extract_from_pdf(frm);
    }
  }
});

const AEA = {
  KEY_LS: "ucc_ai_settings",

  // ===========================================================================
  // === EDIT THRESHOLDS HERE ===  (verbatim from mer_rules.skeleton.js)
  // ===========================================================================

  ACADEMIC_EQUIVALENCY: {
    tiers: [
      { key: "TIER_NONE", label: "No formal qualification / below Secondary", rank: 0 },
      { key: "TIER_SECONDARY", label: "Secondary / O-Level / IGCSE / GCSE equivalent (~10-12yr schooling milestone)", rank: 1 },
      { key: "TIER_PREU", label: "Pre-University / A-Level / high-school-leaving equivalent", rank: 2 },
      { key: "TIER_DIPLOMA", label: "Diploma equivalent", rank: 3 },
      { key: "TIER_ADV_DIPLOMA", label: "Advanced Diploma equivalent", rank: 4 },
      { key: "TIER_DEGREE", label: "Bachelor's Degree equivalent", rank: 5 },
      { key: "TIER_POSTGRAD", label: "Postgraduate / Master's equivalent", rank: 6 }
    ],
    qualificationToTier: {
      "GCE O-Level": "TIER_SECONDARY", "SG-Cambridge GCE O-Level": "TIER_SECONDARY", "GCSE": "TIER_SECONDARY",
      "IGCSE": "TIER_SECONDARY", "SPM": "TIER_SECONDARY", "HKDSE": "TIER_PREU", "Zhongkao": "TIER_SECONDARY",
      "Class 10": "TIER_SECONDARY", "CBSE Class 10": "TIER_SECONDARY", "ICSE": "TIER_SECONDARY",
      "IB MYP": "TIER_SECONDARY", "CSEC": "TIER_SECONDARY",
      "GCE A-Level": "TIER_PREU", "SG-Cambridge GCE A-Level": "TIER_PREU", "GCE A Levels": "TIER_PREU",
      "International A Level": "TIER_PREU", "IAL": "TIER_PREU", "STPM": "TIER_PREU", "Gaokao": "TIER_PREU",
      "Class 12": "TIER_PREU", "CBSE Class 12": "TIER_PREU", "ISC": "TIER_PREU", "Brunei A-Level": "TIER_PREU",
      "Canadian High School Diploma": "TIER_PREU", "American High School Diploma": "TIER_PREU",
      "High School Diploma": "TIER_PREU", "Abitur": "TIER_PREU", "French Baccalaureat": "TIER_PREU",
      "Baccalaureat": "TIER_PREU", "European Baccalaureate": "TIER_PREU", "IB Diploma": "TIER_PREU",
      "IBDP": "TIER_PREU", "CAPE": "TIER_PREU", "Studentereksamen": "TIER_PREU",
      "Australian Year 12": "TIER_PREU", "HSC": "TIER_PREU", "VCE": "TIER_PREU", "QCE": "TIER_PREU",
      "WACE": "TIER_PREU", "SACE": "TIER_PREU", "TCE": "TIER_PREU", "ACT SSC": "TIER_PREU",
      "Diploma": "TIER_DIPLOMA", "Advanced Diploma": "TIER_ADV_DIPLOMA",
      "Bachelor's Degree": "TIER_DEGREE", "Bachelor Degree": "TIER_DEGREE",
      "Bachelor of Business Administration": "TIER_DEGREE",
      "Master's Degree": "TIER_POSTGRAD", "Master Degree": "TIER_POSTGRAD"
    }
  },

  ENGLISH_EQUIVALENCY: [
    { key: "EXPERT", label: "Expert user", uccPlacementTest: 100, ielts: 9, pte: 90, toeflIbt: [118, 120], duolingo: null, igcseEl1: "A*/9", igcseEl2: null, oLevel: null },
    { key: "VERY_GOOD_TO_EXPERT", label: "Very good to expert user", uccPlacementTest: 100, ielts: 8.5, pte: 85, toeflIbt: [115, 117], duolingo: 160, igcseEl1: "A*/8", igcseEl2: null, oLevel: null },
    { key: "VERY_GOOD", label: "Very good user", uccPlacementTest: 95, ielts: 8, pte: 80, toeflIbt: [110, 114], duolingo: [150, 155], igcseEl1: "A/7", igcseEl2: null, oLevel: "A1" },
    { key: "GOOD_TO_VERY_GOOD", label: "Good to very good user", uccPlacementTest: 90, ielts: 7.5, pte: 75, toeflIbt: [102, 109], duolingo: [140, 145], igcseEl1: "A/7", igcseEl2: null, oLevel: "A2" },
    { key: "GOOD", label: "Good user", uccPlacementTest: 85, ielts: 7, pte: 70, toeflIbt: [94, 101], duolingo: [130, 135], igcseEl1: "B/6", igcseEl2: null, oLevel: "B3" },
    { key: "COMPETENT_TO_GOOD", label: "Competent to good user", uccPlacementTest: 80, ielts: 6.5, pte: 65, toeflIbt: [79, 93], duolingo: [120, 125], igcseEl1: "B/6", igcseEl2: "A*/9", oLevel: "B4" },
    { key: "COMPETENT", label: "Competent user", uccPlacementTest: 75, ielts: 6, pte: 60, toeflIbt: [60, 78], duolingo: [110, 115], igcseEl1: "C/5", igcseEl2: "A*/8", oLevel: "C5" },
    { key: "MODEST_TO_COMPETENT", label: "Modest to competent user", uccPlacementTest: 70, ielts: 5.5, pte: 55, toeflIbt: [46, 59], duolingo: [95, 100], igcseEl1: "C/5", igcseEl2: "A/7", oLevel: "C6" },
    { key: "MODEST", label: "Modest user", uccPlacementTest: 55, ielts: 5, pte: 50, toeflIbt: [35, 45], duolingo: [80, 90], igcseEl1: "D/4", igcseEl2: "A/7", oLevel: "D7" },
    { key: "LIMITED_TO_MODEST", label: "Limited to modest user", uccPlacementTest: 50, ielts: 4.5, pte: 45, toeflIbt: [32, 34], duolingo: [65, 75], igcseEl1: "D/4", igcseEl2: "B/6", oLevel: "E8" },
    { key: "LIMITED", label: "Limited user", uccPlacementTest: 35, ielts: 4, pte: 40, toeflIbt: [29, 31], duolingo: [10, 60], igcseEl1: "E/3", igcseEl2: "B/6", oLevel: "F9" },
    { key: "EXTREMELY_LIMITED_1", label: "Extremely limited user", uccPlacementTest: 30, ielts: 3.5, pte: 35, toeflIbt: [25, 28], duolingo: null, igcseEl1: "E/3", igcseEl2: "C/5", oLevel: null },
    { key: "EXTREMELY_LIMITED_2", label: "Extremely limited user", uccPlacementTest: 25, ielts: 3, pte: 30, toeflIbt: [20, 24], duolingo: null, igcseEl1: "F/2", igcseEl2: "C/5", oLevel: null },
    { key: "INTERMITTENT_1", label: "Intermittent user", uccPlacementTest: 20, ielts: 2.5, pte: 25, toeflIbt: [14, 19], duolingo: null, igcseEl1: "F/2", igcseEl2: "D/4", oLevel: null },
    { key: "INTERMITTENT_2", label: "Intermittent user", uccPlacementTest: 15, ielts: 2, pte: 20, toeflIbt: [8, 13], duolingo: null, igcseEl1: "G/1", igcseEl2: "D/4", oLevel: null },
    { key: "NON_USER_1", label: "Non-user", uccPlacementTest: 10, ielts: 1.5, pte: 15, toeflIbt: [4, 7], duolingo: null, igcseEl1: "G/1", igcseEl2: "E/3", oLevel: null },
    { key: "NON_USER_2", label: "Non-user", uccPlacementTest: 5, ielts: 1, pte: 10, toeflIbt: [0, 3], duolingo: null, igcseEl1: "U/0", igcseEl2: "E/3", oLevel: null },
    { key: "DID_NOT_ATTEMPT", label: "Did not attempt", uccPlacementTest: 0, ielts: 0, pte: 0, toeflIbt: null, duolingo: null, igcseEl1: "U/0", igcseEl2: "F/2", oLevel: null }
  ],

  MER_RULES: {
    "PREP_AEIS": {
      "label": "Preparatory Course for AEIS (all grade levels: Primary 2 - Secondary 3)",
      "minimumAge": 14,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "At least Secondary 2 (or equivalent) academic standing."
      },
      "english": {
        "minIelts": null,
        "minUccPlacement": null,
        "altCourseCompletion": null,
        "altNote": "At least Secondary 2 proficiency in English, OR required score in UCC's internal placement test, OR equivalent."
      },
      "matureApplicant": null,
      "alternativeCourse": "ENGLISH_L2"
    },
    "PREP_OLEVEL": {
      "label": "Preparatory Course for GCE O-Level",
      "minimumAge": 14,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "At least a Secondary 2 (Singapore) or Grade 8 education (other countries)."
      },
      "english": {
        "minIelts": 4.5,
        "minUccPlacement": 50,
        "altCourseCompletion": null,
        "altNote": "OR a minimum score of 50 in English Language/English Literature in an education system where the medium of instruction is English."
      },
      "matureApplicant": null,
      "alternativeCourse": "ENGLISH_L2"
    },
    "PREP_ALEVEL": {
      "label": "Preparatory Course for GCE A-Level",
      "minimumAge": 16,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 1,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "At least one GCE O-Level pass EXCLUDING English (Singapore) or Grade 10 school leaving certificate (other countries)."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 70,
        "altCourseCompletion": null,
        "altNote": "OR a minimum score of C6 in English for the GCE O-Level examinations."
      },
      "matureApplicant": null,
      "alternativeCourse": "PREP_OLEVEL"
    },
    "ENGLISH_GENERAL": {
      "label": "Certificate in English Language",
      "minimumAge": 14,
      "academic": {
        "minTier": "TIER_NONE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "No prior academic qualification required."
      },
      "english": {
        "minIelts": 4.5,
        "minUccPlacement": 40,
        "altCourseCompletion": null,
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": "ENGLISH_L1"
    },
    "ENGLISH_L1": {
      "label": "Certificate in English Level 1",
      "minimumAge": 15,
      "academic": {
        "minTier": "TIER_NONE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "No prior academic qualification required."
      },
      "english": {
        "minIelts": 3.5,
        "minUccPlacement": 30,
        "altCourseCompletion": null,
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": null
    },
    "ENGLISH_L2": {
      "label": "Certificate in English Level 2",
      "minimumAge": 15,
      "academic": {
        "minTier": "TIER_NONE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "No prior academic qualification required."
      },
      "english": {
        "minIelts": 4.5,
        "minUccPlacement": 50,
        "altCourseCompletion": "ENGLISH_L1",
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": "ENGLISH_L1"
    },
    "ENGLISH_L3": {
      "label": "Certificate in English Level 3",
      "minimumAge": 15,
      "academic": {
        "minTier": "TIER_NONE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "No prior academic qualification required."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 70,
        "altCourseCompletion": "ENGLISH_L2",
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": "ENGLISH_L2"
    },
    "ENGLISH_IELTS_PREP": {
      "label": "Preparatory Course for IELTS",
      "minimumAge": 15,
      "academic": {
        "minTier": "TIER_NONE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "No prior academic qualification required."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 50,
        "altCourseCompletion": null,
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": "ENGLISH_L2"
    },
    "GENERAL_MANAGEMENT": {
      "label": "Certificate in General Management",
      "minimumAge": 16,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 1,
        "yearsFormalEducationMin": 9,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": 3,
        "altNote": "Passed any 1 subject in GCE O-Level, OR completed 9 years of formal education, OR equivalent qualifications, OR no qualifications but at least 3 years work experience (subject to interview)."
      },
      "english": {
        "minIelts": 4.5,
        "minUccPlacement": 50,
        "altCourseCompletion": "ENGLISH_L2",
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": "ENGLISH_L2"
    },
    "GENERAL_MANAGEMENT_MANDARIN": {
      "label": "Certificate in General Management (Mandarin)",
      "minimumAge": 16,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 1,
        "yearsFormalEducationMin": 9,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": 3,
        "altNote": "Same academic path as the English-medium Certificate in General Management."
      },
      "english": null,
      "mandarinNote": "Completed 9-year formal education with Mandarin as the medium of instruction. (No English test required — verify Mandarin-medium schooling manually; this DocType has no dedicated Mandarin-proficiency field.)",
      "matureApplicant": null,
      "alternativeCourse": null
    },
    "BIZ_DIPLOMA": {
      "label": "Diploma in Business Management",
      "minimumAge": 17,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 3,
        "yearsFormalEducationMin": 12,
        "altCourseCompletion": "GENERAL_MANAGEMENT",
        "workExperienceAlternativeYears": 5,
        "altNote": "Passed any 3 subjects in GCE O-Level, OR completed 12 years of formal education, OR completed UCC's Certificate in General Management, OR equivalent qualifications, OR no qualifications but at least 5 years work experience (subject to interview)."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 70,
        "altCourseCompletion": "ENGLISH_L3",
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": "GENERAL_MANAGEMENT"
    },
    "BIZ_DIPLOMA_MANDARIN": {
      "label": "Diploma in Business Management (Mandarin)",
      "minimumAge": 17,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 3,
        "yearsFormalEducationMin": 12,
        "altCourseCompletion": "GENERAL_MANAGEMENT",
        "workExperienceAlternativeYears": 5,
        "altNote": "Same academic path as the English-medium Diploma in Business Management."
      },
      "english": null,
      "mandarinNote": "Completed 12-year formal education with Mandarin as the medium of instruction. (No English test required — verify manually.)",
      "matureApplicant": null,
      "alternativeCourse": "GENERAL_MANAGEMENT_MANDARIN"
    },
    "BIZ_ADV_DIPLOMA": {
      "label": "Advanced Diploma in Business Administration",
      "minimumAge": 17,
      "academic": {
        "minTier": "TIER_DIPLOMA",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "A Diploma from any institution, OR GCE A-Levels or equivalent."
      },
      "english": {
        "minIelts": 6,
        "minUccPlacement": 75,
        "altCourseCompletion": null,
        "altNote": "OR a pass in English in high school."
      },
      "matureApplicant": {
        "minAge": 30,
        "minYears": 8
      },
      "alternativeCourse": "BIZ_DIPLOMA"
    },
    "BIZ_POSTGRAD_CERT": {
      "label": "Postgraduate Certificate in Business Administration",
      "minimumAge": 20,
      "academic": {
        "minTier": "TIER_DEGREE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "At least a 3-Year Bachelor's degree in any discipline."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 70,
        "altCourseCompletion": "ENGLISH_L3",
        "altNote": "OR any other equivalent qualification in English."
      },
      "matureApplicant": {
        "minAge": null,
        "minYears": 8,
        "altNote": "Matured candidate with no qualifications but at least 8 years of working experience, subject to interview. No explicit minimum age stated for this route (unlike the 30yo Mature Applicant path on Diploma-tier courses) — VERIFY with UCC."
      },
      "alternativeCourse": "BIZ_ADV_DIPLOMA"
    },
    "BIZ_POSTGRAD_CERT_MANDARIN": {
      "label": "Postgraduate Certificate in Business Administration (Mandarin)",
      "minimumAge": 20,
      "academic": {
        "minTier": "TIER_DEGREE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "Same academic path as the English-medium Postgraduate Certificate."
      },
      "english": null,
      "mandarinNote": "Completed 12 years of formal education with Mandarin as the medium of instruction, OR achieved a minimum of HSK4 in the Chinese Proficiency Test. (No English test required — verify manually.)",
      "matureApplicant": {
        "minAge": null,
        "minYears": 8,
        "altNote": "Same Mature Applicant route as the English-medium Postgraduate Certificate."
      },
      "alternativeCourse": "BIZ_ADV_DIPLOMA"
    },
    "BIZ_POSTGRAD_DIPLOMA": {
      "label": "Postgraduate Diploma in Business Administration",
      "minimumAge": 20,
      "academic": {
        "minTier": "TIER_DEGREE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "At least a 3-Year Bachelor's degree in any discipline."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 70,
        "altCourseCompletion": "ENGLISH_L3",
        "altNote": "OR any other equivalent qualification in English."
      },
      "matureApplicant": {
        "minAge": null,
        "minYears": 8,
        "altNote": "Matured candidate with no qualifications but at least 8 years of working experience, subject to interview. No explicit minimum age stated — VERIFY with UCC."
      },
      "alternativeCourse": "BIZ_ADV_DIPLOMA"
    },
    "BIZ_POSTGRAD_DIPLOMA_MANDARIN": {
      "label": "Postgraduate Diploma in Business Administration (Mandarin)",
      "minimumAge": 20,
      "academic": {
        "minTier": "TIER_DEGREE",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "Same academic path as the English-medium Postgraduate Diploma."
      },
      "english": null,
      "mandarinNote": "Completed 12 years of formal education with Mandarin as the medium of instruction, OR achieved a minimum of HSK4 in the Chinese Proficiency Test. (No English test required — verify manually.)",
      "matureApplicant": {
        "minAge": null,
        "minYears": 8,
        "altNote": "Same Mature Applicant route as the English-medium Postgraduate Diploma."
      },
      "alternativeCourse": "BIZ_ADV_DIPLOMA"
    },
    "TOURISM_HOSPITALITY": {
      "label": "Diploma in Tourism and Hospitality Management",
      "minimumAge": 17,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 3,
        "yearsFormalEducationMin": 12,
        "altCourseCompletion": "GENERAL_MANAGEMENT",
        "workExperienceAlternativeYears": 5,
        "altNote": "Passed any 3 subjects in GCE O-Level, OR completed 12 years of formal education, OR completed UCC's General Management course, OR equivalent qualifications, OR no qualifications but at least 5 years work experience (subject to interview)."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 70,
        "altCourseCompletion": "ENGLISH_L3",
        "altNote": "OR equivalent qualifications."
      },
      "matureApplicant": null,
      "alternativeCourse": "GENERAL_MANAGEMENT"
    },
    "TOURISM_HOSPITALITY_MANDARIN": {
      "label": "Diploma in Tourism and Hospitality Management (Mandarin)",
      "minimumAge": 17,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 3,
        "yearsFormalEducationMin": 12,
        "altCourseCompletion": "GENERAL_MANAGEMENT",
        "workExperienceAlternativeYears": 5,
        "altNote": "Same academic path as the English-medium Diploma in Tourism and Hospitality Management."
      },
      "english": null,
      "mandarinNote": "Completed 12-year formal education with Mandarin as the medium of instruction. (No English test required — verify manually.)",
      "matureApplicant": null,
      "alternativeCourse": "GENERAL_MANAGEMENT_MANDARIN"
    },
    "AI_DIPLOMA": {
      "label": "Diploma in Applied Artificial Intelligence (AI)",
      "minimumAge": 17,
      "academic": {
        "minTier": "TIER_SECONDARY",
        "oLevelSubjectsMin": 3,
        "yearsFormalEducationMin": 12,
        "altCourseCompletion": "GENERAL_MANAGEMENT",
        "workExperienceAlternativeYears": null,
        "altNote": "Passed any 3 subjects in GCE O-Level, OR completed 12 years of formal education, OR completed UCC's Certificate in General Management."
      },
      "english": {
        "minIelts": 5.5,
        "minUccPlacement": 70,
        "altCourseCompletion": "ENGLISH_L3",
        "altNote": "OR completed UCC's Certificate in English Language."
      },
      "matureApplicant": {
        "minAge": 30,
        "minYears": 8
      },
      "alternativeCourse": "GENERAL_MANAGEMENT"
    },
    "AI_ADV_DIPLOMA": {
      "label": "Advanced Diploma in Applied Artificial Intelligence (AI)",
      "minimumAge": null,
      "academic": {
        "minTier": "TIER_DIPLOMA",
        "oLevelSubjectsMin": null,
        "yearsFormalEducationMin": null,
        "altCourseCompletion": null,
        "workExperienceAlternativeYears": null,
        "altNote": "A Diploma from any institution, OR GCE A-Levels or equivalent."
      },
      "english": {
        "minIelts": 6,
        "minUccPlacement": 75,
        "altCourseCompletion": null,
        "altNote": "OR a pass in English in high school."
      },
      "matureApplicant": {
        "minAge": 30,
        "minYears": 8
      },
      "alternativeCourse": "AI_DIPLOMA"
    }
  },

  COURSE_TYPE_KEY_MAP: {
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
  },


  // ===========================================================================
  // === END EDIT THRESHOLDS ===
  // ===========================================================================

  // ---------- AI Settings (browser localStorage only) ----------
  get_ai_settings() {
    try {
      const raw = localStorage.getItem(this.KEY_LS);
      if (!raw) return { enabled: false };
      return JSON.parse(raw);
    } catch (e) {
      return { enabled: false };
    }
  },

  save_ai_settings(values) {
    const settings = {
      enabled: !!values.enable_ai,
      apiKey: String(values.api_key || "").trim(),
      analysisModel: String(values.analysis_model || "gpt-4o-mini").trim(),
      utilityModel: String(values.utility_model || "gpt-4o-mini").trim(),
      visionModel: String(values.vision_model || "gpt-4o-mini").trim(),
      temperature: values.temperature !== undefined && values.temperature !== null && values.temperature !== ""
        ? parseFloat(values.temperature) : 0.10
    };
    localStorage.setItem(this.KEY_LS, JSON.stringify(settings));
    return settings;
  },

  open_ai_settings(frm) {
    const self = this;
    const current = this.get_ai_settings();
    const d = new frappe.ui.Dialog({
      title: "AI Settings",
      fields: [
        {
          fieldtype: "HTML",
          options: "<div style='color:#667085;font-size:12px;margin-bottom:8px'>Stored ONLY in this browser's local storage. The API key is never saved to this record, sent to any server of ours, or committed anywhere.</div>"
        },
        { label: "Enable AI", fieldname: "enable_ai", fieldtype: "Check", default: current.enabled ? 1 : 0,
          description: "When off, Extract from PDF is disabled and Run Assessment only uses the rules engine on whatever is already in the fields." },
        { label: "OpenAI API Key", fieldname: "api_key", fieldtype: "Small Text", default: current.apiKey || "",
          description: "From platform.openai.com/account/api-keys. Starts with sk- (project keys sk-proj-… can be ~160 chars; Small Text is used so the full key fits — it is stored only in this browser's local storage)." },
        { label: "Vision Model", fieldname: "vision_model", fieldtype: "Data", default: current.visionModel || "gpt-4o-mini",
          description: "Used by Extract from PDF to read the uploaded document." },
        { label: "Analysis Model", fieldname: "analysis_model", fieldtype: "Data", default: current.analysisModel || "gpt-4o-mini",
          description: "Reserved for future use classifying ambiguous equivalency cases." },
        { label: "Utility Model", fieldname: "utility_model", fieldtype: "Data", default: current.utilityModel || "gpt-4o-mini",
          description: "Reserved for future lightweight text-processing calls." },
        { label: "Temperature", fieldname: "temperature", fieldtype: "Float", default: current.temperature !== undefined ? current.temperature : 0.10,
          description: "Lower = more literal/consistent extraction. Default 0.10." }
      ],
      primary_action_label: "Save",
      primary_action(values) {
        const cleaned = String(values.api_key || "").trim();
        if (cleaned && !/^sk-/.test(cleaned)) {
          frappe.msgprint({
            title: "That does not look like an OpenAI key",
            message: "OpenAI secret keys start with <b>sk-</b>.",
            indicator: "red"
          });
          return;
        }
        self.save_ai_settings(values);
        d.hide();
        frappe.show_alert({ message: "AI Settings saved to this browser.", indicator: "green" });
      }
    });
    d.show();
  },

  // ---------- helpers ----------
  strip(html) {
    return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  },

  async file_to_data_url(file_url) {
    const res = await fetch(file_url);
    if (!res.ok) throw new Error(`Could not read attached file (HTTP ${res.status}).`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read attached file."));
      reader.readAsDataURL(blob);
    });
  },

  compute_age(dob_str) {
    if (!dob_str) return null;
    const dob = new Date(dob_str);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  },

  // Case-insensitive best-match lookup: exact match first, then "the map key
  // appears inside the input" (handles free text like "Diploma in Business
  // Management for Sarah Tan"), preferring the longest matching key.
  best_match(input, map) {
    if (!input) return null;
    const norm = String(input).trim().toLowerCase();
    if (!norm) return null;
    for (const key of Object.keys(map)) {
      if (key.toLowerCase() === norm) return { key, value: map[key] };
    }
    let best = null;
    for (const key of Object.keys(map)) {
      const k = key.toLowerCase();
      if (norm.includes(k) || k.includes(norm)) {
        if (!best || k.length > best.key.length) best = { key, value: map[key] };
      }
    }
    return best;
  },

  match_course_type(course_type) {
    const m = this.best_match(course_type, this.COURSE_TYPE_KEY_MAP);
    if (!m) return null;
    return { ruleKey: m.value, rule: this.MER_RULES[m.value] };
  },

  match_qualification_tier(qualification) {
    const m = this.best_match(qualification, this.ACADEMIC_EQUIVALENCY.qualificationToTier);
    if (!m) return null;
    const tier = this.ACADEMIC_EQUIVALENCY.tiers.find((t) => t.key === m.value);
    return tier ? { matchedOn: m.key, tier } : null;
  },

  tier_rank(tier_key) {
    const t = this.ACADEMIC_EQUIVALENCY.tiers.find((x) => x.key === tier_key);
    return t ? t.rank : -1;
  },

  // Converts whatever english_test/english_score the applicant has into an
  // IELTS-equivalent band using ENGLISH_EQUIVALENCY, best-effort matching the
  // test name. Returns { ielts, uccPlacement, matchedRow } or null if the
  // test name isn't recognised (caller should route to Review, not Fail).
  normalise_english_score(english_test, english_score) {
    if (!english_test || english_score === null || english_score === undefined || english_score === "") return null;
    const test = String(english_test).toLowerCase();
    const scoreNum = parseFloat(english_score);
    if (isNaN(scoreNum)) return null;

    const inRange = (v) => (Array.isArray(v) ? scoreNum >= v[0] && scoreNum <= v[1] : v === scoreNum);
    let column = null;
    if (test.includes("ucc") || test.includes("placement")) column = "uccPlacementTest";
    else if (test.includes("ielts")) column = "ielts";
    else if (test.includes("pte")) column = "pte";
    else if (test.includes("toefl")) column = "toeflIbt";
    else if (test.includes("duolingo")) column = "duolingo";
    else return null; // unrecognised test name — caller routes to Review

    // Find the closest row whose column value covers (or is nearest to) the score,
    // then read off the row's ielts/uccPlacementTest for a normalised comparison.
    let bestRow = null, bestDiff = Infinity;
    for (const row of this.ENGLISH_EQUIVALENCY) {
      const v = row[column];
      if (v === null || v === undefined) continue;
      if (inRange(v)) { bestRow = row; bestDiff = 0; break; }
      const mid = Array.isArray(v) ? (v[0] + v[1]) / 2 : v;
      const diff = Math.abs(mid - scoreNum);
      if (diff < bestDiff) { bestDiff = diff; bestRow = row; }
    }
    if (!bestRow) return null;
    return { ielts: bestRow.ielts, uccPlacement: bestRow.uccPlacementTest, matchedRow: bestRow.label };
  },

  // ---------- PDF extraction ----------
  async extract_from_pdf(frm) {
    const settings = this.get_ai_settings();
    if (!settings.enabled || !settings.apiKey) {
      frappe.msgprint({
        title: "AI extraction not available",
        message: "Enable AI and enter an OpenAI API key via the <b>AI Settings</b> button, or fill in the Applicant Details fields by hand.",
        indicator: "orange"
      });
      return;
    }

    frappe.show_alert({ message: "Extracting from PDF…", indicator: "blue" });

    try {
      const files = [{ url: frm.doc.application_pdf, name: "application.pdf" }];
      if (frm.doc.supporting_pdf) files.push({ url: frm.doc.supporting_pdf, name: "supporting.pdf" });

      const fileContentParts = [];
      for (const f of files) {
        const data_url = await this.file_to_data_url(f.url);
        fileContentParts.push({ type: "file", file: { filename: f.name, file_data: data_url } });
      }

      const system_prompt = [
        "You extract structured admission data from an applicant's uploaded document(s) (application form, transcripts, certificates).",
        "Return ONLY a JSON object, no prose, no markdown fences, with exactly these keys:",
        '{"applicant_name":"string or null","date_of_birth":"YYYY-MM-DD or null","nationality":"string or null","residence_status":"string or null","program_applied":"string or null","course_type":"string or null","student_type":"string or null","highest_qualification":"string or null","english_test":"string or null","english_score":"string or null","work_experience_years":"number or null","extraction_notes":"string or null"}',
        "date_of_birth MUST be converted to ISO YYYY-MM-DD regardless of the format printed on the document.",
        "course_type should be steered toward this exact controlled vocabulary when the document clearly matches one of these programmes (use the closest match, do not force a match if none fits): " +
          Object.keys(this.COURSE_TYPE_KEY_MAP).join(" | "),
        "work_experience_years is total relevant work experience summed across any employment history shown, in years (decimal allowed).",
        "Do not invent any value not evidenced in the document — use null for anything not found. Put anything you are unsure about in extraction_notes.",
        "Return JSON only."
      ].join("\n");

      const body = {
        model: settings.visionModel || "gpt-4o-mini",
        temperature: settings.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: [{ type: "text", text: "Extract the applicant fields from the attached document(s)." }, ...fileContentParts] }
        ]
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        let detail = "";
        try { const j = await res.json(); detail = j.error && j.error.message ? j.error.message : ""; } catch (e) {}
        if (res.status === 0 || /Failed to fetch/i.test(detail)) {
          throw new Error("Network/CORS error calling OpenAI directly from the browser. This environment may need a Server Script proxy to reach api.openai.com — extraction cannot proceed client-side here.");
        }
        throw new Error(`OpenAI ${res.status}${detail ? ": " + detail : ""}`);
      }

      const data = await res.json();
      const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
      if (!content) throw new Error("The model returned an empty response.");

      let extracted;
      try {
        extracted = JSON.parse(content);
      } catch (e) {
        frm.set_value("extracted_json", content);
        frm.set_value("extraction_status", "Extraction Failed");
        frappe.msgprint({
          title: "Extraction failed",
          message: "The model did not return valid JSON. Raw output saved to Extracted JSON for review — please fill in Applicant Details manually.",
          indicator: "red"
        });
        return;
      }

      frm.set_value("extracted_json", JSON.stringify(extracted, null, 2));

      const fieldMap = {
        applicant_name: "applicant_name", date_of_birth: "date_of_birth", nationality: "nationality",
        residence_status: "residence_status", program_applied: "program_applied", course_type: "course_type",
        student_type: "student_type", highest_qualification: "highest_qualification", english_test: "english_test",
        english_score: "english_score", work_experience_years: "work_experience_years"
      };
      let any_set = false;
      for (const [jsonKey, fieldname] of Object.entries(fieldMap)) {
        const v = extracted[jsonKey];
        if (v !== null && v !== undefined && v !== "") { frm.set_value(fieldname, v); any_set = true; }
      }

      frm.set_value("extraction_status", any_set ? "Extracted" : "Extraction Failed");

      if (extracted.extraction_notes) {
        frappe.msgprint({
          title: "Extraction complete — review before assessing",
          message: frappe.utils.escape_html(extracted.extraction_notes),
          indicator: "blue"
        });
      } else {
        frappe.show_alert({ message: "Extracted. Review the fields, then click Run Assessment.", indicator: "green" });
      }
    } catch (e) {
      frm.set_value("extraction_status", "Extraction Failed");
      frappe.msgprint({
        title: "AI extraction failed",
        message: frappe.utils.escape_html(e && e.message ? e.message : String(e)),
        indicator: "red"
      });
    }
  },

  // ---------- assessment ----------
  async run_assessment(frm) {
    try {
      const doc = frm.doc;
      const age = this.compute_age(doc.date_of_birth);
      if (age !== null) frm.set_value("age", age);

      const flags = [];
      const detail = { criteria: {}, flags, matched_course_key: null, matured_applicant_route: false };

      const courseMatch = this.match_course_type(doc.course_type);
      if (!courseMatch) {
        flags.push(`Course type "${doc.course_type || "(blank)"}" did not match any known programme.`);
        frm.set_value("academic_status", "Review");
        frm.set_value("english_status", "Review");
        frm.set_value("age_status", "Review");
        frm.set_value("recommendation", "Manual Review");
        frm.set_value("proposed_alternative", "");
        frm.set_value("assessment_detail", JSON.stringify(detail, null, 2));
        this.build_result_html(frm, detail);
        frm.set_value("assessed_on", frappe.datetime.now_datetime());
        frm.set_value("assessed_by", frappe.session.user);
        await frm.save();
        return;
      }

      const rule = courseMatch.rule;
      detail.matched_course_key = courseMatch.ruleKey;
      detail.course_label = rule.label;

      // ---- Age ----
      let age_status = "Review";
      if (age === null) {
        flags.push("No Date of Birth on record — age could not be checked.");
      } else if (rule.minimumAge === null || rule.minimumAge === undefined) {
        flags.push(`No minimum age is on record for "${rule.label}" — please verify manually.`);
      } else if (age >= rule.minimumAge) {
        age_status = "Pass";
      } else {
        age_status = "Fail";
        flags.push(`Applicant is ${age}, below the minimum age of ${rule.minimumAge} for "${rule.label}".`);
      }
      detail.criteria.age = { status: age_status, applicantAge: age, requiredMinimumAge: rule.minimumAge };

      // ---- Mature Applicant route (checked alongside academic) ----
      let matured_route = false;
      if (rule.matureApplicant) {
        const ageOk = rule.matureApplicant.minAge === null || rule.matureApplicant.minAge === undefined || (age !== null && age >= rule.matureApplicant.minAge);
        const yearsOk = doc.work_experience_years !== null && doc.work_experience_years !== undefined && doc.work_experience_years >= rule.matureApplicant.minYears;
        if (ageOk && yearsOk) {
          matured_route = true;
          flags.push(`Qualifies via the Mature Applicant route (${rule.matureApplicant.minYears}+ years work experience${rule.matureApplicant.minAge ? `, age ${rule.matureApplicant.minAge}+` : ""}) — requires interview and supporting documents per UCC policy.`);
        }
      }
      detail.matured_applicant_route = matured_route;

      // ---- Academic ----
      let academic_status = "Fail";
      const qualMatch = this.match_qualification_tier(doc.highest_qualification);
      const altCourseKey = rule.academic.altCourseCompletion;
      const altCourseMatched = altCourseKey && doc.highest_qualification &&
        String(doc.highest_qualification).toLowerCase().includes((this.MER_RULES[altCourseKey] || {}).label.toLowerCase());

      if (matured_route) {
        academic_status = "Pass"; // mature route substitutes for the academic requirement, but overall still routes to interview below
        flags.push("Academic requirement satisfied via the Mature Applicant route.");
      } else if (!doc.highest_qualification || String(doc.highest_qualification).trim() === "") {
        academic_status = "Review";
        flags.push("No Highest Qualification on record — cannot check the academic requirement.");
      } else if (qualMatch && this.tier_rank(qualMatch.tier.key) >= this.tier_rank(rule.academic.minTier)) {
        academic_status = "Pass";
      } else if (altCourseMatched) {
        academic_status = "Pass";
        flags.push(`Academic requirement satisfied via prior completion of "${this.MER_RULES[altCourseKey].label}".`);
      } else if (!qualMatch) {
        academic_status = "Review";
        flags.push(`Highest Qualification "${doc.highest_qualification}" was not recognised — please verify manually against: ${rule.academic.altNote}`);
      } else if (rule.academic.workExperienceAlternativeYears && doc.work_experience_years >= rule.academic.workExperienceAlternativeYears) {
        academic_status = "Pass";
        flags.push(`Academic requirement satisfied via ${rule.academic.workExperienceAlternativeYears}+ years work experience — requires interview per UCC policy.`);
        matured_route = true; // this path also requires interview, same as Mature Applicant
        detail.matured_applicant_route = true;
      } else {
        academic_status = "Fail";
        flags.push(`Highest Qualification does not meet the requirement for "${rule.label}": ${rule.academic.altNote}`);
      }
      detail.criteria.academic = {
        status: academic_status, requirement: rule.academic.altNote,
        matchedQualification: qualMatch ? qualMatch.matchedOn : null, matchedTier: qualMatch ? qualMatch.tier.key : null
      };

      // ---- English ----
      // `english_unrecognised` distinguishes "we have no basis to evaluate this"
      // (blank, or a test name we don't recognise) from a genuine Fail (a
      // recognised test whose score falls short) — the two route to different
      // recommendations below: unrecognised -> Conditional Placement Required
      // (invite them to sit UCC's own test), genuine Fail -> Not Eligible.
      let english_status = "Review";
      let english_unrecognised = false;
      if (!rule.english) {
        english_status = "Review";
        flags.push(rule.mandarinNote || "This programme's language requirement is not English-based — verify manually.");
      } else if (!doc.english_test && !doc.english_score) {
        english_status = "Review";
        english_unrecognised = true;
        flags.push("No English Test / Score on record.");
      } else {
        const norm = this.normalise_english_score(doc.english_test, doc.english_score);
        const altCourseEn = rule.english.altCourseCompletion;
        const altCourseEnMatched = altCourseEn && doc.highest_qualification &&
          String(doc.highest_qualification).toLowerCase().includes((this.MER_RULES[altCourseEn] || {}).label.toLowerCase());
        if (norm && rule.english.minIelts !== null && norm.ielts !== null && norm.ielts >= rule.english.minIelts) {
          english_status = "Pass";
        } else if (altCourseEnMatched) {
          english_status = "Pass";
          flags.push(`English requirement satisfied via prior completion of "${this.MER_RULES[altCourseEn].label}".`);
        } else if (!norm) {
          english_status = "Review";
          english_unrecognised = true;
          flags.push(`English Test "${doc.english_test}" with score "${doc.english_score}" was not recognised — please verify manually against: ${rule.english.altNote}`);
        } else {
          english_status = "Fail";
          flags.push(`English score does not meet the requirement for "${rule.label}" (needs IELTS ${rule.english.minIelts} / UCC Placement Test ${rule.english.minUccPlacement} or equivalent).`);
        }
      }
      detail.criteria.english = { status: english_status, requirement: rule.english ? rule.english.altNote : (rule.mandarinNote || null), unrecognised: english_unrecognised };

      frm.set_value("academic_status", academic_status);
      frm.set_value("english_status", english_status);
      frm.set_value("age_status", age_status);

      // ---- Recommendation ----
      // Priority order:
      //   1. Mature Applicant / work-experience-interview route, nothing else failed -> Requires Interview.
      //   2. A hard blocker unrelated to English recognition (academic or age Fail) -> Not Eligible.
      //   3. English is the only gap AND we have no recognised test at all -> Conditional Placement Required
      //      (never Not Eligible for a missing/unrecognised test — invite them to sit the Placement Test).
      //   4. A recognised English test whose score falls short -> Not Eligible.
      //   5. Anything else still ambiguous (unmatched qualification/course, missing age policy) -> Review path.
      //   6. Otherwise -> Eligible.
      let recommendation, proposed_alternative = "";
      const hardFail = academic_status === "Fail" || age_status === "Fail";
      const anyReview = [academic_status, english_status, age_status].includes("Review");

      const propose_alternative = () => {
        if (!rule.alternativeCourse) {
          flags.push("No lower/foundation course is defined as a fallback for this programme — refer to Admissions for manual guidance.");
          return "";
        }
        const altRule = this.MER_RULES[rule.alternativeCourse];
        if (altRule.minimumAge && age !== null && age < altRule.minimumAge) {
          flags.push(`Note: the proposed alternative "${altRule.label}" also has a minimum age of ${altRule.minimumAge}, which this applicant (age ${age}) does not yet meet.`);
        }
        return altRule.label;
      };

      if (matured_route && !hardFail && english_status !== "Fail") {
        recommendation = "Requires Interview";
      } else if (hardFail) {
        recommendation = "Not Eligible";
        proposed_alternative = propose_alternative();
      } else if (english_unrecognised && academic_status !== "Fail") {
        recommendation = "Conditional – English Placement Required";
        proposed_alternative = "UCC English Placement Test";
      } else if (english_status === "Fail") {
        recommendation = "Not Eligible";
        proposed_alternative = propose_alternative();
      } else if (anyReview) {
        recommendation = doc.highest_qualification || doc.course_type ? "Requires Additional Documents" : "Manual Review";
      } else {
        recommendation = "Eligible";
      }

      frm.set_value("recommendation", recommendation);
      frm.set_value("proposed_alternative", proposed_alternative);
      frm.set_value("assessment_detail", JSON.stringify(detail, null, 2));

      this.build_result_html(frm, detail);

      frm.set_value("assessed_on", frappe.datetime.now_datetime());
      frm.set_value("assessed_by", frappe.session.user);

      await frm.save();
      frappe.show_alert({ message: `Assessment complete: ${recommendation}.`, indicator: "green" });
    } catch (e) {
      console.error(e);
      frm.set_value("recommendation", "Manual Review");
      frm.set_value("assessment_detail", JSON.stringify({ error: e && e.message ? e.message : String(e) }, null, 2));
      frappe.msgprint({
        title: "Assessment error",
        message: "Something went wrong while assessing this applicant. Recommendation set to Manual Review. Details: " +
          frappe.utils.escape_html(e && e.message ? e.message : String(e)),
        indicator: "red"
      });
      try { await frm.save(); } catch (e2) { /* leave unsaved if even this fails; error already shown */ }
    }
  },

  // ---------- HTML render ----------
  build_result_html(frm, detail) {
    const rec = frm.doc.recommendation || "Manual Review";
    const badgeColor = {
      "Eligible": "#2e7d32", "Not Eligible": "#c62828",
      "Conditional – English Placement Required": "#ef6c00",
      "Requires Interview": "#1a3b6e", "Requires Additional Documents": "#8a6d00",
      "Manual Review": "#666"
    }[rec] || "#666";

    const criterionCard = (label, c) => {
      if (!c) return "";
      const color = c.status === "Pass" ? "#2e7d32" : c.status === "Fail" ? "#c62828" : "#8a6d00";
      const bg = c.status === "Pass" ? "#e8f5e9" : c.status === "Fail" ? "#fdecea" : "#fff8e1";
      return `
        <div style="flex:1;min-width:200px;border:1px solid ${color}33;background:${bg};border-radius:8px;padding:10px 12px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${color};letter-spacing:.04em;">${label}</div>
          <div style="font-size:18px;font-weight:750;color:${color};margin:2px 0 6px;">${frappe.utils.escape_html(c.status)}</div>
          <div style="font-size:12px;color:#444;line-height:1.4;">${frappe.utils.escape_html(c.requirement || "")}</div>
        </div>`;
    };

    const flagsHtml = (detail.flags || []).length
      ? `<ul style="margin:10px 0 0;padding-left:18px;font-size:12.5px;color:#555;line-height:1.6;">${detail.flags.map((f) => `<li>${frappe.utils.escape_html(f)}</li>`).join("")}</ul>`
      : "";

    const altHtml = frm.doc.proposed_alternative
      ? `<div style="margin-top:12px;padding:10px 12px;border:1px solid #8295bd55;background:#eef2fb;border-radius:8px;">
           <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#33406a;letter-spacing:.04em;">Proposed Alternative</div>
           <div style="font-size:14px;color:#1a3b6e;margin-top:2px;">${frappe.utils.escape_html(frm.doc.proposed_alternative)}</div>
         </div>`
      : "";

    const html = `
      <div style="font-family:inherit;border:1px solid #e0e0e0;border-radius:10px;padding:16px;background:#fff;">
        <div style="display:inline-block;padding:5px 14px;border-radius:999px;background:${badgeColor};color:#fff;font-weight:700;font-size:14px;margin-bottom:12px;">
          ${frappe.utils.escape_html(rec)}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${criterionCard("Academic", detail.criteria && detail.criteria.academic)}
          ${criterionCard("English", detail.criteria && detail.criteria.english)}
          ${criterionCard("Age", detail.criteria && detail.criteria.age)}
        </div>
        ${flagsHtml}
        ${altHtml}
      </div>`;

    frm.set_df_property("eligibility_result_html", "options", html);
    frm.refresh_field("eligibility_result_html");
  },

  // ---------- buttons ----------
  bind(frm) {
    frm.page.clear_primary_action();
    frm.add_custom_button("Run Assessment", () => AEA.run_assessment(frm)).addClass("btn-primary");
    frm.add_custom_button("AI Settings", () => AEA.open_ai_settings(frm));
    if (frm.doc.application_pdf) {
      frm.add_custom_button("Re-extract from PDF", () => AEA.extract_from_pdf(frm));
    }
  }
};
