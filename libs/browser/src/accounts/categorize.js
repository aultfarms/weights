const _ = require('lodash');

module.exports = (acct) => {
  const containsCategory = (cat,only) => {
    if (!cat) return false;
    if (cat.name === only) return true;
    if (!cat.children) return false;
    return _.reduce(cat.children, (found,child) => {
      return found || containsCategory(child);
    },false);
  };

  const underCategory = (child,search_parent_name) => {
    const prt = parentForCategory(child);
    if (!prt) return false; // reached the top
    if (prt.name === search_parent_name) return true;
    return underCategory(prt,search_parent_name);
  };

  const parentForCategory = (child,curparent) => {
    curparent = curparent || cats;
    if (!curparent.children) return null; // didn't find it!
    if (curparent.children[child.name]) return curparent;
    for(let i in curparent.children) {
      let foundparent = parentForCategory(child,curparent.children[i]);
      if (foundparent) return foundparent;
    }
    return null; // didn't find it
  };
  
  const template = (name) => { 
    return {
      name,
      children: {},
      transactions: [],
      credit: function(cfg) { cfg.type='credit'; return this.amount(cfg); },
      debit:  function(cfg) { cfg.type='debit';  return this.amount(cfg); },
      amount:  function(cfg) {
        cfg = cfg || {};
        const {start,end,timerange,type,only,exclude,under_only} = cfg;
        // if this one it explicitly excluded, no need to recurse
        if (exclude && this.name === exclude) return 0;
        // if this one does not contain the only one we want, we're done
        if (only && !containsCategory(this,only) && !underCategory(this,only)) return 0;
        // total of transactions at this level plus amounts of children

        const mysum = _.reduce(this.transactions, (sum,tx) => {
          if (type === 'credit' && tx.amount < 0) return sum; // credits are positive
          if (type === 'debit'  && tx.amount > 0) return sum; // debits are negative
          if (start && tx.date.isBefore(start)) return sum; // before start time
          if (end   && tx.date.isAfter(end))    return sum; // after end time
          if (timerange && !timerange.contains(tx.date)) return sum; // does not fall within the time range

          return sum + tx.amount; // otherwise, include in resulting sum
        },0);
        const childrensum = _.reduce(this.children, (sum,child) => {
          return sum + child.amount(cfg);
        },0);

        return mysum + childrensum;
      },
    };
  };

  const cats = template('root');

  const transactionToTree = (catarr,tx,treelevel) => {
    const catkey = catarr[0];
    if (!treelevel.children[catkey]) treelevel.children[catkey] = template(catkey);
    const catobj = treelevel.children[catkey];
    // If there are more, recurse again
    if (catarr.length > 1) {
      transactionToTree(catarr.slice(1), tx, catobj);
      return;
    }
    // If that was the only item in the remaining cat array, this transaction
    // goes here in the tree and no need to recurse further
    catobj.transactions.push(tx);
  };

  const txCatToArr = (tx) => {
    if (!tx.category || typeof tx.category !== 'string') {
      throw new Error(`categorize: ERROR: found a tx without a valid category: ${JSON.stringify(tx, false, '  ')}`);
    }
    return tx.category.split('-');
  };

  _.each(acct.lines, tx => {
    transactionToTree(txCatToArr(tx),tx,cats);
  });


  return cats;
}
