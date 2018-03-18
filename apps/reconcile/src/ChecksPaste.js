import React, { Component } from 'react';
import { connect } from '@cerebral/react';
import { state,signal } from 'cerebral/tags';
import './ChecksPaste.css';
import Dropzone from 'react-dropzone';
import _ from 'lodash';

import Table, {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
} from 'material-ui/Table';
import Button from 'material-ui/Button';
import TextField from 'material-ui/TextField';
import Paper from 'material-ui/Paper';
import Typography  from 'material-ui/Typography';

export default connect({
  // State:
  cp: state`checkspaste`,

  // Signals:
  pasteTextChanged: signal`checkspaste.pasteTextChanged`,

}, function ChecksPaste({cp, pasteTextChanged}) {

  const pasteAreaChanged = evt => {
    pasteTextChanged({ pasted: evt.target.value });
  };

  const rowClick = index => () => {
    console.log('clicked row '+index+'!');
  };

  const removeSplit = index => () => {
    console.log('remove split '+index+' clicked');
  };

  const addSplit = index => () => {
    console.log('add split '+index+' clicked');
  };

  //---------------------------------
  // Rendering

  const renderTextField = () => 
    <TextField id="checkspastetext" multiline={true} onChange={pasteAreaChanged} placeholder="Paste checks here" fullWidth={true}>
      Paste here
    </TextField>
  ;

  const renderProcessed = () => {
    return <Paper>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Conf. #</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Who</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Split?</TableCell>
          </TableRow>

          { _.map(cp.processed, (i,index) => 
            <TableRow key={'checkstable'+index} onClick={rowClick(index)}>
              <TableCell>{i.date}</TableCell>
              <TableCell>{i.conf}</TableCell>
              <TableCell>{i.amt}</TableCell>
              <TableCell>{i.name}</TableCell>
              <TableCell><TextField placeholder="category"></TextField></TableCell>
              <TableCell>
                { i.isSplit 
                  ? <Button onClick={removeSplit(index)}>Split</Button>
                  : <Button onClick={addSplit(index)}>X</Button>
                }
              </TableCell>
            </TableRow>
          )}

        </TableHead>
      </Table>
    </Paper>
      
  };

  return (
    <div className="ChecksPaste">
      { cp && cp.pasted && cp.pasted.length > 0
        ? renderProcessed()
        : renderTextField()
      }
    </div>
  );
});

