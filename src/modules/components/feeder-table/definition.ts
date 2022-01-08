import { GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
  {
    flex: 1.5,
    field: "feederName",
    headerName: "Feeder name",
  },
  {
    flex: 1,
    field: "hoursPlayedOneWeek",
    headerName: "Hours played",
    type: "number",
  },
  {
    flex: 1,
    field: "gamesPlayedOneWeek",
    headerName: "Games played",
    type: "number",
  },
  {
    flex: 1,
    field: "totalDeathsOneWeek",
    headerName: "Total deaths",
    type: "number",
  },
  {
    flex: 1,
    field: "killParticipationPercentageOneWeek",
    headerName: "Kill participation",
    type: "number",
    valueFormatter: ({ value }) =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value)),
  },
];

export const MAX_NUMBER_OF_FEEDERS = 10;

export default columns;
