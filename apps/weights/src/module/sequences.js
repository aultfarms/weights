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
  ({props,state}) => {
    if (typeof props.tag.number !== 'undefined') state.set(`tagInput.tag.number`, +(props.tag.number));
    if (props.tag.color)  state.set(`tagInput.tag.color`, props.tag.color);
  }, 
  scrollToTag
]); // tag, number
export const changeOut = sequence('changeOut', [
  set(state`msg`, { type: 'bad', text: 'Saving out change...' }),
  ({props,state}) => state.set(`weights.records.${props.row}.out`, props.checked),
  weights.saveRecordRow, // props: row, will pull record from state
  set(state`msg`, { type: 'good', text: 'Out change saved' }),
]);

function loadInputFromRow({state,props}) {
  const row = state.get(`${props.whichInput}.row`);
  const numrows = state.get('weights.records').length;
  if (props.whichInput === 'tagInput') {
    if (row === numrows)
      return state.set('tagInput.tag.number', ''); // new row, reset input
    const tag = state.get(`weights.records.${row}.tag`);
    if (tag) state.set('tagInput.tag', _.clone(tag));
  } 
  // otherwise, weight
  if (row === numrows)
    return state.set('weightInput.weight', '');
  const weight = state.get(`weights.records.${row}.weight`);
  state.set('weightInput.weight', _.clone(weight)/10);
}
export const moveInput = sequence('moveTagInput', [
  ({state,props}) => { 
    let row = props.row;
    if (props.row < 0) row = 0;
    else {
      const numrecords = state.get('weights.records').length;
      if (props.row > numrecords-1)  row = numrecords;
    }
    state.set(`${props.whichInput}.row`, row);
    return { row };
  },
  loadInputFromRow,
  ({props}) => { if (props.whichInput === 'tagInput') return scrollToTag(); return scrollToWeight(); },
]);
 
export const moveInputUp = sequence('moveInputUp', [ 
  ({state,props}) => { 
    const row = state.get(`${props.whichInput}.row`)-1;
    return { row };
  },
  moveInput,
]);
export const moveInputDown = sequence('moveTagInputDown', [ 
  ({state,props}) => { 
    const row = state.get(`${props.whichInput}.row`)+1;
    return { row };
  },
  moveInput,
]);



//-------------------------------------------------------
// Saving things
function loadWeight({props,state}) {
  if (props.weight) return;
  const weight = state.get(`weights.records.${props.row}.weight`);
  if (!weight) return;
  return { weight: _.cloneDeep(weight) };
}
function loadTag({props,state}) {
  if (props.tag) return;
  const tag = state.get(`weights.records.${props.row}.tag`);
  if (!tag) return;
  return { tag: _.cloneDeep(tag) };
}
function loadGroup({props,state}) {
  if (props.group) return;
  if (!props.tag) return; // can't find group for null tag
  let group = groupForTag(state.get('incoming.records'),props.tag);
  if (!group) return;
  return { group: _.cloneDeep(group.groupname) };
}
function computeDaysRoG({props,state}) {
  if (!props.weight) return; 
  if (!props.group) return;
  if (!props.tag) return; 
  const group = _.find(state.get('incoming.records'), r => r.groupname === props.group);
  const days = moment(state.get('date'),'YYYY-MM-DD').diff(moment(group.date,'YYYY-MM-DD'), 'days');
  const adjWeight = props.weight / 0.98; // 2% scale offset
  const lbsGain = adjWeight - group.weight;
  const rog = lbsGain / days;
  return {
    adjWeight,
    lbsGain,
    days,
    rog,
    inDate: group.date,
  };
}
function saveRecord({props,state}) {
  const rec = state.get(`weights.records.${props.row}`);
  if (!rec) state.set(`weights.records.${props.row}`, { row: props.row, date: state.get('date') });
  if (props.tag)      state.set(`weights.records.${props.row}.tag`,      _.clone(props.tag));
  if (props.weight)   state.set(`weights.records.${props.row}.weight`,   props.weight);
  if (props.adjWeight)state.set(`weights.records.${props.row}.adjWeight`,props.adjWeight);
  if (props.lbsGain)  state.set(`weights.records.${props.row}.lbsGain`,  props.lbsGain);
  if (props.group)    state.set(`weights.records.${props.row}.group`,    props.group);
  if (props.days)     state.set(`weights.records.${props.row}.days`,     props.days);
  if (props.rog)      state.set(`weights.records.${props.row}.rog`,      props.rog);
  if (props.inDate)   state.set(`weights.records.${props.row}.inDate`,   props.inDate);
  return { record: state.get(`weights.records.${props.row}`) };
}
export const saveTag = sequence('saveTag', [ 
  set(state`msg`, { type: 'bad', text: 'Saving tag...' }),
  ({state}) => state.get('tagInput'), // put row and tag into props
  loadGroup,
  loadWeight,
  computeDaysRoG,
  saveRecord,
  weights.saveRecordRow, // props: row, will pull record from state
  () => ({whichInput: 'tagInput'}),
  moveInputDown,
  set(state`msg`, { type: 'good', text: 'Tag Saved' }),
]);


export const saveWeight = sequence('saveWeight', [
  set(state`msg`, { type: 'bad', text: 'Saving weight...' }),
  ({state}) => state.get('weightInput'), // put row and weight into props
  ({props}) => ({ weight: props.weight * 10 }),
  loadTag, // pull tag into props if it exists
  loadGroup,
  computeDaysRoG,
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
  ({state}) => {
    const lastrow = state.get(`weights.records`).length;
    state.set(`tagInput.row`, lastrow);
    state.set(`weightInput.row`, lastrow);
  },
  set(state`recordsValid`, true),
  set(state`msg`, { type: 'good', text: 'Loaded successfully.'}),
  scrollToTag,
]);
