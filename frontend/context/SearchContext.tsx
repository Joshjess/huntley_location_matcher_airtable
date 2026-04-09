import React, { createContext, useContext, useCallback } from "react";
import { useLocationSearch } from "../hooks/useLocationSearch";
import { FilterMap } from "../utils/filters";
import {
  SearchMode,
  SearchResult,
  SearchStats,
  GeocodedLocation,
  SearchSourceConfig,
  DateRange,
  FilterDefinition,
} from "../types";

interface SearchContextValue {
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  keywordQuery: string;
  setKeywordQuery: React.Dispatch<React.SetStateAction<string>>;
  radius: string;
  setRadius: (value: string) => void;
  filters: FilterMap;
  handleFilterChange: (fieldId: string, values: string[]) => void;
  currentFilters: FilterDefinition[];
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  handleSearch: () => void;
  isSearching: boolean;
  error: string | null;
  results: SearchResult[] | null;
  geocodedLocation: GeocodedLocation | null;
  stats: SearchStats | null;
  handleExpand: (id: string) => void;
  searchSources: SearchSourceConfig;
  handleSearchSourceChange: (source: keyof SearchSourceConfig, enabled: boolean) => void;
  hasPat: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearchContext(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}

interface SearchProviderProps {
  pat: string;
  hasPat: boolean;
  children: React.ReactNode;
}

export function SearchProvider({ pat, hasPat, children }: SearchProviderProps): React.ReactElement {
  const search = useLocationSearch(pat);

  const handleFilterChange = useCallback(
    (fieldId: string, values: string[]) => {
      search.setFilters((prev) => ({ ...prev, [fieldId]: values }));
    },
    [search.setFilters],
  );

  const handleSearchSourceChange = useCallback(
    (source: keyof SearchSourceConfig, enabled: boolean) => {
      search.setSearchSources((prev) => ({ ...prev, [source]: enabled }));
    },
    [search.setSearchSources],
  );

  const value: SearchContextValue = {
    searchMode: search.searchMode,
    setSearchMode: search.setSearchMode,
    locationQuery: search.locationQuery,
    setLocationQuery: search.setLocationQuery,
    keywordQuery: search.keywordQuery,
    setKeywordQuery: search.setKeywordQuery,
    radius: search.radius,
    setRadius: search.setRadius,
    filters: search.filters,
    handleFilterChange,
    currentFilters: search.dynamicFilters,
    dateRange: search.dateRange,
    setDateRange: search.setDateRange,
    handleSearch: search.handleSearch,
    isSearching: search.isSearching,
    error: search.error,
    results: search.results,
    geocodedLocation: search.geocodedLocation,
    stats: search.stats,
    handleExpand: search.handleExpand,
    searchSources: search.searchSources,
    handleSearchSourceChange,
    hasPat,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
