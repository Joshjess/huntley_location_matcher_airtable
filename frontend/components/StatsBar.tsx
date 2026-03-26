import React from "react";
import { Box, Text } from "@airtable/blocks/ui";
import { StatsBarProps } from "../types";

export function StatsBar({ stats }: StatsBarProps): React.ReactElement {
  return (
    <Box
      display="flex"
      padding={2}
      marginBottom={3}
      backgroundColor="white"
      borderRadius="large"
      border="default"
    >
      <Box flex="1" textAlign="center" padding={1}>
        <Text size="xlarge" fontWeight="600">
          {stats.matched}
        </Text>
        <Text size="small" textColor="light">
          Gevonden
        </Text>
      </Box>
      <Box flex="1" textAlign="center" padding={1} borderLeft="default">
        <Text size="xlarge" fontWeight="600" textColor="green">
          {stats.fromVacancy}
        </Text>
        <Text size="small" textColor="light">
          📍 Vacature
        </Text>
      </Box>
      <Box flex="1" textAlign="center" padding={1} borderLeft="default">
        <Text size="xlarge" fontWeight="600" textColor="blue">
          {stats.fromCompany}
        </Text>
        <Text size="small" textColor="light">
          🏢 Bedrijf
        </Text>
      </Box>
      <Box flex="1" textAlign="center" padding={1} borderLeft="default">
        <Text size="xlarge" fontWeight="600" textColor="purple">
          {stats.fromLocation}
        </Text>
        <Text size="small" textColor="light">
          📌 Locatie
        </Text>
      </Box>
      <Box flex="1" textAlign="center" padding={1} borderLeft="default">
        <Text size="xlarge" fontWeight="600" textColor="light">
          {stats.noCoords}
        </Text>
        <Text size="small" textColor="light">
          Geen coord.
        </Text>
      </Box>
    </Box>
  );
}
