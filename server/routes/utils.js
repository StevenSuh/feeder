import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

export const promiseWithTimeout = (promiseFn, delay = 1000) =>
  new Promise((resolve, reject) =>
    setTimeout(() => promiseFn().then(resolve).catch(reject), delay)
  );

export const fetchRiotWithDelay = (url, delay = 1000) =>
  promiseWithTimeout(
    () =>
      fetch(url, { headers: { "X-Riot-Token": RIOT_API_KEY } }).then(
        async (res) => {
          const data = await res.json();
          return { ok: res.ok, data };
        }
      ),
    delay
  );

export const MAX_NUMBER_OF_FEEDERS = 10;

export const getRiotProfile = (name) =>
  fetchRiotWithDelay(
    `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}`
  );
