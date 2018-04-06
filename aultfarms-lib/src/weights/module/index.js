
import { Module } from 'cerebral';

import * as signals from './sequences';

export default Module({
  signals,
  state: {
    records: [
      // {
      //   date: 2018-03-17,
      //   tag: { color: 'ORANGE', number: 2, },
      //   weight: 1470,
      //   group: 'MICH:OCT17-1',
      // },
    ],
  },

});
