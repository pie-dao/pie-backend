import 'dotenv/config';
import * as express from 'express';
import { connectDB, db } from './database';
import { setupScheduler } from './scheduler';
import { importCoinAndCandles } from './controllers/coinPopulator';
import { router as pieRouter } from './controllers/pie/routes';
import { IndexCalculator } from './classes/IndexCalculator';

const app = express();

// const defil = [
//   {
//     name: "COMP",
//     "coingeckoId": "compound-governance-token",
//     sentimentScore: 44,
//     RATIO: 0.1768
//   },
//   {
//     name: "Aave",
//     "coingeckoId": "aave",
//     sentimentScore: 66,
//     RATIO: 0.0488
//   },
//   {
//     name: "UNI",
//     "coingeckoId": "uniswap",
//     sentimentScore: 60,
//     RATIO: 0.0209
//   },
//   {
//     name: "LINK",
//     "coingeckoId": "chainlink",
//     sentimentScore: 54,
//     RATIO: 0.0126
//   },
//   {
//     name: "MKR",
//     "coingeckoId": "maker",
//     sentimentScore: 46,
//     RATIO: 0.2833
//   },
//   {
//     name: "SNX",
//     "coingeckoId": "havven",
//     sentimentScore: 58,
//     RATIO: 0.0151
//   },
//   {
//     name: "YFI",
//     "coingeckoId": "yearn-finance",
//     sentimentScore: 71,
//     RATIO: 0.0316
//   },
//   {
//     name: "SUSHI",
//     "coingeckoId": "sushi",
//     sentimentScore: 61,
//     RATIO: 0.4106
//   }
// ]

let play = [
  {
      name: 'MANA',
      coingeckoId: 'decentraland',
      sentimentScore: 48
  },
  {
      name: 'ENJ',
      coingeckoId: 'enjincoin',
      sentimentScore: 52
  },
  {
      name: 'RFOX',
      coingeckoId: 'redfox-labs-2',
      sentimentScore: 45
  },
  {
      name: 'SAND',
      coingeckoId: 'the-sandbox',
      sentimentScore: 44
  },
  {
      name: 'AXS',
      coingeckoId: 'axie-infinity',
      sentimentScore: 43
  },
  {
      name: 'MUST',
      coingeckoId: 'must',
      sentimentScore: 46
  },
  {
      name: 'ATRI',
      coingeckoId: 'atari',
      sentimentScore: 41
  },
  {
      name: 'GHST',
      coingeckoId: 'aavegotchi',
      sentimentScore: 48
  },
  {
    name: 'ULTRA',
    coingeckoId: 'ultra',
    sentimentScore: 41
  },
  {
    name: 'FUN',
    coingeckoId: 'funfair',
    sentimentScore: 38
  },
]

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

  let idx = new IndexCalculator('PLAY-xed');
  await idx.pullData(false, play);
  idx.compute();

  //idx.optimizeSharpe();
  
  // idx.computeMCAP();
  // idx.computeBacktesting();
  // idx.computeCovariance();
  // idx.computeCorrelation();
  // idx.computeMCTR();
  // idx.computePerformance();
  // idx.computeTokenNumbers();
  // idx.computeSharpeRatio();
  // idx.saveModel();
})();