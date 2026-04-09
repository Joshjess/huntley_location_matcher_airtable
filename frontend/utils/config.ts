import { Base, Field, FieldType, Table } from "@airtable/blocks/models";
import { FilterTemplate } from "../types";

// ---------------------------------------------------------------------------
// Name-based schema: table and field names consistent across bases
// ---------------------------------------------------------------------------

const TABLE_NAMES = {
  vacancy: "Vacatures",
  company: "Bedrijven",
  candidate: "Kandidaten",
  location: "Locaties",
} as const;

const FIELD_NAMES = {
  lat: "Latitude",
  lon: "Longitude",
  vacancyCompanyLink: "Bedrijf",
  companyLocationLink: "Locaties",
  companyVacaturesLink: "Vacatures",
} as const;

// ---------------------------------------------------------------------------
// Resolved schema: same shape as old hardcoded SCHEMA, with real IDs
// ---------------------------------------------------------------------------

export interface ResolvedSchema {
  readonly vacancy: {
    readonly tableId: string;
    readonly latFieldId: string;
    readonly lonFieldId: string;
    readonly companyLinkFieldId: string;
  };
  readonly company: {
    readonly tableId: string;
    readonly latFieldId: string;
    readonly lonFieldId: string;
    readonly locationLinkFieldId: string;
    readonly vacaturesLinkFieldId: string;
  };
  readonly candidate: {
    readonly tableId: string;
    readonly latFieldId: string;
    readonly lonFieldId: string;
  };
  readonly location: {
    readonly tableId: string;
    readonly latFieldId: string;
    readonly lonFieldId: string;
  };
}

/**
 * Resolve table and field IDs by name from the current base.
 * Returns null if required tables/fields are missing.
 */
export function resolveSchema(base: Base): ResolvedSchema | null {
  const vacancyTable = base.getTableByNameIfExists(TABLE_NAMES.vacancy);
  const companyTable = base.getTableByNameIfExists(TABLE_NAMES.company);
  const candidateTable = base.getTableByNameIfExists(TABLE_NAMES.candidate);
  const locationTable = base.getTableByNameIfExists(TABLE_NAMES.location);

  if (!vacancyTable || !companyTable || !candidateTable || !locationTable) return null;

  const vacLat = vacancyTable.getFieldByNameIfExists(FIELD_NAMES.lat);
  const vacLon = vacancyTable.getFieldByNameIfExists(FIELD_NAMES.lon);
  const vacCompanyLink = vacancyTable.getFieldByNameIfExists(FIELD_NAMES.vacancyCompanyLink);
  if (!vacLat || !vacLon || !vacCompanyLink) return null;

  const compLat = companyTable.getFieldByNameIfExists(FIELD_NAMES.lat);
  const compLon = companyTable.getFieldByNameIfExists(FIELD_NAMES.lon);
  const compLocationLink = companyTable.getFieldByNameIfExists(FIELD_NAMES.companyLocationLink);
  const compVacaturesLink = companyTable.getFieldByNameIfExists(FIELD_NAMES.companyVacaturesLink);
  if (!compLat || !compLon || !compLocationLink || !compVacaturesLink) return null;

  const candLat = candidateTable.getFieldByNameIfExists(FIELD_NAMES.lat);
  const candLon = candidateTable.getFieldByNameIfExists(FIELD_NAMES.lon);
  if (!candLat || !candLon) return null;

  const locLat = locationTable.getFieldByNameIfExists(FIELD_NAMES.lat);
  const locLon = locationTable.getFieldByNameIfExists(FIELD_NAMES.lon);
  if (!locLat || !locLon) return null;

  return {
    vacancy: {
      tableId: vacancyTable.id,
      latFieldId: vacLat.id,
      lonFieldId: vacLon.id,
      companyLinkFieldId: vacCompanyLink.id,
    },
    company: {
      tableId: companyTable.id,
      latFieldId: compLat.id,
      lonFieldId: compLon.id,
      locationLinkFieldId: compLocationLink.id,
      vacaturesLinkFieldId: compVacaturesLink.id,
    },
    candidate: {
      tableId: candidateTable.id,
      latFieldId: candLat.id,
      lonFieldId: candLon.id,
    },
    location: {
      tableId: locationTable.id,
      latFieldId: locLat.id,
      lonFieldId: locLon.id,
    },
  };
}

/** Build the set of structural field IDs that should never appear as filters. */
export function buildStructuralFieldIds(schema: ResolvedSchema): Set<string> {
  return new Set([
    schema.vacancy.latFieldId,
    schema.vacancy.lonFieldId,
    schema.vacancy.companyLinkFieldId,
    schema.company.latFieldId,
    schema.company.lonFieldId,
    schema.company.locationLinkFieldId,
    schema.company.vacaturesLinkFieldId,
    schema.candidate.latFieldId,
    schema.candidate.lonFieldId,
    schema.location.latFieldId,
    schema.location.lonFieldId,
  ]);
}

// ---------------------------------------------------------------------------
// Filter field discovery
// ---------------------------------------------------------------------------

/** Field types that should be offered as filters. */
const FILTERABLE_TYPES = new Set<string>([
  FieldType.SINGLE_SELECT,
  FieldType.MULTIPLE_SELECTS,
]);

/** Discover all single-select and multi-select fields in a table, skipping structural fields. */
export function discoverFilterFields(table: Table, structuralFieldIds: Set<string>): FilterTemplate[] {
  const templates: FilterTemplate[] = [];
  for (const field of table.fields) {
    if (structuralFieldIds.has(field.id)) continue;
    if (!FILTERABLE_TYPES.has(field.type)) continue;
    templates.push({ fieldId: field.id, label: field.name });
  }
  return templates;
}

/** Get a field-name-to-field-id mapping for filterable fields in a table. */
export function getFilterFieldNameMap(table: Table, structuralFieldIds: Set<string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of table.fields) {
    if (structuralFieldIds.has(field.id)) continue;
    if (!FILTERABLE_TYPES.has(field.type)) continue;
    map.set(field.name, field.id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Table / field helpers
// ---------------------------------------------------------------------------

export function getTable(
  base: Base,
  tableId: string,
): Table | null {
  return base.getTableByIdIfExists(tableId);
}

export function getQueryFields(
  table: Table,
  fieldIds: readonly string[],
): Field[] {
  const fields: Field[] = [table.primaryField];
  for (const id of fieldIds) {
    const field = table.getFieldByIdIfExists(id);
    if (field && !fields.some((f) => f.id === field.id)) {
      fields.push(field);
    }
  }
  return fields;
}
