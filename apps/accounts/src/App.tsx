import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { context } from './state';
import { NavBar } from './NavBar';
import { ActivityLog } from './ActivityLog';
import { Ledger } from './Ledger';
import { BalanceSheets } from './BalanceSheets';
import { ProfitLoss } from './ProfitLoss';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import pkg from '../package.json';

const warn = debug('accounts#App:info');

// STOPPED HERE XXX
// Basic React app w/ mobx is done.  This app now needs:
// XX 1: console output, collapsable (console-feed)
// 2: config page w/ localstorage (google paths)
// XXX 3: load ledger by default on startup from stored path
// XXX 4: show all errors on main screen
// XXX 5: button to create balance sheet and p&l  (download vs. in google)
// 6: debug assets since all current ones have incorrect prior's
// 6: display general combined tax/mkt ledgers (toggle for tax/mkt)
// 7: display balance sheet on balance sheet page
// 8: display P&L on P&L page
// 9: download button on each balance and P&L page
// 10: add category listing for new categories this year, maybe also missing categories

export const App = observer(function App() {
  const ctx = React.useContext(context);
  const { state } = ctx;

  React.useEffect(() => {
    // NOTE: DO NOT CONSOLE.LOG IN THIS FUNCTION.
    // It will trigger infinite re-renders
    const console_div = document.getElementById('console-container');
    if (!console_div) return;
    console_div.scrollTop = console_div.scrollHeight - console_div.clientHeight;
  });

  const displayPage = () => {
    switch(state.page) {
      case 'activity': return <ActivityLog />;
      case 'ledger': return <Ledger />;
      case 'balance': return <BalanceSheets />;
      case 'profit': return <ProfitLoss />;
    }
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>AF/Accounts - v{pkg.version}</title>
      </Helmet>
      <div>
        <NavBar />
        {displayPage()}
      </div>
    </HelmetProvider>
  );
});
