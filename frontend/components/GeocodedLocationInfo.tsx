import React from "react";
import { Box, Text } from "@airtable/blocks/ui";
import { GeocodedLocationInfoProps } from "../types";

export function GeocodedLocationInfo({
  location,
  radius,
}: GeocodedLocationInfoProps): React.ReactElement {
  return (
    <Box
      padding={2}
      marginBottom={2}
      backgroundColor="blueLight1"
      borderRadius="large"
      display="flex"
      alignItems="center"
    >
      <Text size="small" textColor="blueDark1">
        📍 Gezocht rond: <strong>{location.displayName}</strong> (
        {location.lat.toFixed(4)}, {location.lon.toFixed(4)}) — straal {radius}{" "}
        km
      </Text>
    </Box>
  );
}
