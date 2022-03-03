import * as React from 'react';
import { render } from 'react-dom';
import { context, initialContext } from './state/index.js';
import { App } from './App.js';

render(
  <context.Provider value={initialContext}>
    <App />
  </context.Provider>
, document.querySelector('#app'));
