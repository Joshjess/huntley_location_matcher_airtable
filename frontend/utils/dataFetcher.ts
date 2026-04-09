import { Base, Table, TableOrViewQueryResult } from "@airtable/blocks/models";
import { GeocodedLocation } from "../types";
import { computeBoundingBox } from "./geo";
import { ResolvedSchema, getTable, getQueryFields, discoverFilterFields } from "./config";
import {
  fetchRecordsByFormula,
  buildBboxFormula,
  buildNoCoordsFormula,
  fetchCmaVacancies,
} from "./airtableRest";
import { RecordAccessor, fromSdkRecord, fromRestRecord, fromCmaRecord } from "./recordAccessor";

export interface FetchResult {
  readonly records: RecordAccessor[];
  readonly companyMap: ReadonlyMap<string, RecordAccessor>;
  readonly locationMap: ReadonlyMap<string, RecordAccessor>;
  readonly filterFieldIds: { fieldId: string }[];
  readonly totalFetched: number;
  /** SDK queries that need unloading (empty for REST) */
  readonly queriesToUnload: (TableOrViewQueryResult | null)[];
  /** The main query to cache for record expansion (SDK only) */
  readonly cacheableQuery: TableOrViewQueryResult | null;
}

// ---------------------------------------------------------------------------
// Vacancy data fetching
// ---------------------------------------------------------------------------

export async function fetchVacancyData(
  base: Base,
  pat: string | null,
  geo: GeocodedLocation,
  maxDist: number,
  schema: ResolvedSchema,
  structuralFieldIds: Set<string>,
): Promise<FetchResult> {
  if (pat) {
    return fetchVacancyDataRest(base, pat, geo, maxDist, schema, structuralFieldIds);
  }
  return fetchVacancyDataSdk(base, geo, maxDist, schema, structuralFieldIds);
}

async function fetchVacancyDataRest(
  base: Base,
  pat: string,
  geo: GeocodedLocation,
  maxDist: number,
  schema: ResolvedSchema,
  structuralFieldIds: Set<string>,
): Promise<FetchResult> {
  const bbox = computeBoundingBox(geo.lat, geo.lon, maxDist);
  const baseId = base.id;
  const vacancyTable = getTable(base, schema.vacancy.tableId);
  const primaryFieldId = vacancyTable?.primaryField?.id;

  const [vacInBbox, vacNoCoords, companiesInBbox, locationsInBbox] = await Promise.all([
    fetchRecordsByFormula(pat, baseId, schema.vacancy.tableId,
      buildBboxFormula(schema.vacancy.latFieldId, schema.vacancy.lonFieldId, bbox)),
    fetchRecordsByFormula(pat, baseId, schema.vacancy.tableId,
      buildNoCoordsFormula(schema.vacancy.latFieldId, schema.vacancy.lonFieldId)),
    fetchRecordsByFormula(pat, baseId, schema.company.tableId,
      buildBboxFormula(schema.company.latFieldId, schema.company.lonFieldId, bbox)),
    fetchRecordsByFormula(pat, baseId, schema.location.tableId,
      buildBboxFormula(schema.location.latFieldId, schema.location.lonFieldId, bbox)),
  ]);

  const companyMap = new Map<string, RecordAccessor>();
  for (const rec of companiesInBbox) companyMap.set(rec.id, fromRestRecord(rec));
  const locationMap = new Map<string, RecordAccessor>();
  for (const rec of locationsInBbox) locationMap.set(rec.id, fromRestRecord(rec));

  const allVacancies = [...vacInBbox, ...vacNoCoords];
  const records = allVacancies.map((rec) => fromRestRecord(rec, primaryFieldId));

  const filterFieldIds = vacancyTable ? discoverFilterFields(vacancyTable, structuralFieldIds) : [];

  return {
    records,
    companyMap,
    locationMap,
    filterFieldIds,
    totalFetched: allVacancies.length,
    queriesToUnload: [],
    cacheableQuery: null,
  };
}

