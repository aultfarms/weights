import { Module, sequence } from 'cerebral';

import trelloProvider from '../../providers/trello';
import trelloModule from '../trello';
import { authorize as authorizeTrello } from '../trello/sequences';

import googleProvider from '../../providers/google';
import googleModule from '../google';
import { authorize as authorizeGoogle } from '../google/sequences';

import livestockModule from '../livestock';
import { init as livestockInit } from '../livestock/sequences';

export default Module((name,controller) => {
  return {

    state: { },

    signals: {
      init: [
        sequence('app.init->trello.authorize', authorizeTrello),
        sequence('app.init->google.authorize', authorizeGoogle),
        sequence('app.init->livestock.init', livestockInit),
      ],
    },

    modules: {
      trello: trelloModule,
      livestock: livestockModule,
      google: googleModule,
    },

    providers: {
      trello: trelloProvider,
      google: googleProvider,
    },

  };
});
