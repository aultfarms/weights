import { Module } from 'cerebral';
import { processCards, init }  from './sequences';

const signals = {
  init,
  processCards,
};

export default Module(m => {
  return {
    state: {
      ignoreBefore: '2017-11-01', // ignore all deliveries before this date for checking paid/invoiced/trucking status
      ready: false,
      deliveries: [],
      notPaidFor: {},
      notInvoiced: {},
      truckingNotPaid: {},
    },
  
    signals,

  };
});

