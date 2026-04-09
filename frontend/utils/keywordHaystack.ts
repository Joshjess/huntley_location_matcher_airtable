import { RecordAccessor, buildKeywordHaystack } from "./recordAccessor";

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
): string {
  const vacancyHaystack = buildKeywordHaystack(vacancy, vacancy.fieldIds, vacancyExcludeFieldIds);

  const companyIds = vacancy.getLinkedIds(companyLinkFieldId);
  const companyParts: string[] = [];
  for (const companyId of companyIds) {
    const company = companyMap.get(companyId);
    if (company) {
      companyParts.push(buildCompanyKeywordHaystack(company, companyExcludeFieldIds));
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
 * Build keyword haystack from CMA record fields (coordinates excluded).
 */
export function buildCmaKeywordHaystack(
  accessor: RecordAccessor,
): string {
  const exclude = new Set(["Latitude", "Longitude"]);
  return buildKeywordHaystack(accessor, accessor.fieldIds, exclude);
}

/**
 * Whitespace-separated tokens; every token must appear (substring, case-insensitive).
 */
export function matchesKeywordQuery(haystackLower: string, rawQuery: string): boolean {
  const tokens = rawQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  for (const t of tokens) {
    if (!haystackLower.includes(t)) return false;
  }
  return true;
}
