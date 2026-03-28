import React from "react";
import { initializeBlock } from "@airtable/blocks/ui";
import { VacancyLocationSearch } from "./components/VacancyLocationSearch";
import "./styles.css";

try {
  initializeBlock({
    dashboard: () => <VacancyLocationSearch />,
    view: () => <VacancyLocationSearch />,
  });
} catch (error) {
  if (error instanceof Error && error.message.includes("Invalid context")) {
    // Airtable introduced a run context that SDK v1.19 doesn't recognize.
    // Fall back to manual rendering through the internal SDK wrapper.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactDOM = require("react-dom") as any;
    const AirtableBlocks = require("@airtable/blocks") as { __sdk: any };
    const BlockWrapper = require("@airtable/blocks/dist/cjs/ui/block_wrapper")
      .default as React.ComponentType<{ sdk: unknown; children: React.ReactNode }>;

    const sdk = AirtableBlocks.__sdk;
    sdk.__setBatchedUpdatesFn(ReactDOM.unstable_batchedUpdates);

    const container = document.createElement("div");
    document.body.appendChild(container);
    ReactDOM.render(
      <BlockWrapper sdk={sdk}>
        <VacancyLocationSearch />
      </BlockWrapper>,
      container,
    );
  } else {
    throw error;
  }
}
