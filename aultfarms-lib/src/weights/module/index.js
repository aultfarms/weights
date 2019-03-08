import * as sequences from './sequences';

export default {
  sequences,
  state: {
    filters: {
      heavy: {
        limit: 1500,
        count: 0,
      },
    },
    stats: {
           ALL: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
          SELL: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
         HEAVY: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
          KEEP: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
          JUNK: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
      SPECIAL1: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
    },
    records: [
      // {
      //   date: 2018-03-17,
      //   tag: { color: 'ORANGE', number: 2, },
      //   weight: 1470,
      //   group: 'MICH:OCT17-1',
      //   sort: SELL | HEAVY | KEEP | JUNK | SPECIAL1
      // },
    ],
  },

};
