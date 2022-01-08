import { Feeder } from "../db.js";

import {
  getRiotProfile,
  fetchRiotWithDelay,
  promiseWithTimeout,
  MAX_NUMBER_OF_FEEDERS,
} from "./utils.js";

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

const getMatchDetail = async (matchId, delay) =>
  fetchRiotWithDelay(
    `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`,
    delay
  ).then((result) => {
    if (!result.ok) {
      throw new Error(
        "Riot API failed probably because of their stingy rate limiting - try again in 2 minutes"
      );
    }
    return result.data;
  });

const getMatchDetails = (matchIdsByPuuidList) => {
  const matchDetailPromises = [];
  const matchVisitedMap = {};
  matchIdsByPuuidList.forEach((matchIdsByPuuid) => {
    matchIdsByPuuid.matchIds.forEach((matchId) => {
      if (matchVisitedMap[matchId]) {
        return;
      }
      matchVisitedMap[matchId] = true;
      matchDetailPromises.push(
        getMatchDetail(matchId, 1000 + (matchDetailPromises.length + 1) * 1000)
      );
    });
  });
  return Promise.all(matchDetailPromises);
};

const convertToMatchDetailMap = (matchDetails) => {
  const matchDetailMap = {};
  matchDetails.forEach((matchDetail) => {
    matchDetailMap[matchDetail.metadata.matchId] = matchDetail;
  });
  return matchDetailMap;
};

const parseMatchDetails = ({ feeder, matchIds }, matchDetailMap) => {
  const hoursPlayedOneWeek = Math.trunc(
    matchIds.reduce((accum, curr) => {
      const match = matchDetailMap[curr];
      // Some riot API specific stuff
      const gameDuration = match.info.gameEndTimestamp
        ? match.info.gameDuration
        : Math.trunc(match.info.gameDuration / 1000);
      return accum + gameDuration;
    }, 0) /
      (60 * 60)
  ); // Convert duration from seconds to hour

  const totalDeathsOneWeek = matchIds.reduce((accum, curr) => {
    const match = matchDetailMap[curr];
    const participantFeeder = match.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.deaths;
  }, 0);

  const totalKillsOneWeek = matchIds.reduce((accum, curr) => {
    const match = matchDetailMap[curr];
    const participantFeeder = match.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.kills;
  }, 0);

  const totalAssistsOneWeek = matchIds.reduce((accum, curr) => {
    const match = matchDetailMap[curr];
    const participantFeeder = match.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.assists;
  }, 0);

  const totalImpactScoreOneWeek = matchIds.reduce((accum, curr) => {
    const match = matchDetailMap[curr];
    const participantFeeder = match.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    );
    return accum + participantFeeder.timeCCingOthers;
  }, 0);

  const totalTeamKillsOneWeek = matchIds.reduce((accum, curr) => {
    const match = matchDetailMap[curr];
    const feederTeamId = match.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    ).teamId;

    const teamKillCount = match.info.participants.reduce(
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

  const totalEnemyKillsOneWeek = matchIds.reduce((accum, curr) => {
    const match = matchDetailMap[curr];
    const feederTeamId = match.info.participants.find(
      (participant) => participant.puuid === feeder.puuid
    ).teamId;

    const teamKillCount = match.info.participants.reduce(
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
    gamesPlayedOneWeek: matchIds.length,
    avgImpactScoreOneWeek: Math.trunc(
      totalImpactScoreOneWeek / matchIds.length
    ),
    deathParticipationPercentageOneWeek:
      totalDeathsOneWeek / totalEnemyKillsOneWeek,
    killParticipationPercentageOneWeek:
      (totalKillsOneWeek + totalAssistsOneWeek) / totalTeamKillsOneWeek,
  };
};

const assignLeagueRoutes = (app) => {
  // Endpoints
  app.get("/api/feeders", async (req, res) => {
    const allFeeders = await Feeder.find({});
    const feedersToForceFetch = req.query.ids ? req.query.ids.split(",") : [];

    const feedersToFetch = allFeeders
      .map((feeder) => ({
        puuid: feeder.puuid,
        name: feeder.name,
        lastFetched: feeder.lastFetched,
      }))
      .filter(({ puuid }) => feedersToForceFetch.includes(puuid));

    const riotProfilesPromise = Promise.all(
      feedersToFetch.map((feeder, i) =>
        promiseWithTimeout(() => getRiotProfile(feeder), 1000 + (i + 1) * 1000)
      )
    );

    const matchIdsByPuuidListPromise = Promise.all(
      feedersToFetch.map((feeder, i) =>
        promiseWithTimeout(
          () => getAllMatchesWithinOneWeek(feeder),
          1000 + (i + 1) * 1000
        )
      )
    );

    const matchDetailMapPromise = matchIdsByPuuidListPromise
      .then(getMatchDetails)
      .then(convertToMatchDetailMap);

    const [matchIdsByPuuidList, matchDetailMap, riotProfiles] =
      await Promise.all([
        matchIdsByPuuidListPromise,
        matchDetailMapPromise,
        riotProfilesPromise,
      ]);
    const parsedFeederDetails = matchIdsByPuuidList.map((matchIdsByPuuid) =>
      parseMatchDetails(matchIdsByPuuid, matchDetailMap)
    );

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
  app.post("/api/feeder", async (req, res) => {
    const feedersCount = await Feeder.count({});

    if (feedersCount >= MAX_NUMBER_OF_FEEDERS) {
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

    const result = await getRiotProfile(req.body.name);

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

    res.json({ id: newFeederProfile.puuid });
  });

  // Remove feeders from the list
  app.delete("/api/feeders", async (req, res) => {
    await Feeder.deleteMany({ puuid: { $in: req.body.ids } });
    res.json({});
  });
};

export default assignLeagueRoutes;
