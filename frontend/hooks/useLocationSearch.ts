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
import { SCHEMA, getFilterTemplates } from "../utils/config";
import { matchesKeywordTokens } from "../utils/keywordHaystack";
import { buildCompanyKeywordHaystack, buildCandidateKeywordHaystack } from "../utils/keywordHaystack";
import { FilterMap, applyFilters } from "../utils/filters";
import { BaseStats } from "../utils/searchProcessor";
import { processVacancyRecords, processSimpleRecords, processVacatureScraperRecords } from "../utils/searchProcessor";
import { FetchResult, fetchVacancyData, fetchCompanyData, fetchCandidateData, fetchVacatureScraperData } from "../utils/dataFetcher";
import { VacancyCoordinateResolution } from "../utils/coordinateResolution";

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

interface LocalSearchCacheEntry {
  readonly key: string;
  readonly data: FetchResult;
  readonly companyKeywordHaystackCache: Map<string, string>;
  readonly resolutionCache: Map<string, VacancyCoordinateResolution>;
}

interface PendingLocalSearchCacheEntry {
  readonly key: string;
  readonly promise: Promise<LocalSearchCacheEntry>;
}

function unloadFetchResult(data: FetchResult): void {
  data.cacheableQuery?.unloadData();
  for (const query of data.queriesToUnload) {
    query?.unloadData();
  }
}

function mergeSortedResults(
  left: SearchResult[],
  right: SearchResult[],
): SearchResult[] {
  if (left.length === 0) return right;
  if (right.length === 0) return left;

  const merged: SearchResult[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex].distance <= right[rightIndex].distance) {
      merged.push(left[leftIndex]);
      leftIndex++;
    } else {
      merged.push(right[rightIndex]);
      rightIndex++;
    }
  }

  while (leftIndex < left.length) {
    merged.push(left[leftIndex]);
    leftIndex++;
  }

  while (rightIndex < right.length) {
    merged.push(right[rightIndex]);
    rightIndex++;
  }

  return merged;
}

