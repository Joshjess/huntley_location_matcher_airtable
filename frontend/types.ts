export type SearchMode = "vacancy" | "company" | "candidate";

export type CoordSource = "vacancy" | "company" | "location";

export type SearchSource = "local" | "cma";

export type FilterValue = string | string[] | null;

export interface SearchSourceConfig {
  local: boolean;
  cma: boolean;
}

export interface GeocodedLocation {
  readonly lat: number;
  readonly lon: number;
  readonly displayName: string;
}

export interface VacancySearchResult {
  readonly mode: "vacancy";
  readonly source: SearchSource;
  readonly id: string;
  readonly name: string;
  readonly distance: number;
  readonly coordSource: CoordSource;
  readonly filterValues: Readonly<Record<string, FilterValue>>;
  /** Lowercased concatenation of vacancy + linked company searchable fields */
  readonly keywordHaystack: string;
  readonly createdAt: string | null;
}

export interface CompanySearchResult {
  readonly mode: "company";
  readonly source: SearchSource;
  readonly id: string;
  readonly name: string;
  readonly distance: number;
  readonly filterValues: Readonly<Record<string, FilterValue>>;
  readonly keywordHaystack: string;
  readonly createdAt: string | null;
}

export interface CandidateSearchResult {
  readonly mode: "candidate";
  readonly source: SearchSource;
  readonly id: string;
  readonly name: string;
  readonly distance: number;
  readonly filterValues: Readonly<Record<string, FilterValue>>;
  readonly keywordHaystack: string;
  readonly createdAt: string | null;
}

export type SearchResult = VacancySearchResult | CompanySearchResult | CandidateSearchResult;

export interface SearchStats {
  readonly total: number;
  readonly matched: number;
  readonly noUsableCoords: number;
  readonly fromVacancy: number;
  readonly fromCompany: number;
  readonly fromLocation: number;
  readonly withoutVacancyCoords: number;
  readonly withoutCompanyLink: number;
  readonly withoutCompanyMainCoords: number;
  readonly withoutAlternativeLocations: number;
  readonly withoutAlternativeLocationCoords: number;
  readonly filteredOut: number;
  readonly cmaTotal?: number;
  readonly cmaMatched?: number;
}

export interface RadiusOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterTemplate {
  readonly fieldId: string;
  readonly label: string;
}

export interface FilterDefinition {
  readonly fieldId: string;
  readonly label: string;
  readonly options: readonly string[];
}

export interface DateRange {
  from: string;
  to: string;
}

export interface LinkedRecordCellValue {
  readonly id: string;
  readonly name: string;
}

export interface ResultCardProps {
  readonly result: SearchResult;
  readonly onExpand: (id: string) => void;
}

export interface StatsBarProps {
  readonly stats: SearchStats;
  readonly searchMode: SearchMode;
}

export interface SearchResultsProps {
  readonly results: SearchResult[];
  readonly stats: SearchStats;
  readonly radius: string;
  readonly searchMode: SearchMode;
  readonly onExpand: (id: string) => void;
}

export interface GeocodedLocationInfoProps {
  readonly location: GeocodedLocation;
  readonly radius: string;
}
