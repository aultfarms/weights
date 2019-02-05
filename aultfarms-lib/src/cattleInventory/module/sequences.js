import _ from 'lodash';
//import moment from 'moment';
import { set } from 'cerebral/factories';
import { state, sequence, parallel } from 'cerebral';

import { loadList } from '../trello/sequences';
import { loadSheetRows } from '../google/sequences';

import { mapCardsSequence } from '../../../../lib/cardMappers';


//--------------------------------------------------------------------
// Load all the lists of interest in parallel and process them:
export const init = [
  parallel([
    sequence('livestock->load In', [
      () => ({ boardName: 'Livestock', listName: 'In', key: 'in' }),
      sequence(loadList),
      sequence(mapCardsSequence),
    ]),
    sequence('livestock->load Out', [
      () => ({ boardName: 'Livestock', listName: 'Out', key: 'out' }),
      sequence(loadList),
      sequence(mapCards),
    ]),
    sequence('livestock->load Buy Contracts', [
      () => ({ boardName: 'Livestock', listName: 'Buy Contracts', key: 'buyContracts' }),
      sequence(loadList),
      sequence(mapCards),
    ]),
    sequence('livestock->load Sell Contracts', [
      () => ({ boardName: 'Livestock', listName: 'Sell Contracts', key: 'sellContracts' }),
      sequence(loadList),
      sequence(mapCards),
    ]),
    sequence('livestock->load Dead', [
      () => ({ boardName: 'Livestock', listName: 'Dead', key: 'dead' }),
      sequence(loadList),
      sequence(mapCards),
    ]),

    //-------------------------------------------------------------------
    // Load Google Sheets:
    sequence('livestock->load Inventory', [
      () => ({ 
        path: '/Ault Farms Shared/LiveData/BeefCattleInventory', 
        key: 'beefInventory', 
        worksheetName: 'Beef_Inventory' }),
      sequence(loadSheetRows),
      // load each row as an object (keyed from header row) into the state:
      ({props,store}) => store.set('livestock.inventory', _.reduce(props.values, (acc,row,i) => {
        if (i===0) return acc;
        const header = props.values[0];
        acc.push(_.zipObject(header, row));
        return acc;
      }, [])),
    ]),
  ]),

  set(state`livestock.ready`, true),
];


