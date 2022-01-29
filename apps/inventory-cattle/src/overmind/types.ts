import { State as Trello } from 'aultfarms-lib/trello/overmind/types';

export type State = {
  accountsLoaded: boolean,
  receiptsLoaded: boolean,
  allLoaded: boolean,
  trello: Trello,
};


