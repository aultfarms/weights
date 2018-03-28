
import { Module } from 'cerebral';

import * as signals from './sequences';

export default Module({
  signals,
  state: {
    records: [
      // {
      //   date: 2018-03-17,
      //   tags: [ { number: 123, color: 'ORANGE' }],
      //   id: '02kjlwfj0f23',                // ID of the card
      //   idList: '2fj0ijosdf',              // ID of the dead list
      //   cardName: '2018-03-17: ORANGE123', // original card, for debugging
      //   dateLastActivity: '2018-03-17',    // for sorting by "recent"-ness
      // },
    ]
  }

});
//# sourceMappingURL=index.js.map