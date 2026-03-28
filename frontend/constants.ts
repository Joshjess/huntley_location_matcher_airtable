import { CoordSource, FilterDefinition, RadiusOption, SearchMode } from "./types";
import { SCHEMA } from "./utils/config";

export const RADIUS_OPTIONS: readonly RadiusOption[] = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "15", label: "15 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "75", label: "75 km" },
  { value: "100", label: "100 km" },
];

export const COORD_SOURCE_LABELS: Readonly<Record<CoordSource, string>> = {
  vacancy: "📍 Vacature",
  company: "🏢 Bedrijf hoofdlocatie",
  location: "📌 Alternatieve locatie",
};

export const VACANCY_FILTERS: readonly FilterDefinition[] = [
  {
    fieldId: SCHEMA.vacancy.filterFields.status,
    label: "Status",
    options: ["Open", "Gesloten", "On Hold"],
  },
  {
    fieldId: SCHEMA.vacancy.filterFields.contractType,
    label: "Contract Type",
    options: ["fulltime", "parttime", "stage", "freelance", "tijdelijk", "onbekend"],
  },
  {
    fieldId: SCHEMA.vacancy.filterFields.niche,
    label: "Niche",
    options: [
      "Maritime & Scheepvaart",
      "Food & Productie",
      "Intern Transport & Equipment",
      "Industrie",
      "Automotive",
    ],
  },
  {
    fieldId: SCHEMA.vacancy.filterFields.profielgroep,
    label: "Profielgroep",
    options: [
      "Service Engineers",
      "Heftruck Monteurs",
      "Automonteurs",
      "Bedrijfswagenmonteurs",
      "Monteur Technische Dienst",
      "Werkvoorbereiders",
      "Operators",
      "Liftmonteurs",
      "Kraanmonteurs",
    ],
  },
  {
    fieldId: SCHEMA.vacancy.filterFields.prioriteit,
    label: "Prioriteit",
    options: ["Hoog", "Normaal", "Laag"],
  },
];

export const COMPANY_FILTERS: readonly FilterDefinition[] = [
  {
    fieldId: SCHEMA.company.filterFields.status,
    label: "Status",
    options: ["Todo", "In progress", "Done"],
  },
  {
    fieldId: SCHEMA.company.filterFields.sector,
    label: "Sector",
    options: [
      "Industrie",
      "Maritime & Scheepvaart",
      "Food & Productie",
      "Automotive",
      "Anders",
      "Intern Transport & Equipment",
      "Energietransitie",
    ],
  },
  {
    fieldId: SCHEMA.company.filterFields.provincie,
    label: "Provincie",
    options: [
      "Drenthe",
      "Flevoland",
      "Friesland",
      "Gelderland",
      "Groningen",
      "Limburg",
      "Noord-Brabant",
      "Noord-Holland",
      "Overijssel",
      "Utrecht",
      "Zeeland",
      "Zuid-Holland",
      "Vlaanderen",
      "Niedersachsen",
      "North Brabant",
      "South Holland",
      "North Holland",
      "Flanders",
    ],
  },
];

export const FILTERS_BY_MODE: Readonly<Record<SearchMode, readonly FilterDefinition[]>> = {
  vacancy: VACANCY_FILTERS,
  company: COMPANY_FILTERS,
};
