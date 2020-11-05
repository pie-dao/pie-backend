import { Candle } from './candle';
import {Entity, PrimaryGeneratedColumn, Column, OneToMany} from "typeorm";

@Entity()
export class Coin {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
    })
    symbol: string;

    @Column({
        unique: true,
        nullable: true
    })
    contractAddress: string;

    @Column()
    name: string;

    @Column({
        unique: true,
    })
    coingeckoId: string;

    @OneToMany(() => Candle, candle => candle.coin)
    candles: Candle[]
}