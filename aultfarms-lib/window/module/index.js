import { Module } from 'cerebral';
import * as signals from './sequences';

export default Module({
  signals,
  state: {
    isSmall: true, // changes to true for mobile, false for computer
    orientation: 'portrait' // portrait | landscape
  }

});
//# sourceMappingURL=index.js.map