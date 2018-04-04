import { Module } from 'cerebral';

import treatmentsModule from 'aultfarms-lib/treatments/module';
import   incomingModule from 'aultfarms-lib/incoming/module';
import       deadModule from 'aultfarms-lib/dead/module';
import     trelloModule from 'aultfarms-lib/trello/module';
import windowSizeModule from 'aultfarms-lib/windowSize/module';

import     trelloProvider from 'aultfarms-lib/trello/provider';
import windowSizeProvider from 'aultfarms-lib/windowSize/provider';

import * as signals from './sequences';

export default Module({
  signals,
  state: { 
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

    treatmentCodes,
    colors,

    records: {
      treatments: [],
      dead: [],
      incoming: [],
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
});



  module.addSignals({

    recordSaveClicked: [ 
      recordToTreatmentCardOutput,
      set('state:app.trello.treatmentcardsValid', false),
      [ // async:
        putTreatmentCardName, {
          fail: [ msgFail('Could not put card to Trello!') ],
          success: [ 
            set('state:app.record.is_saved', true),
            set('state:app.record.tag.number', ''),
            set('state:app.historySelector.active', 'date'),
            msgSuccess('Saved card - wait for card list refresh'),
            chainFetchCards('treatments'),
          ],
        },
      ],
    ],

    authorizationNeeded: [ chainDoAuthorization ], // async, so don't ...expand
    logoutClicked: [ 
      ({state,services}) => { state.set('app.trello.authorized', false); services.trello.deauthorize(); },
      chainDoAuthorization,
    ],

    historyGroupSortClicked: [ copy('input:sort', 'state:app.historyGroup.sort') ],

  });
}
