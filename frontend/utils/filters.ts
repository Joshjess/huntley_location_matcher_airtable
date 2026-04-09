import { SearchResult, FilterValue } from "../types";

export type FilterMap = { [fieldId: string]: string[] };

export function applyFilters(
  allResults: SearchResult[],
  activeFilters: FilterMap,
): { filtered: SearchResult[]; filteredOut: number } {
  let filteredOut = 0;
  const filtered: SearchResult[] = [];
  for (const r of allResults) {
    let passes = true;
    for (const [fieldId, selectedValues] of Object.entries(activeFilters)) {
      if (selectedValues.length === 0) continue;
      const cellValue: FilterValue = r.filterValues[fieldId] ?? null;
      if (Array.isArray(cellValue)) {
        if (!cellValue.some((v) => selectedValues.includes(v))) {
          passes = false;
          break;
        }
      } else {
        if (!selectedValues.includes(cellValue ?? "")) {
          passes = false;
          break;
        }
      }
    }
    if (passes) filtered.push(r);
    else filteredOut++;
  }
  return { filtered, filteredOut };
}
