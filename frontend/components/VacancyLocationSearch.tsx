import React, { useCallback } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { useLocationSearch } from "../hooks/useLocationSearch";
import { SearchBar } from "./SearchBar";
import { GeocodedLocationInfo } from "./GeocodedLocationInfo";
import { StatsBar } from "./StatsBar";
import { SearchResults } from "./SearchResults";

export function VacancyLocationSearch(): React.ReactElement {
  const {
    searchMode,
    setSearchMode,
    locationQuery,
    setLocationQuery,
    radius,
    setRadius,
    filters,
    setFilters,
    results,
    geocodedLocation,
    isSearching,
    error,
    stats,
    handleSearch,
    handleExpand,
  } = useLocationSearch();

  const handleFilterChange = useCallback(
    (fieldId: string, values: string[]) => {
      setFilters((prev) => ({ ...prev, [fieldId]: values }));
    },
    [setFilters],
  );

  const title = searchMode === "vacancy"
    ? "Vacatures zoeken op locatie"
    : "Bedrijven zoeken op locatie";
  const subtitle = searchMode === "vacancy"
    ? "Zoek vacatures binnen een straal van een locatie"
    : "Zoek bedrijven binnen een straal van een locatie";
  const loadingText = searchMode === "vacancy"
    ? "Vacatures doorzoeken en afstanden berekenen..."
    : "Bedrijven doorzoeken en afstanden berekenen...";

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      <SearchBar
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        locationQuery={locationQuery}
        onLocationQueryChange={setLocationQuery}
        radius={radius}
        onRadiusChange={setRadius}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        isSearching={isSearching}
      />

      {isSearching && (
        <div className="loading-container">
          <div className="spinner" />
          <span className="loading-text">{loadingText}</span>
        </div>
      )}

      {error && (
        <div className="error-box">
          <WarningCircle size={20} weight="fill" className="error-icon" />
          <span className="error-text">{error}</span>
        </div>
      )}

      {geocodedLocation && !isSearching && (
        <GeocodedLocationInfo location={geocodedLocation} radius={radius} />
      )}

      {stats && !isSearching && <StatsBar stats={stats} searchMode={searchMode} />}

      {results && stats && !isSearching && (
        <SearchResults
          results={results}
          stats={stats}
          radius={radius}
          searchMode={searchMode}
          onExpand={handleExpand}
        />
      )}

      {!results && !isSearching && !error && (
        <div className="card empty-state">
          <p className="empty-state__title">
            Voer een locatie in en klik op &quot;Zoeken&quot; om te starten
          </p>
        </div>
      )}
    </div>
  );
}
