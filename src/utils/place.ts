/** Common spellings in CSVs mapped to the names used in the `countries` table. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States", us: "United States", "u.s.": "United States", "u.s.a.": "United States",
  "united states of america": "United States", uk: "United Kingdom", uae: "United Arab Emirates",
};

const STATE_ALIASES: Record<string, string> = {
  uttrakhand: "Uttarakhand", uttaranchal: "Uttarakhand", "new delhi": "Delhi",
  orissa: "Odisha", pondicherry: "Puducherry",
};

const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

export const canonicalCountry = (s: unknown): string => COUNTRY_ALIASES[clean(s).toLowerCase()] ?? clean(s);
export const canonicalState = (s: unknown): string => STATE_ALIASES[clean(s).toLowerCase()] ?? clean(s);
