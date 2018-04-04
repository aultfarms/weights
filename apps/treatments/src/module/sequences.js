import { set } from 'cerebral/operators';
import { state,props } from 'cerebral/tags';

import * as treatments from 'aultfarms-lib/treatments/module/sequences';

export const showTreatmentEditor = [ set(state`treatmentEditorActive`,true)  ];
export const hideTreatmentEditor = [ set(state`treatmentEditorActive`,false) ];

export const historySelectionChangeRequested = [ set(state`historySelector.active`, props`active`), ];
export const historyGroupSortClicked = [ set(state`historyGroup.sort`, props`sort`) ];

export const recordUpdateRequested = [ updateRecord, updateMsg ];
export const logoutClicked = [ trello.deauthorize, trello.authorize];

export const recordSaveClicked = [ 
  set(props`record`, state`record`),
  set(state`recordsValid`, false),
  updateMsg,
  feed.saveTreatment,
  feed.fetch,
  set(state`recordsValid`, true),
  updateMsg,
];

export const init = [
  trello.authorize,
  parallel([
    treatments.fetch,
    treatments.fetchConfig,
    incoming.fetch,
    dead.fetch,
  ]),
  computeStats
];
