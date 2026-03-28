import { Field, Record } from "@airtable/blocks/models";
import { LinkedRecordCellValue } from "../types";

export function getCellFloat(
  record: Record,
  field: Field | null,
): number | null {
  if (!field) return null;
  const val = record.getCellValue(field);
  if (val == null) return null;
  const num = parseFloat(String(val));
  return isNaN(num) ? null : num;
}

export function getLinkedIds(
  record: Record,
  field: Field | null,
): string[] {
  if (!field) return [];
  const linked = record.getCellValue(field);
  if (!Array.isArray(linked)) return [];
  return (linked as LinkedRecordCellValue[]).map((l) => l.id);
}
