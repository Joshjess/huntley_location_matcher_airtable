import React from "react";
import { Box, Text } from "@airtable/blocks/ui";
import { COORD_SOURCE_LABELS } from "../constants";
import { ResultCardProps } from "../types";

export function ResultCard({
  vacancy,
  distance,
  coordSource,
  onExpand,
}: ResultCardProps): React.ReactElement {
  return (
    <Box
      padding={3}
      marginBottom={2}
      border="default"
      borderRadius="large"
      backgroundColor="white"
      display="flex"
      alignItems="center"
      style={{ cursor: "pointer", transition: "box-shadow 0.15s" }}
      onClick={() => onExpand(vacancy)}
    >
      <Box flex="1">
        <Text fontWeight="600" size="large">
          {vacancy.name || "Naamloze vacature"}
        </Text>
        <Box display="flex" alignItems="center" marginTop={1}>
          <Text size="small" textColor="light">
            {COORD_SOURCE_LABELS[coordSource] || "Onbekend"} &middot;{" "}
            {distance.toFixed(1)} km afstand
          </Text>
        </Box>
      </Box>
      <Box
        paddingX={2}
        paddingY={1}
        borderRadius="large"
        backgroundColor={
          distance <= 10
            ? "greenLight1"
            : distance <= 25
              ? "yellowLight1"
              : "orangeLight1"
        }
      >
        <Text
          fontWeight="600"
          size="small"
          textColor={
            distance <= 10
              ? "greenDark1"
              : distance <= 25
                ? "yellowDark1"
                : "orangeDark1"
          }
        >
          {distance.toFixed(1)} km
        </Text>
      </Box>
    </Box>
  );
}
