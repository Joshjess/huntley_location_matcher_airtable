export const CMA_BASE_ID = "app0N8iiJGETseFUe";
export const CMA_VACANCIES_TABLE_ID = "tblX7XuOFzBlomag2";
const API_BASE = "https://api.airtable.com/v0";

// Rate limit: max 4 req/sec (Airtable limit is 5)
let lastRequestMs = 0;
const MIN_REQUEST_INTERVAL_MS = 250;

async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestMs;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestMs = Date.now();
}

interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

interface ListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface CmaVacancy {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: string | null;
  fields: Record<string, unknown>;
}

async function airtableFetch(
  pat: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  await throttleRequest();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "30", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return airtableFetch(pat, path, options);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable API ${res.status}: ${body}`);
  }
  return res;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Fetch CMA vacancies that have coordinates, optionally within a bounding box.
 */
// ---------------------------------------------------------------------------
// Generic REST record fetching with filterByFormula
// ---------------------------------------------------------------------------

export interface RestRecord {
  id: string;
  createdTime: string | null;
  fields: Record<string, unknown>;
}

/** Build an Airtable filterByFormula that limits to records inside a bounding box. */
export function buildBboxFormula(
  latFieldId: string,
  lonFieldId: string,
  bbox: BoundingBox,
): string {
  return `AND({${latFieldId}}!=BLANK(),{${lonFieldId}}!=BLANK(),{${latFieldId}}>=${bbox.minLat},{${latFieldId}}<=${bbox.maxLat},{${lonFieldId}}>=${bbox.minLon},{${lonFieldId}}<=${bbox.maxLon})`;
}

/** Build a formula matching records that are missing coordinates. */
export function buildNoCoordsFormula(
  latFieldId: string,
  lonFieldId: string,
): string {
  return `OR({${latFieldId}}=BLANK(),{${lonFieldId}}=BLANK())`;
}

/**
 * Fetch records from any Airtable table using filterByFormula.
 * Paginates automatically. Uses returnFieldsByFieldId=true so field keys are IDs.
 */
export async function fetchRecordsByFormula(
  pat: string,
  baseId: string,
  tableId: string,
  formula: string,
  fieldIds?: string[],
): Promise<RestRecord[]> {
  const results: RestRecord[] = [];
  let offset: string | undefined;

  const encodedFormula = encodeURIComponent(formula);
  const fieldsParam = fieldIds
    ? fieldIds.map((id) => `&fields%5B%5D=${encodeURIComponent(id)}`).join("")
    : "";

  do {
    const offsetParam = offset ? `&offset=${encodeURIComponent(offset)}` : "";
    const path = `/${baseId}/${tableId}?filterByFormula=${encodedFormula}&returnFieldsByFieldId=true${fieldsParam}${offsetParam}`;

    const res = await airtableFetch(pat, path);
    const data: ListResponse = await res.json();

    for (const rec of data.records) {
      results.push({
        id: rec.id,
        createdTime: rec.createdTime ?? null,
        fields: rec.fields,
      });
    }

    offset = data.offset;
  } while (offset);

  return results;
}

// ---------------------------------------------------------------------------
// CMA-specific fetch (uses field names, not IDs)
// ---------------------------------------------------------------------------

export async function fetchCmaVacancies(
  pat: string,
  boundingBox?: BoundingBox,
): Promise<CmaVacancy[]> {
  const results: CmaVacancy[] = [];
  let offset: string | undefined;

  let formula = "AND({Latitude}!=BLANK(),{Longitude}!=BLANK())";
  if (boundingBox) {
    formula = `AND({Latitude}!=BLANK(),{Longitude}!=BLANK(),{Latitude}>=${boundingBox.minLat},{Latitude}<=${boundingBox.maxLat},{Longitude}>=${boundingBox.minLon},{Longitude}<=${boundingBox.maxLon})`;
  }
  const encodedFormula = encodeURIComponent(formula);

  do {
    const offsetParam = offset ? `&offset=${encodeURIComponent(offset)}` : "";
    const path = `/${CMA_BASE_ID}/${CMA_VACANCIES_TABLE_ID}?filterByFormula=${encodedFormula}${offsetParam}`;

    const res = await airtableFetch(pat, path);
    const data: ListResponse = await res.json();

    for (const rec of data.records) {
      const lat = Number(rec.fields["Latitude"]);
      const lon = Number(rec.fields["Longitude"]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const name = typeof rec.fields["Job Title"] === "string"
        ? rec.fields["Job Title"]
        : (rec.id);

      results.push({ id: rec.id, name, lat, lon, createdAt: rec.createdTime ?? null, fields: rec.fields });
    }

    offset = data.offset;
  } while (offset);

  return results;
}

