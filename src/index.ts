import 'dotenv/config';
import * as express from 'express';
import { connectDB, db } from './database'
import { Coin } from './entities/coin';

const CoinGecko = require('coingecko-api');

const app = express();

//configure application routes
//@GET - dummy api route
//@ts-ignore
app.get('/api', (req, res, next) => {
  res.status(200).json({
    hello: 'World!',
  });
});

app.get('/populateCoin/:coingeckoId', async (req, res) => {
  const CoinGeckoClient = new CoinGecko();
  let resApi: any = await CoinGeckoClient.coins.fetch(req.params.coingeckoId, {});
  const { coinsRepo } = db.getRepos();
  
  let coin = new Coin();
  coin.symbol = resApi.data.symbol;
  coin.name = resApi.data.name;
  coin.coingeckoId = req.params.coingeckoId;
  await coinsRepo.save(coin);
  console.log("Coin has been saved");

  const all = await coinsRepo.find();

  res.status(200).json({
    id: req.params.coingeckoId,
    all 
  });
});

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