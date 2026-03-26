import { Table, Record } from "@airtable/blocks/models";
import GlobalConfig from "@airtable/blocks/dist/types/src/global_config";
import { GlobalConfigFieldKey, LinkedRecordCellValue } from "../types";

export function getFieldName(
  table: Table | null,
  globalConfig: GlobalConfig,
  configKey: GlobalConfigFieldKey,
): string | null {
  const fieldId = globalConfig.get(configKey) as string | undefined;
  if (!fieldId || !table) return null;
  const field = table.getFieldByIdIfExists(fieldId);
  return field ? field.name : null;
}

export function getCellFloat(
  record: Record,
  table: Table | null,
  globalConfig: GlobalConfig,
  configKey: GlobalConfigFieldKey,
): number | null {
  const fieldName = getFieldName(table, globalConfig, configKey);
  if (!fieldName) return null;
  const val = record.getCellValue(fieldName);
  if (val == null) return null;
  const num = parseFloat(String(val));
  return isNaN(num) ? null : num;
}

export function getLinkedIds(
  record: Record,
  table: Table | null,
  globalConfig: GlobalConfig,
  configKey: GlobalConfigFieldKey,
): string[] {
  const fieldName = getFieldName(table, globalConfig, configKey);
  if (!fieldName) return [];
  const linked = record.getCellValue(fieldName);
  if (!Array.isArray(linked)) return [];
  return (linked as LinkedRecordCellValue[]).map((l) => l.id);
}
