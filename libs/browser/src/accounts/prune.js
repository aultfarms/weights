const _ = require('lodash');
const numeral = require('numeral');

// Get rid of non-transaction or non-asset lines (i.e. comments, settings)
module.exports = input => {
  // Filter to include only those lines that have no values of COMMENT, IGNORE, or SETTINGS
  input.lines = _.filter(input.lines, l => !_.values(l).find(v => 
    v === 'COMMENT' || v === 'IGNORE' || v === 'SETTINGS'
  ));

  // Filter out empty lines (i.e. lines with no columns that have text in them)
  input.lines = _.filter(input.lines, l => {
    const linewithoutlineno = _.omit(l, 'lineno');
    return _.values(linewithoutlineno).find(v => !!v); // keep (return true) if we have any non-falsy values
  });

  // Convert any string numbers into actual numbers: remove $, turn -- into -, remove commas
  input.lines = _.map(input.lines, l => _.mapValues(l, (v,key) => {
    if (_.find([ 'acct', 'stmt', 'note', 'description' ], key)) {
      return v;
    }
    if (typeof v !== 'string') return v;
    const start = v;
    v = v.trim();
    if (!v.match(/^[\$\-]*[0-9.,]+$/)) {
      return v;
    }
    // Convert to number if it looks like a number
    v = v.replace(/^\$/,'')
         .replace(/^-\$-/, '-') // some things start with -$-
         .replace(/^--/,'-') // some things start with --
         .replace(/,/g, '');
    v = +v;
    return v;
  }));

  return input;
}
