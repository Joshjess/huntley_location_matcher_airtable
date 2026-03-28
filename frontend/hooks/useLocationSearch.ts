import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Table, Record as AirtableRecord, Field, TableOrViewQueryResult } from "@airtable/blocks/models";
import { useBase } from "@airtable/blocks/ui";
import { expandRecord } from "@airtable/blocks/ui";
import {
  GeocodedLocation,
  SearchResult,
  SearchStats,
  SearchMode,
  VacancySearchResult,
  CompanySearchResult,
} from "../types";
import { haversineKm, geocodeLocation } from "../utils/geo";
import { SCHEMA, getTable, getQueryFields } from "../utils/config";
import { resolveVacancyCoordinates } from "../utils/coordinateResolution";
import { getCellFloat } from "../utils/records";

export type FilterMap = { [fieldId: string]: string[] };

interface UseLocationSearchReturn {
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  radius: string;
  setRadius: (value: string) => void;
  filters: FilterMap;
  setFilters: React.Dispatch<React.SetStateAction<FilterMap>>;
  results: SearchResult[] | null;
  geocodedLocation: GeocodedLocation | null;
  isSearching: boolean;
  error: string | null;
  stats: SearchStats | null;
  handleSearch: () => void;
  handleExpand: (id: string) => void;
}

/** Base stats from search before any client-side filtering. */
interface BaseStats {
  readonly total: number;
  readonly noUsableCoords: number;
  readonly fromVacancy: number;
  readonly fromCompany: number;
  readonly fromLocation: number;
  readonly withoutVacancyCoords: number;
  readonly withoutCompanyLink: number;
  readonly withoutCompanyMainCoords: number;
  readonly withoutAlternativeLocations: number;
  readonly withoutAlternativeLocationCoords: number;
}

function getCellString(record: AirtableRecord, field: Field | null): string | null {
  if (!field) return null;
  const val = record.getCellValueAsString(field);
  return val || null;
}

function applyFilters(
  allResults: SearchResult[],
  activeFilters: FilterMap,
): { filtered: SearchResult[]; filteredOut: number } {
  let filteredOut = 0;
  const filtered: SearchResult[] = [];
  for (const r of allResults) {
    let passes = true;
    for (const [fieldId, selectedValues] of Object.entries(activeFilters)) {
      if (selectedValues.length === 0) continue;
      const cellValue = r.filterValues[fieldId] ?? "";
      if (!selectedValues.includes(cellValue)) { passes = false; break; }
    }
    if (passes) filtered.push(r);
    else filteredOut++;
  }
  return { filtered, filteredOut };
}

