
import { Module } from 'cerebral';

import { treatmentCodes, colors } from './defaults';
import * as signals from './sequences';

export default Module({
  signals,
  state: {
    treatmentCodes,
    colors,
    records: [
      // {
      //   date: 2018-03-17,
      //   treatment: 'DrExHt',
      //   tags: [
      //     { number: 123, color: 'ORANGE' }
      //   ]
      // },
    ],
  },

});