async function fetchVacancyDataSdk(
  base: Base,
  _geo: GeocodedLocation,
  _maxDist: number,
  schema: ResolvedSchema,
  structuralFieldIds: Set<string>,
): Promise<FetchResult> {
  const vacancyTable = getTable(base, schema.vacancy.tableId);
  if (!vacancyTable) throw new Error("Vacatures tabel niet gevonden.");

  const companyTable = getTable(base, schema.company.tableId);
  const locationTable = getTable(base, schema.location.tableId);

  const [vacancyQuery, companyQuery, locationQuery] = await Promise.all([
    vacancyTable.selectRecordsAsync({ fields: vacancyTable.fields }),
    companyTable
      ? companyTable.selectRecordsAsync({ fields: companyTable.fields })
      : Promise.resolve(null),
    locationTable
      ? locationTable.selectRecordsAsync({
          fields: getQueryFields(locationTable, [
            schema.location.latFieldId,
            schema.location.lonFieldId,
          ]),
        })
      : Promise.resolve(null),
  ]);

  try {
    const companyMap = new Map<string, RecordAccessor>();
    if (companyTable) {
      for (const rec of companyQuery?.records ?? []) {
        companyMap.set(rec.id, fromSdkRecord(rec, companyTable));
      }
    }

    const locationMap = new Map<string, RecordAccessor>();
    if (locationTable) {
      for (const rec of locationQuery?.records ?? []) {
        locationMap.set(rec.id, fromSdkRecord(rec, locationTable));
      }
    }

    const records = vacancyQuery.records.map((rec) => fromSdkRecord(rec, vacancyTable));
    const filterFieldIds = discoverFilterFields(vacancyTable, structuralFieldIds);

    return {
      records,
      companyMap,
      locationMap,
      filterFieldIds,
      totalFetched: vacancyQuery.records.length,
      queriesToUnload: [companyQuery, locationQuery],
      cacheableQuery: vacancyQuery,
    };
  } catch (err) {
    vacancyQuery.unloadData();
    companyQuery?.unloadData();
    locationQuery?.unloadData();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Company data fetching
// ---------------------------------------------------------------------------

export async function fetchCompanyData(
  base: Base,
  pat: string | null,
  geo: GeocodedLocation,
  maxDist: number,
  schema: ResolvedSchema,
  structuralFieldIds: Set<string>,
): Promise<FetchResult> {
  if (pat) {
    return fetchCompanyDataRest(base, pat, geo, maxDist, schema, structuralFieldIds);
  }
  return fetchCompanyDataSdk(base, schema, structuralFieldIds);
}

async function fetchCompanyDataRest(
  base: Base,
  pat: string,
  geo: GeocodedLocation,
  maxDist: number,
  schema: ResolvedSchema,
  structuralFieldIds: Set<string>,
): Promise<FetchResult> {
  const bbox = computeBoundingBox(geo.lat, geo.lon, maxDist);
  const baseId = base.id;
  const companyTable = getTable(base, schema.company.tableId);
  const primaryFieldId = companyTable?.primaryField?.id;

  const companiesInBbox = await fetchRecordsByFormula(
    pat, baseId, schema.company.tableId,
    buildBboxFormula(schema.company.latFieldId, schema.company.lonFieldId, bbox),
  );

  const records = companiesInBbox.map((rec) => fromRestRecord(rec, primaryFieldId));
  const filterFieldIds = companyTable ? discoverFilterFields(companyTable, structuralFieldIds) : [];

  return {
    records,
    companyMap: new Map(),
    locationMap: new Map(),
    filterFieldIds,
    totalFetched: companiesInBbox.length,
    queriesToUnload: [],
    cacheableQuery: null,
  };
}

async function fetchCompanyDataSdk(base: Base, schema: ResolvedSchema, structuralFieldIds: Set<string>): Promise<FetchResult> {
  const companyTable = getTable(base, schema.company.tableId);
  if (!companyTable) throw new Error("Bedrijven tabel niet gevonden.");

  const companyQuery = await companyTable.selectRecordsAsync({ fields: companyTable.fields });

  try {
    const records = companyQuery.records.map((rec) => fromSdkRecord(rec, companyTable));
    const filterFieldIds = discoverFilterFields(companyTable, structuralFieldIds);

    return {
      records,
      companyMap: new Map(),
      locationMap: new Map(),
      filterFieldIds,
      totalFetched: companyQuery.records.length,
      queriesToUnload: [],
      cacheableQuery: companyQuery,
    };
  } catch (err) {
    companyQuery.unloadData();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Candidate data fetching
// ---------------------------------------------------------------------------

export async function fetchCandidateData(
  base: Base,
  pat: string | null,
  geo: GeocodedLocation,
  maxDist: number,
  schema: ResolvedSchema,
  structuralFieldIds: Set<string>,
): Promise<FetchResult> {
  if (pat) {
    return fetchCandidateDataRest(base, pat, geo, maxDist, schema, structuralFieldIds);
  }
  return fetchCandidateDataSdk(base, schema, structuralFieldIds);
}

async function fetchCandidateDataRest(
  base: Base,
  pat: string,
  geo: GeocodedLocation,
  maxDist: number,
  schema: ResolvedSchema,
  structuralFieldIds: Set<string>,
): Promise<FetchResult> {
  const bbox = computeBoundingBox(geo.lat, geo.lon, maxDist);
  const baseId = base.id;
  const candidateTable = getTable(base, schema.candidate.tableId);
  const primaryFieldId = candidateTable?.primaryField?.id;

  const candidatesInBbox = await fetchRecordsByFormula(
    pat, baseId, schema.candidate.tableId,
    buildBboxFormula(schema.candidate.latFieldId, schema.candidate.lonFieldId, bbox),
  );

  const records = candidatesInBbox.map((rec) => fromRestRecord(rec, primaryFieldId));
  const filterFieldIds = candidateTable ? discoverFilterFields(candidateTable, structuralFieldIds) : [];

  return {
    records,
    companyMap: new Map(),
    locationMap: new Map(),
    filterFieldIds,
    totalFetched: candidatesInBbox.length,
    queriesToUnload: [],
    cacheableQuery: null,
  };
}

async function fetchCandidateDataSdk(base: Base, schema: ResolvedSchema, structuralFieldIds: Set<string>): Promise<FetchResult> {
  const candidateTable = getTable(base, schema.candidate.tableId);
  if (!candidateTable) throw new Error("Kandidaten tabel niet gevonden.");

  const candidateQuery = await candidateTable.selectRecordsAsync({
    fields: candidateTable.fields,
  });

  try {
    const records = candidateQuery.records.map((rec) => fromSdkRecord(rec, candidateTable));
    const filterFieldIds = discoverFilterFields(candidateTable, structuralFieldIds);

    return {
      records,
      companyMap: new Map(),
      locationMap: new Map(),
      filterFieldIds,
      totalFetched: candidateQuery.records.length,
      queriesToUnload: [],
      cacheableQuery: candidateQuery,
    };
  } catch (err) {
    candidateQuery.unloadData();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// CMA data fetching
// ---------------------------------------------------------------------------

export async function fetchCmaData(
  pat: string,
  geo: GeocodedLocation,
  maxDist: number,
): Promise<RecordAccessor[]> {
  const boundingBox = computeBoundingBox(geo.lat, geo.lon, maxDist);
  const cmaVacancies = await fetchCmaVacancies(pat, boundingBox);
  return cmaVacancies.map((vac) => fromCmaRecord(vac));
}
