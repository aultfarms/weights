import { createContext } from 'react';
import { state, IndexedStatements } from './state';
import * as actions from './actions';
export type { IndexedStatements };

export type State = typeof state;
export type Actions = typeof actions;
export { state, actions };

export type Context = {
  state: State,
  actions: Actions,
};
export const initialContext = { state, actions };
export const context = createContext<Context>(initialContext);

if ('onInitialize' in actions) {
  (actions as any).onInitialize();
}
