import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

const rows = [
  {
    id: 1,
    feederName: 'jerry',
    hoursPlayedOneWeek: 2,
    gamesPlayedOneWeek: 4,
    totalDeathsOneWeek: 0,
    killParticipationPercentageOneWeek: 0.95,
    createdAt: 1641556721028,
  },
  {
    id: 2,
    feederName: 'jerrry',
    hoursPlayedOneWeek: 2,
    gamesPlayedOneWeek: 4,
    totalDeathsOneWeek: 0,
    killParticipationPercentageOneWeek: 0.99,
    createdAt: 1631556701028,
  },
  {
    id: 3,
    feederName: 'jerrrry',
    hoursPlayedOneWeek: 2,
    gamesPlayedOneWeek: 4,
    totalDeathsOneWeek: 0,
    killParticipationPercentageOneWeek: 0.99,
    createdAt: 1621556521028,
  },
  {
    id: 4,
    feederName: 'jerrrrry',
    hoursPlayedOneWeek: 2,
    gamesPlayedOneWeek: 4,
    totalDeathsOneWeek: 0,
    killParticipationPercentageOneWeek: 0.99,
    createdAt: 1601555721028,
  },
];

// Have Node serve the files for our built React app
app.use(express.static(path.resolve('../build')));

// Endpoints
app.get('/api/feeders', (_req, res) => {
  res.json(rows);
});

app.post('/api/feeder', (_req, res) => {
  res.status(400).send({ message: 'bad' });
});

app.delete('/api/feeders', (_req, res) => {
  res.status(400).send({ message: 'bad' });
});

// All other GET requests not handled before will return our React app
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