function scheduleIdleTask(task: () => void): () => void {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(task, { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timeoutHandle = window.setTimeout(task, 250);
  return () => window.clearTimeout(timeoutHandle);
}

export function useLocationSearch(vacatureScraperPat: string): UseLocationSearchReturn {
  const base = useBase();

  const schema = SCHEMA;
  const vacancyExclude = useMemo(() => new Set([
    schema.vacancy.latFieldId,
    schema.vacancy.lonFieldId,
    schema.vacancy.companyLinkFieldId,
  ]), [schema]);
  const companyExclude = useMemo(() => new Set([
    schema.company.latFieldId,
    schema.company.lonFieldId,
  ]), [schema]);

  const [searchMode, setSearchModeRaw] = useState<SearchMode>("vacancy");
  const [locationQuery, setLocationQuery] = useState("");
  const [radius, setRadius] = useState("25");
  const [filters, setFilters] = useState<FilterMap>({});
  const [keywordQuery, setKeywordQuery] = useState("");
  const [searchSources, setSearchSources] = useState<SearchSourceConfig>({ local: true, vacatureScraper: false });
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [unfilteredResults, setUnfilteredResults] = useState<SearchResult[] | null>(null);
  const [baseStats, setBaseStats] = useState<BaseStats | null>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<GeocodedLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cachedQueryRef = useRef<TableOrViewQueryResult | null>(null);
  const localSearchCacheRef = useRef<Partial<Record<SearchMode, LocalSearchCacheEntry>>>({});
  const pendingLocalSearchCacheRef = useRef<Partial<Record<SearchMode, PendingLocalSearchCacheEntry>>>({});

  const setSearchMode = useCallback((mode: SearchMode) => {
    setSearchModeRaw(mode);
    setFilters({});
    setKeywordQuery("");
    setUnfilteredResults(null);
    setBaseStats(null);
    setError(null);
  }, []);

  const unloadCachedQueries = useCallback((): void => {
    for (const cacheEntry of Object.values(localSearchCacheRef.current)) {
      if (cacheEntry) unloadFetchResult(cacheEntry.data);
    }
    localSearchCacheRef.current = {};
    pendingLocalSearchCacheRef.current = {};
    cachedQueryRef.current = null;
  }, []);

  useEffect(() => {
    return () => { unloadCachedQueries(); };
  }, [unloadCachedQueries]);

  const getLocalSearchCacheEntry = useCallback(async (
    mode: SearchMode,
    pat: string | null,
  ): Promise<LocalSearchCacheEntry> => {
    const cacheKey = `${base.id}:${mode}:${pat ?? ""}`;
    const cachedEntry = localSearchCacheRef.current[mode];
    if (cachedEntry?.key === cacheKey) {
      return cachedEntry;
    }

    const pendingEntry = pendingLocalSearchCacheRef.current[mode];
    if (pendingEntry?.key === cacheKey) {
      return pendingEntry.promise;
    }

    if (cachedEntry) {
      unloadFetchResult(cachedEntry.data);
    }

    const promise = (async (): Promise<LocalSearchCacheEntry> => {
      const data = mode === "vacancy"
        ? await fetchVacancyData(base, pat, schema)
        : mode === "company"
          ? await fetchCompanyData(base, pat, schema)
          : await fetchCandidateData(base, schema);

      const cacheEntry: LocalSearchCacheEntry = {
        key: cacheKey,
        data,
        companyKeywordHaystackCache: new Map<string, string>(),
        resolutionCache: new Map<string, VacancyCoordinateResolution>(),
      };
      localSearchCacheRef.current[mode] = cacheEntry;
      return cacheEntry;
    })();

    pendingLocalSearchCacheRef.current[mode] = { key: cacheKey, promise };

    try {
      return await promise;
    } finally {
      const latestPendingEntry = pendingLocalSearchCacheRef.current[mode];
      if (latestPendingEntry?.key === cacheKey) {
        delete pendingLocalSearchCacheRef.current[mode];
      }
    }
  }, [base, schema]);

  useEffect(() => {
    let cancelled = false;
    let cancelIdlePrefetch = () => {};

    const normalizedPat = vacatureScraperPat.trim() || null;

    const preloadMode = async (mode: SearchMode, pat: string | null): Promise<void> => {
      try {
        await getLocalSearchCacheEntry(mode, pat);
      } catch (err) {
        console.warn(`Startup prefetch failed for ${mode} search data.`, err);
      }
    };

    void preloadMode("vacancy", normalizedPat).then(() => {
      if (cancelled) return;
      cancelIdlePrefetch = scheduleIdleTask(() => {
        if (cancelled) return;
        void preloadMode("company", normalizedPat);
        void preloadMode("candidate", null);
      });
    });

    return () => {
      cancelled = true;
      cancelIdlePrefetch();
    };
  }, [getLocalSearchCacheEntry, vacatureScraperPat]);

  // ---------------------------------------------------------------------------
  // Derive displayed results: keyword + date + facet filters (all client-side)
  // ---------------------------------------------------------------------------
  const keywordTokens = useMemo(() => {
    return keywordQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }, [keywordQuery]);

  const { results, stats } = useMemo(() => {
    if (!unfilteredResults || !baseStats) return { results: null, stats: null };

    let afterKeyword = keywordTokens.length > 0
      ? unfilteredResults.filter((r) => matchesKeywordTokens(r.keywordHaystack, keywordTokens))
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

    let fromVacancy = 0, fromCompany = 0, fromLocation = 0, vacatureScraperMatched = 0;
    for (const r of filtered) {
      if (r.source === "vacatureScraper") vacatureScraperMatched++;
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
      vacatureScraperTotal: baseStats.vacatureScraperTotal,
      vacatureScraperMatched,
    };

    return { results: filtered, stats };
  }, [unfilteredResults, baseStats, filters, keywordTokens, dateRange]);

  // ---------------------------------------------------------------------------
  // Filter field metadata — templates are hardcoded, options from SDK metadata
  // ---------------------------------------------------------------------------
  const fieldMetadata = useMemo(() => {
    const templates = getFilterTemplates(searchMode);
    const tableId = searchMode === "vacancy"
      ? schema.vacancy.tableId
      : searchMode === "company"
        ? schema.company.tableId
        : schema.candidate.tableId;
    const table = base.getTableByIdIfExists(tableId);

    return templates.map((template) => {
      let metadataOptions: string[] = [];
      if (table) {
        const field = table.getFieldByIdIfExists(template.fieldId);
        if (field) {
          try {
            const cfg = field.config;
            const choices = (cfg.options as { choices?: Array<{ name: string }> })?.choices;
            if (choices && choices.length > 0) {
              metadataOptions = choices.map((c) => c.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "nl"));
            }
          } catch { /* ignore */ }
        }
      }
      return { ...template, metadataOptions };
    });
  }, [base, searchMode, schema]);

  // Build final filters: use result-based options when available, fall back to metadata
  const resultFilterOptions = useMemo(() => {
    const optionMap = new Map<string, Set<string>>();
    if (!unfilteredResults) return optionMap;

    for (const result of unfilteredResults) {
      for (const [fieldId, cellValue] of Object.entries(result.filterValues)) {
        if (cellValue == null) continue;

        const options = optionMap.get(fieldId) ?? new Set<string>();
        if (Array.isArray(cellValue)) {
          for (const value of cellValue) {
            if (value) options.add(value);
          }
        } else if (cellValue) {
          options.add(cellValue);
        }
        optionMap.set(fieldId, options);
      }
    }

    return optionMap;
  }, [unfilteredResults]);

  const dynamicFilters: FilterDefinition[] = useMemo(() => {
    return fieldMetadata.map((entry) => {
      const options = resultFilterOptions.get(entry.fieldId);
      if (options && options.size > 0) {
        return {
          fieldId: entry.fieldId,
          label: entry.label,
          options: [...options].sort((a, b) => a.localeCompare(b, "nl")),
        };
      }
      return { fieldId: entry.fieldId, label: entry.label, options: entry.metadataOptions };
    });
  }, [fieldMetadata, resultFilterOptions]);

  // ---------------------------------------------------------------------------
  // Main search handler
  // ---------------------------------------------------------------------------
  const handleSearch = useCallback(async () => {
    if (!locationQuery.trim()) {
      setError("Voer een locatie in om te zoeken.");
      return;
    }

    if (searchMode !== "candidate" && !searchSources.local && !searchSources.vacatureScraper) {
      setError("Selecteer minstens één bron om in te zoeken.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setUnfilteredResults(null);
    setBaseStats(null);
    cachedQueryRef.current = null;

    const pat = vacatureScraperPat.trim();
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
        const filterTemplates = getFilterTemplates("candidate");
        const cacheEntry = await getLocalSearchCacheEntry("candidate", null);
        const data = cacheEntry.data;
        const result = processSimpleRecords({
          mode: "candidate",
          records: data.records,
          geo,
          maxDist,
          latFieldId: schema.candidate.latFieldId,
          lonFieldId: schema.candidate.lonFieldId,
          filterFieldIds: filterTemplates,
          buildHaystack: buildCandidateKeywordHaystack,
        });
        if (data.cacheableQuery) cachedQueryRef.current = data.cacheableQuery;
        setUnfilteredResults(result.results);
        setBaseStats(result.baseStats);
      } else {
        // Vacancy or Company search with optional Vacature scraper
        let localResults: SearchResult[] = [];
        let localStats: BaseStats = {
          total: 0, noUsableCoords: 0, fromVacancy: 0, fromCompany: 0, fromLocation: 0,
          withoutVacancyCoords: 0, withoutCompanyLink: 0, withoutCompanyMainCoords: 0,
          withoutAlternativeLocations: 0, withoutAlternativeLocationCoords: 0,
          vacatureScraperTotal: 0, vacatureScraperMatched: 0,
        };

        if (searchSources.local) {
          if (searchMode === "company") {
            const cacheEntry = await getLocalSearchCacheEntry("company", usePat);
            const data = cacheEntry.data;
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
            localResults = result.results;
            localStats = result.baseStats;
          } else {
            const cacheEntry = await getLocalSearchCacheEntry("vacancy", usePat);
            const data = cacheEntry.data;
            const result = processVacancyRecords({
              records: data.records,
              geo,
              maxDist,
              companyMap: data.companyMap,
              locationMap: data.locationMap,
              companyLocationLinks: data.companyLocationLinks,
              filterFieldIds: data.filterFieldIds,
              schema,
              vacancyExcludeFieldIds: vacancyExclude,
              companyExcludeFieldIds: companyExclude,
              companyKeywordHaystackCache: cacheEntry.companyKeywordHaystackCache,
              resolutionCache: cacheEntry.resolutionCache,
              resolutionCacheKeyPrefix: `${geo.lat}:${geo.lon}:${maxDist}`,
            });
            if (data.cacheableQuery) cachedQueryRef.current = data.cacheableQuery;
            localResults = result.results;
            localStats = result.baseStats;
          }
        }

        // Vacature scraper search (vacancy mode only)
        let vacatureScraperResults: SearchResult[] = [];
        let vacatureScraperTotal = 0;
        if (searchSources.vacatureScraper && usePat && searchMode === "vacancy") {
          const scraperRecords = await fetchVacatureScraperData(usePat, geo, maxDist);
          const scraperResult = processVacatureScraperRecords(scraperRecords, geo, maxDist, new Map());
          vacatureScraperResults = scraperResult.results;
          vacatureScraperTotal = scraperResult.total;
        }

        const allResults = mergeSortedResults(localResults, vacatureScraperResults);
        setUnfilteredResults(allResults);
        setBaseStats({
          ...localStats,
          vacatureScraperTotal,
          vacatureScraperMatched: vacatureScraperResults.length,
        });
      }
    } catch (err) {
      setError(`Er ging iets mis: ${(err as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  }, [locationQuery, radius, searchMode, searchSources, vacatureScraperPat, getLocalSearchCacheEntry, schema, vacancyExclude, companyExclude]);

  const handleExpand = useCallback((id: string): void => {
    const record = cachedQueryRef.current?.getRecordByIdIfExists(id);
    if (record) {
      expandRecord(record);
      return;
    }
    const tableId = searchMode === "company"
      ? schema.company.tableId
      : searchMode === "candidate"
        ? schema.candidate.tableId
        : schema.vacancy.tableId;
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
