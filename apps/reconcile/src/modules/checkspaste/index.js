import { Module } from 'cerebral';
import _ from 'lodash';

const processPaste = require('converter');

// Checks paste
export default Module(({name,path,controller}) => {
  return {

    state: {
      pasted: '',
      processed: [],
    },

    signals: {
      pasteTextChanged: [ 
        ({state,props}) => {
          state.set(`${path}.pasted`, props.pasted);
          state.set(`${path}.processed`, processPaste(props.pasted));
        },
      ],
    },

  };

});
