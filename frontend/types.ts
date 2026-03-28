export type SearchMode = "vacancy" | "company";

export type CoordSource = "vacancy" | "company" | "location";

export interface GeocodedLocation {
  readonly lat: number;
  readonly lon: number;
  readonly displayName: string;
}

export interface VacancySearchResult {
  readonly mode: "vacancy";
  readonly id: string;
  readonly name: string;
  readonly distance: number;
  readonly coordSource: CoordSource;
  readonly filterValues: Readonly<Record<string, string | null>>;
}

export interface CompanySearchResult {
  readonly mode: "company";
  readonly id: string;
  readonly name: string;
  readonly distance: number;
  readonly filterValues: Readonly<Record<string, string | null>>;
}

export type SearchResult = VacancySearchResult | CompanySearchResult;

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
}

export interface RadiusOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterDefinition {
  readonly fieldId: string;
  readonly label: string;
  readonly options: readonly string[];
}

export interface LinkedRecordCellValue {
  readonly id: string;
  readonly name: string;
}

export interface ResultCardProps {
  readonly result: SearchResult;
  readonly onExpand: (id: string) => void;
}

export interface SearchBarProps {
  readonly searchMode: SearchMode;
  readonly onSearchModeChange: (mode: SearchMode) => void;
  readonly locationQuery: string;
  readonly onLocationQueryChange: (value: string) => void;
  readonly radius: string;
  readonly onRadiusChange: (value: string) => void;
  readonly filters: Readonly<Record<string, string[]>>;
  readonly onFilterChange: (fieldId: string, values: string[]) => void;
  readonly onSearch: () => void;
  readonly isSearching: boolean;
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
