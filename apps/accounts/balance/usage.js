module.exports = msg => {
  console.log(msg);
  console.log(`node index.js -y 2020 -> generate spreadsheet with all quarters of 2020`);
  console.log(`node index.js -d 2020-12-31 -> generate spreadsheet with all account balances as of EOD on date`);
  console.log(`node index.js -d 2020-12-31 -a fbb.checking -> print ledger and show account balance up to this date for this account`);
  console.log(`Default: without -d or -y, date defaults to now()`);
  console.log(`Must pass --force to overwrite existing file`);
  process.exit(1);
};


