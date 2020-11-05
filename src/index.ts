import 'dotenv/config';
import * as express from 'express';
import { connectDB, db } from './database'
import {importCoinAndCandles} from './controllers/coinPopulator';

const app = express();

//configure application routes
//@GET - dummy api route
//@ts-ignore
app.get('/api', (req, res, next) => {
  res.status(200).json({
    hello: 'World!',
  });
});



app.get('/test', async (req, res) => {
  const { coinsRepo } = db.getRepos();
  const dbRes = await coinsRepo.find({
    where: [
      { coingeckoId: "piedao-defi-smdddall-cap"},
    ]
  });

  res.status(200).json({
    dbRes
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