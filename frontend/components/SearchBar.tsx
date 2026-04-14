import React, { useState } from "react";
import { useSearchContext } from "../context/SearchContext";
import { ModeToggle } from "./search/ModeToggle";
import { SourceSelector } from "./search/SourceSelector";
import { SearchInputRow } from "./search/SearchInputRow";
import { KeywordInput } from "./search/KeywordInput";
import { FilterPanel } from "./search/FilterPanel";

export function SearchBar(): React.ReactElement {
  const { filters, dateRange } = useSearchContext();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = Object.values(filters).reduce(
    (sum, vals) => sum + vals.length,
    0,
  ) + (dateRange.from ? 1 : 0) + (dateRange.to ? 1 : 0);

  return (
    <div className="search-bar-container">
      <ModeToggle />
      <SourceSelector />

      <div className="card search-bar">
        <SearchInputRow
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          activeFilterCount={activeFilterCount}
        />
        <KeywordInput />
      </div>
      {filtersOpen && <FilterPanel />}
    </div>
  );
}
