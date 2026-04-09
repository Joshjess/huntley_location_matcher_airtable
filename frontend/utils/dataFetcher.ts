import { Base, TableOrViewQueryResult } from "@airtable/blocks/models";
import { GeocodedLocation } from "../types";
import { computeBoundingBox } from "./geo";
import { SCHEMA, ResolvedSchema, getTable, getFilterTemplates } from "./config";
import { fetchLinkMapping, fetchVacatureScraperVacancies } from "./airtableRest";
import { RecordAccessor, fromSdkRecord, withLinkOverrides, fromVacatureScraperRecord } from "./recordAccessor";

export interface FetchResult {
  readonly records: RecordAccessor[];
  readonly companyMap: ReadonlyMap<string, RecordAccessor>;
  readonly locationMap: ReadonlyMap<string, RecordAccessor>;
  readonly filterFieldIds: readonly { fieldId: string }[];
  readonly totalFetched: number;
  readonly queriesToUnload: (TableOrViewQueryResult | null)[];
  readonly cacheableQuery: TableOrViewQueryResult | null;
}

// ---------------------------------------------------------------------------
// Vacancy data fetching (SDK records + REST link mappings)
// The SDK can't see linked record fields on Bedrijven, so we fetch those
// link mappings via REST and inject them into the company accessors.
// ---------------------------------------------------------------------------

export async function fetchVacancyData(
  base: Base,
  pat: string | null,
  schema: ResolvedSchema,
): Promise<FetchResult> {
  const vacancyTable = getTable(base, schema.vacancy.tableId);
  if (!vacancyTable) throw new Error("Vacatures tabel niet gevonden.");

  const companyTable = getTable(base, schema.company.tableId);
  const locationTable = getTable(base, schema.location.tableId);

  // SDK: fetch all records; REST: fetch link mappings the SDK can't see
  const [vacancyQuery, companyQuery, locationQuery, companyLocationLinks] = await Promise.all([
    vacancyTable.selectRecordsAsync({ fields: vacancyTable.fields }),
    companyTable
      ? companyTable.selectRecordsAsync({ fields: companyTable.fields })
      : Promise.resolve(null),
    locationTable
      ? locationTable.selectRecordsAsync({ fields: locationTable.fields })
      : Promise.resolve(null),
    pat
      ? fetchLinkMapping(pat, base.id, schema.company.tableId, schema.company.locationLinkFieldId)
      : Promise.resolve(new Map<string, string[]>()),
  ]);

  try {
    const companyMap = new Map<string, RecordAccessor>();
    if (companyTable) {
      for (const rec of companyQuery?.records ?? []) {
        const accessor = fromSdkRecord(rec, companyTable);
        const links = companyLocationLinks.get(rec.id);
        companyMap.set(
          rec.id,
          links ? withLinkOverrides(accessor, { [schema.company.locationLinkFieldId]: links }) : accessor,
        );
      }
    }

    const locationMap = new Map<string, RecordAccessor>();
    if (locationTable) {
      for (const rec of locationQuery?.records ?? []) {
        locationMap.set(rec.id, fromSdkRecord(rec, locationTable));
      }
    }

    const records = vacancyQuery.records.map((rec) => fromSdkRecord(rec, vacancyTable));

    return {
      records,
      companyMap,
      locationMap,
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
  schema: ResolvedSchema,
): Promise<FetchResult> {
  const companyTable = getTable(base, schema.company.tableId);
  if (!companyTable) throw new Error("Bedrijven tabel niet gevonden.");

  const companyQuery = await companyTable.selectRecordsAsync({ fields: companyTable.fields });

  try {
    const records = companyQuery.records.map((rec) => fromSdkRecord(rec, companyTable));

    return {
      records,
      companyMap: new Map(),
      locationMap: new Map(),
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

  const candidateQuery = await candidateTable.selectRecordsAsync({
    fields: candidateTable.fields,
  });

  try {
    const records = candidateQuery.records.map((rec) => fromSdkRecord(rec, candidateTable));

    return {
      records,
      companyMap: new Map(),
      locationMap: new Map(),
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
