import React from "react";
import { MapPinIcon, BuildingsIcon, PushPinIcon, NavigationArrowIcon, UserIcon } from "@phosphor-icons/react";
import { ResultCardProps, CoordSource, FilterValue } from "../types";

const FUNCTION_TITLE_FIELD_ID = "fldVOPaHYrnC3o4vF";

const SOURCE_CONFIG: Record<CoordSource, { icon: React.ReactNode; label: string }> = {
  vacancy:  { icon: <MapPinIcon size={14} weight="fill" />,   label: "Vacature" },
  company:  { icon: <BuildingsIcon size={14} weight="fill" />, label: "Bedrijf hoofdlocatie" },
  location: { icon: <PushPinIcon size={14} weight="fill" />,  label: "Alternatieve locatie" },
};

function getDistanceBadgeClass(distance: number): string {
  if (distance <= 10) return "distance-badge distance-badge--close";
  if (distance <= 25) return "distance-badge distance-badge--mid";
  return "distance-badge distance-badge--far";
}

const MAX_BADGES = 4;

let cardTitle: string | undefined;

export function ResultCard({ result, onExpand }: ResultCardProps): React.ReactElement {
  const isVacancy = result.mode === "vacancy";
  const isCandidate = result.mode === "candidate";

  const source = isVacancy
    ? SOURCE_CONFIG[result.coordSource]
    : isCandidate
      ? { icon: <UserIcon size={14} weight="fill" />, label: "Kandidaat" }
      : { icon: <BuildingsIcon size={14} weight="fill" />, label: "Bedrijf" };

  const badges: { key: string; label: string; className?: string }[] = [];
  if (result.source === "vacatureScraper") {
    badges.push({ key: "source-vacature-scraper", label: "Vacature scraper", className: "tag--vacature-scraper" });
  }


  cardTitle = result.name;

  if (isCandidate) {
    const funcTitle = result.filterValues[FUNCTION_TITLE_FIELD_ID];
    cardTitle = funcTitle ? `${result.name} - ${funcTitle}` : result.name;
  }
  if (isVacancy) {
    cardTitle = result.name;
  }

  // Show first N non-null filter values as badges
  for (const [fieldId, value] of Object.entries(result.filterValues)) {
    if (isCandidate && fieldId === FUNCTION_TITLE_FIELD_ID) {
      continue;
    }
    if (badges.length >= MAX_BADGES) break;
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (badges.length >= MAX_BADGES) break;
        if (v) badges.push({ key: `${fieldId}-${v}`, label: v });
      }
    } else if (value) {
      badges.push({ key: fieldId, label: value });
    }

  }

  return (
    <div className="result-card" onClick={() => onExpand(result.id)}>
      <div className="result-card__body">
        <div className="result-card__title">
          {cardTitle || (isVacancy ? "Naamloze vacature" : isCandidate ? "Naamloze kandidaat" : "Naamloos bedrijf")}
        </div>
        <div className="result-card__meta">
          <span className="result-card__meta-icon">{source.icon}</span>
          <span>{source.label}</span>
          <span>&middot;</span>
          <span>{result.distance.toFixed(1)} km afstand</span>
        </div>
        {badges.length > 0 && (
          <div className="result-card__tags">
            {badges.map((b) => (
              <span key={b.key} className={`tag ${b.className ?? ""}`}>{b.label}</span>
            ))}
          </div>
        )}
      </div>
      <span className={getDistanceBadgeClass(result.distance)}>
        <NavigationArrowIcon size={12} weight="fill" />
        {result.distance.toFixed(1)} km
      </span>
    </div>
  );
}
