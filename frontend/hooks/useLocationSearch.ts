import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { TableOrViewQueryResult } from "@airtable/blocks/models";
import { useBase } from "@airtable/blocks/ui";
import { expandRecord } from "@airtable/blocks/ui";
import {
  GeocodedLocation,
  SearchResult,
  SearchStats,
  SearchMode,
  SearchSourceConfig,
  DateRange,
  FilterDefinition,
} from "../types";
import { geocodeLocation } from "../utils/geo";
import { resolveSchema, buildStructuralFieldIds, discoverFilterFields, getFilterFieldNameMap } from "../utils/config";
import { matchesKeywordQuery } from "../utils/keywordHaystack";
import { buildCompanyKeywordHaystack, buildCandidateKeywordHaystack } from "../utils/keywordHaystack";
import { FilterMap, applyFilters } from "../utils/filters";
import { BaseStats } from "../utils/searchProcessor";
import { processVacancyRecords, processSimpleRecords, processCmaRecords } from "../utils/searchProcessor";
import { fetchVacancyData, fetchCompanyData, fetchCandidateData, fetchCmaData } from "../utils/dataFetcher";

export type { FilterMap } from "../utils/filters";

interface UseLocationSearchReturn {
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  radius: string;
  setRadius: (value: string) => void;
  filters: FilterMap;
  setFilters: React.Dispatch<React.SetStateAction<FilterMap>>;
  keywordQuery: string;
  setKeywordQuery: React.Dispatch<React.SetStateAction<string>>;
  results: SearchResult[] | null;
  geocodedLocation: GeocodedLocation | null;
  isSearching: boolean;
  error: string | null;
  stats: SearchStats | null;
  dynamicFilters: FilterDefinition[];
  handleSearch: () => void;
  handleExpand: (id: string) => void;
  searchSources: SearchSourceConfig;
  setSearchSources: React.Dispatch<React.SetStateAction<SearchSourceConfig>>;
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
}

