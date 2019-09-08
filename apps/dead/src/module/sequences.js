import { set } from 'cerebral/operators';
import { state,props } from 'cerebral/tags';
import { sequence, parallel } from 'cerebral';

import * as treatments from 'aultfarms-lib/treatments/module/sequences';
import * as incoming   from 'aultfarms-lib/incoming/module/sequences';
import * as dead       from 'aultfarms-lib/dead/module/sequences';
import * as trello     from 'aultfarms-lib/trello/module/sequences';
import * as windowSize from 'aultfarms-lib/windowSize/module/sequences';

export const updateMsg = sequence('updateMsg', [
  ({props,state}) => {
    if (props.msg) return state.set('msg', props.msg);
    if (!state.get('trello.authorized')) 
      return state.set('msg', { type: 'bad', text: 'You are not logged in to Trello.' });
    if (state.get('record.is_saved')) 
      return state.set('msg', { type: 'good', text: 'Treatment record saved.'});
    state.set('msg', { type: 'bad', text: 'Treatment record not saved'});
  },
]);

export const historySelectionChangeRequested = sequence('app.historySelectionChangeRequested', [ 
  set(state`historySelector.active`, props`active`), 
]);
export const historyGroupSortClicked = sequence('app.historyGroupSortClicked', [ 
  set(state`historyGroup.sort`, props`sort`) 
]);

export const changeRecord = sequence('app.changeRecord', [ 
  ({props,state}) => {
    // Only the first time that the is_saved gets set to false, automatically
    // switch the Date/Tag pane to Tag since we're typing a tag now.
    if (state.get('record.is_saved')) state.set('historySelector.active', 'tag');
    // if they are changing a record that has already been saved, go ahead and clear out
    // the date box for them
    if (props.date) state.set('record.date', props.date);
    if (props.tag && typeof props.tag.color === 'string') {
      state.set('record.tag.color', props.tag.color);
      if (props.tag.color === 'NOTAG') state.set('record.tag.number','1');
    }
    if (props.tag && (typeof props.tag.number === 'string' || typeof props.tag.number === 'number')) {
      state.set('record.tag.number', +(props.tag.number));
    }
    state.set('record.is_saved', false);
  },
  updateMsg,
]);
export const logout = sequence('app.logout', [ trello.deauthorize, trello.authorize]);

export const saveRecord = sequence('app.saveRecord', [ 
  set(props`record`, state`record`),
  set(state`recordsValid`, false),
  set(state`msg`, { type: 'good', text: 'Saving card...' }),
  dead.saveDead,
  set(state`msg`, { type: 'good', text: 'Refreshing records...' }),
  dead.fetch,
  set(state`recordsValid`, true),
  set(state`record.is_saved`, true),
  set(state`record.tag.number`, ''),
  set(state`historySelector.active`, 'date'),
  set(state`msg`, { type: 'good', text: 'Recomputing stats...' }),
  incoming.computeStats,
  updateMsg,
]);

export const init = sequence('app.init', [
  windowSize.init,
  set(state`msg`, { type: 'good', text: 'Checking trello authorization...' }),
  trello.authorize,
  set(state`msg`, { type: 'good', text: 'Fetching records...' }),
  parallel('app.init.parallel', [
    treatments.fetch,
    treatments.fetchConfig,
    incoming.fetch,
    dead.fetch,
  ]),
  set(state`msg`, { type: 'good', text: 'Computing stats...' }),
  incoming.computeStats,
  set(state`recordsValid`, true),
  set(state`msg`, { type: 'good', text: 'Loaded successfully.'}),
]);
