import { createConnection, Repository, Connection } from 'typeorm';
import {Coin} from './entities/coin';
import { Candle } from './entities/candle';

let connection: Connection;
let coinsRepo: Repository<Coin>;
let candleRepo: Repository<Candle>;

export const connectDB = async () => {
    connection = await createConnection();
    coinsRepo = connection.getRepository(Coin);
    candleRepo = connection.getRepository(Candle);
};

const getRepos = () => {
    return {
        coinsRepo,
        candleRepo
    }
}

export const db = {
    getRepos
}