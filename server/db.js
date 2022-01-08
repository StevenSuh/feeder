import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const ATLAS_URI = process.env.ATLAS_URI;

// Connection
mongoose.connect(ATLAS_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema
const FeederSchema = new mongoose.Schema(
  {
    // Riot stuff
    puuid: String,
    name: String,

    // League of legends
    hoursPlayedOneWeek: Number,
    gamesPlayedOneWeek: Number,
    avgImpactScoreOneWeek: Number,
    deathParticipationPercentageOneWeek: Number,
    killParticipationPercentageOneWeek: Number,
    lastFetched: Number, // timestamp
  },
  {
    timestamps: true,
  }
);

const TfterSchema = new mongoose.Schema(
  {
    // Riot stuff
    puuid: String,
    name: String,

    // TFT
    hoursPlayedOneWeek: Number,
    gamesPlayedOneWeek: Number,
    lastFetched: Number, // timestamp
  },
  {
    timestamps: true,
  }
);

export const Feeder = mongoose.model("Feeder", FeederSchema);
export const Tfter = mongoose.model("Tfter", TfterSchema);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));

export default db;
