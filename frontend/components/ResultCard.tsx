import React from "react";
import { MapPinIcon, BuildingsIcon, PushPinIcon, NavigationArrowIcon, UserIcon, EnvelopeSimpleIcon, PhoneIcon, CarIcon, FireIcon } from "@phosphor-icons/react";
import { ResultCardProps, CoordSource, CandidateSearchResult, VacancySearchResult } from "../types";
import { useSearchContext } from "../context/SearchContext";

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

const MAX_BADGES = 8;

function buildLocationString(displayFields: Readonly<Record<string, string | null>>): string | null {
  const gemeente = displayFields["Gemeente"];
  const provincie = displayFields["Provincie"];
  if (gemeente && provincie) return `${gemeente}, ${provincie}`;
  return gemeente || provincie || displayFields["Locatie"] || null;
}

function CandidateDetails({ result }: { result: CandidateSearchResult }): React.ReactElement | null {
  const df = result.displayFields;
  if (!df || Object.keys(df).length === 0) return null;

  const status = df["Status"];
  const beschikbaarheid = df["Beschikbaarheid"];
  const leeftijd = df["Leeftijd"];
  const sectoren = df["Sectoren"];
  const email = df["Email"];
  const telefoon = df["Telefoonnummer"];
  const rijbewijs = df["Rijbewijs B"];
  const hasRijbewijs = rijbewijs === "checked" || rijbewijs === "true";

  const hasDetails = status || beschikbaarheid || leeftijd || sectoren;
  const hasContact = email || telefoon || hasRijbewijs;

  return (
    <>
      {hasDetails && (
        <div className="result-card__details">
          {status && <span className="result-card__detail"><strong>Status:</strong> {status}</span>}
          {beschikbaarheid && <span className="result-card__detail"><strong>Beschikbaar:</strong> {beschikbaarheid}</span>}
          {leeftijd && <span className="result-card__detail"><strong>Leeftijd:</strong> {leeftijd}</span>}
          {sectoren && <span className="result-card__detail"><strong>Sector:</strong> {sectoren}</span>}
        </div>
      )}
      {hasContact && (
        <div className="result-card__contact">
          {email && (
            <span className="result-card__contact-item">
              <EnvelopeSimpleIcon size={12} weight="bold" />
              {email}
            </span>
          )}
          {telefoon && (
            <span className="result-card__contact-item">
              <PhoneIcon size={12} weight="bold" />
              {telefoon}
            </span>
          )}
          {hasRijbewijs && (
            <span className="result-card__contact-item result-card__contact-item--check">
              <CarIcon size={12} weight="bold" />
              Rijbewijs B
            </span>
          )}
        </div>
      )}
    </>
  );
}

export function ResultCard({ result, onExpand }: ResultCardProps): React.ReactElement {
  const { hotlistCompanyIds } = useSearchContext();
  const isVacancy = result.mode === "vacancy";
  const isCandidate = result.mode === "candidate";

  const isHotlist = isCandidate
    ? false
    : isVacancy
      ? (result as VacancySearchResult).companyIds.some((cid) => hotlistCompanyIds.has(cid))
      : hotlistCompanyIds.has(result.id);

  const source = isVacancy
    ? SOURCE_CONFIG[result.coordSource]
    : isCandidate
      ? { icon: <UserIcon size={14} weight="fill" />, label: "Kandidaat" }
      : { icon: <BuildingsIcon size={14} weight="fill" />, label: "Bedrijf" };

  const badges: { key: string; label: string; className?: string }[] = [];
  if (result.source === "vacatureScraper") {
    badges.push({ key: "source-vacature-scraper", label: "Vacature scraper", className: "tag--vacature-scraper" });
  }

  let cardTitle: string | undefined = result.name;

  if (isCandidate) {
    const funcTitle = result.filterValues[FUNCTION_TITLE_FIELD_ID];
    cardTitle = funcTitle ? `${result.name} - ${funcTitle}` : result.name;
  }

  // Build location string for candidate meta line
  const locationStr = isCandidate ? buildLocationString((result as CandidateSearchResult).displayFields) : null;

  // Show filter values as badges
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
    <div className="result-card" onClick={() => onExpand(result.id, result.source)}>
      <div className="result-card__body">
        <div className="result-card__title">
          {cardTitle || (isVacancy ? "Naamloze vacature" : isCandidate ? "Naamloze kandidaat" : "Naamloos bedrijf")}
          {isHotlist && <FireIcon size={14} weight="fill" className="result-card__hotlist-icon" />}
        </div>
        <div className="result-card__meta">
          <span className="result-card__meta-icon">{source.icon}</span>
          <span>{source.label}</span>
          <span>&middot;</span>
          <span>{result.distance.toFixed(1)} km afstand</span>
          {locationStr && (
            <>
              <span>&middot;</span>
              <span>{locationStr}</span>
            </>
          )}
        </div>
        {isCandidate && <CandidateDetails result={result as CandidateSearchResult} />}
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
