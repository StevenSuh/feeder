import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";
import path from "path";

import { Feeder } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const RIOT_API_KEY = process.env.RIOT_API_KEY;

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
          .then(async (res) => {
            const data = await res.json();
            return { ok: res.ok, data };
          })
          .then(resolve)
          .catch(reject),
      delay
    )
  );

const getAllMatchesWithinOneWeek = async (feeder) => {
  const oneWeekAgo = Math.trunc(Date.now() / 1000) - 60 * 60 * 24 * 7;
  let matchIds = [];

  while (true) {
    const result = await fetchRiotWithDelay(
      `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${feeder.puuid}/ids?startTime=${oneWeekAgo}&start=${matchIds.length}&count=100`
    );

    if (!result.ok) {
      throw new Error(
        "Riot API failed probably because of their stingy rate limiting - try again in 2 minutes"
      );
    }

    matchIds = matchIds.concat(result.data);

    if (result.data.length < 100) {
      break;
    }
  }

  return { feeder, matchIds };
};

const getMatchDetails = async ({ feeder, matchIds }) => {
  const matchDetails = await Promise.all(
    matchIds.map((matchId, i) =>
      fetchRiotWithDelay(
        `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`,
        1000 + (i + 1) * 1000 // most request intensive area here
      ).then((result) => {
        if (!result.ok) {
          throw new Error(
            "Riot API failed probably because of their stingy rate limiting - try again in 2 minutes"
          );
        }
        return result.data;
      })
    )
  );
  return {
    feeder: { ...feeder, lastFetched: Date.now() },
    matches: matchDetails,
  };
};

