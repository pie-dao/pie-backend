import { createConnection, Repository, Connection } from 'typeorm';
import {Coin} from './entities/coin';
import { Candle } from './entities/candle';
import { Price } from './entities/price';

let connection: Connection;
let coinsRepo: Repository<Coin>;
let candleRepo: Repository<Candle>;
let pricesRepo: Repository<Price>;


export const connectDB = async () => {
    connection = await createConnection();
    coinsRepo = connection.getRepository(Coin);
    candleRepo = connection.getRepository(Candle);
    pricesRepo = connection.getRepository(Price);
};

const getRepos = () => {
    return {
        coinsRepo,
        candleRepo,
        pricesRepo
    }
}

export const db = {
    getRepos
}