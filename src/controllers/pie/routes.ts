import * as express from 'express';
import { db } from '../../database';
import * as _ from 'lodash';
export const router = express.Router();

// Home page route.
router.get('/', function (req, res) {
  res.send('Pie Router');
})

router.get('/getAll', async function (req, res) {
    const { piesRepo } = db.getRepos();
    let pies = await piesRepo.find();

    let arr: any[] = _.filter(pies, (o) => o.contains.length > 0)
    .map( p => {
        return {
            ...p,
            nav: p.getNav(),
            contains: p.contains.map( c => {
                return {
                    ...c,
                    coin: {
                        ...c.coin,
                        last_price: _.head(c.coin.prices).price
                    }
                }
            })
        }
    });

    res.status(200).json({
        arr
    });
})


