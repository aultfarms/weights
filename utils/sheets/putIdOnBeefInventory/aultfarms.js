const Promise = global.Promise = require('bluebird');
const {info,warn,error} = require('debug-levels')('aultfarms');
const _ = require('lodash');
const sheets = Promise.promisifyAll(require('googleapis').sheets('v4'));
sheets.spreadsheets = Promise.promisifyAll(sheets.spreadsheets);

let singleton = null;
module.exports = async () => {
  if (!singleton)  {
    const drive = await require('./drive')();

    const checks = {};
    const inventory = {};

    await Promise.props({
      checks: drive.findFileAtPath({ path: '/Ault Farms Shared/LiveData/BeefCattleChecks' }),
      inventory: drive.findFileAtPath({ path: '/Ault Farms Shared/LiveData/BeefCattleInventory' }),
    }).then(res => {
      config.checks.id = res.checks;
      config.inventory.id = res.inventory;
    });
 
    const loadInventorySheet = async () => {
      singleton.inventory.sheet = await sheets.spreadsheets.getAsync({
        spreadsheetId: inventory.id,
        auth: drive.auth,
      }).then(res => res.data);
    };

    singleton = {
      checks: config.checks,
      inventory: config.inventory,
      loadInventorySheet,
      auth: drive.auth,
    };
  }

  return singleton;
};
