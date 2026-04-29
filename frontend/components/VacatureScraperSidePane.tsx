import React, { useEffect } from "react";
import { XIcon, ArrowSquareOutIcon, StackIcon } from "@phosphor-icons/react";
import { VacatureScraperVacancy, VACATURE_SCRAPER_BASE_ID, VACATURE_SCRAPER_VACANCIES_TABLE_ID } from "../utils/airtableRest";

interface Props {
  readonly record: VacatureScraperVacancy | null;
  readonly onClose: () => void;
}

const HIDDEN_FIELDS = new Set(["Latitude", "Longitude"]);

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function renderValue(raw: unknown): React.ReactNode {
  if (raw == null || raw === "") return null;

  if (Array.isArray(raw)) {
    const parts = raw
      .map((item) => {
        if (item == null) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object" && "name" in item) return String((item as { name: string }).name);
        if (typeof item === "object" && "url" in item) return String((item as { url: string }).url);
        return String(item);
      })
      .filter((v): v is string => Boolean(v));
    if (parts.length === 0) return null;
    return (
      <div className="side-pane__value-chips">
        {parts.map((p, i) => (
          <span key={`${p}-${i}`} className="side-pane__chip">{p}</span>
        ))}
      </div>
    );
  }

  if (typeof raw === "object" && "name" in raw) {
    return String((raw as { name: string }).name);
  }

  if (typeof raw === "boolean") {
    return raw ? "Ja" : "Nee";
  }

  const str = String(raw);
  if (isUrl(str)) {
    return (
      <a className="side-pane__value-link" href={str} target="_blank" rel="noopener noreferrer">
        {str}
        <ArrowSquareOutIcon size={12} weight="bold" />
      </a>
    );
  }
  return str;
}

export function VacatureScraperSidePane({ record, onClose }: Props): React.ReactElement {
  const isOpen = record !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!record) return <></>;

  const airtableUrl = `https://airtable.com/${VACATURE_SCRAPER_BASE_ID}/${VACATURE_SCRAPER_VACANCIES_TABLE_ID}/${record.id}`;

  const entries = Object.entries(record.fields).filter(([key, value]) => {
    if (HIDDEN_FIELDS.has(key)) return false;
    if (value == null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  return (
    <>
      <div className="side-pane__backdrop" onClick={onClose} />
      <aside className="side-pane" role="dialog" aria-modal="true" aria-label="Vacature scraper detail">
        <header className="side-pane__header">
          <div className="side-pane__header-top">
            <span className="side-pane__source-badge">
              <StackIcon size={12} weight="fill" />
              Vacature scraper
            </span>
            <button type="button" className="side-pane__close" onClick={onClose} aria-label="Sluiten">
              <XIcon size={18} weight="bold" />
            </button>
          </div>
          <h2 className="side-pane__title">{record.name || "Naamloze vacature"}</h2>
          <a className="side-pane__external-link" href={airtableUrl} target="_blank" rel="noopener noreferrer">
            Open in Airtable
            <ArrowSquareOutIcon size={12} weight="bold" />
          </a>
        </header>
        <div className="side-pane__body">
          {entries.length === 0 ? (
            <p className="side-pane__empty">Geen extra velden gevonden voor dit record.</p>
          ) : (
            <dl className="side-pane__fields">
              {entries.map(([key, value]) => {
                const rendered = renderValue(value);
                if (rendered == null) return null;
                return (
                  <div key={key} className="side-pane__field">
                    <dt className="side-pane__field-label">{key}</dt>
                    <dd className="side-pane__field-value">{rendered}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      </aside>
    </>
  );
}
