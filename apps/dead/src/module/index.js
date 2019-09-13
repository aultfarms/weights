import moment from 'moment';
import { set } from 'cerebral/factories';
import { state } from 'cerebral/tags';


import treatmentsModule from 'aultfarms-lib/treatments/module';
import   incomingModule from 'aultfarms-lib/incoming/module';
import       deadModule from 'aultfarms-lib/dead/module';
import     trelloModule from 'aultfarms-lib/trello/module';
import windowSizeModule from 'aultfarms-lib/windowSize/module';

import     trelloProvider from 'aultfarms-lib/trello/provider';
import windowSizeProvider from 'aultfarms-lib/windowSize/provider';

import * as trelloErrors from 'aultfarms-lib/trello/module/errors';

import * as sequences from './sequences';

export default {
  sequences,
  state: { 
    recordsValid: false,
    treatmentEditorActive: false,
    historySelector: {
      active: 'date', // date/tag/group/dead
    },
    historyGroup: {
      sort: 'date', // date/name/dead/perc
    },

    msg: {
      type: 'bad',
      text: 'Treatment record not saved.',
    },

    record: {
      group: {
        /*date: '2019-09-12', // incoming date
         *groupname: 'BKTKY:MAR19-C',
         *...other group things...
         */
      },
      date: moment().format('YYYY-MM-DD'),
      tag: {
        color: '',
        number: 0,
      },
      is_saved: true,
    },

  },
  modules: {
    treatments: treatmentsModule,
      incoming: incomingModule,
          dead: deadModule,
        trello: trelloModule,
    windowSize: windowSizeModule,
  },
  providers: {
        trello: trelloProvider,
    windowSize: windowSizeProvider,
  },
  catch: [
    [ trelloErrors.TrelloSaveError,      [ set(state`msg`, 'ERROR: failed to save in Trello')      ] ],
    [ trelloErrors.TrelloGetError,       [ set(state`msg`, 'ERROR: failed to get in Trello')       ] ],
    [ trelloErrors.TrelloAuthorizeError, [ set(state`msg`, 'ERROR: failed to authorize in Trello') ] ],
  ],
};

