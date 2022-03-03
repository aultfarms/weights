import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { Console } from 'console-feed';
import { context } from './state/index.js';
import { NavBar } from './NavBar.js';

const warn = debug('accounts#App:info');

// STOPPED HERE XXX
// Basic React app w/ mobx is done.  This app now needs:
// XX 1: console output, collapsable (console-feed)
// 2: config page w/ localstorage (google paths)
// 3: load ledger by default on startup from stored path
// 4: show all errors on main screen
// 5: button to create balance sheet and p&l  (download vs. in google)

export const App = observer(function App() {
  const ctx = React.useContext(context);
  const { changeIt } = ctx.actions;

  const change = () => {
    changeIt(Math.random().toString());
  };

  React.useEffect(() => {
    // NOTE: DO NOT CONSOLE.LOG IN THIS FUNCTION.
    // It will trigger infinite re-renders
    const console_div = document.getElementById('console-container');
    if (!console_div) return;
    console_div.scrollTop = console_div.scrollHeight - console_div.clientHeight;
  });

  return (
    <div onClick={change}>
      <NavBar />

      {ctx.state.hello} world
      <br />
      <div id="console-container" style={{backgroundColor: '#242424', maxHeight: '400px', overflowY: 'scroll'}}>
        <Console logs={ctx.state.logs} variant="dark" />
      </div>
    </div>
  )
});
