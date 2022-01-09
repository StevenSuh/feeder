import React from "react";

import Stack from "@mui/material/Stack";
import { GridColDef } from "@mui/x-data-grid";

import RefreshRowBtn from "./refresh-row-btn";

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

const formatByUnit = (diff: number, unit: string) =>
  `${diff} ${diff <= 1 ? unit : unit + "s"} ago`;

const columns: GridColDef[] = [
  {
    minWidth: 120,
    flex: 1,
    field: "feederName",
    headerName: "Feeder name",
  },
  {
    minWidth: 120,
    flex: 1,
    field: "hoursPlayedOneWeek",
    headerName: "Hours played",
    type: "number",
  },
  {
    minWidth: 120,
    flex: 1,
    field: "gamesPlayedOneWeek",
    headerName: "Games played",
    type: "number",
  },
  {
    minWidth: 120,
    flex: 1,
    field: "avgImpactScoreOneWeek",
    headerName: "Avg impact score",
    type: "number",
  },
  {
    minWidth: 120,
    flex: 1,
    field: "deathParticipationPercentageOneWeek",
    headerName: "Death participation",
    type: "number",
    valueFormatter: ({ value = 0 }) =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value)),
  },
  {
    minWidth: 120,
    flex: 1,
    field: "killParticipationPercentageOneWeek",
    headerName: "Kill participation",
    type: "number",
    valueFormatter: ({ value = 0 }) =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value)),
  },
  {
    minWidth: 180,
    flex: 1.5,
    field: "lastFetched",
    headerName: "Last updated",
    type: "number",
    valueFormatter: ({ value = 0 }) => {
      const dateNow = Date.now();

      let diff = Math.round((dateNow - Number(value)) / DAY);
      let unit = "day";

      if (diff > 0) {
        return formatByUnit(diff, unit);
      }

      diff = Math.round((dateNow - Number(value)) / HOUR);
      unit = "hour";
      if (diff > 0) {
        return formatByUnit(diff, unit);
      }

      diff = Math.round((dateNow - Number(value)) / MINUTE);
      unit = "minute";
      return formatByUnit(diff, unit);
    },
    renderCell: (params) => {
      const value = params.formattedValue;
      return (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <span>{value}</span>
          <RefreshRowBtn id={params.id as string} />
        </Stack>
      );
    },
  },
];

export const MAX_NUMBER_OF_FEEDERS = 10;

export default columns;
