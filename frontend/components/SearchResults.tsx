import React from "react";
import { SmileySad } from "@phosphor-icons/react";
import { ResultCard } from "./ResultCard";
import { SearchResultsProps } from "../types";

function getEmptyState(
  total: number,
  radius: string,
  stats: SearchResultsProps["stats"],
  isCompany: boolean,
): { title: string; description: string } {
  const label = isCompany ? "bedrijven" : "vacatures";

  if (total === 0) {
    return {
      title: `Nog geen ${label} beschikbaar`,
      description: `De geselecteerde tabel bevat momenteel geen records.`,
    };
  }

  const withUsableCoords = total - stats.noUsableCoords;

  if (withUsableCoords === 0) {
    if (isCompany) {
      return {
        title: "Geen bedrijven met bruikbare coordinaten",
        description: `Alle ${total} bedrijven missen latitude/longitude coordinaten.`,
      };
    }

    const details = [
      `${stats.withoutVacancyCoords} vacatures missen vacaturecoordinaten.`,
      stats.withoutCompanyLink > 0
        ? `${stats.withoutCompanyLink} vacatures hebben geen gekoppeld bedrijf.`
        : null,
      stats.withoutCompanyMainCoords > 0
        ? `${stats.withoutCompanyMainCoords} vacatures konden niet terugvallen op een bedrijfs-hoofdlocatie.`
        : null,
      stats.withoutAlternativeLocations > 0
        ? `${stats.withoutAlternativeLocations} vacatures hebben geen alternatieve locaties.`
        : null,
      stats.withoutAlternativeLocationCoords > 0
        ? `${stats.withoutAlternativeLocationCoords} alternatieve locaties missen coordinaten.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      title: "Geen vacatures met bruikbare coordinaten",
      description: details,
    };
  }

  let desc =
    `Er zijn ${withUsableCoords} ${label} met bruikbare coordinaten gecontroleerd, maar geen daarvan valt binnen ${radius} km.` +
    (stats.noUsableCoords > 0
      ? ` ${stats.noUsableCoords} ${label} misten bruikbare coordinaten.`
      : "");

  if (stats.filteredOut > 0) {
    desc += ` ${stats.filteredOut} ${label} zijn uitgefilterd door actieve filters.`;
  }

  return {
    title: `Geen ${label} binnen de straal`,
    description: desc,
  };
}

export function SearchResults({
  results,
  stats,
  radius,
  searchMode,
  onExpand,
}: SearchResultsProps): React.ReactElement {
  if (results.length === 0) {
    const emptyState = getEmptyState(stats.total, radius, stats, searchMode === "company");

    return (
      <div className="card empty-state">
        <div className="empty-state__icon">
          <SmileySad size={40} weight="light" />
        </div>
        <div className="empty-state__title">{emptyState.title}</div>
        <p className="empty-state__description">{emptyState.description}</p>
      </div>
    );
  }

  return (
    <div>
      {results.map((item) => (
        <ResultCard
          key={item.id}
          result={item}
          onExpand={onExpand}
        />
      ))}
    </div>
  );
}
