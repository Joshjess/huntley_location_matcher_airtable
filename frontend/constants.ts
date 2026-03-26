import { CoordSource, RadiusOption } from "./types";

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
  company: "🏢 Bedrijf",
  location: "📌 Locatie",
};
