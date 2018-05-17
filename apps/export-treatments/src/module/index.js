import moment from 'moment';
import { Module } from 'cerebral';
import { set } from 'cerebral/operators';
import { state } from 'cerebral/tags';

import treatmentsModule from 'aultfarms-lib/treatments/module';
import   incomingModule from 'aultfarms-lib/incoming/module';
import       deadModule from 'aultfarms-lib/dead/module';
import     trelloModule from 'aultfarms-lib/trello/module';
import windowSizeModule from 'aultfarms-lib/windowSize/module';

import     trelloProvider from 'aultfarms-lib/trello/provider';
import windowSizeProvider from 'aultfarms-lib/windowSize/provider';

import * as trelloErrors from 'aultfarms-lib/trello/module/errors';

import * as signals from './sequences';

export default Module({
  signals,
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
      date: moment().format('YYYY-MM-DD'),
      treatment: 'NoExHt',
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
});

