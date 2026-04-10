import { RecordAccessor, buildKeywordHaystack } from "./recordAccessor";

const VACATURE_SCRAPER_EXCLUDE_FIELDS = new Set(["Latitude", "Longitude"]);

/**
 * Collect searchable text from a company record (coordinates excluded).
 */
export function buildCompanyKeywordHaystack(
  company: RecordAccessor,
  companyExcludeFieldIds: Set<string>,
): string {
  return buildKeywordHaystack(company, company.fieldIds, companyExcludeFieldIds);
}

/**
 * Vacancy fields plus all linked company records' fields.
 */
export function buildVacancyKeywordHaystack(
  vacancy: RecordAccessor,
  companyMap: ReadonlyMap<string, RecordAccessor>,
  vacancyExcludeFieldIds: Set<string>,
  companyExcludeFieldIds: Set<string>,
  companyLinkFieldId: string,
  companyKeywordHaystackCache?: Map<string, string>,
): string {
  const vacancyHaystack = buildKeywordHaystack(vacancy, vacancy.fieldIds, vacancyExcludeFieldIds);

  const companyIds = vacancy.getLinkedIds(companyLinkFieldId);
  const companyParts: string[] = [];
  for (const companyId of companyIds) {
    const company = companyMap.get(companyId);
    if (company) {
      const cachedHaystack = companyKeywordHaystackCache?.get(companyId);
      if (cachedHaystack != null) {
        companyParts.push(cachedHaystack);
        continue;
      }

      const companyHaystack = buildCompanyKeywordHaystack(company, companyExcludeFieldIds);
      companyKeywordHaystackCache?.set(companyId, companyHaystack);
      companyParts.push(companyHaystack);
    }
  }

  if (companyParts.length === 0) return vacancyHaystack;
  return vacancyHaystack + " " + companyParts.join(" ");
}

/**
 * Collect searchable text from a candidate record.
 */
export function buildCandidateKeywordHaystack(
  candidate: RecordAccessor,
): string {
  return buildKeywordHaystack(candidate, candidate.fieldIds, new Set());
}

/**
 * Build keyword haystack from Vacature scraper record fields (coordinates excluded).
 */
export function buildVacatureScraperKeywordHaystack(
  accessor: RecordAccessor,
): string {
  return buildKeywordHaystack(accessor, accessor.fieldIds, VACATURE_SCRAPER_EXCLUDE_FIELDS);
}

/**
 * Whitespace-separated tokens; every token must appear (substring, case-insensitive).
 */
export function matchesKeywordQuery(haystackLower: string, rawQuery: string): boolean {
  return matchesKeywordTokens(haystackLower, rawQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean));
}

export function matchesKeywordTokens(
  haystackLower: string,
  tokens: readonly string[],
): boolean {
  if (tokens.length === 0) return true;
  for (const t of tokens) {
    if (!haystackLower.includes(t)) return false;
  }
  return true;
}
