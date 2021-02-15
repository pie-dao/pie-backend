const csv = require('csv-parser')
const fs = require('fs')
const CoinGecko = require('coingecko-api');
var { jStat } = require('jstat');
const path = require('path');
import * as _ from 'lodash';

const round = (num) => Math.round(num * 100) / 100;

export class IndexCalculator {

    public dataSet: Array<any>;
    public cumulativeUnderlyingMCAP: number;
    private maxWeight: number;
    private sentimentWeightInfluence: number;
    private marketWeightInfluence: number;
    private _api: any;

    constructor() {
        this.dataSet = [];
        this.maxWeight = 0.20;
        this.sentimentWeightInfluence = 0.2;
        this.marketWeightInfluence = 1 - this.sentimentWeightInfluence;
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
                name: 'NFTX',
                coingeckoId: 'nftx',
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
            
        ]

        for (const token of tokens) {
            console.log(`Fetchin ${token.coingeckoId} ...`)

            let jsonSnapshot = require(path.resolve(__dirname, `../data/coins/${token.coingeckoId}.json`));

            if(jsonSnapshot) {
                this.dataSet.push({
                    ...token,
                    data: jsonSnapshot
                })
                continue;
            }

            let response: any = await this.fetchCoinData(token.coingeckoId);
            this.dataSet.push({
                ...token,
                data: response.data
            })

            let data = JSON.stringify(response.data);
            fs.writeFileSync(path.resolve(__dirname, `../data/coins/${token.coingeckoId}.json`), data);
            console.log('done');
        }
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

    getCorrectRatio(el) {
        if(el.cappedRATIO) {
            return el.cappedRATIO;
        } else if ( el.adjustedRATIO ) {
            return el.adjustedRATIO;
        } else {
            return el.RATIO;
        }
    }

    computeSentimentWeight() {
        let total = 0;
        this.dataSet.forEach(el => {
            total += el.sentimentScore;
        });

        // Calculate Sentiment Weight
        this.dataSet.forEach(el => {
            el.sentimentRATIO = el.sentimentScore/total;
        });

        // Calculate OverAllWeight
        this.dataSet.forEach(el => {
            el.sentimentRATIO = el.sentimentScore/total;
            el.finalWEIGHT = ( this.getCorrectRatio(el) * this.marketWeightInfluence ) + (el.sentimentRATIO * this.sentimentWeightInfluence);
        });


    }

    computeBacktesting() {
        this.dataSet.forEach(el => {
            
            // let prices = el.data.prices.map( o => {
            //     // o[0] Timestamp
            //     // o[1] Value
            //     return o[1];
            // });


            // o[0] Timestamp
            // o[1] Value
            // o[2] ln(price/prev prive)
            for (let i = 0; i < el.data.prices.length; i++) {
                const price = el.data.prices[i][1];

                if( i === 0) {
                    el.data.prices[i].push(0);
                } else {
                    let prePrice = el.data.prices[i-1][1]
                    let ln = Math.log( price /  prePrice)
                    el.data.prices[i].push( ln );
                }
            }
        })

        this.dataSet.forEach(el => {
            let logs = el.data.prices.map( o => {
                return o[2];
            });
            el.VARIANCE = jStat.variance(logs) * logs.length;
            el.STDEV = Math.sqrt(el.VARIANCE)
        })
    }

    compute() {
        this.computeMCAP();
        this.computeWeights();
        this.computeAdjustedWeights();
        this.computeBacktesting();
        this.computeSentimentWeight();

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

        this.dataSet.forEach(el => {
            console.log(`${el.name}: ${el.finalWEIGHT} %`)
        });
    }

}