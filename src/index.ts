import 'dotenv/config';
import * as express from 'express';
import { connectDB } from './database';
import { setupScheduler } from './scheduler';
import { importCoinAndCandles, storePricesCoins } from './controllers/coinPopulator';

const app = express();

//configure application routes
//@GET - dummy api route
//@ts-ignore
app.get('/api', (req, res, next) => {
  res.status(200).json({
    stay: 'crusty!',
  });
});

app.get('/test', storePricesCoins);

app.get('/populateCoin/:coingeckoId', importCoinAndCandles);

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