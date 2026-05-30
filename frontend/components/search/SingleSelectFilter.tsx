import React from "react";
import { useSearchContext } from "../../context/SearchContext";

interface SingleSelectFilterProps {
  readonly fieldId: string;
  readonly label: string;
  readonly placeholder: string;
}

export function SingleSelectFilter({
  fieldId,
  label,
  placeholder,
}: SingleSelectFilterProps): React.ReactElement | null {
  const { currentFilters, filters, handleFilterChange } = useSearchContext();

  const filterDef = currentFilters.find((f) => f.fieldId === fieldId);
  if (!filterDef || filterDef.options.length === 0) return null;

  const selected = filters[fieldId] ?? [];
  const dropdownValue = selected.length === 1 ? selected[0] : "";

  return (
    <div className="single-select-filter">
      <label className="field-label">
        <span className="filter-group__label">{label}</span>
        <select
          className="select single-select-filter__select"
          value={dropdownValue}
          onChange={(e) =>
            handleFilterChange(fieldId, e.target.value ? [e.target.value] : [])
          }
        >
          <option value="">{placeholder}</option>
          {filterDef.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
