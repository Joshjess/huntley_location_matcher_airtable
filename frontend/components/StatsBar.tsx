import React from "react";
import { MapPinIcon, BuildingsIcon, PushPinIcon, QuestionIcon, FunnelSimpleIcon, DatabaseIcon } from "@phosphor-icons/react";
import { StatsBarProps } from "../types";

export function StatsBar({ stats, searchMode }: StatsBarProps): React.ReactElement {
  const items: Array<{
    label: string;
    value: number;
    colorClass: string;
    icon?: React.ReactNode;
  }> =
    searchMode === "vacancy"
      ? [
          { label: "Totaal", value: stats.total, colorClass: "stat-value--default" },
          { label: "Gevonden", value: stats.matched, colorClass: "stat-value--default" },
          {
            label: "Vacature",
            value: stats.fromVacancy,
            colorClass: "stat-value--green",
            icon: <MapPinIcon size={12} weight="fill" />,
          },
          {
            label: "Hoofdlocatie",
            value: stats.fromCompany,
            colorClass: "stat-value--blue",
            icon: <BuildingsIcon size={12} weight="fill" />,
          },
          {
            label: "Alt. locatie",
            value: stats.fromLocation,
            colorClass: "stat-value--purple",
            icon: <PushPinIcon size={12} weight="fill" />,
          },
          {
            label: "Geen coord.",
            value: stats.noUsableCoords,
            colorClass: "stat-value--muted",
            icon: <QuestionIcon size={12} weight="bold" />,
          },
          ...(stats.cmaMatched != null && stats.cmaMatched > 0
            ? [
                {
                  label: "CMA",
                  value: stats.cmaMatched,
                  colorClass: "stat-value--purple",
                  icon: <DatabaseIcon size={12} weight="fill" /> as React.ReactNode,
                },
              ]
            : []),
          ...(stats.filteredOut > 0
            ? [
                {
                  label: "Uitgefilterd",
                  value: stats.filteredOut,
                  colorClass: "stat-value--muted",
                  icon: <FunnelSimpleIcon size={12} weight="bold" /> as React.ReactNode,
                },
              ]
            : []),
        ]
      : [
          { label: "Totaal", value: stats.total, colorClass: "stat-value--default" },
          { label: "Gevonden", value: stats.matched, colorClass: "stat-value--default" },
          {
            label: "Geen locatie",
            value: stats.noUsableCoords,
            colorClass: "stat-value--muted",
            icon: <QuestionIcon size={12} weight="bold" />,
          },
          ...(stats.filteredOut > 0
            ? [
                {
                  label: "Uitgefilterd",
                  value: stats.filteredOut,
                  colorClass: "stat-value--muted",
                  icon: <FunnelSimpleIcon size={12} weight="bold" /> as React.ReactNode,
                },
              ]
            : []),
        ];

  return (
    <div className="stats-bar">
      {items.map((item) => (
        <div key={item.label} className="stat-card">
          <div className={`stat-value ${item.colorClass}`}>{item.value}</div>
          <div className="stat-label">
            {item.icon && <span className="result-card__meta-icon">{item.icon}</span>}
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
