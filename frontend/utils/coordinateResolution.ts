import { CoordSource } from "../types";
import { haversineKm } from "./geo";
import { BoundingBox } from "./airtableRest";
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
  readonly companyLocationLinks: ReadonlyMap<string, string[]>;
  readonly boundingBox: BoundingBox;
  readonly vacancyLatFieldId: string;
  readonly vacancyLonFieldId: string;
  readonly vacancyCompanyLinkFieldId: string;
  readonly companyLatFieldId: string;
  readonly companyLonFieldId: string;
  readonly locationLatFieldId: string;
  readonly locationLonFieldId: string;
  readonly searchLat: number;
  readonly searchLon: number;
}

function isWithinBoundingBox(
  lat: number,
  lon: number,
  boundingBox: BoundingBox,
): boolean {
  return lat >= boundingBox.minLat &&
    lat <= boundingBox.maxLat &&
    lon >= boundingBox.minLon &&
    lon <= boundingBox.maxLon;
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
  companyLocationLinks,
  boundingBox,
  vacancyLatFieldId,
  vacancyLonFieldId,
  vacancyCompanyLinkFieldId,
  companyLatFieldId,
  companyLonFieldId,
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

  let bestCandidate: Candidate | null = null;

  function considerCandidate(candidate: Candidate): void {
    if (bestCandidate == null) {
      bestCandidate = candidate;
      return;
    }

    if (candidate.distanceKm !== bestCandidate.distanceKm) {
      if (candidate.distanceKm < bestCandidate.distanceKm) bestCandidate = candidate;
      return;
    }
    if (candidate.lat !== bestCandidate.lat) {
      if (candidate.lat < bestCandidate.lat) bestCandidate = candidate;
      return;
    }
    if (candidate.lon !== bestCandidate.lon) {
      if (candidate.lon < bestCandidate.lon) bestCandidate = candidate;
      return;
    }
    if (candidate.source.localeCompare(bestCandidate.source) < 0) {
      bestCandidate = candidate;
    }
  }

  for (const companyId of companyIds) {
    const company = companyMap.get(companyId);
    if (!company) continue;

    const companyLat = company.getFloat(companyLatFieldId);
    const companyLon = company.getFloat(companyLonFieldId);

    if (companyLat != null && companyLon != null) {
      diagnostics.hadCompanyMainCoords = true;
      if (isWithinBoundingBox(companyLat, companyLon, boundingBox)) {
        considerCandidate({
          lat: companyLat,
          lon: companyLon,
          source: "company",
          distanceKm: haversineKm(searchLat, searchLon, companyLat, companyLon),
        });
      }
    }

    const locationIds = companyLocationLinks.get(companyId) ?? [];
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
      if (isWithinBoundingBox(locLat, locLon, boundingBox)) {
        considerCandidate({
          lat: locLat,
          lon: locLon,
          source: "location",
          distanceKm: haversineKm(searchLat, searchLon, locLat, locLon),
        });
      }
    }
  }

  if (bestCandidate == null) {
    return { resolved: null, diagnostics };
  }

  const resolvedCandidate = bestCandidate as Candidate;
  return {
    resolved: { lat: resolvedCandidate.lat, lon: resolvedCandidate.lon, source: resolvedCandidate.source },
    diagnostics,
  };
}
