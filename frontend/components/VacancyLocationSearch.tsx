import React, { useState } from "react";
import {
  useBase,
  useRecords,
  useGlobalConfig,
  expandRecord,
  Box,
  Text,
  Heading,
  Button,
  Loader,
} from "@airtable/blocks/ui";
import { Record } from "@airtable/blocks/models";
import { useVacancySearch } from "../hooks/useVacancySearch";
import { SettingsPanel } from "./SettingsPanel";
import { SearchBar } from "./SearchBar";
import { GeocodedLocationInfo } from "./GeocodedLocationInfo";
import { StatsBar } from "./StatsBar";
import { SearchResults } from "./SearchResults";

export function VacancyLocationSearch(): React.ReactElement {
  const base = useBase();
  const globalConfig = useGlobalConfig();
  const [showSettings, setShowSettings] = useState(false);

  // Resolve tables from config
  const vacancyTableId = globalConfig.get("vacancyTableId") as
    | string
    | undefined;
  const companyTableId = globalConfig.get("companyTableId") as
    | string
    | undefined;
  const locationTableId = globalConfig.get("locationTableId") as
    | string
    | undefined;

  const vacancyTable = vacancyTableId
    ? base.getTableByIdIfExists(vacancyTableId)
    : null;
  const companyTable = companyTableId
    ? base.getTableByIdIfExists(companyTableId)
    : null;
  const locationTable = locationTableId
    ? base.getTableByIdIfExists(locationTableId)
    : null;

  // Load records (cast needed: useRecords overloads don't accept Table | null directly)
  const vacancyRecords = useRecords(vacancyTable as null) as Record[] | null;
  const companyRecords = useRecords(companyTable as null) as Record[] | null;
  const locationRecords = useRecords(locationTable as null) as Record[] | null;

  const {
    locationQuery,
    setLocationQuery,
    radius,
    setRadius,
    results,
    geocodedLocation,
    isSearching,
    error,
    stats,
    handleSearch,
  } = useVacancySearch({
    vacancyTable,
    companyTable,
    locationTable,
    vacancyRecords,
    companyRecords,
    locationRecords,
    globalConfig,
  });

  const handleExpand = (record: Record): void => {
    expandRecord(record);
  };

  return (
    <Box padding={3} backgroundColor="lightGray1" minHeight="100vh">
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={3}
      >
        <Box>
          <Heading size="xlarge">🔍 Vacatures zoeken op locatie</Heading>
          <Text textColor="light" marginTop={1}>
            Zoek vacatures binnen een straal van een locatie
          </Text>
        </Box>
        <Button
          icon="cog"
          variant="secondary"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Instellingen"
        >
          {showSettings ? "Sluiten" : "Instellingen"}
        </Button>
      </Box>

      {/* Settings */}
      {showSettings && <SettingsPanel />}

      {/* Search bar */}
      <SearchBar
        locationQuery={locationQuery}
        onLocationQueryChange={setLocationQuery}
        radius={radius}
        onRadiusChange={setRadius}
        onSearch={handleSearch}
        isSearching={isSearching}
      />

      {/* Loading */}
      {isSearching && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          padding={4}
        >
          <Loader scale={0.5} />
          <Text marginLeft={2}>
            Vacatures doorzoeken en afstanden berekenen...
          </Text>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Box
          padding={3}
          marginBottom={3}
          backgroundColor="redLight1"
          borderRadius="large"
        >
          <Text textColor="redDark1">⚠️ {error}</Text>
        </Box>
      )}

      {/* Geocoded location info */}
      {geocodedLocation && !isSearching && (
        <GeocodedLocationInfo location={geocodedLocation} radius={radius} />
      )}

      {/* Stats bar */}
      {stats && !isSearching && <StatsBar stats={stats} />}

      {/* Results list */}
      {results && !isSearching && (
        <SearchResults results={results} onExpand={handleExpand} />
      )}

      {/* Empty state */}
      {!results && !isSearching && !error && (
        <Box
          padding={4}
          textAlign="center"
          backgroundColor="white"
          borderRadius="large"
          border="default"
        >
          <Text size="large" textColor="light">
            Voer een locatie in en klik op &quot;Zoeken&quot; om te starten
          </Text>
        </Box>
      )}
    </Box>
  );
}
