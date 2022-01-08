import express from "express";

import cors from "cors";
import dotenv from "dotenv";

import assignLeagueRoutes from "./routes/league.js";
import assignTftRoutes from "./routes/tft.js";

import "express-async-errors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({ origin: "https://feeder.onrender.com", optionsSuccessStatus: 200 })
);
app.use(express.json());

assignLeagueRoutes(app);
assignTftRoutes(app);

app.use((err, req, res, next) => {
  if (err.message) {
    res.status(400).send({ message: err.message });
  }
  next(err);
});

app.listen(PORT);
