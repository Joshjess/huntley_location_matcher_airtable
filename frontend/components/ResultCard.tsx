import React from "react";
import { MapPin, Buildings, PushPin, NavigationArrow } from "@phosphor-icons/react";
import { ResultCardProps, CoordSource } from "../types";
import { SCHEMA } from "../utils/config";

const SOURCE_CONFIG: Record<CoordSource, { icon: React.ReactNode; label: string }> = {
  vacancy:  { icon: <MapPin size={14} weight="fill" />,   label: "Vacature" },
  company:  { icon: <Buildings size={14} weight="fill" />, label: "Bedrijf hoofdlocatie" },
  location: { icon: <PushPin size={14} weight="fill" />,  label: "Alternatieve locatie" },
};

function getDistanceBadgeClass(distance: number): string {
  if (distance <= 10) return "distance-badge distance-badge--close";
  if (distance <= 25) return "distance-badge distance-badge--mid";
  return "distance-badge distance-badge--far";
}

export function ResultCard({ result, onExpand }: ResultCardProps): React.ReactElement {
  const isVacancy = result.mode === "vacancy";
  const source = isVacancy ? SOURCE_CONFIG[result.coordSource] : { icon: <Buildings size={14} weight="fill" />, label: "Bedrijf" };

  const badges: { key: string; label: string }[] = [];
  if (isVacancy) {
    const fv = result.filterValues;
    const vf = SCHEMA.vacancy.filterFields;
    if (fv[vf.status]) badges.push({ key: "v-status", label: fv[vf.status]! });
    if (fv[vf.contractType]) badges.push({ key: "v-contract", label: fv[vf.contractType]! });
    if (fv[vf.niche]) badges.push({ key: "v-niche", label: fv[vf.niche]! });
  } else {
    const fv = result.filterValues;
    const cf = SCHEMA.company.filterFields;
    if (fv[cf.sector]) badges.push({ key: "c-sector", label: fv[cf.sector]! });
    if (fv[cf.provincie]) badges.push({ key: "c-prov", label: fv[cf.provincie]! });
  }

  return (
    <div className="result-card" onClick={() => onExpand(result.id)}>
      <div className="result-card__body">
        <div className="result-card__title">
          {result.name || (isVacancy ? "Naamloze vacature" : "Naamloos bedrijf")}
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
              <span key={b.key} className="tag">{b.label}</span>
            ))}
          </div>
        )}
      </div>
      <span className={getDistanceBadgeClass(result.distance)}>
        <NavigationArrow size={12} weight="fill" />
        {result.distance.toFixed(1)} km
      </span>
    </div>
  );
}
