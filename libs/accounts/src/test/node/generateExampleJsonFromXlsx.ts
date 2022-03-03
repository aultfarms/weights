import { spreadsheets } from '../../node/index.js';

const args = process.argv.slice(2); // get rid of node <scriptname>

if (!args || !args[0]) {
  throw new Error(`USAGE: <script> accountsdir`);
}
const accountsdir = args[0];

const accts = spreadsheets.readAccountsFromDir({ accountsdir });

console.log(JSON.stringify(accts));
