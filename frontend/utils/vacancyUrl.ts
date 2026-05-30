import { RecordAccessor } from "./recordAccessor";

const URL_RE = /^https?:\/\//i;

/** Trim for comparison: lowercase, strip whitespace and trailing slashes. */
export function normalizeUrl(raw: string): string {
  return raw.trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * First field value that looks like an http(s) URL, normalized; null if none.
 * Works on any RecordAccessor (local SDK vacancies and Vacature scraper records).
 */
export function extractVacancyUrl(accessor: RecordAccessor): string | null {
  for (const fieldId of accessor.fieldIds) {
    const val = accessor.getString(fieldId);
    if (val && URL_RE.test(val.trim())) return normalizeUrl(val);
  }
  return null;
}
