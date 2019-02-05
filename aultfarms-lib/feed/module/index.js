'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sequences = require('./sequences');

var sequences = _interopRequireWildcard(_sequences);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.default = {
  sequences: sequences,
  state: {
    ignoreBefore: '2017-11-01', // ignore all deliveries before this date for checking paid/invoiced/trucking status
    ready: false,
    records: [],
    notPaidFor: {},
    notInvoiced: {},
    truckingNotPaid: {}
  }
};
//# sourceMappingURL=index.js.map