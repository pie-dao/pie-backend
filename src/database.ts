import { Weight } from './entities/Weight';
import { Pie } from './entities/Pie';
import { createConnection, Repository, Connection } from 'typeorm';
import {Coin} from './entities/coin';
import { Candle } from './entities/candle';
import { Price } from './entities/price';

let connection: Connection;
let coinsRepo: Repository<Coin>;
let candleRepo: Repository<Candle>;
let pricesRepo: Repository<Price>;
let piesRepo: Repository<Pie>;
let weightsRepo: Repository<Weight>;


export const connectDB = async () => {
    connection = await createConnection();
    coinsRepo = connection.getRepository(Coin);
    candleRepo = connection.getRepository(Candle);
    pricesRepo = connection.getRepository(Price);
    piesRepo = connection.getRepository(Pie);
    weightsRepo = connection.getRepository(Weight);
};

const getRepos = () => {
    return {
        coinsRepo,
        candleRepo,
        pricesRepo,
        piesRepo,
        weightsRepo
    }
}

export const db = {
    getRepos
}