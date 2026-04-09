import React from "react";
import { MapPinIcon } from "@phosphor-icons/react";
import { GeocodedLocationInfoProps } from "../types";

export function GeocodedLocationInfo({
  location,
  radius,
}: GeocodedLocationInfoProps): React.ReactElement {
  return (
    <div className="info-bar">
      <MapPinIcon size={16} weight="fill" className="info-icon" />
      <span className="info-text">
        Gezocht rond: <strong>{location.displayName}</strong> (
        {location.lat.toFixed(4)}, {location.lon.toFixed(4)}) — straal {radius} km
      </span>
    </div>
  );
}
