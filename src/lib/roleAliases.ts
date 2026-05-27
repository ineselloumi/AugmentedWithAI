/**
 * Maps known role synonyms (lowercase) to a canonical role key (also lowercase).
 * The canonical key is what gets stored in and looked up from the cache.
 * Add new entries here as new variants are discovered.
 */
export const ROLE_ALIASES: Record<string, string> = {
  // ── Product Manager ──────────────────────────────────────────────
  "product manager":            "product manager",
  "pm":                         "product manager",
  "product mgr":                "product manager",
  "product management":         "product manager",

  // ── Product Marketing Manager ─────────────────────────────────────
  "product marketing manager":  "product marketing manager",
  "pmm":                        "product marketing manager",
  "product marketer":           "product marketing manager",
  "product marketing":          "product marketing manager",

  // ── Data Scientist ────────────────────────────────────────────────
  "data scientist":             "data scientist",
  "data science":               "data scientist",
  "ml engineer":                "data scientist",
  "machine learning engineer":  "data scientist",
  "applied scientist":          "data scientist",

  // ── Data Science Manager ──────────────────────────────────────────
  "data science manager":       "data science manager",
  "manager of data science":    "data science manager",

  // ── Director of Data Science ──────────────────────────────────────
  "director of data science":   "director of data science",
  "data science director":      "director of data science",

  // ── Data Analyst ─────────────────────────────────────────────────
  "data analyst":               "data analyst",
  "data analytics":             "data analyst",
  "business analyst":           "data analyst",
  "analyst":                    "data analyst",

  // ── Software Engineer ─────────────────────────────────────────────
  "software engineer":          "software engineer",
  "swe":                        "software engineer",
  "software developer":         "software engineer",
  "software dev":               "software engineer",
  "developer":                  "software engineer",
  "programmer":                 "software engineer",
  "software development":       "software engineer",

  // ── Growth Manager ────────────────────────────────────────────────
  "growth manager":             "growth manager",
  "growth lead":                "growth manager",
  "growth marketer":            "growth manager",
  "growth hacker":              "growth manager",
  "growth":                     "growth manager",

  // ── Product Lead ─────────────────────────────────────────────────
  "product lead":               "product lead",
  "vp of product":              "product lead",
  "vp product":                 "product lead",

  // ── Director of Product ───────────────────────────────────────────
  "director of product":            "director of product",
  "director of product management": "director of product",
  "dir of product":                 "director of product",

  // ── Head of Product ───────────────────────────────────────────────
  "head of product":            "head of product",

  // ── Group Product Manager ─────────────────────────────────────────
  "group product manager":      "group product manager",
  "gpm":                        "group product manager",

  // ── Go-to-Market Manager ──────────────────────────────────────────
  "go-to-market manager":       "go-to-market manager",
  "go to market manager":       "go-to-market manager",
  "go-to-market":               "go-to-market manager",
  "go to market":               "go-to-market manager",
  "gtm manager":                "go-to-market manager",
  "gtm lead":                   "go-to-market manager",
  "gtm":                        "go-to-market manager",

  // ── Head of GTM ───────────────────────────────────────────────────
  "head of gtm":                "head of gtm",
  "head of go-to-market":       "head of gtm",
  "head of go to market":       "head of gtm",

  // ── Business Operations ───────────────────────────────────────────
  "business operations":        "business operations",
  "business ops":               "business operations",
  "biz ops":                    "business operations",
  "bizops":                     "business operations",
  "biz operations":             "business operations",

  // ── Engineering Manager ───────────────────────────────────────────
  "engineering manager":        "engineering manager",
  "eng manager":                "engineering manager",
  "engineering management":     "engineering manager",
  "em":                         "engineering manager",

  // ── Engineering Lead ─────────────────────────────────────────────
  "engineering lead":           "engineering lead",
  "tech lead":                  "engineering lead",
  "technical lead":             "engineering lead",
  "tl":                         "engineering lead",

  // ── CEO ───────────────────────────────────────────────────────────
  "ceo":                        "ceo",
  "chief executive officer":    "ceo",
  "chief executive":            "ceo",

  // ── CTO ───────────────────────────────────────────────────────────
  "cto":                        "cto",
  "chief technology officer":   "cto",
  "chief technical officer":    "cto",
  "vp of engineering":          "cto",
  "vp engineering":             "cto",

  // ── COO ───────────────────────────────────────────────────────────
  "coo":                        "coo",
  "chief operating officer":    "coo",

  // ── CPO ───────────────────────────────────────────────────────────
  "cpo":                        "cpo",
  "chief product officer":      "cpo",

  // ── CMO ───────────────────────────────────────────────────────────
  "cmo":                        "cmo",
  "chief marketing officer":    "cmo",

  // ── Chief of Staff ────────────────────────────────────────────────
  "chief of staff":             "chief of staff",
  "cos":                        "chief of staff",

  // ── Graphic Designer ──────────────────────────────────────────────
  "graphic designer":           "graphic designer",
  "visual designer":            "graphic designer",
  "graphic design":             "graphic designer",

  // ── Product Designer ──────────────────────────────────────────────
  "product designer":           "product designer",
  "ui/ux designer":             "product designer",
  "ux/ui designer":             "product designer",
  "ux designer":                "product designer",
  "ui designer":                "product designer",
  "user experience designer":   "product designer",
  "user interface designer":    "product designer",

  // ── Program Manager ───────────────────────────────────────────────
  "program manager":            "program manager",
  "technical program manager":  "program manager",
  "tpm":                        "program manager",

  // ── Project Manager ───────────────────────────────────────────────
  "project manager":            "project manager",
  "proj manager":               "project manager",
};

/**
 * Returns the canonical cache key for a given role input.
 * Falls back to the lowercased/trimmed input if no alias is found.
 */
export function normalizeRole(input: string): string {
  const key = input.toLowerCase().trim();
  return ROLE_ALIASES[key] ?? key;
}
