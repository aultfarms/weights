import _ from 'lodash';
import moment from 'moment';
import { set } from 'cerebral/operators';
import { state,props } from 'cerebral/tags';
import { sequence, parallel } from 'cerebral';

import * as treatments from 'aultfarms-lib/treatments/module/sequences';
import * as incoming   from 'aultfarms-lib/incoming/module/sequences';
import * as dead       from 'aultfarms-lib/dead/module/sequences';
import * as weights    from 'aultfarms-lib/weights/module/sequences';
import * as trello     from 'aultfarms-lib/trello/module/sequences';
import * as google     from 'aultfarms-lib/google/module/sequences';
import * as windowSize from 'aultfarms-lib/windowSize/module/sequences';
import { groupForTag } from 'aultfarms-lib/util/tagHelpers';


//------------------------------------------------------
// Help for scrolling:
const scrollToTag = () => {
  const el = document.getElementById('tagScrollToMe');
  if (el) el.scrollIntoView();
};
const scrollToWeight = () => {
  const el = document.getElementById('weightScrollToMe');
  if (el) el.scrollIntoView();
};


//-------------------------------------------------------
// Misc view functions
export const changeTab = [ set(state`tabSelector.active`, props`active`), ];
export const tabGroupSortClicked = [ set(state`tabGroup.sort`, props`sort`) ];
export const logout = [ trello.deauthorize, trello.authorize];

//-------------------------------------------------------
// Changing values
export const changeLightLimit = sequence('changeLightLimit', [ set(state`limits.light`, props`light`) ]);
export const changeHeavyLimit = sequence('changeHeavyLimit', [ set(state`limits.heavy`, props`heavy`) ]);
export const   changeDate = sequence('changeDate',  [ 
  set(state`date`, props`date`),
]);
export const loadWeightsForDate = sequence('loadWeightsForDate', [
  set(props`date`, state`date`),
  weights.clearCache,
  weights.fetch,
]);
export const changeWeight = sequence('changeWeight',[ set(state`weightInput.weight`, props`weight`), scrollToWeight ]);
export const    changeTag = sequence('changeTag',   [ 
  ({props,store}) => {
    if (typeof props.tag.number !== 'undefined') store.set(state`tagInput.tag.number`, +(props.tag.number));
    if (props.tag.color)  store.set(state`tagInput.tag.color`, props.tag.color);
  }, 
  scrollToTag
]); // tag, number
export const changeOut = sequence('changeOut', [
  set(state`msg`, { type: 'bad', text: 'Saving out change...' }),
  ({props,store}) => store.set(state`weights.records.${props.row}.out`, props.checked),
  weights.saveRecordRow, // props: row, will pull record from state
  set(state`msg`, { type: 'good', text: 'Out change saved' }),
]);
export const changeOut2 = sequence('changeOut2', [
  set(state`msg`, { type: 'bad', text: 'Saving out2 change...' }),
  ({props,store}) => store.set(state`weights.records.${props.row}.out2`, props.checked),
  weights.saveRecordRow, // props: row, will pull record from state
  set(state`msg`, { type: 'good', text: 'Out2 change saved' }),
]);
export const changeOut3 = sequence('changeOut3', [
  set(state`msg`, { type: 'bad', text: 'Saving out3 change...' }),
  ({props,store}) => store.set(`weights.records.${props.row}.out3`, props.checked),
  weights.saveRecordRow, // props: row, will pull record from state
  set(state`msg`, { type: 'good', text: 'Out3 change saved' }),
]);



function loadInputFromRow({store,props,get}) {
  const row = get(state`${props.whichInput}.row`);
  const numrows = get(state`weights.records`).length;
  if (props.whichInput === 'tagInput') {
    if (row === numrows)
      return store.set(state`tagInput.tag.number`, ''); // new row, reset input
    const tag = get(state`weights.records.${row}.tag`);
    if (tag) store.set(state`tagInput.tag`, _.clone(tag));
  } 
  // otherwise, weight
  if (row === numrows)
    return store.set(state`weightInput.weight`, '');
  const weight = get(state`weights.records.${row}.weight`);
  store.set(state`weightInput.weight`, _.clone(weight)/10);
}
export const moveInput = sequence('moveTagInput', [
  ({store,props,get}) => { 
    let row = props.row;
    if (props.row < 0) row = 0;
    else {
      const numrecords = get(state`weights.records`).length;
      if (props.row > numrecords-1)  row = numrecords;
    }
    store.set(state`${props.whichInput}.row`, row);
    return { row };
  },
  loadInputFromRow,
  ({props}) => { if (props.whichInput === 'tagInput') return scrollToTag(); return scrollToWeight(); },
]);
 
