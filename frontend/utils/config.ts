import { Base, Field, Table } from "@airtable/blocks/models";
import { FilterTemplate, SearchMode } from "../types";

// ---------------------------------------------------------------------------
// Hardcoded schema — field IDs from Airtable REST metadata API
// Base: Huntley Recruitment ATS (apphob4FGdn1Bdy4F)
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
    readonly companyLinkFieldId: string;
    readonly latFieldId: string;
    readonly lonFieldId: string;
  };
}

export const SCHEMA: ResolvedSchema = {
  vacancy: {
    tableId: "tbl8M37XZbobk4QQZ",
    latFieldId: "fldjDWspQIInFZTEi",
    lonFieldId: "fldcTTbcDBmB76eRn",
    companyLinkFieldId: "fldkDy9PxjOXtOiAJ",
  },
  company: {
    tableId: "tblYgvlqdHv3ct2t7",
    latFieldId: "fldcwIlDPYV3Yq0sx",
    lonFieldId: "fldkgyEEj0nYIdgq8",
    locationLinkFieldId: "fld877ccOcPJaOUj1",
    vacaturesLinkFieldId: "fld2dvqxQLNg8TDuE",
  },
  candidate: {
    tableId: "tblabJll67hRggXzU",
    latFieldId: "fldfqTJlJUqOukSpm",
    lonFieldId: "fld77BAbMcLh2rP6D",
  },
  location: {
    tableId: "tblFiEJUWOZGABAxF",
    companyLinkFieldId: "fldgKJFnIhNZJUvGU",
    latFieldId: "fldgGAjIxs2IkA3Pl",
    lonFieldId: "fld7VK9jnIc1evzY0",
  },
};

// ---------------------------------------------------------------------------
// Filter fields — hardcoded IDs, options discovered dynamically from data
// ---------------------------------------------------------------------------

const FILTER_FIELDS: Record<SearchMode, readonly FilterTemplate[]> = {
  vacancy: [],
  company: [
    { fieldId: "fldHLFawQFMgf2AkB", label: "Sector" },
  ],
  candidate: [
    { fieldId: "fldVOPaHYrnC3o4vF", label: "Functietitel" },
    { fieldId: "fld0RHj8yUB8wMi24", label: "Diploma/Opleiding" },
    { fieldId: "fldfXLEXSyO0PJ0sJ", label: "Certificaten" },
    { fieldId: "fldkdmX8fHoiWQtIq", label: "Werkervaring Vakgebied" },
    { fieldId: "fldE8B6sT0k0pbaXB", label: "Profielgroep" },
  ],
};

export function getFilterTemplates(searchMode: SearchMode): readonly FilterTemplate[] {
  return FILTER_FIELDS[searchMode];
}

const SEARCHABLE_FIELD_TYPES = new Set<string>([
  "singleLineText",
  "multilineText",
  "richText",
  "singleSelect",
  "multipleSelects",
  "multipleRecordLinks",
  "phoneNumber",
  "email",
  "url",
  "number",
  "currency",
  "percent",
  "duration",
  "checkbox",
  "date",
  "dateTime",
  "formula",
  "rollup",
  "multipleLookupValues",
  "count",
  "rating",
  "autoNumber",
]);

export function uniqueFieldIds(...groups: ReadonlyArray<readonly string[]>): string[] {
  const fieldIds = new Set<string>();
  for (const group of groups) {
    for (const fieldId of group) {
      if (fieldId) fieldIds.add(fieldId);
    }
  }
  return [...fieldIds];
}

export function getSearchableFieldIds(
  table: Table,
  excludeFieldIds: readonly string[] = [],
): string[] {
  const excludedFieldIds = new Set(excludeFieldIds);

  return table.fields
    .filter((field) => !excludedFieldIds.has(field.id))
    .filter((field) => SEARCHABLE_FIELD_TYPES.has(String(field.type)))
    .map((field) => field.id);
}

// ---------------------------------------------------------------------------
// Table / field helpers
// ---------------------------------------------------------------------------

export function getTable(base: Base, tableId: string): Table | null {
  return base.getTableByIdIfExists(tableId);
}

export function getQueryFields(table: Table, fieldIds: readonly string[]): Field[] {
  const fields: Field[] = [table.primaryField];
  for (const id of fieldIds) {
    const field = table.getFieldByIdIfExists(id);
    if (field && !fields.some((f) => f.id === field.id)) {
      fields.push(field);
    }
  }
  return fields;
}
