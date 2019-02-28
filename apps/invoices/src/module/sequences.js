import { set, toggle } from 'cerebral/factories';
import { state, props, sequence } from 'cerebral';

import * as       feed from 'aultfarms-lib/feed/module/sequences';
import * as     trello from 'aultfarms-lib/trello/module/sequences';
import * as windowSize from 'aultfarms-lib/windowSize/module/sequences';

export const drawerToggle = sequence('drawerToggle', [ 
  toggle(state`page.drawer.open`) 
]);
export const closeDrawer = sequence('closeDrawer', [
  set(state`page.drawer.open`, false),
]);

export const changeGroup = sequence('changeGroup', [ 
  set(state`invoicegroups.curgroupname`, props`group`),
  set(state`page.name`, props`group`),
  closeDrawer,
]);

export const handleError = sequence('handleError', [
  ({props}) => console.log('Caught an Error props = !', props),
]);

export const init = sequence('init', [
  windowSize.init,
  trello.authorize,
  feed.fetch,
  set(state`recordsValid`, true),
  // Set initial group to notInvoiced
  () => ({group: 'notInvoiced'}),
  changeGroup,
]);


