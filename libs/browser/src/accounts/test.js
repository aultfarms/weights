
const ledger = require('../lib');
(async () => {

const all = await ledger();
console.log('Done, all = ', all);

})()
