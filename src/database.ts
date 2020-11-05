import { createConnection, Repository, Connection } from 'typeorm';
import {Coin} from './entities/coin';

let connection: Connection;
let coinsRepo: Repository<Coin>;

export const connectDB = async () => {
    connection = await createConnection();
    coinsRepo = connection.getRepository(Coin);
};

const getRepos = () => {
    return {
        coinsRepo
    }
}

export const db = {
    getRepos
}