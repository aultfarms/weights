import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import Button from '@mui/material/Button';
import { context } from './state';
import chalk from 'chalk'
import ansispan from './ansispan';
import htmlparse from 'html-react-parser';
import { LinesTable } from './LinesTable';
import { ledger, type inventory } from '@aultfarms/accounts';
import {ActivityLog} from './ActivityLog';

const { red, green } = chalk;

const redSpan = (msg: string) => htmlparse(ansispan(red(msg)));
const greenSpan = (msg: string) => htmlparse(ansispan(green(msg)));

const warn = debug('accounts#Inventory:warn');
const info = debug('accounts#Inventory:info');
//const trace = debug('accounts#Inventory:trace');

export const Inventory = observer(function Inventory(): React.ReactElement {

  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  const sr = actions.ledger(); 
  // access state.stepResult.rev so we are updated when it changes
  if (!state.stepResult || state.stepResult.rev < 0 || !sr || !sr.final) {
    warn('WARNING: have no valid accounts.  Inventory can only run if all accounts have no errors.');
    return <div>Accounts are not valid.  Inventory can only run if all accounts have been loaded with no errors.</div>
  }


  const displayRunInventory = () => {
    switch(state.inventory.state) {
      case 'start': return (
        <div>
          <Button onClick={() => actions.runInventory()}>Run Inventory</Button>
        </div>);
      case 'running': return <div>Running Inventory.  Check activity log for any messages.</div>;
      case 'done': return <div>Inventory processing complete.</div>;
    }
  };

  const displayMissingInCash = (lines: ledger.InventoryAccountTx[]) => 
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div><b>{redSpan('Missing lines in Cash Accounts')}</b></div>
      <div>
        <b>You must fix these manually:</b> they exist in an inventory account, 
        but have no cash account equivalent.
      </div>
      <LinesTable lines={lines} qtyPrecision={lines[0].acct.settings.qtyPrecision || 0}/>
    </div>

  const displayMissingInIvty = (lines: ledger.AccountTx[]) => 
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div><b>{redSpan('Missing lines in Inventory Accounts')}</b></div>
      <div>
        These exist in an inventory account, but have no cash account equivalent, or are needed for FIFO.
      </div>
      <LinesTable lines={lines} qtyPrecision={lines[0].acct.settings.qtyPrecision || 0}/>
    </div>


  const displayPresentInBoth = (pibresult: inventory.PresentInBothResult[]) =>
    <div>
      <div><b>{redSpan('Lines Different in both Cash and Inventory')}</b></div>
      <div>
        <b>You must fix these manually.</b>  These lines are for the same type of 
        thing on the same day, but something doesn't match about them.
      </div>
      <LinesTable lines={pibresult.reduce((acc, p, index) => ([  // Just show both lines in the table, one on top of the other
        ...acc, 
        { ...p.cashtx, description: `CASH #${index}: ${p.cashtx.acct.name}` },
        { ...p.ivtytx, description: `IVTY #${index}: ${p.ivtytx.acct.name}` },
      ]), [] as ledger.AccountTx[])} qtyPrecision={pibresult[0].ivtytx.acct.settings.qtyPrecision || 0}/>
    </div>

  const finalaccts = actions.ledger()?.final;
  const maybelivestock = finalaccts?.originals.find(acct => acct.settings.inventorytype === 'livestock') || null;
  let livestock: ledger.LivestockInventoryAccount | null = null;
  try {
    ledger.assertLivestockInventoryAccount(maybelivestock)
    livestock = maybelivestock;
  } catch(e: any) { }

  const haveManualFixes = !!state.inventory.missing?.find(m => m.missingInCash.length > 0 || m.presentInBothButOneIsWrong.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '10px' }}>

      <div style={{ display: 'flex', flexDirection: 'row', margin: '5px', alignItems: 'center' }}>
        <div style={{ margin: '5px', padding: '5px', display: 'flex', flexDirection: 'row' }}>
          <div style={{ margin: '5px' }}>Today:</div>
          <input type="date" 
            value={state.inventory.today} 
            onChange={evt => actions.inventoryToday(evt.target.value)} 
          />
        </div>
        {displayRunInventory()}
      </div>

      { state.inventory.state === 'running' || state.inventory.state === 'error' ? <ActivityLog /> : <React.Fragment/> }

      {/* Manual fixes first */}
      { !state.inventory.missing ? <React.Fragment/> :
        !haveManualFixes ? 
          <div>{greenSpan('There are no manual fixes necessary for cash and inventory accounts')}</div>
        : <div>
            <h1>{redSpan('Manual fixes:')}</h1>
            <b>You must fix all these manually</b> and reload the page before any automatic updates can be applied.
            {state.inventory.missing.map((missing, index) => (
              <div key={`manual-${index}`}>
                <hr />
                <h3>Account: {missing.acct.name}</h3>
                {missing.presentInBothButOneIsWrong.length > 0 ? displayPresentInBoth(missing.presentInBothButOneIsWrong) : <React.Fragment/>}
                {missing.missingInCash.length > 0 ? displayMissingInCash(missing.missingInCash) : <React.Fragment/>}
              </div>
            ))}
          </div>
      }

      {/* Lines that can be automatically inserted*/}
      { !state.inventory.missing || haveManualFixes ? <React.Fragment/> :
        state.inventory.missing.length < 1 ?
          <div>{greenSpan('There are no missing or conflicting lines in cash and inventory accounts')}</div>
        : <div>
            <h1>Automatable Missing Lines:</h1>
            These can be automatically fixed.  Please review, then click the button to insert the missing lines in the spreadsheets.
            <br/>
            <Button onClick={() => actions.inventoryInsertAllMissingLines()} variant="contained">Insert Missing Lines in Spreadsheets</Button>
            {state.inventory.missing.map((missing, index) => (
              <div key={`automatic-${index}`}>
                <hr />
                <h3>Account: {missing.acct.name}</h3>
                {missing.missingInIvty.length > 0 ? displayMissingInIvty(missing.missingInIvty) : <React.Fragment/>}
              </div>
            ))}
          </div>
      }

      {/* Updates to make that are not inserts (FIFO).  These can only go if there are no missing lines */}
      { !state.inventory.changes || (state.inventory.missing && state.inventory.missing.length > 0) ? <React.Fragment/> :
        state.inventory.changes.length < 1 ? 
          <div>{greenSpan('There are no changes needed in livestock inventory to match FIFO')}</div>
        : !livestock ?
          <div>{redSpan('ERROR: could not find livestock inventory account in list of accounts')}</div>
        : <div>
            <h1>{redSpan('Automatable Changes Needed for FIFO:')}</h1>
            These lines need to have values changed in them to match FIFO.  Please review and click the button to update them in the spreadsheets.
            <br/>
            <Button onClick={() => actions.inventoryApplyAllChanges(livestock!)} variant="contained">Apply All Changes to Spreadsheets</Button>
            <hr/>
            <h3>Account: {livestock.name}</h3>
            <LinesTable lines={state.inventory.changes} />
          </div>
      }

      { state.inventory.state === 'done' && !state.inventory.missing?.length && !state.inventory.changes?.length
        ? <h1>{greenSpan('All accounts are up to date for inventory.')}</h1>
        : <React.Fragment/>
      }

    </div>
  );
});
