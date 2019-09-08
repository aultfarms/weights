import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import AppModule from './modules';
import registerServiceWorker from './registerServiceWorker';

import { Controller } from 'cerebral';
import { Container } from '@cerebral/react';
import devtools from 'cerebral/devtools';

const controller = Controller(AppModule, {
  devtools: process.env.NODE_ENV !== 'production' ? devtools({host: 'localhost:8000', reconnect: true }) : null,
});


// Render the root node:
ReactDOM.render(
  <Container controller={controller}>
    <App />
  </Container>, document.getElementById('root')
);

registerServiceWorker();
