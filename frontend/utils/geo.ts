import { GeocodedLocation } from "../types";

interface OpenMeteoGeocodingResult {
  readonly id: number;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country?: string;
  readonly admin1?: string;
}

interface OpenMeteoGeocodingResponse {
  readonly results?: OpenMeteoGeocodingResult[];
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

import { BoundingBox } from "./airtableRest";

/** Compute a lat/lon bounding box for a centre point + radius in km. */
export function computeBoundingBox(lat: number, lon: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

export async function geocodeLocation(
  query: string,
): Promise<GeocodedLocation | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=nl&format=json&countryCode=NL`;
  const res = await fetch(url);
  const data: OpenMeteoGeocodingResponse = await res.json();
  if (!data.results?.length) return null;
  const top = data.results[0];
  const displayName = [top.name, top.admin1, top.country]
    .filter(Boolean)
    .join(", ");
  return {
    lat: top.latitude,
    lon: top.longitude,
    displayName,
  };
}

