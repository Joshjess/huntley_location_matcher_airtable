import { Record } from "@airtable/blocks/models";

export type CoordSource = "vacancy" | "company" | "location";

export interface GeocodedLocation {
  readonly lat: number;
  readonly lon: number;
  readonly displayName: string;
}

export interface VacancySearchResult {
  readonly vacancy: Record;
  readonly distance: number;
  readonly coordSource: CoordSource;
}

export interface SearchStats {
  readonly total: number;
  readonly matched: number;
  readonly noCoords: number;
  readonly fromVacancy: number;
  readonly fromCompany: number;
  readonly fromLocation: number;
}

export interface RadiusOption {
  readonly value: string;
  readonly label: string;
}

export type GlobalConfigFieldKey =
  | "vacancyTableId"
  | "companyTableId"
  | "locationTableId"
  | "vacancyLatFieldId"
  | "vacancyLonFieldId"
  | "vacancyCompanyLinkFieldId"
  | "companyLatFieldId"
  | "companyLonFieldId"
  | "companyLocationLinkFieldId"
  | "locationLatFieldId"
  | "locationLonFieldId";

export interface LinkedRecordCellValue {
  readonly id: string;
  readonly name: string;
}

export interface ResultCardProps {
  readonly vacancy: Record;
  readonly distance: number;
  readonly coordSource: CoordSource;
  readonly onExpand: (record: Record) => void;
}

export interface SearchBarProps {
  readonly locationQuery: string;
  readonly onLocationQueryChange: (value: string) => void;
  readonly radius: string;
  readonly onRadiusChange: (value: string) => void;
  readonly onSearch: () => void;
  readonly isSearching: boolean;
}

export interface StatsBarProps {
  readonly stats: SearchStats;
}

export interface SearchResultsProps {
  readonly results: VacancySearchResult[];
  readonly onExpand: (record: Record) => void;
}

export interface GeocodedLocationInfoProps {
  readonly location: GeocodedLocation;
  readonly radius: string;
}
