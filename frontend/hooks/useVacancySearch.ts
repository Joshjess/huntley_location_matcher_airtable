import { useState, useCallback } from "react";
import { Table, Record } from "@airtable/blocks/models";
import GlobalConfig from "@airtable/blocks/dist/types/src/global_config";
import {
  CoordSource,
  GeocodedLocation,
  VacancySearchResult,
  SearchStats,
} from "../types";
import { haversineKm, geocodeLocation } from "../utils/geo";
import { getCellFloat, getLinkedIds } from "../utils/records";

interface UseVacancySearchParams {
  vacancyTable: Table | null;
  companyTable: Table | null;
  locationTable: Table | null;
  vacancyRecords: Record[] | null;
  companyRecords: Record[] | null;
  locationRecords: Record[] | null;
  globalConfig: GlobalConfig;
}

interface UseVacancySearchReturn {
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  radius: string;
  setRadius: (value: string) => void;
  results: VacancySearchResult[] | null;
  geocodedLocation: GeocodedLocation | null;
  isSearching: boolean;
  error: string | null;
  stats: SearchStats | null;
  handleSearch: () => void;
}

export function useVacancySearch({
  vacancyTable,
  companyTable,
  locationTable,
  vacancyRecords,
  companyRecords,
  locationRecords,
  globalConfig,
}: UseVacancySearchParams): UseVacancySearchReturn {
  const [locationQuery, setLocationQuery] = useState("");
  const [radius, setRadius] = useState("25");
  const [results, setResults] = useState<VacancySearchResult[] | null>(null);
  const [geocodedLocation, setGeocodedLocation] =
    useState<GeocodedLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SearchStats | null>(null);

  const isConfigured = vacancyTable != null;

  const handleSearch = useCallback(async () => {
    if (!locationQuery.trim()) {
      setError("Voer een locatie in om te zoeken.");
      return;
    }
    if (!isConfigured) {
      setError("Configureer eerst de tabellen via ⚙️ Instellingen.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults(null);
    setStats(null);

    try {
      const geo = await geocodeLocation(locationQuery.trim());
      if (!geo) {
        setError(
          `Locatie "${locationQuery}" niet gevonden. Probeer een andere zoekterm.`,
        );
        setIsSearching(false);
        return;
      }
      setGeocodedLocation(geo);

      const searchLat = geo.lat;
      const searchLon = geo.lon;
      const maxDist = parseFloat(radius);

      const companyMap = new Map<string, Record>();
      if (companyRecords) {
        for (const rec of companyRecords) {
          companyMap.set(rec.id, rec);
        }
      }
      const locationMap = new Map<string, Record>();
      if (locationRecords) {
        for (const rec of locationRecords) {
          locationMap.set(rec.id, rec);
        }
      }

      const matched: VacancySearchResult[] = [];
      let fromVacancy = 0;
      let fromCompany = 0;
      let fromLocation = 0;
      let noCoords = 0;

      for (const vac of vacancyRecords || []) {
        let lat: number | null = null;
        let lon: number | null = null;
        let source: CoordSource | null = null;

        // Step A: Check vacancy coordinates
        lat = getCellFloat(vac, vacancyTable, globalConfig, "vacancyLatFieldId");
        lon = getCellFloat(vac, vacancyTable, globalConfig, "vacancyLonFieldId");
        if (lat != null && lon != null) {
          source = "vacancy";
        }

        // Step B: Check linked company coordinates
        if (source == null && companyTable) {
          const companyIds = getLinkedIds(
            vac,
            vacancyTable,
            globalConfig,
            "vacancyCompanyLinkFieldId",
          );
          for (const cId of companyIds) {
            const comp = companyMap.get(cId);
            if (!comp) continue;
            const cLat = getCellFloat(
              comp,
              companyTable,
              globalConfig,
              "companyLatFieldId",
            );
            const cLon = getCellFloat(
              comp,
              companyTable,
              globalConfig,
              "companyLonFieldId",
            );
            if (cLat != null && cLon != null) {
              lat = cLat;
              lon = cLon;
              source = "company";
              break;
            }
          }
        }

        // Step C: Check company's linked locations
        if (source == null && companyTable && locationTable) {
          const companyIds = getLinkedIds(
            vac,
            vacancyTable,
            globalConfig,
            "vacancyCompanyLinkFieldId",
          );
          for (const cId of companyIds) {
            const comp = companyMap.get(cId);
            if (!comp) continue;
            const locIds = getLinkedIds(
              comp,
              companyTable,
              globalConfig,
              "companyLocationLinkFieldId",
            );
            let bestDist = Infinity;
            for (const lId of locIds) {
              const loc = locationMap.get(lId);
              if (!loc) continue;
              const lLat = getCellFloat(
                loc,
                locationTable,
                globalConfig,
                "locationLatFieldId",
              );
              const lLon = getCellFloat(
                loc,
                locationTable,
                globalConfig,
                "locationLonFieldId",
              );
              if (lLat != null && lLon != null) {
                const d = haversineKm(searchLat, searchLon, lLat, lLon);
                if (d < bestDist) {
                  bestDist = d;
                  lat = lLat;
                  lon = lLon;
                  source = "location";
                }
              }
            }
            if (source === "location") break;
          }
        }

        if (source == null) {
          noCoords++;
          continue;
        }

        const distance = haversineKm(searchLat, searchLon, lat!, lon!);
        if (distance <= maxDist) {
          matched.push({ vacancy: vac, distance, coordSource: source });
          if (source === "vacancy") fromVacancy++;
          else if (source === "company") fromCompany++;
          else fromLocation++;
        }
      }

      matched.sort((a, b) => a.distance - b.distance);
      setResults(matched);
      setStats({
        total: (vacancyRecords || []).length,
        matched: matched.length,
        noCoords,
        fromVacancy,
        fromCompany,
        fromLocation,
      });
    } catch (err) {
      setError(`Er ging iets mis: ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  }, [
    locationQuery,
    radius,
    isConfigured,
    vacancyRecords,
    companyRecords,
    locationRecords,
    vacancyTable,
    companyTable,
    locationTable,
    globalConfig,
  ]);

  return {
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
  };
}
