import 'dotenv/config';
import * as express from 'express';
import { connectDB } from './database'
import { importCoinAndCandles } from './controllers/coinPopulator';
import { RSI } from './controllers/taUtils';

const app = express();

//configure application routes
//@GET - dummy api route
//@ts-ignore
app.get('/api', (req, res, next) => {
  res.status(200).json({
    stay: 'crusty!',
  });
});

app.get('/test', async (req, res) => {
  const coin = await RSI(4);
  res.status(200).json({
    coin
  });
});

app.get('/populateCoin/:coingeckoId', importCoinAndCandles);

const port: Number = Number(process.env.PORT) || 3000;
const startServer = async () => {
  await app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

(async () => {
  await connectDB();
  await startServer();
})();