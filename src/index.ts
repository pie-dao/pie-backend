import { createPie } from './entities/Pie';
import 'dotenv/config';
import * as express from 'express';
import { connectDB } from './database';
import { setupScheduler } from './scheduler';
import { importCoinAndCandles } from './controllers/coinPopulator';

const app = express();

app.get('/populateCoin/:coingeckoId', importCoinAndCandles);

app.get('/test', async (req, res) => {

  let pie = await createPie([
    {
      percentage: 70,
      coingeckoId: 'piedao-defi-large-cap'
    },
    {
      percentage: 30,
      coingeckoId: 'piedao-defi-small-cap'
    },
  ])

  res.status(200).json({
    pie
  });
});

const port: Number = Number(process.env.PORT) || 3000;
const startServer = async () => {
  await app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

(async () => {
  setupScheduler();
  await connectDB();
  await startServer();
})();