import {
  SearchResult,
  SearchSource,
  FilterValue,
  GeocodedLocation,
  VacancySearchResult,
  CompanySearchResult,
  CandidateSearchResult,
} from "../types";
import { computeBoundingBox, haversineKm } from "./geo";
import { ResolvedSchema } from "./config";
import { resolveVacancyCoordinates, VacancyCoordinateResolution } from "./coordinateResolution";
import { RecordAccessor } from "./recordAccessor";
import {
  buildVacancyKeywordHaystack,
  buildCompanyKeywordHaystack,
  buildCandidateKeywordHaystack,
  buildVacatureScraperKeywordHaystack,
} from "./keywordHaystack";

export interface BaseStats {
  readonly total: number;
  readonly noUsableCoords: number;
  readonly fromVacancy: number;
  readonly fromCompany: number;
  readonly fromLocation: number;
  readonly withoutVacancyCoords: number;
  readonly withoutCompanyLink: number;
  readonly withoutCompanyMainCoords: number;
  readonly withoutAlternativeLocations: number;
  readonly withoutAlternativeLocationCoords: number;
  readonly vacatureScraperTotal: number;
  readonly vacatureScraperMatched: number;
}

export function emptyBaseStats(): BaseStats {
  return {
    total: 0, noUsableCoords: 0, fromVacancy: 0, fromCompany: 0, fromLocation: 0,
    withoutVacancyCoords: 0, withoutCompanyLink: 0, withoutCompanyMainCoords: 0,
    withoutAlternativeLocations: 0, withoutAlternativeLocationCoords: 0,
    vacatureScraperTotal: 0, vacatureScraperMatched: 0,
  };
}

interface ProcessVacancyInput {
  readonly records: RecordAccessor[];
  readonly geo: GeocodedLocation;
  readonly maxDist: number;
  readonly companyMap: ReadonlyMap<string, RecordAccessor>;
  readonly locationMap: ReadonlyMap<string, RecordAccessor>;
  readonly companyLocationLinks: ReadonlyMap<string, string[]>;
  readonly filterFieldIds: readonly { fieldId: string }[];
  readonly schema: ResolvedSchema;
  readonly vacancyExcludeFieldIds: Set<string>;
  readonly companyExcludeFieldIds: Set<string>;
  readonly companyKeywordHaystackCache?: Map<string, string>;
  readonly resolutionCache?: Map<string, VacancyCoordinateResolution>;
  readonly resolutionCacheKeyPrefix?: string;
}

function isWithinBoundingBox(
  lat: number,
  lon: number,
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
): boolean {
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}

