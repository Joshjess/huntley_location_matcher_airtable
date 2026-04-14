import React from "react";
import { useSearchContext } from "../../context/SearchContext";
import { PROFIELGROEP_FIELD_ID } from "../../utils/config";

export function ProfielgroepSelector(): React.ReactElement | null {
  const { searchMode, currentFilters, filters, handleFilterChange } = useSearchContext();

  if (searchMode !== "candidate") return null;

  const profielgroepFilter = currentFilters.find((f) => f.fieldId === PROFIELGROEP_FIELD_ID);
  if (!profielgroepFilter || profielgroepFilter.options.length === 0) return null;

  const selected = filters[PROFIELGROEP_FIELD_ID] ?? [];
  const dropdownValue = selected.length === 1 ? selected[0] : "";

  return (
    <div className="profielgroep-selector">
      <label className="field-label">
        <span className="filter-group__label">Profielgroep</span>
      <select
        className="select profielgroep-selector__select"
        value={dropdownValue}
        onChange={(e) =>
          handleFilterChange(PROFIELGROEP_FIELD_ID, e.target.value ? [e.target.value] : [])
        }
      >
        <option value="">Alle profielgroepen</option>
        {profielgroepFilter.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      </label>
    </div>
  );
}
