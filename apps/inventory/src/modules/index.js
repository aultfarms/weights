import { Module, sequence } from 'cerebral';

import trelloProvider from 'aultfarms-lib/providers/trello';
import trelloModule from 'aultfarms-lib/trello/module';
import { authorize as authorizeTrello } from 'aultfarms-lib/trello/module/sequences';

import googleProvider from 'aultfarms-lib/google/provider';
import googleModule from 'aultfarms-lib/google/module';
import { authorize as authorizeGoogle } from 'aultfarms-lib/google/module/sequences';

import livestockModule from 'aultfarms-lib/livestock/module';
import { init as livestockInit } from 'aultfarms-lib/livestock/module/sequences';

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
