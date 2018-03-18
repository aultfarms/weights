if (!process.env.DEBUG) process.env.DEBUG="*,-follow-redirects";

const {info,warn,error} = require('debug-levels')('main');
const _ = require('lodash');


try { (async () => {
  const af = await require('./aultfarms')();
  await af.loadInventorySheet();
  
  info('aultfarms = ', af.inventory.sheet); // have af.checks.id and af.inventory.id

  // NEXT STEP: use google sheets for inventory sheet
  // loop over every row
  // replace ID with computed ID for the row (date:ST1)
  // track counts of already-used id's in order to make count on end correct
  
  return;

})();} catch(err) {
  if (err.code) return error('Error (Code: ',err.code,'): ', err.errors);
  return error('Error: ', err);
}
