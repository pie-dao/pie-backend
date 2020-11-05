import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Coin {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    symbol: string;

    @Column()
    name: string;

    @Column()
    coingeckoId: string;
}