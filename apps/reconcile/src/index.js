import React from 'react'
import { render } from 'react-dom'
import { createOvermind } from 'overmind'
import { Provider } from 'overmind-react'
import { config } from './overmind'
import App from './App'

const overmind = createOvermind(config, {
  devtools: (process.env.NODE_ENV !== 'production'),
});

render(
  <Provider value={overmind}>
    <App />
  </Provider>
, document.querySelector('#root'));


if (module.hot) {
  module.hot.accept();
}


