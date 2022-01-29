import {IConfig, createOvermind } from 'overmind'
import { createHook, createStateHook, createEffectsHook, createActionsHook } from 'overmind-react'
import { merge, namespaced } from 'overmind/config'
import { State } from './types'
import { state } from './state'
import { actions } from './actions'
import { effects } from './effects'
import { onInitialize } from './onInitialize'

import { trello } from 'aultfarms-lib/trello/overmind'

export const config = {
  state,
  onInitialize,
  actions,
  effects,
  devtools: true
};

export const overmind = createOvermind(merge(
  config,
  namespaced({
    // Cores
    trello, 
//    gsheets, 
//    gdrive, 
//    accounts, 

    // Derived
//    cattle, 
//    receipts
  })
));

export const useOvermind = createHook();
export const useState = createStateHook();
export const useActions = createActionsHook();
export const useEffects = createEffectsHook();

// From overmind docs:
declare module 'overmind' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Config extends IConfig<{
    state: typeof state,
    actions: typeof actions,
    effects: typeof effects,
  }> {}
}