const parseMatchDetails = ({ feeder, matches }) => {
  const hoursPlayedOneWeek = Math.trunc(
    matches.reduce((accum, curr) => {
      // Some riot API specific stuff
      const gameDuration = curr.info.gameEndTimestamp
        ? curr.info.gameDuration
        : Math.trunc(curr.info.gameDuration / 1000);
      return accum + gameDuration;
    }, 0) /
      (60 * 60)
  ); // Convert duration from seconds to hour

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

  const totalImpactScoreOneWeek = matches.reduce((accum, curr) => {
    const participantFeeder = curr.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.timeCCingOthers;
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

  const totalEnemyKillsOneWeek = matches.reduce((accum, curr) => {
    const feederTeamId = curr.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    ).teamId;

    const teamKillCount = curr.info.participants.reduce(
      (teamKillCountAccum, participant) => {
        if (participant.teamId === feederTeamId) {
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
    lastFetched: feeder.lastFetched,
    hoursPlayedOneWeek,
    gamesPlayedOneWeek: matches.length,
    avgImpactScoreOneWeek: Math.trunc(totalImpactScoreOneWeek / matches.length),
    deathParticipationPercentageOneWeek:
      totalDeathsOneWeek / totalEnemyKillsOneWeek,
    killParticipationPercentageOneWeek:
      (totalKillsOneWeek + totalAssistsOneWeek) / totalTeamKillsOneWeek,
  };
};

const getRiotProfile = (name) =>
  fetchRiotWithDelay(
    `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}`
  );

// Endpoints
app.get("/api/feeders", async (req, res, next) => {
  const allFeeders = await Feeder.find({});
  const feedersToForceFetch = req.query.ids ? req.query.ids.split(",") : [];

  // Fetch feeders that was last updated at least an hour ago or is specifically requested to refresh
  const feedersToFetch = allFeeders
    .map((feeder) => ({
      puuid: feeder.puuid,
      name: feeder.name,
      lastFetched: feeder.lastFetched,
    }))
    .filter(
      ({ puuid, lastFetched = 0 }) =>
        (Date.now() - lastFetched) > (1000 * 60 * 60) ||
        feedersToForceFetch.includes(puuid)
    );

  const riotProfilesPromise = Promise.all(allFeeders.map(getRiotProfile));

  const matchesByPuuidPromises = feedersToFetch.map((feeder) =>
    getAllMatchesWithinOneWeek(feeder).catch(next)
  );
  const matchesWithDetailByPuuidPromises = matchesByPuuidPromises.map(
    (matchesByPuuidPromise) =>
      matchesByPuuidPromise.then(getMatchDetails).catch(next)
  );

  const matchesWithDetailByPuuidPromise = Promise.all(
    matchesWithDetailByPuuidPromises
  );

  const [matchesWithDetailByPuuid, riotProfiles] = await Promise.all([
    matchesWithDetailByPuuidPromise,
    riotProfilesPromise,
  ]);
  const parsedFeederDetails = matchesWithDetailByPuuid.map(parseMatchDetails);

  // Update relevant info
  const allParsedFeederDetails = allFeeders.map((feeder) => {
    const riotProfile = riotProfiles.find(
      (profile) => profile.puuid === feeder.puuid
    );
    const currFeederDetail = parsedFeederDetails.find(
      (feederDetail) => feederDetail.id === feeder.puuid
    );

    let hasBeenUpdated = false;

    if (riotProfile) {
      feeder.name = riotProfile.name;
      hasBeenUpdated = true;
    }
    if (currFeederDetail) {
      feeder.lastFetched = Date.now();
      feeder.hoursPlayedOneWeek = currFeederDetail.hoursPlayedOneWeek;
      feeder.gamesPlayedOneWeek = currFeederDetail.gamesPlayedOneWeek;
      feeder.avgImpactScoreOneWeek = currFeederDetail.avgImpactScoreOneWeek;
      feeder.deathParticipationPercentageOneWeek =
        currFeederDetail.deathParticipationPercentageOneWeek;
      feeder.killParticipationPercentageOneWeek =
        currFeederDetail.killParticipationPercentageOneWeek;
      hasBeenUpdated = true;
    }

    if (hasBeenUpdated) {
      feeder.save();
    }

    return {
      id: feeder.puuid,
      feederName: feeder.name,
      lastFetched: feeder.lastFetched,
      hoursPlayedOneWeek: feeder.hoursPlayedOneWeek,
      gamesPlayedOneWeek: feeder.gamesPlayedOneWeek,
      avgImpactScoreOneWeek: feeder.avgImpactScoreOneWeek,
      deathParticipationPercentageOneWeek:
        feeder.deathParticipationPercentageOneWeek,
      killParticipationPercentageOneWeek:
        feeder.killParticipationPercentageOneWeek,
    };
  });

  res.json(allParsedFeederDetails);
});

// Add more feeders to the list
app.post("/api/feeder", async (req, res, next) => {
  const feedersCount = await Feeder.count({});

  if (feedersCount >= MAX_FEEDERS_LENGTH) {
    res.status(400).send({
      message: "Too many feeders - remove someone before adding a new one",
    });
    return;
  }

  // Case insensitive find
  const currFeeder = await Feeder.findOne({
    name: { $regex: new RegExp(req.body.name.toLowerCase(), "i") },
  });
  if (currFeeder) {
    res.status(400).send({
      message: "Feeder name already exists",
    });
    return;
  }

  const result = await getRiotProfile(req.body.name).catch(next);

  if (!result.ok) {
    throw new Error(
      "Riot API failed probably because of their stingy rate limiting - try again in 2 minutes"
    );
  }

  const newFeederProfile = result.data;

  if (!newFeederProfile.puuid) {
    res.status(400).send({
      message: `${req.body.name} does not exist`,
    });
    return;
  }

  await Feeder.create({
    puuid: newFeederProfile.puuid,
    name: newFeederProfile.name,
    lastFetched: 0,
  });

  res.json({});
});

// Remove feeders from the list
app.delete("/api/feeders", async (req, res) => {
  await Feeder.deleteMany({ puuid: { $in: req.body.ids } });
  res.json({});
});

// All other GET requests not handled before will return our React app
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../build", "index.html"));
});

app.listen(PORT);
