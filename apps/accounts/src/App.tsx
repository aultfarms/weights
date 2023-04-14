import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { context } from './state';
import { NavBar } from './NavBar';
import { ActivityLog } from './ActivityLog';
import { Ledger } from './Ledger';
import { BalanceSheets } from './BalanceSheets';
import { ProfitLoss } from './ProfitLoss';
import { Ten99 } from './Ten99';
import { Inventory } from './Inventory';
import { Config } from './Config';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Modal from '@mui/material/Modal';
import pkg from '../package.json';

const warn = debug('accounts#App:info');

export const App = observer(function App() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

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
      case 'ten99': return <Ten99 />;
      case 'inventory': return <Inventory />;
    }
  }

  const displayModal = () => {
    if (state.modal === 'none') return <React.Fragment/>;
    if (state.modal === 'config') {
      return (
        <Modal open={state.modal === 'config'} onClose={() => actions.modal('none')}>
          <Config />
        </Modal>
      );
    }
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>AF/Accounts - v{pkg.version}</title>
      </Helmet>
      <div>
        <NavBar />
        {displayPage()}
        {displayModal()}
      </div>
    </HelmetProvider>
  );
});
