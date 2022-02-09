const _ = require('lodash');
const { isStart } = require('./util');

function moneyEquals(a,b) {
  return (Math.abs(a-b) < 0.01); // difference is less than a cent, then they are equal
}

module.exports = acct => {

  let balance = 0;

  _.each(acct.lines, (l,index) => {
    if (isStart(l)) {
      if (index !== 0) {
        l.is_error = true;
        l.error = l.error || new Error('START line is not first line in acct');
        l.msg = `${l.msg ? l.msg+', and': ''}START line found at non-zero index ${index}, line is ${JSON.stringify(l, false, '  ')}`;
        return;
      }
      balance = l.balance
    } else {
      balance += l.amount ? l.amount : 0;
    }
    if (!moneyEquals(balance, l.balance)) {
      const msg = `Balance (${l.balance}) != computed balance from amounts (${balance}) on line ${l.lineno} of acct ${acct.name}`;
      l.is_error = true;
      l.error = l.error || new Error(msg),
      l.msg = `${l.msg ? l.msg+', and': ''} ${msg}`;
    }
  });

  return acct;
  
};
