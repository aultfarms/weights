import { Module } from 'cerebral';

export default Module((name,controller) => {
  return {

    state: {
      loaded: false,
    },
  };

});
