import { Coin } from './coin';
import {Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToOne, JoinColumn} from "typeorm";
import { Pie } from './Pie';

@Entity()
export class Weight {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "float"})
    percentage: number;

    @OneToOne(() => Coin, {
        eager: true
    })
    @JoinColumn()
    coin: Coin;

    @ManyToMany(() => Pie, pie => pie.contains)
    pies: Pie[];
}