import reader from '../../accounts/node/xlsx.js';

const args = process.argv.slice(2); // get rid of node <scriptname>

if (!args || !args[0]) {
  throw new Error(`USAGE: <script> accountsdir`);
}
const accountsdir = args[0];

// example_xlsx is found in ../../public, and is copied to top level in dist/
const accts = reader({ accountsdir });

console.log(JSON.stringify(accts));
