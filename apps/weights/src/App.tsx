import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import debug from 'debug';
import { context } from './state';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { WeightsPane } from './WeightsPane';
import { TagInput } from './TagInput';
import { WeightInput } from './WeightInput';
import { Errors } from './Errors';
import pkg from '../package.json';

import './App.css';

//const warn = debug('weights#App:info');

export const App = observer(function App() {
  const ctx = React.useContext(context);
  const { state } = ctx;

  const dir = state.window.orientation === 'landscape' ? 'row' : 'column';
  const inputdir = dir === 'row' ? 'column' : 'row'; // arrange input opposite main layout
  const maxinputwidth = inputdir === 'row' ? '100%' : '25%';

  return (
    <HelmetProvider>
      <Helmet>
        <title>AF/Weights - v{pkg.version}</title>
      </Helmet>
      <div className="App">
        <div className="container" style={{ flexDirection: dir}}>
          { state.isInitialized 
          ? <React.Fragment>
              <WeightsPane />
              <div className="inputs" style={{ flexDirection: inputdir, maxWidth: maxinputwidth }}>
                <TagInput />
                <div className="spacer"></div>
                <WeightInput />
              </div>
            </React.Fragment>
          : <div>
              Initializing...
              <Errors/>
            </div>
          }
        </div>
      </div>
    </HelmetProvider>
  );
});
