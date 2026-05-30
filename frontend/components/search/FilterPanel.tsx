import React from "react";
import { useSearchContext } from "../../context/SearchContext";
import { SingleSelectFilter } from "./SingleSelectFilter";
import { COMPANY_SECTOR_FIELD_ID, PROFIELGROEP_FIELD_ID } from "../../utils/config";

function FlameIcon({ filled, size = 16 }: { filled?: boolean; size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export function FilterPanel(): React.ReactElement {
  const {
    searchMode, filters, handleFilterChange, currentFilters,
    dateRange, setDateRange, hotlistEnabled, setHotlistEnabled,
  } = useSearchContext();

  const showHotlist = searchMode === "vacancy" || searchMode === "company";
  const showSector = searchMode === "vacancy" || searchMode === "company";
  const showProfielgroep = searchMode === "candidate";

  const activeFilterCount = Object.values(filters).reduce(
    (sum, vals) => sum + vals.length,
    0,
  ) + (dateRange.from ? 1 : 0) + (dateRange.to ? 1 : 0) + (hotlistEnabled ? 1 : 0);

  return (
    <div className="card filters-panel">
      {showHotlist && (
        <div className="filter-group">
          <button
            className={`btn-hotlist ${hotlistEnabled ? "btn-hotlist--active" : ""}`}
            onClick={() => setHotlistEnabled((prev) => !prev)}
            title={hotlistEnabled ? "Hotlist filter uitzetten" : "Toon alleen hotlist bedrijven"}
          >
            <span className="btn-hotlist__icon">
              <FlameIcon filled={hotlistEnabled} />
            </span>
            <span>Hotlist</span>
          </button>
        </div>
      )}
      <div className="filter-group">
        <div className="filter-group__label">Aanmaakdatum</div>
        <div className="date-range">
          <label className="date-range__field">
            <span className="date-range__label">Van</span>
            <input
              type="date"
              className="input date-range__input"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label className="date-range__field">
            <span className="date-range__label">Tot</span>
            <input
              type="date"
              className="input date-range__input"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
        </div>
      </div>
      {showSector && (
        <SingleSelectFilter
          fieldId={COMPANY_SECTOR_FIELD_ID}
          label="Sector"
          placeholder="Alle sectoren"
        />
      )}
      {showProfielgroep && (
        <SingleSelectFilter
          fieldId={PROFIELGROEP_FIELD_ID}
          label="Profielgroep"
          placeholder="Alle profielgroepen"
        />
      )}
      {activeFilterCount > 0 && (
        <button
          className="btn-clear-filters"
          onClick={() => {
            for (const f of currentFilters) handleFilterChange(f.fieldId, []);
            setDateRange({ from: "", to: "" });
            setHotlistEnabled(false);
          }}
        >
          Filters wissen
        </button>
      )}
    </div>
  );
}
