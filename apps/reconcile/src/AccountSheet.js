import React, { Component } from 'react';
import { connect } from '@cerebral/react';
import { state } from 'cerebral/tags';
import './AccountSheet.css';
import Dropzone from 'react-dropzone';

import Table, {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
} from 'material-ui/Table';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import Paper from 'material-ui/Paper';
import Checkbox from 'material-ui/Checkbox';
import IconButton from 'material-ui/IconButton';
import Tooltip from 'material-ui/Tooltip';
import DeleteIcon from 'material-ui-icons/Delete';
import FilterListIcon from 'material-ui-icons/FilterList';;


export default connect({
  sheet: state`accountsheet`,
}, function AccountSheet({sheet}) {

  //--------------------------------
  // Events
  const onDrop = files => {
    console.log('dropped files = ', files);
  };


  //---------------------------------
  // Rendering
  const renderTable = () => {
    return <div>Table</div>;
  };

  const renderDropTarget = () => 
    <Paper elevation={4} className="AccountSheetDropPaper">
      <Dropzone onDrop={onDrop} className="AccountSheetDropZone">
        <Typography type="headline" component="h3">
          Drop Account Sheet Here
        </Typography>
      </Dropzone>
    </Paper>;

  return (
    <div className="AccountSheet">
      { sheet && sheet.loaded
        ? renderTable()
        : renderDropTarget()
      }
    </div>
  );
});

