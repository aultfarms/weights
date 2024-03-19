import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';
import type { SelectChangeEvent } from '@mui/material/Select'
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import { newLoadString } from './state/util';

export const AvailableNumbers = observer(function AvailableNumbers() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  function handleAvailableNumberChange(evt: SelectChangeEvent<string>) {
    if (evt.target.value === newLoadString) {
      actions.newLoadNumberMode(true);
    } else {
      actions.newLoadNumberMode(false);
      actions.changeRecord({ loadNumber: evt.target.value });
    }
  }

   return (<div>
    <FormControl fullWidth variant="standard">
      <InputLabel id="avail-label">Available Numbers</InputLabel>
      <Select labelId="avail-label"
              label="Available Numbers"
              onChange={handleAvailableNumberChange}
              value={ state.newLoadNumberMode ? newLoadString : state.record.loadNumber}
      >
        { state.availableNumbersForCurrentSource.map(a => <MenuItem key={'avail-select-'+a} value={a.name}>{a.name}</MenuItem>) }
        <MenuItem key={'newload-select'} value={newLoadString}>{newLoadString}</MenuItem>
      </Select>
    </FormControl>
    <br/><br/>

    { state.availableNumbersForCurrentSource.length > 0 && !state.newLoadNumberMode
      ? <React.Fragment></React.Fragment>
      : <FormControl fullWidth variant="standard">
          <TextField variant="standard"
                     label="Enter New Load Number"
                     value={state.record.loadNumber}
                     onChange={evt => actions.changeRecord({ loadNumber: evt.target.value })}/>
        </FormControl>
    }
  </div>);
});