import cors from "cors";
import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3001;
const RIOT_API_KEY =
  process.env.RIOT_API_KEY || "RGAPI-cea5e41c-9815-4af4-8fa4-938d7ee40e0d";

// { puuid: string, name: string }[]. Should not exceed 10.
let currentFeeders = [];
const MAX_FEEDERS_LENGTH = 10;

app.use(cors());
app.use(express.json());

// Have Node serve the files for our built React app
app.use(express.static(path.resolve("../build")));

const fetchRiotWithDelay = (url, delay = 1000) =>
  new Promise((resolve, reject) =>
    setTimeout(
      () =>
        fetch(url, { headers: { "X-Riot-Token": RIOT_API_KEY } })
          .then((res) => res.json())
          .then(resolve)
          .catch(reject),
      delay
    )
  );

const getAllMatchesWithinOneWeekPromise = async (feeder) => {
  const oneWeekAgo = Math.trunc(Date.now() / 1000) - 60 * 60 * 24 * 7;
  let matchIds = [];

  while (true) {
    const result = await fetchRiotWithDelay(
      `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${feeder.puuid}/ids?startTime=${oneWeekAgo}&start=${matchIds.length}&count=100`
    );

    matchIds = matchIds.concat(result);

    if (result.length < 100) {
      break;
    }
  }

  return { feeder, matchIds };
};

const getMatchDetails = async ({ feeder, matchIds }) => {
  const matchDetails = await Promise.all(
    matchIds.map((matchId, i) =>
      fetchRiotWithDelay(
        `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`, 1000 + ((i + 1) * 1000) // most request intensive area here
      )
    )
  );
  return { feeder, matches: matchDetails };
};

const parseMatchDetails = ({ feeder, matches }) => {
  const hoursPlayedOneWeek = Math.trunc(matches.reduce((accum, curr) => {
    console.log(curr);
    // Some riot API specific stuff
    const gameDuration = curr.info.gameEndTimestamp
      ? curr.info.gameDuration
      : Math.trunc(curr.info.gameDuration / 1000);
    return accum + gameDuration;
  }, 0) / (60 * 60)); // Convert duration from seconds to hour

  const totalDeathsOneWeek = matches.reduce((accum, curr) => {
    const participantFeeder = curr.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.deaths;
  }, 0);

  const totalKillsOneWeek = matches.reduce((accum, curr) => {
    const participantFeeder = curr.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.kills;
  }, 0);

  const totalAssistsOneWeek = matches.reduce((accum, curr) => {
    const participantFeeder = curr.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.assists;
  }, 0);

  const totalTeamKillsOneWeek = matches.reduce((accum, curr) => {
    const feederTeamId = curr.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    ).teamId;

    const teamKillCount = curr.info.participants.reduce(
      (teamKillCountAccum, participant) => {
        if (participant.teamId !== feederTeamId) {
          return teamKillCountAccum;
        }
        return teamKillCountAccum + participant.kills;
      },
      0
    );

    return accum + teamKillCount;
  }, 0);

  return {
    id: feeder.puuid,
    feederName: feeder.name,
    hoursPlayedOneWeek,
    gamesPlayedOneWeek: matches.length,
    totalDeathsOneWeek,
    killParticipationPercentageOneWeek:
      (totalKillsOneWeek + totalAssistsOneWeek) / totalTeamKillsOneWeek,
  };
};

// Endpoints
// In-memory list of feeders to fetch
app.get("/api/feeders", async (_req, res) => {
  const matchesByPuuidPromises = currentFeeders.map(
    getAllMatchesWithinOneWeekPromise
  );
  const matchesWithDetailByPuuidPromises = matchesByPuuidPromises.map(
    (matchesByPuuidPromise) => matchesByPuuidPromise.then(getMatchDetails)
  );

  const matchesWithDetailByPuuid = await Promise.all(
    matchesWithDetailByPuuidPromises
  );

  res.json(matchesWithDetailByPuuid.map(parseMatchDetails));
});

// Add more feeders to the list
app.post("/api/feeder", async (req, res) => {
  if (currentFeeders.length >= MAX_FEEDERS_LENGTH) {
    res.status(400).send({
      message: "Too many feeders - remove someone before adding a new one",
    });
    return;
  }

  if (currentFeeders.find(feeder => feeder.name.toLowerCase() === req.body.name.toLowerCase())) {
    res.status(400).send({
      message: "Feeder name already exists",
    });
    return;
  }

  const newFeederProfile = await fetchRiotWithDelay(
    `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${req.body.name}`, 0
  );

  if (!newFeederProfile.puuid) {
    res.status(400).send({
      message: `${req.body.name} does not exist`,
    });
    return;
  }

  currentFeeders.push({
    puuid: newFeederProfile.puuid,
    name: newFeederProfile.name,
  });

  res.json({});
});

// Remove feeders from the list
app.delete("/api/feeders", (req, res) => {
  const idsToDelete = req.body.ids;

  currentFeeders = currentFeeders.filter(
    (feeder) => !idsToDelete.includes(feeder.puuid)
  );

  res.json({});
});

// All other GET requests not handled before will return our React app
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../build", "index.html"));
});

app.listen(PORT);
