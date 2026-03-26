import React from "react";
import { Box, Text } from "@airtable/blocks/ui";
import { ResultCard } from "./ResultCard";
import { SearchResultsProps } from "../types";

export function SearchResults({
  results,
  onExpand,
}: SearchResultsProps): React.ReactElement {
  if (results.length === 0) {
    return (
      <Box
        padding={4}
        textAlign="center"
        backgroundColor="white"
        borderRadius="large"
        border="default"
      >
        <Text size="large">🙁 Geen vacatures gevonden</Text>
        <Text textColor="light" marginTop={1}>
          Probeer een grotere straal of een andere locatie.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      {results.map((item) => (
        <ResultCard
          key={item.vacancy.id}
          vacancy={item.vacancy}
          distance={item.distance}
          coordSource={item.coordSource}
          onExpand={onExpand}
        />
      ))}
    </Box>
  );
}