export const moveInputUp = sequence('moveInputUp', [ 
  ({props,get}) => { 
    const row = get(state`${props.whichInput}.row`)-1;
    return { row };
  },
  moveInput,
]);
export const moveInputDown = sequence('moveTagInputDown', [ 
  ({get,props}) => { 
    const row = get(state`${props.whichInput}.row`)+1;
    return { row };
  },
  moveInput,
]);



//-------------------------------------------------------
// Saving things
function loadWeight({props,get}) {
  if (props.weight) return;
  const weight = get(state`weights.records.${props.row}.weight`);
  if (!weight) return;
  return { weight: _.cloneDeep(weight) };
}
function loadTag({props,get}) {
  if (props.tag) return;
  const tag = get(state`weights.records.${props.row}.tag`);
  if (!tag) return;
  return { tag: _.cloneDeep(tag) };
}
function loadGroupDays({props,get}) {
  if (props.group) return;
  if (!props.tag) return; // can't find group for null tag
  let group = groupForTag(get(state`incoming.records`),props.tag);
  if (!group) return;
  const days = moment(get(state`date`),'YYYY-MM-DD').diff(moment(group.date,'YYYY-MM-DD'), 'days');
  return { 
    group: _.cloneDeep(group.groupname), 
    days,
    inDate: group.date,
  };
}

function computeRoG({props,get}) {
  if (!props.weight) return; 
  if (!props.group) return;
  if (!props.days) return;
  if (!props.tag) return; 
  const group = _.find(get(state`incoming.records`), r => r.groupname === props.group);
  const days = props.days;
  const adjWeight = props.weight / 0.98; // 2% scale offset
  const lbsGain = adjWeight - group.weight;
  const rog = lbsGain / days;
  return {
    adjWeight,
    lbsGain,
    rog,
  };
}
function saveRecord({props,store,get}) {
  const rec = get(state`weights.records.${props.row}`);
  if (!rec) store.set(state`weights.records.${props.row}`, { row: props.row, date: get(state`date`) });
  const toMerge = {};
  if (props.tag)      toMerge.tag       = _.clone(props.tag);
  if (props.weight)   toMerge.weight    = props.weight;
  if (props.adjWeight)toMerge.adjWeight = props.adjWeight;
  if (props.lbsGain)  toMerge.lbsGain   = props.lbsGain;
  if (props.group)    toMerge.group     = props.group;
  if (props.days)     toMerge.days      = props.days;
  if (props.rog)      toMerge.rog       = props.rog;
  if (props.inDate)   toMerge.inDate    = props.inDate;
  store.merge(state`weights.records.${props.row}`, toMerge);
  return { record: get(state`weights.records.${props.row}`) };
}
export const saveTag = sequence('saveTag', [ 
  set(state`msg`, { type: 'bad', text: 'Saving tag...' }),
  ({get}) => get(state`tagInput`), // put row and tag into props
  loadGroupDays,
  loadWeight,
  computeRoG,
  saveRecord,
  weights.saveRecordRow, // props: row, will pull record from state
  () => ({whichInput: 'tagInput'}),
  moveInputDown,
  set(state`msg`, { type: 'good', text: 'Tag Saved' }),
]);


export const saveWeight = sequence('saveWeight', [
  set(state`msg`, { type: 'bad', text: 'Saving weight...' }),
  ({get}) => get(state`weightInput`), // put row and weight into props
  ({props}) => ({ weight: props.weight * 10 }),
  loadTag, // pull tag into props if it exists
  loadGroupDays,
  computeRoG,
  saveRecord,
  weights.saveRecordRow, // props: row, will pull record from state
  () => ({whichInput: 'weightInput'}),
  moveInputDown,
  set(state`msg`, { type: 'good', text: 'Weight Saved' }),
]);


//-------------------------------------------------------
// Initialization
export const init = sequence('init', [
  windowSize.init,
  set(state`msg`, { type: 'good', text: 'Checking trello authorization...' }),
  trello.authorize,
  set(state`msg`, { type: 'good', text: 'Checking google authorization...' }),
  google.authorize,
  set(state`msg`, { type: 'good', text: 'Fetching records...' }),
  parallel('parallel fetch', [
    treatments.fetch,
    treatments.fetchConfig,
    incoming.fetch,
    dead.fetch,
    loadWeightsForDate,
  ]),
  set(state`msg`, { type: 'good', text: 'Computing stats...' }),
  incoming.computeStats,
  // Move inputs to bottom row
  ({store,get}) => {
    const lastrow = get(state`weights.records`).length;
    store.set(state`tagInput.row`, lastrow);
    store.set(state`weightInput.row`, lastrow);
  },
  set(state`recordsValid`, true),
  set(state`msg`, { type: 'good', text: 'Loaded successfully.'}),
  scrollToTag,
]);
