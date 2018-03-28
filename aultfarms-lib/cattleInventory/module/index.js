import { Module } from 'cerebral';
import * as signals from './sequences';

export default Module({
  signals,
  state: {
    ready: false,
    in: [],
    out: [],
    buyContracts: [],
    sellContracts: [],
    dead: []
  }
});
//# sourceMappingURL=index.js.map