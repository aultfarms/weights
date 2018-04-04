import { set } from 'cerebral/operators';
import { state,props } from 'cerebral/tags';

export const showTreatmentEditor = [ set(state`treatmentEditorActive`,true)  ];
export const hideTreatmentEditor = [ set(state`treatmentEditorActive`,false) ];

export const historySelectionChangeRequested = [ set(state`historySelector.active`, props`active`), ];


    recordUpdateRequested: {
      chain: [ updateRecord, updateMsg ],
      immediate: true,
    },


