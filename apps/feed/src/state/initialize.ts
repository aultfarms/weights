import { state } from './state';
import { changeRecord } from './actions';
import { loadFeedBoard, loadFromLocalStorage, trello } from './actions';
import debug from 'debug';
import { firstSourceName } from './util';

const info= debug("af/feed:info");

export const initialize = async () => {
  info('Connecting to Trello')
  // Make sure Trello is connected
  await trello();
  // Load the feed board:
  info('Loading feed board')
  await loadFeedBoard();
  // Load the latest record from localstorage now that feed board is loaded
  info('Loading latest saved record values from localStorage')
  loadFromLocalStorage();
  // Now check the current record: if there was nothing saved in localstorage, put in defaults
  if (!state.record.source) changeRecord({ source: firstSourceName(state.feedBoard?.webControls.settings.sources[0] || 'UNKNOWN') });
  if (!state.record.dest) changeRecord({ dest: state.feedBoard?.webControls.settings.destinations[0] || 'UNKNOWN' });
  if (!state.record.driver) changeRecord({ driver: state.feedBoard?.webControls.settings.drivers[0] || 'UNKNOWN' });
};