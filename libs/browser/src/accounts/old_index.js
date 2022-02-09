var _ = require('lodash');
var numeral = require('numeral');
var converter = require('./converter');

function amountFromLineObject(line) {
  // Amount is "Amount" in farm credit, and "Debit"|"Credit" first financial
  var amt = line.Amount;
  if (!amt) amt = line.Debit;
  if (amt && amt.match(/-\$-/)) {
    amt = amt.replace(/-\$-/,'-');
  }
  // Debits and farm credit transactions should be negative their listed value
  if (amt) {
    amt = +(amt.replace(/[$,]/g,''));
    return -1*amt;
  }
  // Could still be credit:
  amt = line.Credit;
  if (!amt) return 0;
  return +(amt.replace(/[$,]/g,''));
}

function parseLoanSplit(split_string, acct_key, lineno) {
  if (typeof split_string !== 'string') {
    console.log('Acct ' + acct_key + ', Line ' + lineno + ': ERROR PARSING LOAN: split_string not a string.  split_string = ', split_string);
    return false;
  }

  var loans = split_string.match(/(\(Loan *[^:]+: *(-?\$?[0-9,]+(\.[0-9]+)? *total;) *(-?\$?[0-9,]+(\.[0-9]+)? *interest)\))/g);
  if (!loans || loans.length < 1) {
    console.log('Acct ' + acct_key + ', Line ' + lineno + ': ERROR PARSING LOAN: line does not match main regexp.  split_string = ' + split_string);
    return false; 
  }
  return _.reduce(loans, function(list, loan) {
    if (!list) return false; // once one dies, kill the rest too
    var matches = loan.match(/\(Loan *([^:]+): *(-?\$?[0-9,]+(\.[0-9]+)?) *total; *(-?\$?[0-9,]+(\.[0-9]+)?) *interest\)/);
    if (!matches || matches.length < 1) {
      console.log('Acct ' + acct_key + ', Line ' + lineno + ': ERROR PARSING 1 LOAN: could not match name, total and interest.  loan_str = ', loan, ', matches = ', matches);
      return false; 
    }
    var loan_name = matches[1];
    var total = +(matches[2].replace(/[$, ]/g,''));
    var interest = +(matches[4].replace(/[$, ]/g,''));
    var principal = total - interest;
    if (isNaN(principal)) {
      console.log('Acct ' + acct_key + ', Line ' + lineno + ': ERROR PARSING 1 LOAN: principal is NaN.  loan_str = ', loan, ', total = ', total, ', interest = ', interest);
      return false;
    }
    list.push({
      loan_name: loan_name,
      total: total,
      interest: interest,
      principal: principal,
    });
    return list;
  }, []);
}

function parseCategorySplit(split_string, acct_key, lineno) {
  var splits_str = cat.replace(/^SPLIT/,'').replace(' ',''); // get rid of SPLIT and whitespace
  var splits = split.match(/(\([^:]+:(-?\$?[0-9,]+(\.[0-9]+)?)\))/g);
  if (!splits || splits.length < 1) {
    console.log('Acct ' + acct_key + ', Line '+lineno+': ERROR ON SPLIT: did not match overall splits regexp.  splits_str = ', splits_str);
    return list;
  }
  _.each(splits, function(split) {
    var matches = split.match(/\(([^:]+):(-?\$?[0-9,]+(\.[0-9]+)?)\)/);
    var category = matches[1];
    var amount = matches[2];
    if (!amount) {
      console.log('Acct ' + acct_key + 'Line '+lineno+': ERROR ON SPLIT: amount not a valid number.  split = ', split, ', matches = ', matches);
      return list;
    }
    amount = amount.replace(/[$,]/g, '');
    categories.push({ 
      category: category,
      amount: +amount
    });
  });
}

function groupByPayee(accts) {
  return _.reduce(_.keys(accts), function(list, acct_key) {
    var acct = accts[acct_key];
    _.each(acct, function(line) {
      var who = line.Who;
      if (!who) return list; // invalid line
      if (!list[who]) { 
        list[who] = { 
          sum: 0, 
          count: 0,
          items: [],
        };
      }
      var amt = amountFromLineObject(line);
      list[who].sum += amt;
      list[who].count++;
      list[who].items.push(line);
    });
    return list;
  }, {});
}

