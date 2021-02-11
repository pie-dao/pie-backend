const csv = require('csv-parser')
const fs = require('fs')
import * as _ from 'lodash';


export class IndexCalculator {

    public dataSet: Array<any>;
    public cumulativeUnderlyingMCAP: number;
    private maxWeight: number;

    constructor() {
        this.dataSet = [];
        this.maxWeight = 0.2;
    }
    
    async importCSV(path: string) {
        return new Promise((resolve, reject) => {
            const rawData = [];
            fs.createReadStream(path)
            .pipe(csv())
            .on('data', (data) => rawData.push(data))
            .on('end', () => {
            //console.log(rawData);
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
            console.log(el)
            let marketCap = _.toArray(el.data);
            console.log(marketCap)
            el.MIN_MCAP = Math.min(...marketCap);
            el.MAX_MCAP = Math.max(...marketCap);
            el.AVG_MCAP = marketCap.reduce((a,b) => a + b, 0) / marketCap.length;
        })

        this.cumulativeUnderlyingMCAP = this.dataSet.reduce((a,b) => a + b.AVG_MCAP, 0);
    }

    computeWeights() {
        this.dataSet.forEach(el => {
            el.RATIO = el.AVG_MCAP / this.cumulativeUnderlyingMCAP;
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

        console.log('this.dataSet', this.dataSet)
        console.log('totalLeftover', totalLeftover)
        console.log('leftoverMCAP', leftoverMCAP)

        
    }

    compute() {
        this.computeMCAP();
        this.computeWeights();
        this.computeAdjustedWeights();
    }

}