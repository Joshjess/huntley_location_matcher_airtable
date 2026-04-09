import React from "react";
import { useSearchContext } from "../../context/SearchContext";

export function ModeToggle(): React.ReactElement {
  const { searchMode, setSearchMode } = useSearchContext();

  return (
    <div className="mode-toggle">
      <button
        className={`mode-toggle__btn ${searchMode === "vacancy" ? "mode-toggle__btn--active" : ""}`}
        onClick={() => setSearchMode("vacancy")}
      >
        Vacatures
      </button>
      <button
        className={`mode-toggle__btn ${searchMode === "company" ? "mode-toggle__btn--active" : ""}`}
        onClick={() => setSearchMode("company")}
      >
        Bedrijven
      </button>
      <button
        className={`mode-toggle__btn ${searchMode === "candidate" ? "mode-toggle__btn--active" : ""}`}
        onClick={() => setSearchMode("candidate")}
      >
        Kandidaten
      </button>
    </div>
  );
}
