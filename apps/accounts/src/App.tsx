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
// MVP is done.  Now add helpful checks:
// - check for transfer as zero
// - check for loan-principal as zero
// - check for dates that are > 4 months different than their neighbors (i.e. mistyped year on date)
// - add lookup feature for category to show all lines that hit that category (year?)

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
