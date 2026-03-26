import React from "react";
import { Box, Text, Input, Button, Select } from "@airtable/blocks/ui";
import { SelectOption } from "@airtable/blocks/dist/types/src/ui/select_and_select_buttons_helpers";
import { RADIUS_OPTIONS } from "../constants";
import { SearchBarProps } from "../types";

export function SearchBar({
  locationQuery,
  onLocationQueryChange,
  radius,
  onRadiusChange,
  onSearch,
  isSearching,
}: SearchBarProps): React.ReactElement {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <Box
      display="flex"
      alignItems="flex-end"
      marginBottom={3}
      padding={3}
      backgroundColor="white"
      borderRadius="large"
      border="default"
    >
      <Box flex="1" marginRight={2}>
        <Text fontWeight="500" size="small" marginBottom={1}>
          Locatie
        </Text>
        {/* Native div wrapper for onKeyDown — Airtable Input doesn't expose it */}
        <div onKeyDown={handleKeyDown}>
          <Input
            value={locationQuery}
            onChange={(e) => onLocationQueryChange(e.target.value)}
            placeholder="Bijv. Amsterdam, Utrecht, Rotterdam..."
            size="large"
          />
        </div>
      </Box>
      <Box width="140px" marginRight={2}>
        <Text fontWeight="500" size="small" marginBottom={1}>
          Straal
        </Text>
        <Select
          options={RADIUS_OPTIONS as SelectOption[]}
          value={radius}
          onChange={(val) => onRadiusChange(val as string)}
          size="large"
        />
      </Box>
      <Button
        variant="primary"
        size="large"
        onClick={onSearch}
        disabled={isSearching}
        icon={isSearching ? undefined : "search"}
      >
        {isSearching ? "Zoeken..." : "Zoeken"}
      </Button>
    </Box>
  );
}
