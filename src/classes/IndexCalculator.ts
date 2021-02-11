const csv = require('csv-parser')
const fs = require('fs')
const CoinGecko = require('coingecko-api');
import * as _ from 'lodash';

const round = (num) => Math.round(num * 100) / 100;

export class IndexCalculator {

    public dataSet: Array<any>;
    public cumulativeUnderlyingMCAP: number;
    private maxWeight: number;
    private _api: any;

    constructor() {
        this.dataSet = [];
        this.maxWeight = 0.20;
        this._api = new CoinGecko();
    }

    async fetchCoinData(id) {
        return this._api.coins.fetchMarketChart(id, {
            days: 30,
        });
    }

    async pullData() {
        
        let tokens = [
            {
                name: 'MANA',
                coingeckoId: 'decentraland',
            },
            {
                name: 'ENJ',
                coingeckoId: 'enjincoin',
            },
            {
                name: 'RFOX',
                coingeckoId: 'redfox-labs-2',
            },
            {
                name: 'SAND',
                coingeckoId: 'the-sandbox',
            },
            {
                name: 'AXS',
                coingeckoId: 'axie-infinity',
            },
            {
                name: 'NFTX',
                coingeckoId: 'nftx',
            },
            {
                name: 'ATRI',
                coingeckoId: 'atari',
            },
            {
                name: 'GHST',
                coingeckoId: 'aavegotchi',
            },
            
        ]

        for (const token of tokens) {
            console.log(`Fetchin ${token.coingeckoId} ...`)
            let response: any = await this.fetchCoinData(token.coingeckoId);
            this.dataSet.push({
                ...token,
                data: response.data
            })
            console.log('done');
        }

        console.log('this.dataSet', this.dataSet)
    }
    
    async importCSV(path: string) {
        return new Promise((resolve, reject) => {
            const rawData = [];
            fs.createReadStream(path)
            .pipe(csv())
            .on('data', (data) => rawData.push(data))
            .on('end', () => {
            rawData.map( row => {
                let purged = {
                    name: row.Token,
                    coingeckoId: row.TRUE,
                    data: _.omit(row, ['Token', 'TRUE', 'Data refresh', '30days average MCAP', 'rolling'])
                }

                let parsedData = {} 
                
                _.forOwn(purged.data, (value, key) => {
                    if(key !== '' && value !== '') {
                        parsedData[key] = parseFloat(value);
                    }
                })

                purged.data = parsedData;
                this.dataSet.push(purged);
            })
            resolve(true);
        });
        })
    }

    computeMCAP() {
        this.dataSet.forEach(el => {
            
            let marketCap = el.data.market_caps.map( o => {
                // o[0] Timestamp
                // o[1] Value
                return o[1];
            })
            el.MIN_MCAP = Math.min(...marketCap);
            el.MAX_MCAP = Math.max(...marketCap);
            el.AVG_MCAP = marketCap.reduce((a,b) => a + b, 0) / marketCap.length;
        })

        this.cumulativeUnderlyingMCAP = this.dataSet.reduce((a,b) => a + b.AVG_MCAP, 0);
    }

    computeWeights() {
        this.dataSet.forEach(el => {
            el.RATIO = round(el.AVG_MCAP / this.cumulativeUnderlyingMCAP);
        });
    }

    computeAdjustedWeights() {

        let totalLeftover = 0;
        let leftoverMCAP = 0;
        this.dataSet.forEach(el => {
            if(el.RATIO > this.maxWeight) {
                el.cappedRATIO = this.maxWeight;
                el.leftover = el.RATIO - this.maxWeight;
                el.CAPPED = true;
                el.ADJUSTED = false;
                totalLeftover += el.leftover;
            } else {
                el.CAPPED = false;
                el.ADJUSTED = true;
                leftoverMCAP += el.AVG_MCAP;
            }
        });

        this.dataSet.forEach(el => {
            if(el.ADJUSTED) {
                el.relativeToLeftoverRATIO = el.AVG_MCAP / leftoverMCAP;
                el.adjustedMarketCAP = el.relativeToLeftoverRATIO * totalLeftover * this.cumulativeUnderlyingMCAP;
                el.addedRatio = el.adjustedMarketCAP / this.cumulativeUnderlyingMCAP;
                el.adjustedRATIO = el.RATIO + el.addedRatio;
            }
        });
    }

    compute() {
        this.computeMCAP();
        this.computeWeights();
        this.computeAdjustedWeights();

        let total = 0;
        this.dataSet.forEach(el => {
            if(el.ADJUSTED) {
                total += el.adjustedRATIO;
            } else {
                total += el.cappedRATIO;
            }
        });

        console.log('this.dataSet', this.dataSet)
        // Check
        if(total < 0.99 || total > 1) {
            console.log('this.dataSet', this.dataSet)
            console.log('TOTAL', total);
        }
    }

}