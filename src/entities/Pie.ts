import {Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable} from "typeorm";
import { findOrInsert } from "../controllers/coinPopulator";
import { db } from "../database";
import { Weight } from "./Weight";

@Entity()
export class Pie {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: false
    })
    isDeployed: boolean;

    @ManyToMany(() => Weight, weight => weight.pies)
    @JoinTable()
    contains: Weight[];
    
}

export async function createPie (_weights: any[]) {
    let weights: Weight[] = [];
    let total = 0;
    _weights.forEach( async entry => {
        total += entry.percentage;
        let coin = await findOrInsert(entry.coingeckoId);

        let w = new Weight();
        w.percentage = entry.percentage;
        w.coin = coin;
        weights.push(w);
    })

    if( total != 100) {
        console.log('Error: weights are not 100', total);
        return false;
    }

    const { weightsRepo, piesRepo } = db.getRepos();
    await weightsRepo.save(weights);

    let pie = new Pie();
    pie.contains = weights;

    await piesRepo.save(pie);

    return pie;
}