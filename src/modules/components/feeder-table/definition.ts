import { GridColDef } from "@mui/x-data-grid";

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

const formatByUnit = (diff: number, unit: string) =>
  `${diff} ${diff <= 1 ? unit : unit + "s"} ago`;

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
  {
    flex: 1,
    field: "createdAt",
    headerName: "Added here",
    type: "number",
    valueFormatter: ({ value }) => {
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
  },
];

export const MAX_NUMBER_OF_FEEDERS = 20;

export default columns;