export function useLocationSearch(): UseLocationSearchReturn {
  const base = useBase();
  const [searchMode, setSearchModeRaw] = useState<SearchMode>("vacancy");
  const [locationQuery, setLocationQuery] = useState("");
  const [radius, setRadius] = useState("25");
  const [filters, setFilters] = useState<FilterMap>({});
  // Unfiltered results from the last search (all within radius, no filter applied)
  const [unfilteredResults, setUnfilteredResults] = useState<SearchResult[] | null>(null);
  const [baseStats, setBaseStats] = useState<BaseStats | null>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<GeocodedLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cachedQueryRef = useRef<TableOrViewQueryResult | null>(null);

  const setSearchMode = useCallback((mode: SearchMode) => {
    setSearchModeRaw(mode);
    setFilters({});
    setUnfilteredResults(null);
    setBaseStats(null);
    setError(null);
  }, []);

  const unloadCachedQuery = useCallback((): void => {
    cachedQueryRef.current?.unloadData();
    cachedQueryRef.current = null;
  }, []);

  useEffect(() => {
    return () => { unloadCachedQuery(); };
  }, [unloadCachedQuery]);

  // Derive displayed results and stats from unfiltered results + active filters
  const { results, stats } = useMemo(() => {
    if (!unfilteredResults || !baseStats) return { results: null, stats: null };

    const { filtered, filteredOut } = applyFilters(unfilteredResults, filters);

    // Recount source breakdown from filtered results only
    let fromVacancy = 0, fromCompany = 0, fromLocation = 0;
    for (const r of filtered) {
      if (r.mode === "vacancy") {
        if (r.coordSource === "vacancy") fromVacancy++;
        else if (r.coordSource === "company") fromCompany++;
        else fromLocation++;
      } else {
        fromCompany++;
      }
    }

    const stats: SearchStats = {
      total: baseStats.total,
      matched: filtered.length,
      noUsableCoords: baseStats.noUsableCoords,
      fromVacancy,
      fromCompany,
      fromLocation,
      withoutVacancyCoords: baseStats.withoutVacancyCoords,
      withoutCompanyLink: baseStats.withoutCompanyLink,
      withoutCompanyMainCoords: baseStats.withoutCompanyMainCoords,
      withoutAlternativeLocations: baseStats.withoutAlternativeLocations,
      withoutAlternativeLocationCoords: baseStats.withoutAlternativeLocationCoords,
      filteredOut,
    };

    return { results: filtered, stats };
  }, [unfilteredResults, baseStats, filters]);

  const handleVacancySearch = useCallback(
    async (geo: GeocodedLocation, maxDist: number) => {
      const vacancyTable = getTable(base, SCHEMA.vacancy.tableId);
      if (!vacancyTable) throw new Error("Vacatures tabel niet gevonden.");

      const companyTable = getTable(base, SCHEMA.company.tableId);
      const locationTable = getTable(base, SCHEMA.location.tableId);

      const fields = {
        vacancyLatField: vacancyTable.getFieldByIdIfExists(SCHEMA.vacancy.latFieldId),
        vacancyLonField: vacancyTable.getFieldByIdIfExists(SCHEMA.vacancy.lonFieldId),
        vacancyCompanyLinkField: vacancyTable.getFieldByIdIfExists(SCHEMA.vacancy.companyLinkFieldId),
        companyLatField: companyTable?.getFieldByIdIfExists(SCHEMA.company.latFieldId) ?? null,
        companyLonField: companyTable?.getFieldByIdIfExists(SCHEMA.company.lonFieldId) ?? null,
        companyLocationLinkField: companyTable?.getFieldByIdIfExists(SCHEMA.company.locationLinkFieldId) ?? null,
        locationLatField: locationTable?.getFieldByIdIfExists(SCHEMA.location.latFieldId) ?? null,
        locationLonField: locationTable?.getFieldByIdIfExists(SCHEMA.location.lonFieldId) ?? null,
      };

      const vacancyFilterFieldIds = Object.values(SCHEMA.vacancy.filterFields);

      const [vacancyQuery, companyQuery, locationQueryResult] = await Promise.all([
        vacancyTable.selectRecordsAsync({
          fields: getQueryFields(vacancyTable, [
            SCHEMA.vacancy.latFieldId,
            SCHEMA.vacancy.lonFieldId,
            SCHEMA.vacancy.companyLinkFieldId,
            ...vacancyFilterFieldIds,
          ]),
        }),
        companyTable
          ? companyTable.selectRecordsAsync({
              fields: getQueryFields(companyTable, [
                SCHEMA.company.latFieldId,
                SCHEMA.company.lonFieldId,
                SCHEMA.company.locationLinkFieldId,
              ]),
            })
          : Promise.resolve(null),
        locationTable
          ? locationTable.selectRecordsAsync({
              fields: getQueryFields(locationTable, [
                SCHEMA.location.latFieldId,
                SCHEMA.location.lonFieldId,
              ]),
            })
          : Promise.resolve(null),
      ]);

      try {
        const companyMap = new Map<string, AirtableRecord>();
        for (const rec of companyQuery?.records ?? []) companyMap.set(rec.id, rec);
        const locationMap = new Map<string, AirtableRecord>();
        for (const rec of locationQueryResult?.records ?? []) locationMap.set(rec.id, rec);

        const allWithinRadius: VacancySearchResult[] = [];
        let noUsableCoords = 0;
        let withoutVacancyCoords = 0, withoutCompanyLink = 0, withoutCompanyMainCoords = 0;
        let withoutAlternativeLocations = 0, withoutAlternativeLocationCoords = 0;

        for (const vac of vacancyQuery.records) {
          const resolution = resolveVacancyCoordinates({
            vacancyRecord: vac,
            companyMap,
            locationMap,
            fields,
            searchLat: geo.lat,
            searchLon: geo.lon,
          });

          if (!resolution.diagnostics.hadVacancyCoords) withoutVacancyCoords++;
          if (!resolution.diagnostics.hadVacancyCoords && !resolution.diagnostics.hadCompanyLink)
            withoutCompanyLink++;
          if (companyTable && !resolution.diagnostics.hadVacancyCoords && resolution.diagnostics.hadCompanyLink && !resolution.diagnostics.hadCompanyMainCoords)
            withoutCompanyMainCoords++;
          if (companyTable && locationTable && !resolution.diagnostics.hadVacancyCoords && resolution.diagnostics.hadCompanyLink && !resolution.diagnostics.hadCompanyMainCoords && !resolution.diagnostics.hadAlternativeLocationLink)
            withoutAlternativeLocations++;
          if (companyTable && locationTable && !resolution.diagnostics.hadVacancyCoords && resolution.diagnostics.hadCompanyLink && !resolution.diagnostics.hadCompanyMainCoords && resolution.diagnostics.hadAlternativeLocationLink && !resolution.diagnostics.hadAlternativeLocationCoords)
            withoutAlternativeLocationCoords++;

          if (!resolution.resolved) { noUsableCoords++; continue; }

          const distance = haversineKm(geo.lat, geo.lon, resolution.resolved.lat, resolution.resolved.lon);
          if (distance > maxDist) continue;

          // filterValues keyed by field ID for consistent filtering
          const filterValues: { [key: string]: string | null } = {};
          for (const [, fid] of Object.entries(SCHEMA.vacancy.filterFields)) {
            const f = vacancyTable.getFieldByIdIfExists(fid);
            filterValues[fid] = getCellString(vac, f);
          }

          allWithinRadius.push({
            mode: "vacancy",
            id: vac.id,
            name: vac.name || "Naamloze vacature",
            distance,
            coordSource: resolution.resolved.source,
            filterValues,
          });
        }

        allWithinRadius.sort((a, b) => a.distance - b.distance);

        cachedQueryRef.current = vacancyQuery;

        return {
          allWithinRadius: allWithinRadius as SearchResult[],
          baseStats: {
            total: vacancyQuery.records.length,
            noUsableCoords,
            fromVacancy: 0, // will be recounted from filtered results
            fromCompany: 0,
            fromLocation: 0,
            withoutVacancyCoords,
            withoutCompanyLink,
            withoutCompanyMainCoords,
            withoutAlternativeLocations,
            withoutAlternativeLocationCoords,
          },
          queriesToUnload: [companyQuery, locationQueryResult],
        };
      } catch (err) {
        vacancyQuery.unloadData();
        companyQuery?.unloadData();
        locationQueryResult?.unloadData();
        throw err;
      }
    },
    [base],
  );

  const handleCompanySearch = useCallback(
    async (geo: GeocodedLocation, maxDist: number) => {
      const companyTable = getTable(base, SCHEMA.company.tableId);
      if (!companyTable) throw new Error("Bedrijven tabel niet gevonden.");

      const companyFilterFieldIds = Object.values(SCHEMA.company.filterFields);

      const companyQuery = await companyTable.selectRecordsAsync({
        fields: getQueryFields(companyTable, [
          SCHEMA.company.latFieldId,
          SCHEMA.company.lonFieldId,
          ...companyFilterFieldIds,
        ]),
      });

      try {
        const allWithinRadius: CompanySearchResult[] = [];
        let noUsableCoords = 0;

        for (const rec of companyQuery.records) {
          const lat = getCellFloat(rec, companyTable.getFieldByIdIfExists(SCHEMA.company.latFieldId));
          const lon = getCellFloat(rec, companyTable.getFieldByIdIfExists(SCHEMA.company.lonFieldId));

          if (lat == null || lon == null) { noUsableCoords++; continue; }

          const distance = haversineKm(geo.lat, geo.lon, lat, lon);
          if (distance > maxDist) continue;

          // filterValues keyed by field ID for consistent filtering
          const filterValues: { [key: string]: string | null } = {};
          for (const [, fid] of Object.entries(SCHEMA.company.filterFields)) {
            const f = companyTable.getFieldByIdIfExists(fid);
            filterValues[fid] = getCellString(rec, f);
          }

          allWithinRadius.push({
            mode: "company",
            id: rec.id,
            name: rec.name || "Naamloos bedrijf",
            distance,
            filterValues,
          });
        }

        allWithinRadius.sort((a, b) => a.distance - b.distance);

        cachedQueryRef.current = companyQuery;

        return {
          allWithinRadius: allWithinRadius as SearchResult[],
          baseStats: {
            total: companyQuery.records.length,
            noUsableCoords,
            fromVacancy: 0,
            fromCompany: 0,
            fromLocation: 0,
            withoutVacancyCoords: 0,
            withoutCompanyLink: 0,
            withoutCompanyMainCoords: 0,
            withoutAlternativeLocations: 0,
            withoutAlternativeLocationCoords: 0,
          },
          queriesToUnload: [] as (TableOrViewQueryResult | null)[],
        };
      } catch (err) {
        companyQuery.unloadData();
        throw err;
      }
    },
    [base],
  );

  const handleSearch = useCallback(async () => {
    if (!locationQuery.trim()) {
      setError("Voer een locatie in om te zoeken.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setUnfilteredResults(null);
    setBaseStats(null);
    unloadCachedQuery();

    try {
      const geo = await geocodeLocation(locationQuery.trim());
      if (!geo) {
        setError(`Locatie "${locationQuery}" niet gevonden. Probeer een andere zoekterm.`);
        setIsSearching(false);
        return;
      }
      setGeocodedLocation(geo);

      const maxDist = parseFloat(radius);
      if (isNaN(maxDist)) {
        setError("Kies een geldige straal.");
        setIsSearching(false);
        return;
      }

      const searchFn = searchMode === "company" ? handleCompanySearch : handleVacancySearch;
      const { allWithinRadius, baseStats: newBaseStats, queriesToUnload } = await searchFn(geo, maxDist);

      setUnfilteredResults(allWithinRadius);
      setBaseStats(newBaseStats);

      for (const q of queriesToUnload) q?.unloadData();
    } catch (err) {
      setError(`Er ging iets mis: ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  }, [locationQuery, radius, searchMode, handleVacancySearch, handleCompanySearch, unloadCachedQuery]);

  const handleExpand = useCallback((id: string): void => {
    const record = cachedQueryRef.current?.getRecordByIdIfExists(id);
    if (record) expandRecord(record);
  }, []);

  return {
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
  };
}
