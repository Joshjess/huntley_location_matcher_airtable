import React, { useState } from "react";
import { GearIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useSettingsButton } from "@airtable/blocks/ui";
import { usePatSettings } from "../hooks/usePatSettings";
import { SearchProvider, useSearchContext } from "../context/SearchContext";
import { SearchBar } from "./SearchBar";
import { GeocodedLocationInfo } from "./GeocodedLocationInfo";
import { StatsBar } from "./StatsBar";
import { SearchResults } from "./SearchResults";
import { SettingsPanel } from "./SettingsPanel";
import { VacatureScraperSidePane } from "./VacatureScraperSidePane";

const MODE_TEXT = {
  vacancy: {
    title: "Vacatures zoeken op locatie",
    subtitle: "Zoek vacatures binnen een straal van een locatie",
    loading: "Vacatures doorzoeken en afstanden berekenen...",
  },
  company: {
    title: "Bedrijven zoeken op locatie",
    subtitle: "Zoek bedrijven binnen een straal van een locatie",
    loading: "Bedrijven doorzoeken en afstanden berekenen...",
  },
  candidate: {
    title: "Kandidaten zoeken op locatie",
    subtitle: "Zoek kandidaten binnen een straal van een locatie",
    loading: "Kandidaten doorzoeken en locaties geocoderen...",
  },
} as const;

export function VacancyLocationSearch(): React.ReactElement {
  const [isShowingSettings, setIsShowingSettings] = useState(false);
  useSettingsButton(() => setIsShowingSettings((prev) => !prev));

  const patSettings = usePatSettings();

  return (
    <SearchProvider pat={patSettings.pat} hasPat={patSettings.hasPat}>
      <VacancyLocationSearchInner
        isShowingSettings={isShowingSettings}
        setIsShowingSettings={setIsShowingSettings}
        patSettings={patSettings}
      />
    </SearchProvider>
  );
}

interface InnerProps {
  isShowingSettings: boolean;
  setIsShowingSettings: (fn: (prev: boolean) => boolean) => void;
  patSettings: ReturnType<typeof usePatSettings>;
}

function VacancyLocationSearchInner({ isShowingSettings, setIsShowingSettings, patSettings }: InnerProps): React.ReactElement {
  const {
    searchMode,
    isSearching,
    error,
    geocodedLocation,
    radius,
    stats,
    results,
    handleExpand,
    selectedScraperRecord,
    closeScraperPane,
  } = useSearchContext();

  const text = MODE_TEXT[searchMode];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{text.title}</h1>
        <div className="page-header__right">
          <button
            className="btn-icon"
            onClick={() => setIsShowingSettings((prev) => !prev)}
            title="Instellingen"
          >
            <GearIcon size={20} />
          </button>
        </div>
        <p className="page-subtitle">{text.subtitle}</p>
      </div>

      {isShowingSettings && (
        <SettingsPanel
          pat={patSettings.pat}
          setPat={patSettings.setPat}
          rememberToken={patSettings.rememberToken}
          setRememberToken={patSettings.setRememberToken}
          canSaveToConfig={patSettings.canSaveToConfig}
          clearSavedToken={patSettings.clearSavedToken}
        />
      )}

      <SearchBar />

      {isSearching && (
        <div className="loading-container">
          <div className="spinner" />
          <span className="loading-text">{text.loading}</span>
        </div>
      )}

      {error && (
        <div className="error-box">
          <WarningCircleIcon size={20} weight="fill" className="error-icon" />
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

      <VacatureScraperSidePane record={selectedScraperRecord} onClose={closeScraperPane} />
    </div>
  );
}
