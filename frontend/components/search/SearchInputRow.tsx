import React from "react";
import { MagnifyingGlassIcon, FunnelSimpleIcon } from "@phosphor-icons/react";
import { useSearchContext } from "../../context/SearchContext";

interface SearchInputRowProps {
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
}

export function SearchInputRow({ filtersOpen, onToggleFilters, activeFilterCount }: SearchInputRowProps): React.ReactElement {
  const { locationQuery, setLocationQuery, radius, setRadius, handleSearch, isSearching } = useSearchContext();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="search-bar__row">
      <div className="field-group field-group--location">
        <label className="field-label">Locatie</label>
        <div className="input-wrapper">
          <span className="input-icon">
            <MagnifyingGlassIcon size={16} />
          </span>
          <input
            className="input"
            type="text"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Bijv. Amsterdam, Utrecht, Rotterdam..."
          />
        </div>
      </div>
      <div className="field-group field-group--radius">
        <label className="field-label">Straal</label>
        <div className="input-wrapper input-wrapper--suffix">
          <input
            className="input input--radius"
            type="number"
            min="1"
            step="1"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="25"
          />
          <span className="input-suffix">km</span>
        </div>
      </div>
      <button
        className={`btn-icon ${filtersOpen ? "btn-icon--active" : ""}`}
        onClick={onToggleFilters}
        title="Filters"
      >
        <FunnelSimpleIcon size={18} weight={filtersOpen ? "fill" : "regular"} />
        {activeFilterCount > 0 && (
          <span className="btn-icon__badge">{activeFilterCount}</span>
        )}
      </button>
      <button
        className="btn-primary"
        onClick={handleSearch}
        disabled={isSearching}
      >
        <MagnifyingGlassIcon size={16} weight="bold" />
        {isSearching ? "Zoeken..." : "Zoeken"}
      </button>
    </div>
  );
}
