import React, { useCallback, useState } from 'react';
import { nameCategoryMapping, standardizeName, categoryNoteMapping } from './name-category-mappings';
import { useDropzone } from 'react-dropzone';
import { parse as csvparse } from 'papaparse';
import moment from 'moment';
import numeral from 'numeral';
import './App.css';
import _ from 'lodash';

const col = (val, redIfPopulated) => {
  const style = { minWidth: val ? '100px' : '10px' };
  if (redIfPopulated && val) style.backgroundColor = 'red';
  return <td style={style} >
    {val ? val : ''}
  </td>;
}

const txToRow = (r,i) => 
  <tr key={'row'+i} style={{backgroundColor: r.iserror ? 'red' : 'white' }}>
    {col(r.date && r.date.isValid() ? r.date.format('YYYY-MM-DD') : '') /* writtenDate */ }
    {col() /* postDate */ }
    {col(r.check ? r.check : '') /* checkNum */ }
    {col(r.description) /* description */ }
    {col(r.amount < 0 ? -r.amount : '') /* debit */ }
    {col(r.amount >= 0 ? r.amount : '') /* credit  */ }
    {col() /* splitAmount */ }
    {col() /* balance */ }
    {col(r.name) /* who */ }
    {col(r.category ? r.category : '') /* category */ }
    {col(r.note ? r.note : '', !r.iserror) /* note, only red if not error */ }
  </tr>
;

const standardizeTx = (tx,line) => {
  line = line + 2; // header row, and 1-index instead of 0-index
  const date = moment(tx['Payment Date'], 'MM/DD/YYYY');
  const name = tx['Payee'] ? tx['Payee'] : '';
  const description = ''; // in the future, can put memo line here
  const amount = -numeral(tx['Dollar Amount']).value(); // These are all checks, so "negative" amounts
  let catmap = _.cloneDeep(nameCategoryMapping[standardizeName(name)]);
  if (!catmap) catmap = false; // explicit boolean false if not there
  let category = '';
  let splits = [];
  let iserror = false;
  let note = '';


  if (!date || !date.isValid()) {
    iserror = true;
    note += `The date ${tx['Payment Date']} is invalid.  `;
  }
  if (!amount) {
    iserror = true;
    note += `The amount ${tx['Dollar Amount']} is invalid`;
  }

  // Handle conditionally merging in stuff from catmap:
  // // Example to pick splits based on amount:
  // { 
  //   category: 'SPLIT',
  //   mergeifamount: {
  //                 abs means "absolute value of amount" to test against value
  //     lessthan: { abs: true, value: 2000, splits: [ 'split cat 1', 'split cat 2' ] },
  //     else: { splits: [ 'split cat 3', 'split cat 4' ] }
  //   }
  // }
  // // Example to pick just category based on amount:
  // { 
  //   mergeifamount: {
  //     lessthan: { value: 0, category: 'cat 1' }
  //     else: { category: 'cat 2' }
  //   }
  // }
  if (catmap && catmap.mergeifamount) {
    const mia = catmap.mergeifamount;
    // Check if we have some "mergers" base on amount
    let merge = {};
    if (mia.lessthan) {
      merge = mia['else'];
      const testamt = mia.lessthan.abs ? Math.abs(amount) : amount;
      if (testamt < mia.lessthan.value) {
        merge = _.omit(mia.lessthan, 'value');
      }
    }
    catmap = { 
      // Keep whatever else is in the catmap, but ditch the mergeifamount now
      ..._.omit(catmap, 'mergeifamount'), 
      ...merge 
    };
  }

  // turn any string or array shorthands into object { category: ... }
  if (catmap && (typeof catmap === 'string' || _.isArray(catmap))) {
    catmap = { category: catmap };
  }

  // Now, decode the category: could be a string, an array of strings, or object w/ category key
  // Did we find a catmap at all?
  if (catmap === false) {
    iserror = true;
    note += `The name ${name} is not found in the known list of category mappings`;
    category = '';

  // Do we have an category?
  } else if (!catmap.category || catmap.category === 'UNKNOWN') {
    iserror = true;
    note += `The category ${catmap.category} is UNKNOWN or empty, please fill it in when you paste`;
    category = catmap.category;

  // Do we have an array of possible categories?
  } else if (_.isArray(catmap.category)) {
    iserror = true;
    note += `This payee could be one of several categories: ${catmap.category.join(', ')}`;
    category = '';

  // Otherwise, just a regular ole' category
  } else {
    category = catmap.category;
  }
  // Category is figured out

  if (catmap.splits) {
    if (!category) category = 'SPLIT';
    splits = catmap.splits;
  }

  // Finally, do we have a default note for this category, or one specified w/ the catmap?
  if (category && categoryNoteMapping[category]) {
    note += categoryNoteMapping[category];
  }
  if (catmap && catmap.note) {
    note += catmap.note;
  }

  // Construct our return value, only include splits if we have some
  let ret = {
    iserror, note, date, amount, name, category, description
  };
  if (splits && splits.length > 0) ret = { ...ret, splits };

  return ret;
}

const splitLine = (tx,category) => ({
  iserror: tx.iserror || !category,
  note: tx.iserror ? 'Split of line w/ error' : (!category ? 'Fill in category' : ''),
  date: '',
  amount: '',
  name: 'SPLIT',
  category,
  description: 'SPLIT',
})
const insertSplits = (acc, tx, i) => {
  acc.push(tx);
  if (tx.splits || (tx.category && tx.category === 'SPLIT')) {
    const splits = tx.splits || [ '', '' ]; // default to 2 blank splits

if (tx.name.match(/CONTERRA/)) {
console.log('CONTERRA: insertsplits: splits = ', splits);
}
    splits.forEach(s => {
      acc.push(splitLine(tx, s));
    });
  }
  return acc;
};

export const App = () => {
  
  const [parseState, setParseState] = useState('START');
  const [transactions, setTransactions] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setParseState('PARSING');

    acceptedFiles.forEach((file) => {
      csvparse(file, {
        header: true,
        complete: ({ data,errors }) => {
          const cleaned = data.map(standardizeTx);
          const withSplits = cleaned.reduce(insertSplits, []);
          setTransactions(withSplits);
          setParseState('PARSED');
        },
      });
    })
  }, []);
  const {getRootProps, getInputProps} = useDropzone({onDrop});


  let body = '';
  switch(parseState) {

    case "PARSING": body = 
      <div>Parsing...</div>
    break;

    case "PARSED": body = 
      <div>
        Paste this into google sheets:
        <table style={ { border: '1px solid grey' } }>
          <tbody>
            { transactions.map(txToRow) }
          </tbody>
        </table>
      </div>;
    break;

    // START:
    default: body = 
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', border: '3px dashed grey', borderRadius: '5px', margin: '20px'}} {...getRootProps()}>
        <input {...getInputProps()} />
        <p>v2.1: Drop FBB Excel File Here</p>
      </div>;
  }

  return <div className="App">
    {body}
  </div>;
}

export default App;
