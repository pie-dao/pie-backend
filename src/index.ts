import 'dotenv/config';
import * as express from 'express';
import { connectDB, db } from './database';
import { setupScheduler } from './scheduler';
import { importCoinAndCandles } from './controllers/coinPopulator';
import { router as pieRouter } from './controllers/pie/routes';
import { IndexCalculator } from './classes/IndexCalculator';

const app = express();

app.use('/pies', pieRouter);
app.get('/populateCoin/:coingeckoId', importCoinAndCandles);

app.get('/test', async (req, res) => {

  const { piesRepo } = db.getRepos();

  let pies = await piesRepo.find();

  res.status(200).json({
    pies
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

  let idx = new IndexCalculator('PLAY');
  await idx.pullData();
  idx.compute();
})();