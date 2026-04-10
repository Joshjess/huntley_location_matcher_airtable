import { Base, Record as AirtableRecord, Table, TableOrViewQueryResult } from "@airtable/blocks/models";
import { GeocodedLocation } from "../types";
import { computeBoundingBox } from "./geo";
import { SCHEMA, ResolvedSchema, getFilterTemplates, getQueryFields, getSearchableFieldIds, getTable, uniqueFieldIds } from "./config";
import { fetchCoordinateData, fetchVacatureScraperVacancies } from "./airtableRest";
import { RecordAccessor, fromSdkRecord, withFloatOverrides, fromVacatureScraperRecord } from "./recordAccessor";

export interface FetchResult {
  readonly records: RecordAccessor[];
  readonly companyMap: ReadonlyMap<string, RecordAccessor>;
  readonly locationMap: ReadonlyMap<string, RecordAccessor>;
  readonly companyLocationLinks: ReadonlyMap<string, string[]>;
  readonly filterFieldIds: readonly { fieldId: string }[];
  readonly totalFetched: number;
  readonly queriesToUnload: (TableOrViewQueryResult | null)[];
  readonly cacheableQuery: TableOrViewQueryResult | null;
}

// ---------------------------------------------------------------------------
// Vacancy data fetching (SDK records + REST coordinates)
// Alternative company locations are derived through the visible reverse
// link on the Locaties table, so we avoid the hidden Bedrijven field.
// ---------------------------------------------------------------------------

function getLinkedIdsFromRecord(
  record: AirtableRecord,
  table: Table,
  fieldId: string,
): string[] {
  const field = table.getFieldByIdIfExists(fieldId);
  if (!field) return [];

  const rawValue = record.getCellValue(field);
  if (!Array.isArray(rawValue)) return [];

  return rawValue
    .map((linkedRecord) => {
      if (linkedRecord && typeof linkedRecord === "object" && "id" in linkedRecord) {
        return String((linkedRecord as { id: string }).id);
      }
      return null;
    })
    .filter((linkedRecordId): linkedRecordId is string => Boolean(linkedRecordId));
}

function buildCompanyLocationLinks(
  vacancyRecords: readonly AirtableRecord[],
  vacancyTable: Table,
  locationRecords: readonly AirtableRecord[],
  locationTable: Table,
  vacancyCompanyLinkFieldId: string,
  locationCompanyLinkFieldId: string,
): Map<string, string[]> {
  const companyIds = new Set<string>();
  for (const vacancyRecord of vacancyRecords) {
    for (const companyId of getLinkedIdsFromRecord(vacancyRecord, vacancyTable, vacancyCompanyLinkFieldId)) {
      companyIds.add(companyId);
    }
  }

  const companyLocationLinks = new Map<string, string[]>();
  for (const locationRecord of locationRecords) {
    for (const companyId of getLinkedIdsFromRecord(locationRecord, locationTable, locationCompanyLinkFieldId)) {
      if (!companyIds.has(companyId)) continue;

      const linkedLocationIds = companyLocationLinks.get(companyId) ?? [];
      linkedLocationIds.push(locationRecord.id);
      companyLocationLinks.set(companyId, linkedLocationIds);
    }
  }

  return companyLocationLinks;
}

function getVacancyQueryFieldIds(
  vacancyTable: Table,
  schema: ResolvedSchema,
): string[] {
  return uniqueFieldIds(
    [
      schema.vacancy.latFieldId,
      schema.vacancy.lonFieldId,
      schema.vacancy.companyLinkFieldId,
    ],
    getFilterTemplates("vacancy").map((template) => template.fieldId),
    getSearchableFieldIds(vacancyTable, [
      schema.vacancy.latFieldId,
      schema.vacancy.lonFieldId,
    ]),
  );
}

function getCompanyQueryFieldIds(
  companyTable: Table,
  schema: ResolvedSchema,
): string[] {
  return uniqueFieldIds(
    [
      schema.company.latFieldId,
      schema.company.lonFieldId,
    ],
    getFilterTemplates("company").map((template) => template.fieldId),
    getSearchableFieldIds(companyTable, [
      schema.company.latFieldId,
      schema.company.lonFieldId,
      schema.company.locationLinkFieldId,
    ]),
  );
}

function getLocationQueryFieldIds(
  locationTable: Table,
  schema: ResolvedSchema,
): string[] {
  return uniqueFieldIds([
    schema.location.companyLinkFieldId,
    schema.location.latFieldId,
    schema.location.lonFieldId,
  ], getSearchableFieldIds(locationTable, [
    schema.location.companyLinkFieldId,
    schema.location.latFieldId,
    schema.location.lonFieldId,
  ]));
}

function getCandidateQueryFieldIds(
  candidateTable: Table,
  schema: ResolvedSchema,
): string[] {
  return uniqueFieldIds(
    [
      schema.candidate.latFieldId,
      schema.candidate.lonFieldId,
    ],
    getFilterTemplates("candidate").map((template) => template.fieldId),
    getSearchableFieldIds(candidateTable, [
      schema.candidate.latFieldId,
      schema.candidate.lonFieldId,
    ]),
  );
}

