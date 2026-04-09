import { CoordSource } from "../types";
import { haversineKm } from "./geo";
import { RecordAccessor } from "./recordAccessor";

interface ResolvedCoordinates {
  readonly lat: number;
  readonly lon: number;
  readonly source: CoordSource;
}

interface ResolutionDiagnostics {
  readonly hadVacancyCoords: boolean;
  readonly hadCompanyLink: boolean;
  readonly hadCompanyMainCoords: boolean;
  readonly hadAlternativeLocationLink: boolean;
  readonly hadAlternativeLocationCoords: boolean;
}

export interface VacancyCoordinateResolution {
  readonly resolved: ResolvedCoordinates | null;
  readonly diagnostics: ResolutionDiagnostics;
}

interface ResolveParams {
  readonly vacancy: RecordAccessor;
  readonly companyMap: ReadonlyMap<string, RecordAccessor>;
  readonly locationMap: ReadonlyMap<string, RecordAccessor>;
  readonly vacancyLatFieldId: string;
  readonly vacancyLonFieldId: string;
  readonly vacancyCompanyLinkFieldId: string;
  readonly companyLatFieldId: string;
  readonly companyLonFieldId: string;
  readonly companyLocationLinkFieldId: string;
  readonly locationLatFieldId: string;
  readonly locationLonFieldId: string;
  readonly searchLat: number;
  readonly searchLon: number;
}

/**
 * Resolve vacancy coordinates through the fallback chain:
 * vacancy direct coords → company coords → alternative location coords.
 *
 * Works uniformly for both SDK and REST records via RecordAccessor.
 */
export function resolveVacancyCoordinates({
  vacancy,
  companyMap,
  locationMap,
  vacancyLatFieldId,
  vacancyLonFieldId,
  vacancyCompanyLinkFieldId,
  companyLatFieldId,
  companyLonFieldId,
  companyLocationLinkFieldId,
  locationLatFieldId,
  locationLonFieldId,
  searchLat,
  searchLon,
}: ResolveParams): VacancyCoordinateResolution {
  const vacancyLat = vacancy.getFloat(vacancyLatFieldId);
  const vacancyLon = vacancy.getFloat(vacancyLonFieldId);

  if (vacancyLat != null && vacancyLon != null) {
    return {
      resolved: { lat: vacancyLat, lon: vacancyLon, source: "vacancy" },
      diagnostics: {
        hadVacancyCoords: true,
        hadCompanyLink: false,
        hadCompanyMainCoords: false,
        hadAlternativeLocationLink: false,
        hadAlternativeLocationCoords: false,
      },
    };
  }

  const companyIds = vacancy.getLinkedIds(vacancyCompanyLinkFieldId);

  const diagnostics = {
    hadVacancyCoords: false,
    hadCompanyLink: companyIds.length > 0,
    hadCompanyMainCoords: false,
    hadAlternativeLocationLink: false,
    hadAlternativeLocationCoords: false,
  };

  interface Candidate extends ResolvedCoordinates {
    readonly distanceKm: number;
  }

  const candidates: Candidate[] = [];

  for (const companyId of companyIds) {
    const company = companyMap.get(companyId);
    if (!company) continue;

    const companyLat = company.getFloat(companyLatFieldId);
    const companyLon = company.getFloat(companyLonFieldId);

    if (companyLat != null && companyLon != null) {
      diagnostics.hadCompanyMainCoords = true;
      candidates.push({
        lat: companyLat,
        lon: companyLon,
        source: "company",
        distanceKm: haversineKm(searchLat, searchLon, companyLat, companyLon),
      });
    }

    const locationIds = company.getLinkedIds(companyLocationLinkFieldId);
    if (locationIds.length > 0) {
      diagnostics.hadAlternativeLocationLink = true;
    }

    for (const locationId of locationIds) {
      const location = locationMap.get(locationId);
      if (!location) continue;

      const locLat = location.getFloat(locationLatFieldId);
      const locLon = location.getFloat(locationLonFieldId);
      if (locLat == null || locLon == null) continue;

      diagnostics.hadAlternativeLocationCoords = true;
      candidates.push({
        lat: locLat,
        lon: locLon,
        source: "location",
        distanceKm: haversineKm(searchLat, searchLon, locLat, locLon),
      });
    }
  }

  if (candidates.length === 0) {
    return { resolved: null, diagnostics };
  }

  candidates.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    if (a.lat !== b.lat) return a.lat - b.lat;
    if (a.lon !== b.lon) return a.lon - b.lon;
    return a.source.localeCompare(b.source);
  });

  const best = candidates[0];
  return {
    resolved: { lat: best.lat, lon: best.lon, source: best.source },
    diagnostics,
  };
}
