const fs = require('fs')
const CoinGecko = require('coingecko-api');
var { jStat } = require('jstat');
const path = require('path');
import * as _ from 'lodash';
import BigNumber from "bignumber.js";

BigNumber.set({ DECIMAL_PLACES: 4, ROUNDING_MODE: 4 })

// if you need 3 digits, replace 1e2 with 1e3 etc.
// or just copypaste this function to your code:
const round = (num, digits=4, base = 10) => {
    return +(Math.round(+(num + `e+${digits}`))  + `e-${digits}`);

    // Method 1
    // let scaling = 10 ** digits;
    // return Math.round((num + Number.EPSILON) * scaling) / scaling;

    //return num.toFixed(digits) * 1;
    //return +num.toFixed(digits);
    // var pow = Math.pow(base, digits);
    // return Math.round(num*pow) / pow;
}

const getDot = (arrA, arrB, row, col) => {
    return arrA[row].map((val, i) => (val * arrB[i][col]))
  .reduce((valA, valB) => valA + valB);
}

const multiplyMatricies = (a, b) => {
    let matrixShape = new Array(a.length).fill(0)
      .map(() => new Array(b[0].length).fill(0));
        return matrixShape.map((row, i) =>
          row.map((val, j) => getDot(a, b, i, j)));
      }

export class IndexCalculator {

    public dataSet: Array<any>;
    public performance: Array<any>;
    public name: string;
    public cumulativeUnderlyingMCAP: number;
    public VARIANCE: number;
    public STDEV: number;
    private maxWeight: number;
    private indexStartingNAV: number; // Calculated in USD
    private sentimentWeightInfluence: number;
    private marketWeightInfluence: number;
    private _api: any;

    constructor(name) {
        this.dataSet = [];
        this.maxWeight = 0.2;
        this.name = name;
        this.performance = [];
        this.indexStartingNAV = 1;
        this.sentimentWeightInfluence = 0.2;
        this.marketWeightInfluence = 1 - this.sentimentWeightInfluence;
        this._api = new CoinGecko();
    }

