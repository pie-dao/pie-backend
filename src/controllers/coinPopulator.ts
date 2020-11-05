import { db } from '../database';
const CoinGecko = require('coingecko-api');
import { Coin } from '../entities/coin';
import { Candle } from '../entities/candle';

export async function importCoinAndCandles(req, res) {
    try {
    const CoinGeckoClient = new CoinGecko();
    const { coinsRepo, candleRepo } = db.getRepos();
    const coingeckoId = req.params.coingeckoId;
    
    const dbRes = await coinsRepo.find({
        where: [
            { coingeckoId: coingeckoId},
        ]
    });
    
    let coin;
    if( dbRes.length ){
        coin = dbRes[0];
    } else {
        let resApi: any = await CoinGeckoClient.coins.fetch(coingeckoId, {});
        coin = new Coin();
        coin.symbol = resApi.data.symbol;
        coin.name = resApi.data.name;
        coin.coingeckoId = coingeckoId;
        await coinsRepo.save(coin);
        console.log("Coin has been saved");
    }
    
    
    const apiRes = await CoinGeckoClient._request(`/coins/${coingeckoId}/ohlc`, {
        vs_currency: 'usd',
        days: 365,
    });
    
    let candles;
    if(apiRes.success) {
        candles = apiRes.data.map(entry => {
            let timestamp = new Date(entry[0]);
            let open = entry[1];
            let high = entry[2];
            let low = entry[3];
            let close = entry[4];
            
            let candle = new Candle();
            
            candle.open = open;
            candle.high = high;
            candle.low = low;
            candle.close = close;
            candle.timestamp = timestamp;
            candle.coin = coin;
            candle.hash = Buffer.from(JSON.stringify([coin.id, timestamp, open, high, low, close])).toString('base64');
            return candle
        });

        if(candles.length) {
            //console.log(candles);
            candleRepo.save(candles);
        }
    }
    
    console.log(candles)
    res.status(200).json({
        candles
    });

    } catch(e) {
        console.log(e, e.message);
    }
}