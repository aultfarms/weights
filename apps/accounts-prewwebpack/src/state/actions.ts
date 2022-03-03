import { action } from 'mobx';
//import type { Context } from './index.js';
import { state } from './state.js';
import { Hook, Decode } from 'console-feed';

export const onInitialize = action('onInitialize', () => {
  Hook(window.console, action('console hook', (log) => {
    state.logs = [...state.logs, Decode(log)];
  }));
});

export const changeIt = action('changeIt', (hello: string) => {
  state.hello = hello;
});


