import React from "react";
import { initializeBlock } from "@airtable/blocks/ui";
import { VacancyLocationSearch } from "./components/VacancyLocationSearch";

initializeBlock(() => <VacancyLocationSearch />);
