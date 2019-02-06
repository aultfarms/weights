import moment from 'moment';
import { set } from 'cerebral/factories';
import { state } from 'cerebral/tags';

import treatmentsModule from 'aultfarms-lib/treatments/module';
import   incomingModule from 'aultfarms-lib/incoming/module';
import       deadModule from 'aultfarms-lib/dead/module';
import    weightsModule from 'aultfarms-lib/weights/module';
import     trelloModule from 'aultfarms-lib/trello/module';
import     googleModule from 'aultfarms-lib/google/module';
import windowSizeModule from 'aultfarms-lib/windowSize/module';

import     trelloProvider from 'aultfarms-lib/trello/provider';
import     googleProvider from 'aultfarms-lib/google/provider';
import windowSizeProvider from 'aultfarms-lib/windowSize/provider';

import * as trelloErrors from 'aultfarms-lib/trello/module/errors';

import * as sequences from './sequences';

export default {
  sequences,
  state: { 
    recordsValid: false,
    date: moment().format('YYYY-MM-DD'),
    tabSelector: {
      active: 'weights', // weights/tag/group/dead
    },
    tagInput: {
      row: 0,
      tag: {
        number: '',
        color: '',
      },
    },
    weightInput: {
      row: 0,
      weight: '',
    },
    limits: {
      light: 1200,
      heavy: 1530,
    },
    msg: {
      type: 'bad',
      text: 'Initializing...',
    },
  },
  modules: {
    treatments: treatmentsModule,
      incoming: incomingModule,
          dead: deadModule,
       weights: weightsModule,
        trello: trelloModule,
        google: googleModule,
    windowSize: windowSizeModule,
  },
  providers: {
        trello: trelloProvider,
        google: googleProvider,
    windowSize: windowSizeProvider,
  },
  catch: [
    [ trelloErrors.TrelloSaveError,      [ set(state`msg`, 'ERROR: failed to save in Trello')      ] ],
    [ trelloErrors.TrelloGetError,       [ set(state`msg`, 'ERROR: failed to get in Trello')       ] ],
    [ trelloErrors.TrelloAuthorizeError, [ set(state`msg`, 'ERROR: failed to authorize in Trello') ] ],
  ],
};

