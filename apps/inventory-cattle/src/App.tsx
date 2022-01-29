import * as React from 'react';
import './App.css';
import { useOvermind } from './overmind';
import { Loading } from './Loading';
import { Inventory } from './Inventory';
// Uncomment this when DebugConsole works with React 17
// import { DebugConsole } from './DebugConsole';

export function App() {
  const { state } = useOvermind();

  return (
    <div className="App">
      <Loading />

      { state.allLoaded ? 
        <Inventory /> : null
      }

{ /*      <DebugConsole /> */ }
    </div>
  );
}

