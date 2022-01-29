import * as sequences from './sequences';

export default {
  sequences,
  state: {
    ignoreBefore: '2017-11-01', // ignore all deliveries before this date for checking paid/invoiced/trucking status
    ready: false,
    records: [],
    notPaidFor: {},
    notInvoiced: {},
    truckingNotPaid: {},
  },
};