export async function fetchVacancyData(
  base: Base,
  pat: string | null,
  schema: ResolvedSchema,
): Promise<FetchResult> {
  const vacancyTable = getTable(base, schema.vacancy.tableId);
  if (!vacancyTable) throw new Error("Vacatures tabel niet gevonden.");

  const companyTable = getTable(base, schema.company.tableId);
  const locationTable = getTable(base, schema.location.tableId);
  const vacancyFieldIds = getVacancyQueryFieldIds(vacancyTable, schema);
  const companyFieldIds = companyTable ? getCompanyQueryFieldIds(companyTable, schema) : [];
  const locationFieldIds = locationTable ? getLocationQueryFieldIds(locationTable, schema) : [];

  // SDK: fetch all records; REST: fetch coordinates the SDK can't see
  const [vacancyQuery, companyQuery, locationQuery, companyCoords, locationCoords] = await Promise.all([
    vacancyTable.selectRecordsAsync({ fields: getQueryFields(vacancyTable, vacancyFieldIds) }),
    companyTable
      ? companyTable.selectRecordsAsync({ fields: getQueryFields(companyTable, companyFieldIds) })
      : Promise.resolve(null),
    locationTable
      ? locationTable.selectRecordsAsync({ fields: getQueryFields(locationTable, locationFieldIds) })
      : Promise.resolve(null),
    pat
      ? fetchCoordinateData(pat, base.id, schema.company.tableId, schema.company.latFieldId, schema.company.lonFieldId)
      : Promise.resolve(new Map()),
    pat
      ? fetchCoordinateData(pat, base.id, schema.location.tableId, schema.location.latFieldId, schema.location.lonFieldId)
      : Promise.resolve(new Map()),
  ]);

  try {
    const companyLocationLinks = locationTable && locationQuery
      ? buildCompanyLocationLinks(
        vacancyQuery.records,
        vacancyTable,
        locationQuery.records,
        locationTable,
        schema.vacancy.companyLinkFieldId,
        schema.location.companyLinkFieldId,
      )
      : new Map<string, string[]>();

    const companyMap = new Map<string, RecordAccessor>();
    if (companyTable) {
      for (const rec of companyQuery?.records ?? []) {
        let accessor: RecordAccessor = fromSdkRecord(rec, companyTable, companyFieldIds);
        const coords = companyCoords.get(rec.id);
        if (coords) accessor = withFloatOverrides(accessor, { [schema.company.latFieldId]: coords.lat, [schema.company.lonFieldId]: coords.lon });
        companyMap.set(rec.id, accessor);
      }
    }

    const locationMap = new Map<string, RecordAccessor>();
    if (locationTable) {
      for (const rec of locationQuery?.records ?? []) {
        let accessor: RecordAccessor = fromSdkRecord(rec, locationTable, locationFieldIds);
        const coords = locationCoords.get(rec.id);
        if (coords) accessor = withFloatOverrides(accessor, { [schema.location.latFieldId]: coords.lat, [schema.location.lonFieldId]: coords.lon });
        locationMap.set(rec.id, accessor);
      }
    }

    const records = vacancyQuery.records.map((rec) => fromSdkRecord(rec, vacancyTable, vacancyFieldIds));

    return {
      records,
      companyMap,
      locationMap,
      companyLocationLinks,
      filterFieldIds: getFilterTemplates("vacancy"),
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
// Company data fetching (SDK — current ATS base)
// ---------------------------------------------------------------------------

export async function fetchCompanyData(
  base: Base,
  pat: string | null,
  schema: ResolvedSchema,
): Promise<FetchResult> {
  const companyTable = getTable(base, schema.company.tableId);
  if (!companyTable) throw new Error("Bedrijven tabel niet gevonden.");
  const companyFieldIds = getCompanyQueryFieldIds(companyTable, schema);

  const [companyQuery, companyCoords] = await Promise.all([
    companyTable.selectRecordsAsync({ fields: getQueryFields(companyTable, companyFieldIds) }),
    pat
      ? fetchCoordinateData(pat, base.id, schema.company.tableId, schema.company.latFieldId, schema.company.lonFieldId)
      : Promise.resolve(new Map()),
  ]);

  try {
    const records = companyQuery.records.map((rec) => {
      let accessor: RecordAccessor = fromSdkRecord(rec, companyTable, companyFieldIds);
      const coords = companyCoords.get(rec.id);
      if (coords) accessor = withFloatOverrides(accessor, { [schema.company.latFieldId]: coords.lat, [schema.company.lonFieldId]: coords.lon });
      return accessor;
    });

    return {
      records,
      companyMap: new Map(),
      locationMap: new Map(),
      companyLocationLinks: new Map(),
      filterFieldIds: getFilterTemplates("company"),
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
// Candidate data fetching (SDK — current ATS base)
// ---------------------------------------------------------------------------

export async function fetchCandidateData(
  base: Base,
  schema: ResolvedSchema,
): Promise<FetchResult> {
  const candidateTable = getTable(base, schema.candidate.tableId);
  if (!candidateTable) throw new Error("Kandidaten tabel niet gevonden.");
  const candidateFieldIds = getCandidateQueryFieldIds(candidateTable, schema);

  const candidateQuery = await candidateTable.selectRecordsAsync({
    fields: getQueryFields(candidateTable, candidateFieldIds),
  });

  try {
    const records = candidateQuery.records.map((rec) => fromSdkRecord(rec, candidateTable, candidateFieldIds));

    return {
      records,
      companyMap: new Map(),
      locationMap: new Map(),
      companyLocationLinks: new Map(),
      filterFieldIds: getFilterTemplates("candidate"),
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
// Vacature scraper data fetching (REST API — external base)
// ---------------------------------------------------------------------------

export async function fetchVacatureScraperData(
  pat: string,
  geo: GeocodedLocation,
  maxDist: number,
): Promise<RecordAccessor[]> {
  const boundingBox = computeBoundingBox(geo.lat, geo.lon, maxDist);
  const vacancies = await fetchVacatureScraperVacancies(pat, boundingBox);
  return vacancies.map((vac) => fromVacatureScraperRecord(vac));
}