function groupByCategory(accts) {
  return _.reduce(_.keys(accts), function(list, acct_key) {
    var acct = accts[acct_key];
    var lineno = 0;
    _.each(acct, function(line) {
      lineno++;
      var line_amt = amountFromLineObject(line);
      var cat = line.Category;
      if (!cat) return list; // invalid line
      // First, assume it's just a single category, then replace if not so.
      var categories = [ 
        { 
          category: cat,
          amount: line_amt
        }
      ];
      // Check if this is a "SPLIT" applied amount or a single category:
      // Note that amounts in categories should be negative for expenses,
      // positive for deposits.
      // SPLIT (category-name: -$10,000.00),(category2-name: $945.00)
      if (cat.match(/^SPLIT/)) {
        categories = parseCategorySplit(cat, acct_key, lineno);
        // Now validate the categories that they indeed add up to the total for 
        // the whole row.
        var sum = _.reduce(categories, function(total, cat) {
          return total + cat.amount;
        },0);
        if (sum !== line_amt) { 
          console.log('Acct ' + acct_key + 'Line '+lineno+': ERROR ON SPLIT: amounts do not add up to line total.  sum = ' + sum + ', line_amt = ' + line_amt);
          return list;
        }
      }
      // Now we have an array of 1 or more categories, so loop through and
      // handle each as if it were it's own line:
      _.each(categories, function(cat_obj) {
        var amt = cat_obj.amount;
        var cat = cat_obj.category;
        var who = line.Who;
        var cats = cat.split('-');
        var parentobj = list;
        var note = line.Note;

        var prev_c = '';
        _.each(cats, function(c) {
          if (!parentobj[c]) {
            parentobj[c] = { 
              sum: 0, 
              count: 0,
              items: [],
              children: {},
            };
          }
          var p = parentobj[c];

          if (cat === 'loan-payment' && c === 'payment') {
            // We have to loop through each of the loans and tally interest, principal:
            var loans = parseLoanSplit(note, acct_key, lineno);
            // Add each loan as a child to the 'payment' parent, and add-up totals
            // for all payments
            _.each(loans, function(l) {
              if (!p.children[l.loan_name]) {
                p.children[l.loan_name] = {
                  principal: 0,
                  interest: 0,
                  sum: 0,
                  count: 0,
                  items: [],
                  children: {}
                };
              };
              p.children[l.loan_name].principal += l.principal;
              p.children[l.loan_name].interest += l.interest;
              p.children[l.loan_name].sum += l.sum;
              p.children[l.loan_name].count++;
              p.children[l.loan_name].items.push(l);
            });
            // STOPPED HERE: finished adding splits by category, may need splits by 
            // payee and category for deposits?
          }
          p.sum += amt;
          p.count++;
          p.items.push(line);
          parentobj = p.children;
          prev_c = c;
        });
      });
    });

    // Now go through the tree and sum up all the children into the parents:
    var sumList = function(list) {
      if (!list) return 0;
      // First update the sums for each item in the list from it's children:
      _.each(list, function(item) {
        item.sum += item.sumList(item.children);
      });
      // Then add up all the sums for this list and return it:
      return _.reduce(list, function(total, item) {
        return total + item.sum;
      },0);
    };
    sumList(list);
    return list;
  }, {});
}

function categoryCsvString(info,cat,position,max_position) {
  var str = '';
  for(i=0; i<position; i++) {
    str += ',';
  }
  str += cat;
  for (i=max_position; i>position; i--) {
    str +=  ',';
  }
  str += info.sum + ',';
  str += info.count + ',';
  str += (info.interest || '') + ',';
  str += (info.principal || '') + '\n';
  _.each(info.children, function(child_info,child_cat) {
    str += categoryCsvString(child_info,child_cat,position+1,max_position);
  });
  return str;
};

//-----------------------------------------------------------------
// Start the show
//-----------------------------------------------------------------


console.log('------------------------------------------------');

// Load the account history file that was converted from Excel to JSON
var accounts = converter('../RollingAccountHistory.xlsx');

// Print totals for each payee:
console.log('payees = ');
  var g = groupByPayee(accounts);
  var payees = _.sortBy(_.keys(g), function(k) { return k; });
_.each(payees, function(payee) {
  var info = g[payee];
  console.log('  Payee: ' + payee + ', sum = ', numeral(info.sum).format('$0,0.00'), ', count = ', info.count);
});

// Print totals for each category:
console.log('------------------------------------------------');
console.log('categories = ');
_.each(groupByCategory(accounts), function(info, category) {
  console.log('  Category: ' + category + ',\tsum = ', numeral(info.sum).format('$0,0.00'), ',\tcount = ', info.count);
});

console.log('------------------------------------------------');
console.log('CSV: ');

console.log('category-1,category-2,category-3,category-4,amount,count,interest,principal');
_.each(groupByCategory(accounts), function(info, category) {
  console.log(categoryCsvString(info,category,0,4));
});


