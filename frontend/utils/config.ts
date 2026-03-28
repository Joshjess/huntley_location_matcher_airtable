import { Base, Field, Table } from "@airtable/blocks/models";

export const SCHEMA = {
  vacancy: {
    tableId: "tbl8M37XZbobk4QQZ",
    latFieldId: "fldjDWspQIInFZTEi",
    lonFieldId: "fldcTTbcDBmB76eRn",
    companyLinkFieldId: "fldkDy9PxjOXtOiAJ",
    filterFields: {
      contractType: "fldYlXxfljjdHS7Mj",
      niche: "fld57OJWErvQ1vzub",
      profielgroep: "fldc9L2HTgheEej1w",
      status: "fldcwHFETjn91lA2E",
      prioriteit: "fldOQsmmQdxwDTj1W",
    },
  },
  company: {
    tableId: "tblYgvlqdHv3ct2t7",
    latFieldId: "fldcwIlDPYV3Yq0sx",
    lonFieldId: "fldkgyEEj0nYIdgq8",
    locationLinkFieldId: "fld877ccOcPJaOUj1",
    filterFields: {
      sector: "fldHLFawQFMgf2AkB",
      provincie: "fldyvrSsggV35eJ9g",
      status: "fldigkILDIjDSzPPd",
    },
  },
  location: {
    tableId: "tblFiEJUWOZGABAxF",
    latFieldId: "fldgGAjIxs2IkA3Pl",
    lonFieldId: "fld7VK9jnIc1evzY0",
  },
} as const;

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
