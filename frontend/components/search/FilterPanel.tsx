import React from "react";
import { useSearchContext } from "../../context/SearchContext";

export function FilterPanel(): React.ReactElement {
  const { filters, handleFilterChange, currentFilters, dateRange, setDateRange } = useSearchContext();

  const activeFilterCount = Object.values(filters).reduce(
    (sum, vals) => sum + vals.length,
    0,
  ) + (dateRange.from ? 1 : 0) + (dateRange.to ? 1 : 0);

  const toggleFilterValue = (fieldId: string, value: string): void => {
    const current = filters[fieldId] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    handleFilterChange(fieldId, next);
  };

  return (
    <div className="card filters-panel">
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
      {currentFilters.map((filter) => {
        const selected = filters[filter.fieldId] ?? [];
        return (
          <div key={filter.fieldId} className="filter-group">
            <div className="filter-group__label">{filter.label}</div>
            <div className="filter-chips">
              {filter.options.length > 0
                ? filter.options.map((opt) => (
                    <button
                      key={opt}
                      className={`filter-chip ${selected.includes(opt) ? "filter-chip--active" : ""}`}
                      onClick={() => toggleFilterValue(filter.fieldId, opt)}
                    >
                      {opt}
                    </button>
                  ))
                : <span className="filter-chips__empty">Zoek om opties te laden</span>
              }
            </div>
          </div>
        );
      })}
      {activeFilterCount > 0 && (
        <button
          className="btn-clear-filters"
          onClick={() => {
            for (const f of currentFilters) handleFilterChange(f.fieldId, []);
            setDateRange({ from: "", to: "" });
          }}
        >
          Filters wissen
        </button>
      )}
    </div>
  );
}
