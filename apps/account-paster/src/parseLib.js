const _ = require('lodash');
const commandline = (require.main === module);

//--------------------------------------------------
// Helpers:
var lines = [];
function processItem(arr) {
  //-------------------------------------------
  // NOTE: this isn't fixed yet for new payees: the old way had an extra line for "Last Paid"
  //-------------------------------------------
  // line[0] is my name for them in bill pay before the *
  //     [1] is actual payee
  //     [2] is empty -- used to be: acct. #
  //     [3] is 'Last paid' -- used to be: 'Check' or 'Electronic'
  //     [4] is empty
  //     [5] is 'Check or Electronic' -- used to be: EITHER 'Last paid: ' or 'Bu Smart'
  //     [6] is empty
  //     [7] is 'Pay fromBu Smart *2769  $5429.60 Amount
  //     < this line used to be empty, now it is just payment date shifted up [8] is empty>
  //     [8] is payment date
  //     [9] is deliver by date
  //    [10] is 'Conf #: 1076'
  //    [11] is 'Check number: 2186' - Electronic ones do not have a check number
  //    [12] is 'Delivery: Standard' - used to split, not included in array
  //    <end>
  // Used to be:
  //     [BuSmart + 1] = ***2769
  //     [BuSmart + 2] = $ Amount
  //     [BuSmart + 3] = Date Written
  //     [BuSmart + 4] = Date to send
  //     [BuSmart + 5] = 'Conf #: '
  //     <end>
console.log('processItem: arr = ', arr);
  arr = _.map(arr, function(a) { return a.trim() });
  const hasLastPaid = !!arr[3].match(/^Last paid: /);
  let check_vs_electronic_line = 5;
  if (!hasLastPaid) check_vs_electronic_line--; // assume one less line
  const isElectronic = !!arr[check_vs_electronic_line].match(/Electronic/);

  const nameline = 0;
  let amtline = 0;
  _.each(arr, (v,i) => {if (v.match(/Amount/)) amtline=i});  
  const dateline = amtline+2; // They seem to be removing or adding a blank line here from time to time
  const confline = dateline+2;
  const checkline = confline+1;

  let matches = arr[amtline].match(/(\$[0-9]+\.[0-9]{2}) +Amount$/);
  const amt = matches[1];
  let check = ''; // Electronic ones do not have a check number
  if (!isElectronic) {
    matches = arr[checkline].match(/^Check number: +([0-9]+)$/);
    //console.log('Check, item = ', arr);
    //console.log('hasLastPaid = ', hasLastPaid);
    //console.log('check_vs_electronic_line = ',arr[check_vs_electronic_line]);
    //console.log('amtline(',amtline,') = ',arr[amtline]);
    //console.log('dateline(',dateline,') = ',arr[dateline]);
    //console.log('confline(',confline,') = ',arr[confline]);
    //console.log('checkline(',checkline,') = ',arr[checkline], ', matches = ', matches);
    check = matches[1];
  }

  const ret = {
    name: arr[nameline].replace(/ *\*.*$/,''), // get rid of the acct number on the end
     amt,
    date: arr[dateline],
    conf: arr[confline],
   check,
  };

  // Validate:
  if (!ret.amt.match(/^\$[0-9]+\.[0-9]{2}$/)) {
    console.log('ERROR: amt should be $XXXX.XX or some such thing instead of ' + ret.amt);
    return null;
  }
  if (!ret.date.match(/^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}$/)) {
    console.log('ERROR: date should be XX/XX/XXXX or some such thing instead of ', ret.date);
    return null;
  }
  if (!ret.conf.match(/^Conf #: [0-9]+$/)) {
    console.log('ERROR: conf # should be Conf #: XXX or some such thing instead of ', ret.conf);
    return null;
  }
  if (!isElectronic && !ret.check.match(/^[0-9]+$/)) {
    console.log('ERROR: check should be Check number: XXXX or some such thing instead of ', ret.check);
    return null;
  }

  return ret;
} 


function processLines(lines) {
console.log('processLines: lines = ', lines);
  // Split things by 'Delivery: Standard'
  var items = [];
  var cur_item = [];
  for(var i=0; i<lines.length; i++) {
    var l = lines[i];
    if (l.match(/Delivery: Standard/)) {
      items.push(processItem(cur_item));
      cur_item = [];
      continue;
    }
    cur_item.push(l);
  }
  return items;
}

function processStr(str) {
console.log('processStr: str = ', str);
  return processLines(_.split(str, '\n'));
}

function generateTabSeparated(items) {
  return _.map(items, function(i) {
    var row = [];
    for(var j=0; j<9; j++) { row.push(''); } // always make 9 columns
    row[0] = i.date;
    row[2] = i.check;
    row[3] = i.conf;
    row[4] = i.amt;
    row[8] = i.name;
//    return _.join(row,'\t');
    return _.join(row,';');
  });
}

if (commandline) {
  const clipboardy = require('clipboardy');
  const str = clipboardy.readSync();
  console.log('--------------------------------------------------------------');
  console.log('Lines to paste into Excel: ');
  console.log(_.join(generateTabSeparated(processStr(str)),'\n'));

} else {
  // running as a library, so just export a function:
  module.exports = processStr;
}


