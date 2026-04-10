import { Record as AirtableRecord, Table, Field } from "@airtable/blocks/models";
import { FilterValue, LinkedRecordCellValue } from "../types";

/**
 * Uniform interface for accessing Airtable record data regardless of whether
 * it was loaded via the SDK (getCellValue) or the REST API (plain objects).
 */
export interface RecordAccessor {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string | null;
  getFloat(fieldId: string): number | null;
  getLinkedIds(fieldId: string): string[];
  getFilterValue(fieldId: string): FilterValue;
  getString(fieldId: string): string | null;
  /** All field IDs available on this record. */
  readonly fieldIds: string[];
}

// ---------------------------------------------------------------------------
// SDK Record Adapter
// ---------------------------------------------------------------------------

export function fromSdkRecord(
  record: AirtableRecord,
  table: Table,
  loadedFieldIds: readonly string[] = table.fields.map((field) => field.id),
): RecordAccessor {
  const fieldCache = new Map<string, Field | null>();
  function getField(fieldId: string): Field | null {
    if (!fieldCache.has(fieldId)) {
      fieldCache.set(fieldId, table.getFieldByIdIfExists(fieldId));
    }
    return fieldCache.get(fieldId)!;
  }

  return {
    id: record.id,
    name: record.name,
    createdAt: (record as unknown as { createdTime?: Date }).createdTime?.toISOString?.() ?? null,
    fieldIds: [...loadedFieldIds],

    getFloat(fieldId: string): number | null {
      const field = getField(fieldId);
      if (!field) return null;
      const val = record.getCellValue(field);
      if (val == null) return null;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    },

    getLinkedIds(fieldId: string): string[] {
      const field = getField(fieldId);
      if (!field) return [];
      const linked = record.getCellValue(field);
      if (!Array.isArray(linked)) return [];
      return (linked as LinkedRecordCellValue[]).map((l) => l.id);
    },

    getFilterValue(fieldId: string): FilterValue {
      const field = getField(fieldId);
      if (!field) return null;
      try {
        const raw = record.getCellValue(field);
        if (raw == null) return null;
        // Multi-select: [{id, name, color}, ...]
        if (Array.isArray(raw)) {
          const names = (raw as Array<Record<string, unknown>>)
            .map((item) => {
              if (typeof item === "object" && item && "name" in item) return String(item.name);
              if (typeof item === "string") return item;
              return "";
            })
            .filter(Boolean);
          return names.length > 0 ? names : null;
        }
        // Single-select: {id, name, color}
        if (typeof raw === "object" && "name" in raw) {
          return (raw as { name: string }).name || null;
        }
        const str = String(raw);
        return str || null;
      } catch {
        try {
          const str = record.getCellValueAsString(field);
          if (!str) return null;
          if (str.includes(", ")) return str.split(", ").filter(Boolean);
          return str;
        } catch {
          return null;
        }
      }
    },

    getString(fieldId: string): string | null {
      const field = getField(fieldId);
      if (!field) return null;
      try {
        const raw = record.getCellValue(field);
        if (raw == null) return null;
        if (typeof raw === "object" && !Array.isArray(raw) && "name" in raw) {
          return (raw as { name: string }).name || null;
        }
        const str = record.getCellValueAsString(field);
        return str || null;
      } catch {
        return null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Link override wrapper — injects REST-fetched link data into an SDK accessor
// Used because the SDK can't see certain linked record fields on Bedrijven.
// ---------------------------------------------------------------------------

export function withLinkOverrides(
  base: RecordAccessor,
  overrides: Record<string, string[]>,
): RecordAccessor {
  return {
    ...base,
    getLinkedIds(fieldId: string): string[] {
      if (fieldId in overrides) return overrides[fieldId];
      return base.getLinkedIds(fieldId);
    },
  };
}

// ---------------------------------------------------------------------------
// Float override wrapper — injects REST-fetched coordinate data into an accessor
// Used because the SDK can't see number fields (Latitude/Longitude) on some tables.
// ---------------------------------------------------------------------------

export function withFloatOverrides(
  base: RecordAccessor,
  overrides: Record<string, number>,
): RecordAccessor {
  return {
    ...base,
    getFloat(fieldId: string): number | null {
      if (fieldId in overrides) return overrides[fieldId];
      return base.getFloat(fieldId);
    },
  };
}

// ---------------------------------------------------------------------------
// REST Record Adapter (field-ID keyed objects from fetchRecordsByFormula)
// ---------------------------------------------------------------------------

interface RestRecordInput {
  readonly id: string;
  readonly createdTime: string | null;
  readonly fields: Record<string, unknown>;
}

export function fromRestRecord(rec: RestRecordInput, primaryFieldId?: string): RecordAccessor {
  const fields = rec.fields;

  function resolveName(): string {
    if (primaryFieldId) {
      const val = fields[primaryFieldId];
      if (typeof val === "string" && val) return val;
    }
    return rec.id;
  }

  return {
    id: rec.id,
    name: resolveName(),
    createdAt: rec.createdTime ?? null,
    fieldIds: Object.keys(fields),

    getFloat(fieldId: string): number | null {
      const val = fields[fieldId];
      if (val == null) return null;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    },

    getLinkedIds(fieldId: string): string[] {
      const val = fields[fieldId];
      if (!Array.isArray(val)) return [];
      return (val as Array<string | { id: string }>).map((l) =>
        typeof l === "string" ? l : l.id,
      );
    },

    getFilterValue(fieldId: string): FilterValue {
      const raw = fields[fieldId];
      if (raw == null) return null;
      if (Array.isArray(raw)) {
        const names = (raw as Array<Record<string, unknown>>)
          .map((item) => {
            if (typeof item === "object" && item && "name" in item) return String(item.name);
            if (typeof item === "string") return item;
            return "";
          })
          .filter(Boolean);
        return names.length > 0 ? names : null;
      }
      if (typeof raw === "object" && "name" in raw) {
        return (raw as { name: string }).name || null;
      }
      const str = String(raw);
      return str || null;
    },

    getString(fieldId: string): string | null {
      const raw = fields[fieldId];
      if (raw == null) return null;
      if (typeof raw === "string") return raw || null;
      if (typeof raw === "object" && "name" in raw) {
        return (raw as { name: string }).name || null;
      }
      if (Array.isArray(raw)) {
        const parts = (raw as Array<unknown>)
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "name" in item) return String((item as { name: string }).name);
            return "";
          })
          .filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : null;
      }
      return String(raw) || null;
    },
  };
}

// ---------------------------------------------------------------------------
// Vacature scraper Record Adapter (field-name keyed objects from fetchVacatureScraperVacancies)
// ---------------------------------------------------------------------------

interface VacatureScraperRecordInput {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly createdAt: string | null;
  readonly fields: Record<string, unknown>;
}

export function fromVacatureScraperRecord(rec: VacatureScraperRecordInput): RecordAccessor {
  const fields = rec.fields;

  return {
    id: rec.id,
    name: rec.name,
    createdAt: rec.createdAt,
    fieldIds: Object.keys(fields),

    getFloat(fieldId: string): number | null {
      // Vacature scraper records use field names, support both "Latitude"/"Longitude" and direct access
      const val = fields[fieldId];
      if (val == null) return null;
      const num = parseFloat(String(val));
      return isNaN(num) ? null : num;
    },

    getLinkedIds(_fieldId: string): string[] {
      // Vacature scraper records don't use linked records in the resolution chain
      return [];
    },

    getFilterValue(fieldId: string): FilterValue {
      const raw = fields[fieldId];
      if (raw == null) return null;
      if (Array.isArray(raw)) {
        const names = (raw as Array<Record<string, unknown>>)
          .map((item) => {
            if (typeof item === "object" && item && "name" in item) return String(item.name);
            if (typeof item === "string") return item;
            return "";
          })
          .filter(Boolean);
        return names.length > 0 ? names : null;
      }
      if (typeof raw === "object" && "name" in raw) {
        return (raw as { name: string }).name || null;
      }
      const str = String(raw);
      return str || null;
    },

    getString(fieldId: string): string | null {
      const raw = fields[fieldId];
      if (raw == null) return null;
      if (typeof raw === "string") return raw || null;
      if (Array.isArray(raw)) {
        const parts = (raw as Array<unknown>)
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "name" in item) return String((item as { name: string }).name);
            return "";
          })
          .filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : null;
      }
      if (typeof raw === "object" && "name" in raw) {
        return (raw as { name: string }).name || null;
      }
      return String(raw) || null;
    },
  };
}

// ---------------------------------------------------------------------------
// Keyword haystack builder (works with any RecordAccessor)
// ---------------------------------------------------------------------------

/**
 * Build a lowercased keyword haystack from a RecordAccessor.
 * Works uniformly for SDK, REST, and Vacature scraper records.
 */
export function buildKeywordHaystack(
  accessor: RecordAccessor,
  fieldIds: string[],
  excludeFieldIds: Set<string>,
): string {
  const parts: string[] = [];
  for (const fieldId of fieldIds) {
    if (excludeFieldIds.has(fieldId)) continue;
    const val = accessor.getString(fieldId);
    if (val) parts.push(val);
  }
  return parts.join(" ").toLowerCase();
}
