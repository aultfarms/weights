import React from 'react';
import ReactDOM from 'react-dom/client';
import { context, initialContext } from './state';
import { App } from './App';

import './index.css';

// @ts-ignore
document.title += ` - ${__APP_VERSION__}`;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <context.Provider value={initialContext}>
      <App />
    </context.Provider>
  </React.StrictMode>
);

