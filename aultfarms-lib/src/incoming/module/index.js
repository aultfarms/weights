
import { Module } from 'cerebral';

import * as signals from './sequences';

export default Module({
  signals,
  state: {
    records: [
      // {
      //   date: 2018-03-17,
      //   groupname: 'MICH:MAR18-1',
      //   weight: '274.35',
      //   head: 250,
      //   tags: [ 
      //     { 
      //       start: { number: 123, color: 'ORANGE' }, // NOTE: a color split will
      //       end: { number: 372, color: 'ORANGE' },   // show up as multiple ranges
      //     },
      //   ],
      //   id: 'kf2jlk', // ID of card
      //   idList: '29ifjkl', // ID of Incoming list in Trello
      //   cardName: '2018-03-17: MICH:MAR18-1; Head: 250; Weight: 274.35; Tags: ORANGE123-ORANGE372;',
      // },
    ],
  },

});
