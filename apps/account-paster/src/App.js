import React, { useCallback, useState } from 'react';
import { nameCategoryMapping, splitMapping, standardizeName } from './name-category-mappings';
import { useDropzone } from 'react-dropzone';
import { parse as csvparse } from 'papaparse';
import moment from 'moment';
import numeral from 'numeral';
import './App.css';

const col = val => <td style={{minWidth:'25px'}}>{val ? val : ''}</td>;

const txToRow = (r,i) => 
  <tr key={'row'+i} style={{backgroundColor: r.iserror ? 'red' : 'white' }}>
    {col(r.date && r.date.isValid() ? r.date.format('YYYY-MM-DD') : '') /* writtenDate */ }
    {col() /* postDate */ }
    {col(r.check ? r.check : '') /* checkNum */ }
    {col(r.description) /* description */ }
    {col(r.amount < 0 ? r.amount : '') /* debit */ }
    {col(r.amount >= 0 ? r.amount : '') /* credit  */ }
    {col() /* splitAmount */ }
    {col() /* balance */ }
    {col(r.name) /* who */ }
    {col(r.category ? r.category : '') /* category */ }
    {col(r.note ? r.note : '') /* note */ }
  </tr>
;

const standardizeTx = (tx,line) => {
  line = line + 2; // header row, and 1-index instead of 0-index
  const date = moment(tx['Payment Date'], 'MM/DD/YYYY');
  const name = tx['Payee'];
  const amount = numeral(tx['Dollar Amount']).value();
  const category = nameCategoryMapping[standardizeName(name)] || false;
  const description = ''; // in the future, can put memo line here
  let iserror = false;
  let note = '';


  if (!date || !date.isValid()) {
    iserror = true;
    note += `The date ${tx['Payment Date']} is invalid.  `;
  }
  if (!category) {
    iserror = true;
    note += `The name ${name} is not found in the known list of category mappings`;
  }
  if (!amount) {
    iserror = true;
    note += `The amount ${tx['Dollar Amount']} is invalid`;
  }
  return {
    iserror, note, date, amount, name, category, description
  };
}

const splitLine = (tx) => ({
  iserror: tx.iserror,
  note: tx.iserror ? 'Split of line w/ error' : '',
  date: '',
  amount: '',
  name: 'SPLIT',
  category: '',
  descriptoin: 'SPLIT',
})
const insertSplits = (acc, tx, i) => {
  if (tx.category && tx.category === 'SPLIT') {
    const numsplits = splitMapping[tx.name] || 2; // default to 2 split lines
    for(let j=0; j<numsplits; j++) {
      acc.push(splitLine(tx));
    }
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
          console.log('cleaned = ', cleaned);
          console.log('withSplits = ', withSplits);
          setTransactions(cleaned);
          console.log('parsed transactions = ', transactions);
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

    case "PARSED": console.log('IN PARSED, tx = ', transactions); body = 
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
        <p>v2.0: Drop FBB Excel File Here</p>
      </div>;
  }

  return <div className="App">
    {body}
  </div>;
}

export default App;
