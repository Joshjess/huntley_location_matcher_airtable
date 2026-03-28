import { Field, Record } from "@airtable/blocks/models";
import { CoordSource } from "../types";
import { haversineKm } from "./geo";
import { getCellFloat, getLinkedIds } from "./records";

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

interface SchemaFields {
  readonly vacancyLatField: Field | null;
  readonly vacancyLonField: Field | null;
  readonly vacancyCompanyLinkField: Field | null;
  readonly companyLatField: Field | null;
  readonly companyLonField: Field | null;
  readonly companyLocationLinkField: Field | null;
  readonly locationLatField: Field | null;
  readonly locationLonField: Field | null;
}

interface ResolveParams {
  readonly vacancyRecord: Record;
  readonly companyMap: ReadonlyMap<string, Record>;
  readonly locationMap: ReadonlyMap<string, Record>;
  readonly fields: SchemaFields;
  readonly searchLat: number;
  readonly searchLon: number;
}

export function resolveVacancyCoordinates({
  vacancyRecord,
  companyMap,
  locationMap,
  fields,
  searchLat,
  searchLon,
}: ResolveParams): VacancyCoordinateResolution {
  const vacancyLat = getCellFloat(vacancyRecord, fields.vacancyLatField);
  const vacancyLon = getCellFloat(vacancyRecord, fields.vacancyLonField);

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

  const companyIds = getLinkedIds(vacancyRecord, fields.vacancyCompanyLinkField);

  const diagnostics = {
    hadVacancyCoords: false,
    hadCompanyLink: companyIds.length > 0,
    hadCompanyMainCoords: false,
    hadAlternativeLocationLink: false,
    hadAlternativeLocationCoords: false,
  };

  for (const companyId of companyIds) {
    const companyRecord = companyMap.get(companyId);
    if (!companyRecord) continue;

    const companyLat = getCellFloat(companyRecord, fields.companyLatField);
    const companyLon = getCellFloat(companyRecord, fields.companyLonField);

    if (companyLat != null && companyLon != null) {
      diagnostics.hadCompanyMainCoords = true;
      return {
        resolved: { lat: companyLat, lon: companyLon, source: "company" },
        diagnostics,
      };
    }
  }

  let bestAlternativeLocation: ResolvedCoordinates | null = null;
  let bestDistance = Infinity;

  for (const companyId of companyIds) {
    const companyRecord = companyMap.get(companyId);
    if (!companyRecord) continue;

    const locationIds = getLinkedIds(companyRecord, fields.companyLocationLinkField);
    if (locationIds.length > 0) {
      diagnostics.hadAlternativeLocationLink = true;
    }

    for (const locationId of locationIds) {
      const locationRecord = locationMap.get(locationId);
      if (!locationRecord) continue;

      const locationLat = getCellFloat(locationRecord, fields.locationLatField);
      const locationLon = getCellFloat(locationRecord, fields.locationLonField);

      if (locationLat == null || locationLon == null) continue;

      diagnostics.hadAlternativeLocationCoords = true;

      const distance = haversineKm(searchLat, searchLon, locationLat, locationLon);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAlternativeLocation = {
          lat: locationLat,
          lon: locationLon,
          source: "location",
        };
      }
    }
  }

  return { resolved: bestAlternativeLocation, diagnostics };
}
