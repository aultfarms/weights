import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state/index.js';
import { defaultConfig } from './state/state.js';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

export const Config = observer(function Config() {
  const {state, actions} = React.useContext(context);

  // Using internal state here to avoid setting localStorage while typing
  const [accountsPath, setAccountsPath] = React.useState(state.config.accountsLocation.path);

  return (
    <div style={{ 
      backgroundColor: 'white', 
      margin: '30px', 
      padding: '5px', 
      width: '90%', 
      height: '90%', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center' }}
    >
      <div>
        <TextField 
          label="Accounts Path in Google Drive"
          sx={{width: '80ch'}} 
          value={accountsPath}
          onChange={evt => setAccountsPath(evt.target.value)}
        /><br/>
        (Default: {defaultConfig.accountsLocation.path})
      </div>

      <div style={{ marginTop: '10px' }}>
        <Button 
          variant="contained"
          sx={{ width: '80ch' }}
          disabled={state.config.accountsLocation.path === accountsPath} 
          onClick={() => { actions.accountsPath(accountsPath) } }
        >
          Apply and Reload
        </Button>
      </div>

    </div>
  );

});
