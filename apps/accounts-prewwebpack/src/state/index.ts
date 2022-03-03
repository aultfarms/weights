import { createContext } from 'react';
import { state } from './state.js';
import * as actions from './actions.js';

type State = typeof state;
type Actions = typeof actions;
export { state, State, actions, Actions };

export type Context = {
  state: State,
  actions: Actions,
};
export const initialContext = { state, actions };
export const context = createContext<Context>(initialContext);

if ('onInitialize' in actions) {
  (actions as any).onInitialize();
}
