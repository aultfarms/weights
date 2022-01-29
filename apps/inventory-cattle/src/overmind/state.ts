import { derived } from 'overmind';

import { Trello, state as TrelloState } from 'aultfarms-lib/trello/overmind/state'

export const state: State = {
  accountsLoaded: false,
  receiptsLoaded: false,
  allLoaded: derived((state: State) => state.accountsLoaded && state.receiptsLoaded),

};
