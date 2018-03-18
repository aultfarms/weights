import { Module } from 'cerebral';
import accountsheet from '../accountsheet';
import checkspaste  from '../checkspaste';

export default Module((name,controller) => {
  return {

    state: { },

    modules: {
      accountsheet,
      checkspaste,
    }
  };
});