    async fetchCoinData(id) {
        return this._api.coins.fetchMarketChart(id, {
            days: 30,
            interval: 'daily'
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
            let jsonSnapshot;
            let hasSnapshot = false;

            try {
                jsonSnapshot = await require(path.resolve(__dirname, `../data/coins/${token.coingeckoId}.json`));
                hasSnapshot = true;
            } catch(e) {}

            if(hasSnapshot) {
                this.dataSet.push(jsonSnapshot)
                continue;
            } 

            let response: any = await this.fetchCoinData(token.coingeckoId);
            this.dataSet.push({
                ...token,
                backtesting: {},
                data: response.data
            })

            let data = JSON.stringify(response.data);
            fs.writeFileSync(path.resolve(__dirname, `../data/coins/${token.coingeckoId}.json`), data);
            console.log('done');
        }
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
            //Readeble: el.RATIO = el.AVG_MCAP / this.cumulativeUnderlyingMCAP;
            el.originalRATIO =( (new BigNumber(el.AVG_MCAP)).dividedBy( new BigNumber(this.cumulativeUnderlyingMCAP)) ).toNumber();
            el.RATIO = el.originalRATIO;
        });
    }

    computeAdjustedWeights() {

        let totalLeftover = 0;
        let leftoverMCAP = 0;
        this.dataSet.forEach(el => {
            if(el.originalRATIO > this.maxWeight) {
                el.cappedRATIO = this.maxWeight;
                el.RATIO = this.maxWeight;
                el.leftover = el.originalRATIO - this.maxWeight;
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
                el.adjustedRATIO = el.originalRATIO + el.addedRatio;
                el.RATIO = el.adjustedRATIO;
            }
        });

        let total = 0;
        this.dataSet.forEach(el => {
            total += this.getCorrectRatio(el);
        });
        console.log('TOTAL', total)
    }

    getCorrectRatio(el) {
        return el.RATIO;
    }

    getTokenLastPrice(el) {
        return parseFloat( _.last(el.data.prices)[1] );
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
            el.finalWEIGHT = round( ( el.RATIO * this.marketWeightInfluence ) + (el.sentimentRATIO * this.sentimentWeightInfluence), 4);
            el.RATIO = el.finalWEIGHT;
        });


    }

    computeTokenNumbers() {
        this.dataSet.forEach(el => {
            el.tokenBalance = this.indexStartingNAV * this.getCorrectRatio(el) * this.getTokenLastPrice(el);
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
            
            //Passing true indicates to compute the sample variance.
            el.VARIANCE = jStat.variance(logs, true) * logs.length;
            el.STDEV = Math.sqrt(el.VARIANCE);
            el.backtesting.returns = logs;
        })
    }

    computeCorrelation() {
        for (let i = 0; i < this.dataSet.length; i++) {
            const current = this.dataSet[i];
            for (let k = 0; k < this.dataSet.length; k++) {
                const next = this.dataSet[k];
                let correlation = jStat.corrcoeff(current.backtesting.returns, next.backtesting.returns);
                _.set(current.backtesting, `correlation.${next.name}`, correlation);
            }
        }
    }

    computeCovariance() {

        let matrixC = [];
        let matrixB = [];

        for (let i = 0; i < this.dataSet.length; i++) {
            const current = this.dataSet[i];
            let arr = [];
            for (let k = 0; k < this.dataSet.length; k++) {
                const next = this.dataSet[k];
                let covariance = jStat.covariance(current.backtesting.returns, next.backtesting.returns) * current.backtesting.returns.length;
                _.set(current.backtesting, `covariance.${next.name}`, covariance);
                arr.push(covariance);
            }
            matrixB.push(arr)
        }
        
        //Needs documentation, ask Gab
        let weightsArray = this.dataSet.map( el => el.RATIO);
        weightsArray.forEach(el => matrixC.push([el]));

        let product = multiplyMatricies([ weightsArray ] , matrixB);
        const pieVariance = multiplyMatricies(product, matrixC)[0][0];

        this.VARIANCE = pieVariance;
        this.STDEV = Math.sqrt(pieVariance);
    }

    computeMCTR() {
        let totalContributionGlobal = 0;

        //Calculate first the single marginalContribution
        for (let i = 0; i < this.dataSet.length; i++) {
            const current = this.dataSet[i];
            let tempCalc = 0;
            
            for (let k = 0; k < this.dataSet.length; k++) {
                const next = this.dataSet[k];

                let x = next.RATIO * current.STDEV * next.STDEV * current.backtesting.correlation[next.name];
                tempCalc += x;
            }

            current.marginalContribution = tempCalc * (1/this.STDEV);
            current.totalContribution = current.marginalContribution * current.RATIO;
            totalContributionGlobal += current.totalContribution;
        }

        console.log('totalContributionGlobal', totalContributionGlobal)
        //Then calculate MCTR based on the sum of the total contribution
        for (let i = 0; i < this.dataSet.length; i++) {
            const current = this.dataSet[i];
            current.MCTR = current.totalContribution / totalContributionGlobal;
        }
    }

    computePerformance() {
        //Calculate first the performance of the single coin
        for (let i = 0; i < this.dataSet.length; i++) {
            const el = this.dataSet[i];
            el.performance = [];
            
            // o[0] Timestamp
            // o[1] Value
            // o[2] ln(price/prev prive)
            for (let i = 0; i < el.data.prices.length; i++) {
                const timestamp = el.data.prices[i][0];
                const price = el.data.prices[i][1];
                if(i === 0) {
                    el.performance.push([timestamp, 0])
                    continue;
                }

                const timestampYesterday = el.data.prices[i-1][0];
                const priceYesterday = el.data.prices[0][1];
                const performance = (price - priceYesterday) / priceYesterday;

                el.performance.push([timestampYesterday, performance])
            }
        }

        //Calculate the performance of the index
        for (let i = 0; i < this.dataSet[0].data.prices.length; i++) {
            const timestamp = this.dataSet[0].data.prices[i][0];
            let tempCalc = 0;
            
            for (let k = 0; k < this.dataSet.length; k++) {
                const coin = this.dataSet[k];
                tempCalc += coin.RATIO * coin.performance[i][1];
            }

            this.performance.push([timestamp, tempCalc]);
        }
    }

    async exportCSV() {

        let pricesAll = '';
        let mcapAll = '';
        let performance = '';
        for (let i = 0; i < this.dataSet.length; i++) {
            const el = this.dataSet[i];

            pricesAll += el.name + ',';
            mcapAll += el.name + ',';

            let prices = el.data.prices.map(o => {
                return o[1]
            })

            let mcaps = el.data.market_caps.map(o => {
                return o[1]
            })

            pricesAll += prices+'\n';
            mcapAll += mcaps+'\n';   
        }

        fs.writeFileSync(path.resolve(__dirname, `../data/csv/prices.csv`), pricesAll);
        fs.writeFileSync(path.resolve(__dirname, `../data/csv/mcaps.csv`), mcapAll);

        performance += this.performance.map(o => {
            return o[0]
        }).join() 

        performance += '\n';

        performance += this.performance.map(o => {
            return o[1]
        }).join() 

        fs.writeFileSync(path.resolve(__dirname, `../data/csv/${this.name}-performance.csv`), performance);

    }

    compute() {
        this.computeMCAP();
        this.computeWeights();
        this.computeAdjustedWeights();
        this.computeSentimentWeight();
        this.computeBacktesting();
        this.computeCorrelation();
        this.computeCovariance();
        this.computeMCTR();
        this.computePerformance();
        this.computeTokenNumbers();

        let total = 0;
        this.dataSet.forEach(el => {
            total += this.getCorrectRatio(el);

            let data = JSON.stringify(el);
            fs.writeFileSync(path.resolve(__dirname, `../data/coins/${el.coingeckoId}.json`), data);
        });

        console.log('TOTAL', total);

        let data = JSON.stringify(this);
        fs.writeFileSync(path.resolve(__dirname, `../data/pies/${this.name}.json`), data);

        
        // Check
        if(total < 0.99 || total > 1) {
            //console.log('this.dataSet', this.dataSet)
            //console.log('this.dataSet', this.dataSet)
        }

        console.log('TOTAL', total);

        this.dataSet.forEach(el => {
            console.log(`${el.name}: ${el.RATIO} / ${el.tokenBalance}`)
        });

        this.exportCSV();
    }

}