import React, { useState } from "react";
import { MagnifyingGlass, FunnelSimple } from "@phosphor-icons/react";
import { RADIUS_OPTIONS, FILTERS_BY_MODE } from "../constants";
import { SearchBarProps } from "../types";

export function SearchBar({
  searchMode,
  onSearchModeChange,
  locationQuery,
  onLocationQueryChange,
  radius,
  onRadiusChange,
  filters,
  onFilterChange,
  onSearch,
  isSearching,
}: SearchBarProps): React.ReactElement {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") onSearch();
  };

  const activeFilterCount = Object.values(filters).reduce(
    (sum, vals) => sum + vals.length,
    0,
  );

  const currentFilters = FILTERS_BY_MODE[searchMode];

  const toggleFilterValue = (fieldId: string, value: string): void => {
    const current = filters[fieldId] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange(fieldId, next);
  };

  return (
    <div className="search-bar-container">
      <div className="mode-toggle">
        <button
          className={`mode-toggle__btn ${searchMode === "vacancy" ? "mode-toggle__btn--active" : ""}`}
          onClick={() => onSearchModeChange("vacancy")}
        >
          Vacatures
        </button>
        <button
          className={`mode-toggle__btn ${searchMode === "company" ? "mode-toggle__btn--active" : ""}`}
          onClick={() => onSearchModeChange("company")}
        >
          Bedrijven
        </button>
      </div>

      <div className="card search-bar">
        <div className="field-group field-group--location">
          <label className="field-label">Locatie</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <MagnifyingGlass size={16} />
            </span>
            <input
              className="input"
              type="text"
              value={locationQuery}
              onChange={(e) => onLocationQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bijv. Amsterdam, Utrecht, Rotterdam..."
            />
          </div>
        </div>
        <div className="field-group field-group--radius">
          <label className="field-label">Straal</label>
          <select
            className="select"
            value={radius}
            onChange={(e) => onRadiusChange(e.target.value)}
          >
            {RADIUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          className={`btn-icon ${filtersOpen ? "btn-icon--active" : ""}`}
          onClick={() => setFiltersOpen(!filtersOpen)}
          title="Filters"
        >
          <FunnelSimple size={18} weight={filtersOpen ? "fill" : "regular"} />
          {activeFilterCount > 0 && (
            <span className="btn-icon__badge">{activeFilterCount}</span>
          )}
        </button>
        <button
          className="btn-primary"
          onClick={onSearch}
          disabled={isSearching}
        >
          <MagnifyingGlass size={16} weight="bold" />
          {isSearching ? "Zoeken..." : "Zoeken"}
        </button>
      </div>

      {filtersOpen && (
        <div className="card filters-panel">
          {currentFilters.map((filter) => {
            const selected = filters[filter.fieldId] ?? [];
            return (
              <div key={filter.fieldId} className="filter-group">
                <div className="filter-group__label">{filter.label}</div>
                <div className="filter-chips">
                  {filter.options.map((opt) => (
                    <button
                      key={opt}
                      className={`filter-chip ${selected.includes(opt) ? "filter-chip--active" : ""}`}
                      onClick={() => toggleFilterValue(filter.fieldId, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {activeFilterCount > 0 && (
            <button
              className="btn-clear-filters"
              onClick={() => {
                for (const f of currentFilters) onFilterChange(f.fieldId, []);
              }}
            >
              Filters wissen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