export function processVacancyRecords(input: ProcessVacancyInput): {
  results: SearchResult[];
  baseStats: BaseStats;
} {
  const {
    records,
    geo,
    maxDist,
    companyMap,
    locationMap,
    companyLocationLinks,
    filterFieldIds,
    schema,
    vacancyExcludeFieldIds,
    companyExcludeFieldIds,
    companyKeywordHaystackCache,
    resolutionCache,
    resolutionCacheKeyPrefix,
  } = input;
  const boundingBox = computeBoundingBox(geo.lat, geo.lon, maxDist);

  const allWithinRadius: VacancySearchResult[] = [];
  let noUsableCoords = 0;
  let withoutVacancyCoords = 0, withoutCompanyLink = 0, withoutCompanyMainCoords = 0;
  let withoutAlternativeLocations = 0, withoutAlternativeLocationCoords = 0;

  for (const vacancy of records) {
    const vacancyLat = vacancy.getFloat(schema.vacancy.latFieldId);
    const vacancyLon = vacancy.getFloat(schema.vacancy.lonFieldId);

    if (vacancyLat != null && vacancyLon != null) {
      if (!isWithinBoundingBox(
        vacancyLat,
        vacancyLon,
        boundingBox.minLat,
        boundingBox.maxLat,
        boundingBox.minLon,
        boundingBox.maxLon,
      )) {
        continue;
      }

      const distance = haversineKm(geo.lat, geo.lon, vacancyLat, vacancyLon);
      if (distance > maxDist) continue;

      const filterValues: Record<string, FilterValue> = {};
      for (const tmpl of filterFieldIds) {
        filterValues[tmpl.fieldId] = vacancy.getFilterValue(tmpl.fieldId);
      }

      const keywordHaystack = buildVacancyKeywordHaystack(
        vacancy,
        companyMap,
        vacancyExcludeFieldIds,
        companyExcludeFieldIds,
        schema.vacancy.companyLinkFieldId,
        companyKeywordHaystackCache,
      );

      allWithinRadius.push({
        mode: "vacancy",
        source: "local",
        id: vacancy.id,
        name: vacancy.name || "Naamloze vacature",
        distance,
        coordSource: "vacancy",
        filterValues,
        keywordHaystack,
        createdAt: vacancy.createdAt,
      });
      continue;
    }

    const resolutionCacheKey = `${resolutionCacheKeyPrefix ?? `${geo.lat}:${geo.lon}:${maxDist}`}:${vacancy.id}`;
    let resolution = resolutionCache?.get(resolutionCacheKey);
    if (!resolution) {
      resolution = resolveVacancyCoordinates({
        vacancy,
        companyMap,
        locationMap,
        companyLocationLinks,
        boundingBox,
        vacancyLatFieldId: schema.vacancy.latFieldId,
        vacancyLonFieldId: schema.vacancy.lonFieldId,
        vacancyCompanyLinkFieldId: schema.vacancy.companyLinkFieldId,
        companyLatFieldId: schema.company.latFieldId,
        companyLonFieldId: schema.company.lonFieldId,
        locationLatFieldId: schema.location.latFieldId,
        locationLonFieldId: schema.location.lonFieldId,
        searchLat: geo.lat,
        searchLon: geo.lon,
      });
      resolutionCache?.set(resolutionCacheKey, resolution);
    }

    // Track diagnostics
    const d = resolution.diagnostics;
    if (!d.hadVacancyCoords) withoutVacancyCoords++;
    if (!d.hadVacancyCoords && !d.hadCompanyLink) withoutCompanyLink++;
    if (!d.hadVacancyCoords && d.hadCompanyLink && !d.hadCompanyMainCoords) withoutCompanyMainCoords++;
    if (!d.hadVacancyCoords && d.hadCompanyLink && !d.hadCompanyMainCoords && !d.hadAlternativeLocationLink)
      withoutAlternativeLocations++;
    if (!d.hadVacancyCoords && d.hadCompanyLink && !d.hadCompanyMainCoords && d.hadAlternativeLocationLink && !d.hadAlternativeLocationCoords)
      withoutAlternativeLocationCoords++;

    if (!resolution.resolved) { noUsableCoords++; continue; }

    const distance = haversineKm(geo.lat, geo.lon, resolution.resolved.lat, resolution.resolved.lon);
    if (distance > maxDist) continue;

    const filterValues: Record<string, FilterValue> = {};
    for (const tmpl of filterFieldIds) {
      filterValues[tmpl.fieldId] = vacancy.getFilterValue(tmpl.fieldId);
    }

    const keywordHaystack = buildVacancyKeywordHaystack(
      vacancy,
      companyMap,
      vacancyExcludeFieldIds,
      companyExcludeFieldIds,
      schema.vacancy.companyLinkFieldId,
      companyKeywordHaystackCache,
    );

    allWithinRadius.push({
      mode: "vacancy",
      source: "local",
      id: vacancy.id,
      name: vacancy.name || "Naamloze vacature",
      distance,
      coordSource: resolution.resolved.source,
      filterValues,
      keywordHaystack,
      createdAt: vacancy.createdAt,
    });
  }

  allWithinRadius.sort((a, b) => a.distance - b.distance);

  return {
    results: allWithinRadius,
    baseStats: {
      ...emptyBaseStats(),
      total: records.length,
      noUsableCoords,
      withoutVacancyCoords,
      withoutCompanyLink,
      withoutCompanyMainCoords,
      withoutAlternativeLocations,
      withoutAlternativeLocationCoords,
    },
  };
}