export function useLocationSearch(cmaPat: string): UseLocationSearchReturn {
  const base = useBase();

  const schema = useMemo(() => resolveSchema(base), [base]);
  const structuralFieldIds = useMemo(
    () => schema ? buildStructuralFieldIds(schema) : new Set<string>(),
    [schema],
  );
  const vacancyExclude = useMemo(() => schema ? new Set([
    schema.vacancy.latFieldId,
    schema.vacancy.lonFieldId,
    schema.vacancy.companyLinkFieldId,
  ]) : new Set<string>(), [schema]);
  const companyExclude = useMemo(() => schema ? new Set([
    schema.company.latFieldId,
    schema.company.lonFieldId,
  ]) : new Set<string>(), [schema]);

  const [searchMode, setSearchModeRaw] = useState<SearchMode>("vacancy");
  const [locationQuery, setLocationQuery] = useState("");
  const [radius, setRadius] = useState("25");
  const [filters, setFilters] = useState<FilterMap>({});
  const [keywordQuery, setKeywordQuery] = useState("");
  const [searchSources, setSearchSources] = useState<SearchSourceConfig>({ local: true, cma: false });
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [unfilteredResults, setUnfilteredResults] = useState<SearchResult[] | null>(null);
  const [baseStats, setBaseStats] = useState<BaseStats | null>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<GeocodedLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cachedQueryRef = useRef<TableOrViewQueryResult | null>(null);

  const setSearchMode = useCallback((mode: SearchMode) => {
    setSearchModeRaw(mode);
    setFilters({});
    setKeywordQuery("");
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

  // ---------------------------------------------------------------------------
  // Derive displayed results: keyword + date + facet filters (all client-side)
  // ---------------------------------------------------------------------------
  const { results, stats } = useMemo(() => {
    if (!unfilteredResults || !baseStats) return { results: null, stats: null };

    let afterKeyword = keywordQuery.trim()
      ? unfilteredResults.filter((r) => matchesKeywordQuery(r.keywordHaystack, keywordQuery))
      : unfilteredResults;

    // Date range filter
    if (dateRange.from || dateRange.to) {
      const fromMs = dateRange.from ? new Date(dateRange.from).getTime() : 0;
      const toMs = dateRange.to ? new Date(dateRange.to + "T23:59:59").getTime() : Infinity;
      afterKeyword = afterKeyword.filter((r) => {
        if (!r.createdAt) return false;
        const t = new Date(r.createdAt).getTime();
        return t >= fromMs && t <= toMs;
      });
    }

    const { filtered } = applyFilters(afterKeyword, filters);
    const filteredOut = unfilteredResults.length - filtered.length;

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

    const cmaMatched = filtered.filter((r) => r.source === "cma").length;

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
      cmaTotal: baseStats.cmaTotal,
      cmaMatched,
    };

    return { results: filtered, stats };
  }, [unfilteredResults, baseStats, filters, keywordQuery, dateRange]);

  // ---------------------------------------------------------------------------
  // Filter field metadata (runs on startup / mode change)
  // ---------------------------------------------------------------------------
  const fieldMetadata = useMemo(() => {
    if (!schema) return [];
    const tableId = searchMode === "vacancy"
      ? schema.vacancy.tableId
      : searchMode === "company"
        ? schema.company.tableId
        : schema.candidate.tableId;
    const table = base.getTableByIdIfExists(tableId);
    if (!table) return [];

    const templates = discoverFilterFields(table, structuralFieldIds);

    return templates.map((template) => {
      const field = table.getFieldByIdIfExists(template.fieldId);
      let metadataOptions: string[] = [];
      if (field) {
        try {
          const cfg = field.config;
          const choices = (cfg.options as { choices?: Array<{ name: string }> })?.choices;
          if (choices && choices.length > 0) {
            metadataOptions = choices.map((c) => c.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "nl"));
          }
        } catch { /* ignore */ }
      }
      return { ...template, metadataOptions };
    });
  }, [base, searchMode, schema, structuralFieldIds]);

  // Build final filters: use result-based options when available, fall back to metadata
  const dynamicFilters: FilterDefinition[] = useMemo(() => {
    return fieldMetadata.map((entry) => {
      if (unfilteredResults && unfilteredResults.length > 0) {
        const uniqueValues = new Set<string>();
        for (const result of unfilteredResults) {
          const cellValue = result.filterValues[entry.fieldId];
          if (cellValue == null) continue;
          if (Array.isArray(cellValue)) {
            for (const v of cellValue) if (v) uniqueValues.add(v);
          } else if (cellValue) {
            uniqueValues.add(cellValue);
          }
        }
        if (uniqueValues.size > 0) {
          return { fieldId: entry.fieldId, label: entry.label, options: [...uniqueValues].sort((a, b) => a.localeCompare(b, "nl")) };
        }
      }
      return { fieldId: entry.fieldId, label: entry.label, options: entry.metadataOptions };
    });
  }, [fieldMetadata, unfilteredResults]);

  // ---------------------------------------------------------------------------
  // Main search handler
  // ---------------------------------------------------------------------------
  const handleSearch = useCallback(async () => {
    if (!locationQuery.trim()) {
      setError("Voer een locatie in om te zoeken.");
      return;
    }

    if (!schema) {
      setError("Tabellen niet gevonden. Controleer of de tabellen Vacatures, Bedrijven, Kandidaten en Locaties bestaan met Latitude/Longitude velden.");
      return;
    }

    if (searchMode !== "candidate" && !searchSources.local && !searchSources.cma) {
      setError("Selecteer minstens één bron om in te zoeken.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setUnfilteredResults(null);
    setBaseStats(null);
    unloadCachedQuery();

    const pat = cmaPat.trim();
    const usePat = pat.length > 0 ? pat : null;

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

      if (searchMode === "candidate") {
        const data = await fetchCandidateData(base, usePat, geo, maxDist, schema, structuralFieldIds);
        const result = processSimpleRecords({
          mode: "candidate",
          records: data.records,
          geo,
          maxDist,
          latFieldId: schema.candidate.latFieldId,
          lonFieldId: schema.candidate.lonFieldId,
          filterFieldIds: data.filterFieldIds,
          buildHaystack: buildCandidateKeywordHaystack,
        });
        if (data.cacheableQuery) cachedQueryRef.current = data.cacheableQuery;
        for (const q of data.queriesToUnload) q?.unloadData();
        setUnfilteredResults(result.results);
        setBaseStats(result.baseStats);
      } else {
        // Vacancy or Company search with optional CMA
        let localResults: SearchResult[] = [];
        let localStats: BaseStats = {
          total: 0, noUsableCoords: 0, fromVacancy: 0, fromCompany: 0, fromLocation: 0,
          withoutVacancyCoords: 0, withoutCompanyLink: 0, withoutCompanyMainCoords: 0,
          withoutAlternativeLocations: 0, withoutAlternativeLocationCoords: 0,
          cmaTotal: 0, cmaMatched: 0,
        };

        if (searchSources.local) {
          if (searchMode === "company") {
            const data = await fetchCompanyData(base, usePat, geo, maxDist, schema, structuralFieldIds);
            const result = processSimpleRecords({
              mode: "company",
              records: data.records,
              geo,
              maxDist,
              latFieldId: schema.company.latFieldId,
              lonFieldId: schema.company.lonFieldId,
              filterFieldIds: data.filterFieldIds,
              buildHaystack: (rec) => buildCompanyKeywordHaystack(rec, companyExclude),
            });
            if (data.cacheableQuery) cachedQueryRef.current = data.cacheableQuery;
            for (const q of data.queriesToUnload) q?.unloadData();
            localResults = result.results;
            localStats = result.baseStats;
          } else {
            const data = await fetchVacancyData(base, usePat, geo, maxDist, schema, structuralFieldIds);
            const result = processVacancyRecords({
              records: data.records,
              geo,
              maxDist,
              companyMap: data.companyMap,
              locationMap: data.locationMap,
              filterFieldIds: data.filterFieldIds,
              schema,
              vacancyExcludeFieldIds: vacancyExclude,
              companyExcludeFieldIds: companyExclude,
            });
            if (data.cacheableQuery) cachedQueryRef.current = data.cacheableQuery;
            for (const q of data.queriesToUnload) q?.unloadData();
            localResults = result.results;
            localStats = result.baseStats;
          }
        }

        // CMA search (vacancy mode only)
        let cmaResults: SearchResult[] = [];
        let cmaTotal = 0;
        if (searchSources.cma && usePat && searchMode === "vacancy") {
          const vacancyTable = base.getTableByIdIfExists(schema.vacancy.tableId);
          const cmaNameToId = vacancyTable ? getFilterFieldNameMap(vacancyTable, structuralFieldIds) : new Map<string, string>();
          const cmaRecords = await fetchCmaData(usePat, geo, maxDist);
          const cmaResult = processCmaRecords(cmaRecords, geo, maxDist, cmaNameToId);
          cmaResults = cmaResult.results;
          cmaTotal = cmaResult.total;
        }

        const allResults = [...localResults, ...cmaResults].sort((a, b) => a.distance - b.distance);
        setUnfilteredResults(allResults);
        setBaseStats({
          ...localStats,
          cmaTotal,
          cmaMatched: cmaResults.length,
        });
      }
    } catch (err) {
      setError(`Er ging iets mis: ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  }, [locationQuery, radius, searchMode, searchSources, cmaPat, base, unloadCachedQuery, schema, structuralFieldIds, vacancyExclude, companyExclude]);

  const handleExpand = useCallback((id: string): void => {
    const record = cachedQueryRef.current?.getRecordByIdIfExists(id);
    if (record) {
      expandRecord(record);
      return;
    }
    const tableId = searchMode === "company"
      ? schema?.company.tableId
      : searchMode === "candidate"
        ? schema?.candidate.tableId
        : schema?.vacancy.tableId;
    if (tableId) window.open(`https://airtable.com/${base.id}/${tableId}/${id}`, "_blank");
  }, [base, searchMode, schema]);

  return {
    searchMode,
    setSearchMode,
    locationQuery,
    setLocationQuery,
    radius,
    setRadius,
    filters,
    setFilters,
    keywordQuery,
    setKeywordQuery,
    results,
    geocodedLocation,
    isSearching,
    error,
    stats,
    dynamicFilters,
    handleSearch,
    handleExpand,
    searchSources,
    setSearchSources,
    dateRange,
    setDateRange,
  };
}
