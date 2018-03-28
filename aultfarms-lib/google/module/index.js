import { Module } from 'cerebral';
import * as signals from './sequences';

export default Module(m => {
  return {
    state: {
      authorized: false,
      sheets: {}
    },

    signals

    // assumes global 'google' provider exists in controller
  };
});
//# sourceMappingURL=index.js.map