interface ProcessSimpleInput {
  readonly mode: "company" | "candidate";
  readonly records: RecordAccessor[];
  readonly geo: GeocodedLocation;
  readonly maxDist: number;
  readonly latFieldId: string;
  readonly lonFieldId: string;
  readonly filterFieldIds: readonly { fieldId: string }[];
  readonly buildHaystack: (accessor: RecordAccessor) => string;
}

export function processSimpleRecords(input: ProcessSimpleInput): {
  results: SearchResult[];
  baseStats: BaseStats;
} {
  const { mode, records, geo, maxDist, latFieldId, lonFieldId, filterFieldIds, buildHaystack } = input;
  const boundingBox = computeBoundingBox(geo.lat, geo.lon, maxDist);

  const allWithinRadius: (CompanySearchResult | CandidateSearchResult)[] = [];
  let noUsableCoords = 0;

  for (const rec of records) {
    const lat = rec.getFloat(latFieldId);
    const lon = rec.getFloat(lonFieldId);

    if (lat == null || lon == null) { noUsableCoords++; continue; }
    if (!isWithinBoundingBox(lat, lon, boundingBox.minLat, boundingBox.maxLat, boundingBox.minLon, boundingBox.maxLon)) continue;

    const distance = haversineKm(geo.lat, geo.lon, lat, lon);
    if (distance > maxDist) continue;

    const filterValues: Record<string, FilterValue> = {};
    for (const tmpl of filterFieldIds) {
      filterValues[tmpl.fieldId] = rec.getFilterValue(tmpl.fieldId);
    }

    const keywordHaystack = buildHaystack(rec);
    const fallbackName = mode === "company" ? "Naamloos bedrijf" : "Naamloze kandidaat";

    allWithinRadius.push({
      mode,
      source: "local" as SearchSource,
      id: rec.id,
      name: rec.name || fallbackName,
      distance,
      filterValues,
      keywordHaystack,
      createdAt: rec.createdAt,
    } as CompanySearchResult | CandidateSearchResult);
  }

  allWithinRadius.sort((a, b) => a.distance - b.distance);

  return {
    results: allWithinRadius,
    baseStats: {
      ...emptyBaseStats(),
      total: records.length,
      noUsableCoords,
    },
  };
}

export function processVacatureScraperRecords(
  records: RecordAccessor[],
  geo: GeocodedLocation,
  maxDist: number,
  vacatureScraperNameToLocalId: ReadonlyMap<string, string>,
): { results: VacancySearchResult[]; total: number } {
  const results: VacancySearchResult[] = [];
  const shouldMapFilterValues = vacatureScraperNameToLocalId.size > 0;

  for (const rec of records) {
    const lat = rec.getFloat("Latitude");
    const lon = rec.getFloat("Longitude");
    if (lat == null || lon == null) continue;

    const distance = haversineKm(geo.lat, geo.lon, lat, lon);
    if (distance > maxDist) continue;

    // Map Vacature scraper field values to local filter field IDs by matching field names
    const filterValues: Record<string, FilterValue> = {};
    if (shouldMapFilterValues) {
      for (const fieldName of rec.fieldIds) {
        const localId = vacatureScraperNameToLocalId.get(fieldName);
        if (localId) {
          const val = rec.getString(fieldName);
          if (val) filterValues[localId] = val;
        }
      }
    }

    results.push({
      mode: "vacancy",
      source: "vacatureScraper",
      id: rec.id,
      name: rec.name || "Naamloze vacature",
      distance,
      coordSource: "vacancy",
      filterValues,
      keywordHaystack: buildVacatureScraperKeywordHaystack(rec),
      createdAt: rec.createdAt,
    });
  }

  return { results, total: records.length };
}
