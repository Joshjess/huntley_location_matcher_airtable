import React from "react";
import {
  useBase,
  useGlobalConfig,
  Box,
  Text,
  Heading,
  TablePickerSynced,
  FieldPickerSynced,
} from "@airtable/blocks/ui";

export function SettingsPanel(): React.ReactElement {
  const base = useBase();
  const globalConfig = useGlobalConfig();

  const vacancyTableId = globalConfig.get("vacancyTableId") as
    | string
    | undefined;
  const companyTableId = globalConfig.get("companyTableId") as
    | string
    | undefined;
  const locationTableId = globalConfig.get("locationTableId") as
    | string
    | undefined;

  const vacancyTable = vacancyTableId
    ? base.getTableByIdIfExists(vacancyTableId)
    : null;
  const companyTable = companyTableId
    ? base.getTableByIdIfExists(companyTableId)
    : null;
  const locationTable = locationTableId
    ? base.getTableByIdIfExists(locationTableId)
    : null;

  return (
    <Box padding={3} borderBottom="thick">
      <Heading size="small" marginBottom={2}>
        ⚙️ Configuratie
      </Heading>
      <Text variant="paragraph" textColor="light" marginBottom={3}>
        Selecteer de tabellen en velden die worden gebruikt voor de zoekfunctie.
      </Text>

      {/* Vacatures */}
      <Box marginBottom={3}>
        <Text fontWeight="500" marginBottom={1}>
          Vacatures tabel
        </Text>
        <TablePickerSynced globalConfigKey="vacancyTableId" />
      </Box>
      {vacancyTable && (
        <Box marginBottom={3} paddingLeft={2} borderLeft="thick">
          <Text size="small" textColor="light" marginBottom={1}>
            Latitude veld
          </Text>
          <FieldPickerSynced
            table={vacancyTable}
            globalConfigKey="vacancyLatFieldId"
            shouldAllowPickingNone
            placeholder="Kies latitude veld..."
          />
          <Text
            size="small"
            textColor="light"
            marginBottom={1}
            marginTop={2}
          >
            Longitude veld
          </Text>
          <FieldPickerSynced
            table={vacancyTable}
            globalConfigKey="vacancyLonFieldId"
            shouldAllowPickingNone
            placeholder="Kies longitude veld..."
          />
          <Text
            size="small"
            textColor="light"
            marginBottom={1}
            marginTop={2}
          >
            Link naar Bedrijven
          </Text>
          <FieldPickerSynced
            table={vacancyTable}
            globalConfigKey="vacancyCompanyLinkFieldId"
            shouldAllowPickingNone
            placeholder="Kies linked record veld..."
          />
        </Box>
      )}

      {/* Bedrijven */}
      <Box marginBottom={3}>
        <Text fontWeight="500" marginBottom={1}>
          Bedrijven tabel
        </Text>
        <TablePickerSynced globalConfigKey="companyTableId" />
      </Box>
      {companyTable && (
        <Box marginBottom={3} paddingLeft={2} borderLeft="thick">
          <Text size="small" textColor="light" marginBottom={1}>
            Latitude veld
          </Text>
          <FieldPickerSynced
            table={companyTable}
            globalConfigKey="companyLatFieldId"
            shouldAllowPickingNone
            placeholder="Kies latitude veld..."
          />
          <Text
            size="small"
            textColor="light"
            marginBottom={1}
            marginTop={2}
          >
            Longitude veld
          </Text>
          <FieldPickerSynced
            table={companyTable}
            globalConfigKey="companyLonFieldId"
            shouldAllowPickingNone
            placeholder="Kies longitude veld..."
          />
          <Text
            size="small"
            textColor="light"
            marginBottom={1}
            marginTop={2}
          >
            Link naar Locaties
          </Text>
          <FieldPickerSynced
            table={companyTable}
            globalConfigKey="companyLocationLinkFieldId"
            shouldAllowPickingNone
            placeholder="Kies linked record veld..."
          />
        </Box>
      )}

      {/* Locaties */}
      <Box marginBottom={3}>
        <Text fontWeight="500" marginBottom={1}>
          Locaties tabel
        </Text>
        <TablePickerSynced globalConfigKey="locationTableId" />
      </Box>
      {locationTable && (
        <Box paddingLeft={2} borderLeft="thick">
          <Text size="small" textColor="light" marginBottom={1}>
            Latitude veld
          </Text>
          <FieldPickerSynced
            table={locationTable}
            globalConfigKey="locationLatFieldId"
            shouldAllowPickingNone
            placeholder="Kies latitude veld..."
          />
          <Text
            size="small"
            textColor="light"
            marginBottom={1}
            marginTop={2}
          >
            Longitude veld
          </Text>
          <FieldPickerSynced
            table={locationTable}
            globalConfigKey="locationLonFieldId"
            shouldAllowPickingNone
            placeholder="Kies longitude veld..."
          />
        </Box>
      )}
    </Box>
  );
}
