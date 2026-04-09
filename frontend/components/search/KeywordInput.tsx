import React from "react";
import { TextAaIcon } from "@phosphor-icons/react";
import { useSearchContext } from "../../context/SearchContext";

export function KeywordInput(): React.ReactElement {
  const { searchMode, keywordQuery, setKeywordQuery, handleSearch } = useSearchContext();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") handleSearch();
  };

  const placeholder =
    searchMode === "vacancy"
      ? "Trefwoorden in vacature en gekoppeld bedrijf (optioneel)…"
      : searchMode === "company"
        ? "Trefwoorden in bedrijfsvelden (optioneel)…"
        : "Trefwoorden in kandidaatvelden (optioneel)…";

  return (
    <div className="search-bar__row search-bar__row--keywords">
      <div className="field-group field-group--keywords">
        <label className="field-label">Trefwoorden</label>
        <div className="input-wrapper">
          <span className="input-icon">
            <TextAaIcon size={16} />
          </span>
          <input
            className="input"
            type="text"
            value={keywordQuery}
            onChange={(e) => setKeywordQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  );
}
