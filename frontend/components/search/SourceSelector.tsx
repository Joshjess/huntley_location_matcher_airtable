import React from "react";
import { useSearchContext } from "../../context/SearchContext";

export function SourceSelector(): React.ReactElement | null {
  const { searchMode, searchSources, handleSearchSourceChange, hasPat } = useSearchContext();

  if (searchMode !== "vacancy") return null;

  return (
    <div className="source-checkboxes">
      <span className="source-checkboxes__label">Zoek in:</span>
      <label className="source-checkbox">
        <input
          type="checkbox"
          checked={searchSources.local}
          onChange={(e) => handleSearchSourceChange("local", e.target.checked)}
        />
        <span>Huidige base</span>
      </label>
      <label className="source-checkbox">
        <input
          type="checkbox"
          checked={searchSources.vacatureScraper}
          onChange={(e) => handleSearchSourceChange("vacatureScraper", e.target.checked)}
          disabled={!hasPat}
        />
        <span>Vacature scraper Airtable</span>
        {!hasPat && <span className="source-checkbox__hint">(PAT vereist)</span>}
      </label>
    </div>
  );
}
