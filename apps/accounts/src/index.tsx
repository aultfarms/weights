import * as React from 'react';
import { render } from 'react-dom';
import { context, initialContext } from './state';
import { App } from './App';

localStorage.debug = '*';

render(
  <context.Provider value={initialContext}>
    <App />
  </context.Provider>
, document.querySelector('#root'));
