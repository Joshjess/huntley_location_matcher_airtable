import { CoordSource } from "./types";

export const COORD_SOURCE_LABELS: Readonly<Record<CoordSource, string>> = {
  vacancy: "📍 Vacature",
  company: "🏢 Bedrijf hoofdlocatie",
  location: "📌 Alternatieve locatie",
};
